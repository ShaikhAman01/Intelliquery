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
        Introspect the client database and return a schema snapshot.
        Captures column names, types, primary keys, and nullability.
        """
        db_url = self._build_url(connection_model)
        engine = create_engine(db_url)
        inspector = inspect(engine)

        schema_snapshot = {}

        # Get primary keys per table for enrichment
        for table_name in inspector.get_table_names():
            pk_cols = set(inspector.get_pk_constraint(table_name).get("constrained_columns", []))

            columns = []
            for col in inspector.get_columns(table_name):
                columns.append({
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "primary_key": col["name"] in pk_cols,
                })
            schema_snapshot[table_name] = columns

        logger.info(
            f"Schema sync complete: {len(schema_snapshot)} tables found "
            f"for {connection_model.host}"
        )
        return schema_snapshot

    def get_context_string(self, schema_json: dict) -> str:
        """
        Converts the JSON schema into a rich string prompt for the LLM.
        Includes column types for better query generation.
        """
        context_parts = []
        for table, cols in schema_json.items():
            quoted_table = f'"{table}"'
            col_details = ", ".join(
                [f'"{c["name"]}" ({c.get("type", "unknown")}{"" if c.get("nullable", True) else ", NOT NULL"}{"" if not c.get("primary_key") else ", PK"})' for c in cols]
            )
            context_parts.append(f"Table {quoted_table}: ({col_details})")

        return "\n".join(context_parts)