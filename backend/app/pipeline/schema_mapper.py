from sqlalchemy import create_engine, inspect, text
from app.core.security import decrypt_password
from app.core.logger import logger

# Column base types we consider worth sampling for enum-like values.
# Numeric, date/time, uuid, and binary types are excluded — their values
# are either continuous or meaningless as WHERE-clause hints.
_SAMPLEABLE_TYPE_HINTS = ("varchar", "character varying", "text", "char",
                           "enum", "nvarchar", "nchar", "string", "tinytext",
                           "mediumtext", "longtext")
_UNSAMPLEABLE_TYPE_HINTS = ("int", "serial", "numeric", "decimal", "float",
                             "real", "double", "bool", "date", "time",
                             "timestamp", "uuid", "bytea", "json", "xml",
                             "binary", "blob", "bit")

# Max distinct values to treat a column as enum-like.
# If DISTINCT count >= threshold we skip — the values are too varied to help.
_SAMPLE_CARDINALITY_LIMIT = 15
# Max string columns to sample per table (keeps sync time bounded).
_MAX_SAMPLE_COLS_PER_TABLE = 5


class SchemaMapper:
    def _build_url(self, connection_model) -> str:
        """Build connection URL with optional SSL."""
        real_password = decrypt_password(connection_model.encrypted_password)
        use_ssl = getattr(connection_model, "use_ssl", False)
        db_type = connection_model.db_type
        u, h, p, db = (connection_model.username, connection_model.host,
                       connection_model.port, connection_model.db_name)

        if db_type in ("postgres", "cockroach"):
            ssl_param = "?sslmode=require" if use_ssl else ""
            return f"postgresql://{u}:{real_password}@{h}:{p}/{db}{ssl_param}"
        elif db_type in ("mysql", "mariadb"):
            ssl_param = "?ssl=true" if use_ssl else ""
            return f"mysql+pymysql://{u}:{real_password}@{h}:{p}/{db}{ssl_param}"
        elif db_type == "mssql":
            ssl_param = "?encrypt=true" if use_ssl else ""
            return f"mssql+pymssql://{u}:{real_password}@{h}:{p}/{db}{ssl_param}"
        elif db_type == "sqlite":
            return f"sqlite:///{db}"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

    def _is_sampleable(self, type_str: str) -> bool:
        """Return True if this column type is worth sampling for enum-like values."""
        t = type_str.lower()
        # Exclude numeric / date / binary types first
        if any(hint in t for hint in _UNSAMPLEABLE_TYPE_HINTS):
            return False
        return any(hint in t for hint in _SAMPLEABLE_TYPE_HINTS)

    def _sample_column_values(
        self, conn, table_name: str, col_name: str, db_type: str
    ) -> list[str] | None:
        """
        Fetch up to _SAMPLE_CARDINALITY_LIMIT distinct non-null values for one column.
        Returns the list if cardinality is low enough to be useful, else None.

        Uses a statement_timeout on Postgres so a slow full-scan can't block sync.
        """
        try:
            quoted = f'"{table_name}"'
            col_q  = f'"{col_name}"'

            if db_type in ("postgres", "cockroach"):
                conn.execute(text("SET LOCAL statement_timeout = '3s'"))

            # Fetch one more than the limit so we can detect high-cardinality
            fetch_limit = _SAMPLE_CARDINALITY_LIMIT + 1
            rows = conn.execute(
                text(
                    f"SELECT DISTINCT {col_q} FROM {quoted} "
                    f"WHERE {col_q} IS NOT NULL LIMIT {fetch_limit}"
                )
            ).fetchall()

            if not rows or len(rows) >= fetch_limit:
                # Either empty or too many distinct values — not enum-like
                return None

            return [str(r[0]) for r in rows]

        except Exception as exc:
            # Never let a sampling failure break the sync
            logger.debug(f"Sample skipped for {table_name}.{col_name}: {exc}")
            return None

    def sync_schema(self, connection_model) -> dict:
        """
        Introspect the client database and return a rich schema snapshot.
        Captures columns, types, primary keys, foreign keys, nullability,
        and — for low-cardinality string columns — a sample of distinct values.
        The sample values are stored in the schema so the LLM can generate
        accurate WHERE clauses without guessing valid enum values.
        """
        db_url = self._build_url(connection_model)
        # SQLite's driver rejects connect_timeout; it's a network-DB option
        connect_args = {} if connection_model.db_type == "sqlite" else {"connect_timeout": 10}
        engine = create_engine(db_url, connect_args=connect_args)

        schema_snapshot = {}

        try:
            inspector = inspect(engine)

            with engine.connect() as conn:
                for table_name in inspector.get_table_names():
                    # Primary key columns
                    pk_cols = set(
                        inspector.get_pk_constraint(table_name).get("constrained_columns", [])
                    )

                    # Foreign key lookup
                    fk_lookup = {}
                    for fk in inspector.get_foreign_keys(table_name):
                        if fk["constrained_columns"] and fk["referred_columns"]:
                            local_col = fk["constrained_columns"][0]
                            fk_lookup[local_col] = (
                                f"{fk['referred_table']}.{fk['referred_columns'][0]}"
                            )

                    columns_map = {}
                    sample_candidates: list[str] = []

                    for col in inspector.get_columns(table_name):
                        col_name = col["name"]
                        col_type = str(col["type"]).lower()
                        is_pk    = col_name in pk_cols
                        fk_tgt   = fk_lookup.get(col_name)

                        columns_map[col_name] = {
                            "type":      col_type,
                            "nullable":  col.get("nullable", True),
                            "is_pk":     is_pk,
                            "fk_target": fk_tgt,
                        }

                        # Collect sampleable columns (not PK, not FK, string type)
                        if (not is_pk and not fk_tgt
                                and self._is_sampleable(col_type)
                                and len(sample_candidates) < _MAX_SAMPLE_COLS_PER_TABLE):
                            sample_candidates.append(col_name)

                    # Sample distinct values for enum-like columns
                    sampled = 0
                    for col_name in sample_candidates:
                        values = self._sample_column_values(
                            conn, table_name, col_name, connection_model.db_type
                        )
                        if values:
                            columns_map[col_name]["samples"] = values
                            sampled += 1

                    schema_snapshot[table_name] = columns_map

                    if sampled:
                        logger.debug(
                            f"  Sampled {sampled} enum-like column(s) in '{table_name}'"
                        )

            logger.info(
                f"Schema sync complete: {len(schema_snapshot)} tables "
                f"for {connection_model.host}"
            )
            return schema_snapshot

        except Exception as e:
            logger.error(f"Metadata sync execution failed: {str(e)}")
            raise e
        finally:
            engine.dispose()

    def get_context_string(self, schema_json: dict) -> str:
        """
        Converts the rich JSON schema into a structured prompt for the LLM.
        Includes: column types, NOT NULL, PRIMARY KEY, FOREIGN KEY, and
        sample values for low-cardinality string columns so the LLM can
        generate accurate WHERE clause literals without guessing.

        Example output line:
          Table "orders": (
            "id" (integer, NOT NULL, PRIMARY KEY),
            "status" (varchar, NOT NULL, values: active|inactive|pending),
            "user_id" (integer, NOT NULL, FOREIGN KEY REFERENCES users(id))
          )
        """
        context_parts = []
        for table, cols in schema_json.items():
            col_details = []

            items = cols.items() if isinstance(cols, dict) else [(c["name"], c) for c in cols]

            for col_name, col_meta in items:
                c_type     = col_meta.get("type", "unknown")
                c_nullable = col_meta.get("nullable", True)
                c_pk       = col_meta.get("is_pk", col_meta.get("primary_key", False))
                c_fk       = col_meta.get("fk_target")
                c_samples  = col_meta.get("samples")  # list[str] or None

                attributes = []
                if not c_nullable:
                    attributes.append("NOT NULL")
                if c_pk:
                    attributes.append("PRIMARY KEY")
                if c_fk:
                    attributes.append(self._format_fk_for_llm(col_name, c_fk))
                if c_samples:
                    attributes.append(f"values: {'|'.join(c_samples)}")

                attr_str = f", {', '.join(attributes)}" if attributes else ""
                col_details.append(f'"{col_name}" ({c_type}{attr_str})')

            context_parts.append(f'Table "{table}": ({", ".join(col_details)})')

        return "\n".join(context_parts)

    def _format_fk_for_llm(self, current_column: str, fk_target: str) -> str:
        """Helper to format foreign key references cleanly for prompt context."""
        try:
            ref_table, ref_col = fk_target.split('.')
            return f"FOREIGN KEY REFERENCES {ref_table}({ref_col})"
        except ValueError:
            return f"FOREIGN KEY REFERENCES {fk_target}"