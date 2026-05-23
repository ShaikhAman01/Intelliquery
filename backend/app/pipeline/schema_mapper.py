from sqlalchemy import create_engine, inspect
from app.core.security import decrypt_password
from app.core.logger import logger


class SchemaMapper:
    def _build_url(self, connection_model) -> str:
        """Build connection URL with optional SSL."""
        real_password = decrypt_password(connection_model.encrypted_password)
        use_ssl = getattr(connection_model, "use_ssl", False)

        if connection_model.db_type == "postgres":
            ssl_param = "?sslmode=require" if use_ssl else ""
            return (
                f"postgresql://{connection_model.username}:{real_password}"
                f"@{connection_model.host}:{connection_model.port}"
                f"/{connection_model.db_name}{ssl_param}"
            )
        elif connection_model.db_type == "mysql":
            ssl_param = "?ssl=true" if use_ssl else ""
            return (
                f"mysql+pymysql://{connection_model.username}:{real_password}"
                f"@{connection_model.host}:{connection_model.port}"
                f"/{connection_model.db_name}{ssl_param}"
            )
        else:
            raise ValueError(f"Unsupported database type: {connection_model.db_type}")

    def sync_schema(self, connection_model) -> dict:
        """
        Introspect the client database and return a rich schema snapshot.
        Captures columns, explicit types, primary keys, foreign key relations, and nullability.
        Outputs a key-value dictionary optimized for UI data grids.
        """
        db_url = self._build_url(connection_model)
        engine = create_engine(db_url, connect_args={"connect_timeout": 10})
        
        schema_snapshot = {}

        try:
            inspector = inspect(engine)
            
            for table_name in inspector.get_table_names():
                # Extract Primary Key constraint maps
                pk_cols = set(inspector.get_pk_constraint(table_name).get("constrained_columns", []))
                
                # Extract Foreign Key references maps
                fk_metadata = inspector.get_foreign_keys(table_name)
                fk_lookup = {}
                for fk in fk_metadata:
                    if fk["constrained_columns"] and fk["referred_columns"]:
                        local_col = fk["constrained_columns"][0]
                        referred_target = f"{fk['referred_table']}.{fk['referred_columns'][0]}"
                        fk_lookup[local_col] = referred_target

                columns_map = {}
                for col in inspector.get_columns(table_name):
                    col_name = col["name"]
                    columns_map[col_name] = {
                        "type": str(col["type"]).lower(),
                        "nullable": col.get("nullable", True),
                        "is_pk": col_name in pk_cols,
                        "fk_target": fk_lookup.get(col_name, None)
                    }
                
                schema_snapshot[table_name] = columns_map

            logger.info(
                f"Schema sync complete: {len(schema_snapshot)} tables found "
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
        Converts the rich JSON schema into a structured map prompt for the LLM.
        Explicitly declares primary keys and foreign key relations so the AI 
        understands JOIN pathways accurately.
        """
        context_parts = []
        for table, cols in schema_json.items():
            quoted_table = f'"{table}"'
            col_details = []
            
            items = cols.items() if isinstance(cols, dict) else [(c["name"], c) for c in cols]
            
            for col_name, col_meta in items:
                # Handle fallback properties for structural validation safety
                c_type = col_meta.get("type", "unknown")
                c_nullable = col_meta.get("nullable", True)
                c_pk = col_meta.get("is_pk", col_meta.get("primary_key", False))
                c_fk = col_meta.get("fk_target", None)

                attributes = []
                if not c_nullable:
                    attributes.append("NOT NULL")
                if c_pk:
                    attributes.append("PRIMARY KEY")
                if c_fk:
                    attributes.append(self._format_fk_for_llm(col_name, c_fk))

                attr_str = f", {', '.join(attributes)}" if attributes else ""
                col_details.append(f'"{col_name}" ({c_type}{attr_str})')

            context_parts.append(f"Table {quoted_table}: ({', '.join(col_details)})")

        return "\n".join(context_parts)

    def _format_fk_for_llm(self, current_column: str, fk_target: str) -> str:
        """Helper to format foreign key references cleanly for prompt context."""
        try:
            ref_table, ref_col = fk_target.split('.')
            return f"FOREIGN KEY REFERENCES {ref_table}({ref_col})"
        except ValueError:
            return f"FOREIGN KEY REFERENCES {fk_target}"