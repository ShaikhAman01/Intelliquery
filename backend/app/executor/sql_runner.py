import re
from sqlalchemy import text
from fastapi.concurrency import run_in_threadpool
import sqlparse
from app.core.client_db_manager import client_db_manager
from app.core.logger import logger


class SQLRunner:
    DEFAULT_MAX_ROWS = 100
    DEFAULT_TIMEOUT_MS = 15000 

    def validate_query(self, sql: str):
       
        logger.info(f"Validating SQL: {sql}")

        if not sql or not sql.strip():
            logger.error("SQL Validation Failed: Query is empty.")
            raise ValueError("Empty SQL query generated.")

        # Pre-clean: strip common LLM artifacts before parsing
        sql = sql.strip()
        sql = sql.replace("```sql", "").replace("```", "").strip()
        sql = re.sub(
            r'^(?:SQL|Query|Answer|Here\s+is\s+(?:the\s+)?(?:SQL|query))\s*:\s*',
            '', sql, flags=re.IGNORECASE
        ).strip()

        try:
            parsed = sqlparse.parse(sql)[0]
            stmt_type = (parsed.get_type() or "").upper()
            logger.info(f"ℹ️ Detected Statement Type: {stmt_type or 'UNKNOWN'}")
        except Exception as e:
            logger.error(f"SQL Parsing Error: {e}")
            raise ValueError("Invalid SQL syntax.")

        # If sqlparse couldn't determine the type, fall back to checking
        # the first keyword of the stripped SQL. This handles CTEs (WITH ... SELECT),
        # queries with leading comments, and other valid SELECT patterns.
        if not stmt_type or stmt_type == "UNKNOWN":
            normalized = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)  # strip block comments
            normalized = re.sub(r'--[^\n]*', '', normalized)              # strip line comments
            first_word = normalized.strip().split()[0].upper() if normalized.strip() else ""
            if first_word in ("SELECT", "WITH"):
                stmt_type = "SELECT"
                logger.info(f"Fallback detection: first keyword is {first_word}, treating as SELECT")
            else:
                logger.warning(f"Security Alert: Could not confirm SELECT. First keyword: {first_word}")
                raise ValueError(
                    f"Security Alert: Only SELECT statements are allowed. Detected: {first_word or 'UNKNOWN'}"
                )

        if stmt_type != "SELECT":
            logger.warning(f"Security Alert: Blocked {stmt_type} statement.")
            raise ValueError(
                f"Security Alert: Only SELECT statements are allowed. Detected: {stmt_type}"
            )

        forbidden_patterns = [
            r"\bDROP\b", r"\bDELETE\b", r"\bTRUNCATE\b", r"\bINSERT\b",
            r"\bUPDATE\b", r"\bGRANT\b", r"\bALTER\b", r"\bEXEC\b", r"\bCREAT\b",
        ]

        upper_sql = sql.upper()

        for pattern in forbidden_patterns:
            if re.search(pattern, upper_sql):
                match = re.search(pattern, upper_sql)
                detected_word = match.group(0)
                logger.error(
                    f"🚨 Security Alert: Destructive keyword '{detected_word}' found in query."
                )
                logger.error(f"   Query was: {sql}")
                raise ValueError(
                    f"Security Alert: destructive keyword detected: {detected_word}"
                )

        logger.info("✅ SQL Passed Validation.")
        return sql

    def _execute_sync(self, sql: str, connection_model, max_rows: int = None):
        """
        Execute the query inside a SAVEPOINT for safety.
        All queries run within a transaction that is rolled back after reading,
        ensuring zero side-effects on the client database.
        """
        max_rows = max_rows or self.DEFAULT_MAX_ROWS
        logger.info(
            f"🚀 Executing Query on DB: {connection_model.name} "
            f"(Host: {connection_model.host}, max_rows: {max_rows})"
        )

        engine = client_db_manager.get_engine(connection_model)

        try:
            with engine.connect() as conn:
                # Begin explicit transaction
                trans = conn.begin()

                try:
                    # Set statement timeout
                    if connection_model.db_type == "postgres":
                        conn.execute(
                            text(f"SET statement_timeout = {self.DEFAULT_TIMEOUT_MS};")
                        )
                        # Force read-only transaction for extra safety
                        conn.execute(text("SET TRANSACTION READ ONLY;"))

                    # Create a SAVEPOINT before execution
                    conn.execute(text("SAVEPOINT intelliquery_safe;"))
                    logger.info("📌 SAVEPOINT created.")

                    result = conn.execute(text(sql))
                    keys = list(result.keys())
                    rows = result.fetchmany(max_rows)
                    data = [dict(zip(keys, row)) for row in rows]

                    logger.info(f"✅ Query Success. Fetched {len(data)} rows.")

                    conn.execute(text("RELEASE SAVEPOINT intelliquery_safe;"))

                    trans.rollback()

                    return data

                except Exception as e:
                    try:
                        conn.execute(
                            text("ROLLBACK TO SAVEPOINT intelliquery_safe;")
                        )
                        logger.info("⏪ Rolled back to SAVEPOINT.")
                    except Exception:
                        pass
                    trans.rollback()
                    raise e

        except Exception as e:
            logger.error(
                f" Database Execution Error on {connection_model.name}: {str(e)}"
            )
            logger.error(f"   Failed SQL: {sql}")
            raise Exception(f"Database Execution Error: {str(e)}")

    async def run_query(self, sql: str, connection_model, max_rows: int = None):
        """
        Async wrapper for safe SQL execution.
        """
        cleaned_sql = self.validate_query(sql)
        return await run_in_threadpool(
            self._execute_sync, cleaned_sql, connection_model, max_rows
        )