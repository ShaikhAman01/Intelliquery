import re
import time
import asyncio
from typing import List, Dict, Optional

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.core import DbConnection, QueryHistory, User
from app.middleware.auth import get_current_user, require_viewer
from app.pipeline.nlp_processor import NLPProcessor
from app.pipeline.template_engine import DynamicSQLGenerator
from app.pipeline.llm_fallback import LLMService
from app.pipeline.schema_mapper import SchemaMapper
from app.pipeline.schema_selector import select_relevant_tables
from app.executor.sql_runner import SQLRunner
from app.core.logger import logger

router = APIRouter()

# ── Schema-validation helpers ─────────────────────────────────────────────────

# Errors from Postgres and MySQL that mean a table or column name doesn't exist.
_SCHEMA_ERROR_PATTERNS = [
    r'relation ".+?" does not exist',          # PG: unknown table
    r'column ".+?" does not exist',            # PG: unknown column
    r'column .+? does not exist',              # PG variant (unquoted)
    r"table .+? doesn't exist",               # MySQL: unknown table
    r'unknown column',                         # MySQL: unknown column
    r'no such table',                          # SQLite
    r'no such column',                         # SQLite
]


def _is_schema_error(error_msg: str) -> bool:
    """Return True when a DB error is caused by a hallucinated table/column name."""
    msg = error_msg.lower()
    return any(re.search(p, msg, re.IGNORECASE) for p in _SCHEMA_ERROR_PATTERNS)


def _extract_cte_names(sql: str) -> set:
    """Extract CTE alias names so they are not treated as real table references."""
    # Matches: WITH cte_name AS ( ...
    return {m.lower() for m in re.findall(r'\b(\w+)\s+AS\s*\(', sql, re.IGNORECASE)}


def _unknown_tables_in_sql(sql: str, schema: dict) -> list:
    """
    Parse FROM / JOIN clauses and return table names that don't exist in schema.
    CTE aliases and subquery wrappers are excluded to prevent false positives.
    Returns an empty list when every reference is valid (or unparseable).
    """
    cte_names = _extract_cte_names(sql)
    known = {t.lower() for t in schema}

    # Match FROM/JOIN <optional-quote><identifier><optional-quote>
    # The word-char requirement means subquery wrappers `FROM (SELECT` never match.
    found = re.findall(r'(?:FROM|JOIN)\s+"?(\w+)"?', sql, re.IGNORECASE)
    return [t for t in found if t.lower() not in cte_names and t.lower() not in known]


# ── Core execution services ───────────────────────────────────────────────────

# Instantiate core execution services
nlp = NLPProcessor()
schema_mapper = SchemaMapper()
dynamic_gen = DynamicSQLGenerator()
llm = LLMService()
executor = SQLRunner()


def _get_conversation_context(db: Session, user_id: str, connection_id: int, limit: int = 5) -> List[Dict[str, str]]:
    """Fetch recent valid query history for context-aware prompting."""
    try:
        recent = (
            db.query(QueryHistory)
            .filter(
                QueryHistory.user_id == user_id,
                QueryHistory.connection_id == connection_id,
                QueryHistory.execution_status == "SUCCESS",
            )
            .order_by(QueryHistory.timestamp.desc())
            .limit(limit)
            .all()
        )
        return [
            {"question": h.user_question, "sql": h.generated_sql}
            for h in reversed(recent)
        ]
    except Exception as e:
        logger.error(f"Failed to query conversation history context: {str(e)}")
        return []


@router.post("/generate", status_code=status.HTTP_200_OK)
async def process_query(
    user_query: str,
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    # ── 1. Tenant Connection Validation ──────────────────────────────────────
    connection = db.query(DbConnection).filter(DbConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database connection parameters not found.")

    # Enforce organizational workspace boundaries
    if connection.user_id != current_user.id:
        if not connection.org_id or connection.org_id != current_user.org_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this connection instance.")

    if not connection.cached_schema:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Schema map empty. Please re-sync connection catalog.")

    # ── 2. Schema selection + context building ────────────────────────────────
    # Filter to only the tables relevant to this query before sending to LLM.
    # The template engine always uses the full schema for table resolution;
    # only the LLM prompt uses the filtered subset.
    full_schema = connection.cached_schema
    relevant_schema = select_relevant_tables(user_query, full_schema)
    total_tables = len(full_schema)
    selected_tables = len(relevant_schema)
    if selected_tables < total_tables:
        logger.info(f"Schema selection: {selected_tables}/{total_tables} tables selected for query.")

    schema_str = schema_mapper.get_context_string(relevant_schema)
    real_schema_map = {"tables": full_schema}  # template engine uses full schema for resolution

    # ── 3. Query Compilation ──────────────────────────────────────────────────
    nlp_result = nlp.process(user_query)
    sql_query = None
    source = "UNKNOWN"

    # Attempt rule-based routing for basic expressions
    if not nlp_result.get("is_complex", True):
        try:
            logger.info("Evaluating match query against Dynamic Template engine rules...")
            sql_query = dynamic_gen.generate(nlp_result, real_schema_map)
            if sql_query:
                source = "DYNAMIC"
        except Exception as e:
            logger.warn(f"Deterministic dynamic compilation bypassed: {str(e)}")

    # LLM fallback path for deep relational evaluation
    if not sql_query:
        logger.info("Routing query request parsing window down to LLM Fallback pipeline.")
        conversation_history = _get_conversation_context(db, current_user.id, connection_id)
        
        try:
            sql_query = await llm.fallback_generate_sql(
                user_query, schema_str, connection.db_type,
                conversation_history=conversation_history,
            )
            source = "LLM_FALLBACK"
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, 
                detail=f"AI SQL generation pipeline failed: {str(e)}"
            )

    if not sql_query:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Could not parse an executable SQL statement.")

    # ── 4a. Pre-execution table validation (LLM output only) ─────────────────
    # Check FROM/JOIN references against the full schema before hitting the DB.
    # Catches hallucinated table names immediately, saving a round-trip.
    if source == "LLM_FALLBACK":
        unknown = _unknown_tables_in_sql(sql_query, full_schema)
        if unknown:
            logger.warning(f"Pre-exec validation: SQL references unknown tables {unknown} — attempting repair.")
            try:
                sql_query = await llm.repair_sql(
                    sql_query,
                    f"The following tables do not exist in the schema: {unknown}",
                    user_query,
                    schema_str,
                    connection.db_type,
                )
                source = "LLM_REPAIRED"
                logger.info("Pre-exec repair succeeded.")
            except Exception as repair_err:
                logger.error(f"Pre-exec repair failed: {repair_err}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"SQL generation failed: referenced tables {unknown} do not exist in schema.",
                )

    # ── 4b. Isolated Query Execution ─────────────────────────────────────────
    execution_status = "SUCCESS"
    error_msg = None
    data = []
    start_time = time.time()
    max_rows = nlp_result.get("limit") or executor.DEFAULT_MAX_ROWS

    try:
        data = await executor.run_query(sql_query, connection, max_rows=max_rows)
    except Exception as e:
        raw_error = str(e)

        # Attempt one-shot repair when the DB reports a missing table/column
        # and the SQL came from the LLM (not user edits or the template engine).
        if source in ("LLM_FALLBACK", "LLM_REPAIRED") and _is_schema_error(raw_error):
            logger.warning(f"Post-exec schema error detected — attempting repair: {raw_error}")
            try:
                repaired_sql = await llm.repair_sql(
                    sql_query, raw_error, user_query, schema_str, connection.db_type
                )
                data = await executor.run_query(repaired_sql, connection, max_rows=max_rows)
                sql_query = repaired_sql
                source = "LLM_REPAIRED"
                logger.info("Post-exec repair succeeded.")
            except Exception as repair_err:
                execution_status = "ERROR"
                error_msg = raw_error   # surface the original DB error, not the repair error
                logger.error(f"Post-exec repair also failed: {repair_err}")
        else:
            execution_status = "ERROR"
            error_msg = raw_error
            logger.error(f"Query execution failed: {raw_error}")

    execution_time_ms = int((time.time() - start_time) * 1000)

    # ── 5. Log Execution Telemetry (Asynchronous Commit Guard) ────────────────
    history_entry = QueryHistory(
        connection_id=connection.id,
        user_id=current_user.id,
        user_question=user_query,
        generated_sql=sql_query,
        generation_source=source,
        execution_status=execution_status,
        execution_time_ms=execution_time_ms,
        row_count=len(data) if data else 0,
    )
    
    try:
        db.add(history_entry)
        db.commit()
    except Exception as db_err:
        db.rollback()
        logger.error(f"Failed to record operational telemetry transaction entry: {str(db_err)}")

    # Fail early if database run errored out
    if execution_status == "ERROR":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # ── 6. High-Performance Concurrent Post-Processing ───────────────────────
    # We pack all independent AI inferences into a single execution thread loop using asyncio.gather
    columns = list(data[0].keys()) if data else []
    
    insights_task = llm.generate_insights(user_query, data)
    chart_task = llm.recommend_chart_type(columns, data, user_query)
    explain_task = llm.explain_query(sql_query, user_query, connection.db_type)

    try:
        insights, chart_rec, explanation = await asyncio.gather(
            insights_task,
            chart_task,
            explain_task,
            return_exceptions=True
        )
        
        # Normalize response parameters if any parallel task hit an exception
        if isinstance(insights, Exception): insights = "Insights computation timed out."
        if isinstance(chart_rec, Exception): chart_rec = {"chart_type": "table"}
        if isinstance(explanation, Exception): explanation = "Query interpretation unavailable."
        
    except Exception as gather_err:
        logger.error(f"Asynchronous post-processing pool hit an execution bottleneck: {str(gather_err)}")
        insights, chart_rec, explanation = "Analysis offline.", {"chart_type": "table"}, "Unavailable."

    return {
        "query_source": source,
        "sql": sql_query,
        "data": data,
        "nlp_debug": nlp_result,
        "visualization": insights,
        "chart_recommendation": chart_rec,
        "explanation": explanation,
        "history_id": history_entry.id,
        "execution_time_ms": execution_time_ms,
    }


@router.post("/execute", status_code=status.HTTP_200_OK)
async def execute_raw_sql(
    sql: str,
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Execute a raw SQL statement directly, bypassing AI generation."""
    connection = db.query(DbConnection).filter(DbConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    if connection.user_id != current_user.id:
        if not connection.org_id or connection.org_id != current_user.org_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this connection.")

    start_time = time.time()
    try:
        data = await executor.run_query(sql, connection)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    execution_time_ms = int((time.time() - start_time) * 1000)

    history_entry = QueryHistory(
        connection_id=connection.id,
        user_id=current_user.id,
        user_question="[Edited SQL]",
        generated_sql=sql,
        generation_source="USER_EDIT",
        execution_status="SUCCESS",
        execution_time_ms=execution_time_ms,
        row_count=len(data) if data else 0,
    )
    try:
        db.add(history_entry)
        db.commit()
    except Exception:
        db.rollback()

    return {"data": data, "execution_time_ms": execution_time_ms}


@router.post("/explain", status_code=status.HTTP_200_OK)
async def explain_query(
    sql: str,
    user_question: str = "",
    db_type: str = "postgres",
    current_user: User = Depends(require_viewer),
):
    """
    Explain any SQL query in plain natural language.
    Standalone endpoint — doesn't execute the query.
    """
    try:
        explanation = await llm.explain_query(sql, user_question, db_type)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))