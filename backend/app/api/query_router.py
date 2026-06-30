import re
import time
import decimal
import datetime
import asyncio
from collections import Counter
from typing import List, Dict, Optional, Any

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
from app.core.cache import sql_cache, result_cache, make_sql_key, make_result_key
from app.core.logger import logger

router = APIRouter()

# ── Result statistics ─────────────────────────────────────────────────────────

def _to_float(v: Any) -> float | None:
    """Convert a DB value to float, returning None if it isn't numeric."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, decimal.Decimal):
        return float(v)
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _to_str(v: Any) -> str | None:
    """Convert any DB value to a JSON-safe string."""
    if v is None:
        return None
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    if isinstance(v, decimal.Decimal):
        return str(float(v))
    return str(v)


def _compute_result_stats(data: List[Dict]) -> Dict:
    """
    Compute column-level statistics from the full query result set.

    Instead of sending raw rows to the LLM (max 5 rows → hallucinated stats),
    we pre-compute exact numbers here and send those instead.  The LLM receives
    real min/max/mean/sum for numerics and real top-value frequencies for
    categoricals — grounding every insight in actual data.

    Returns a compact dict (serialisable via json.dumps) that fits in ~300 tokens
    regardless of how many rows the query returned.
    """
    if not data:
        return {"row_count": 0, "column_count": 0, "columns": [], "sample_rows": []}

    columns = list(data[0].keys())
    col_stats: list[Dict] = []

    for col in columns:
        values = [row.get(col) for row in data]
        non_null = [v for v in values if v is not None]
        null_count = len(values) - len(non_null)

        float_vals = [_to_float(v) for v in non_null]
        is_numeric = bool(float_vals) and all(f is not None for f in float_vals)

        stat: Dict[str, Any] = {
            "name": col,
            "null_count": null_count,
            "null_pct": round(null_count / len(values) * 100, 1) if values else 0,
            "distinct_count": len({_to_str(v) for v in non_null}),
        }

        if is_numeric:
            fv = [f for f in float_vals if f is not None]
            stat["type"] = "numeric"
            stat["min"]  = round(min(fv), 4)
            stat["max"]  = round(max(fv), 4)
            stat["mean"] = round(sum(fv) / len(fv), 4)
            stat["sum"]  = round(sum(fv), 4)
        else:
            str_vals = [_to_str(v) for v in non_null if v is not None]
            freq = Counter(str_vals)
            stat["type"] = "categorical"
            stat["top_values"] = [
                {"value": v, "count": c} for v, c in freq.most_common(5)
            ]

        col_stats.append(stat)

    # 3 representative rows, fully serialised to JSON-safe types
    sample = [{k: _to_str(v) for k, v in row.items()} for row in data[:3]]

    return {
        "row_count": len(data),
        "column_count": len(columns),
        "columns": col_stats,
        "sample_rows": sample,
    }


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

    # ── 3. SQL generation (with cache) ───────────────────────────────────────
    sql_query = None
    nlp_result: Dict = {}
    source = "UNKNOWN"

    sql_cache_key = make_sql_key(connection_id, user_query)
    cached_sql = sql_cache.get(sql_cache_key)

    if cached_sql:
        logger.info(f"SQL cache HIT for connection {connection_id}.")
        sql_query = cached_sql
        source = "SQL_CACHE"
    else:
        # NLP → template engine (fast path) → LLM fallback
        nlp_result = nlp.process(user_query)

        if not nlp_result.get("is_complex", True):
            try:
                logger.info("Evaluating query against template engine...")
                sql_query = dynamic_gen.generate(nlp_result, real_schema_map)
                if sql_query:
                    source = "DYNAMIC"
            except Exception as e:
                logger.warn(f"Template engine bypassed: {str(e)}")

        if not sql_query:
            logger.info("Routing to LLM fallback pipeline.")
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

        # Store in SQL cache so the next identical question skips NLP+LLM entirely.
        # We cache DYNAMIC and LLM results; LLM_REPAIRED is stored after repair below.
        if sql_query and source in ("DYNAMIC", "LLM_FALLBACK"):
            sql_cache.set(sql_cache_key, sql_query)

    if not sql_query:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Could not parse an executable SQL statement.")

    # ── 4a. Pre-execution table validation (LLM output only) ─────────────────
    # SQL_CACHE entries were validated before they were stored — skip re-check.
    if source == "LLM_FALLBACK":
        unknown = _unknown_tables_in_sql(sql_query, full_schema)
        if unknown:
            logger.warning(f"Pre-exec: SQL references unknown tables {unknown} — attempting repair.")
            try:
                sql_query = await llm.repair_sql(
                    sql_query,
                    f"The following tables do not exist in the schema: {unknown}",
                    user_query, schema_str, connection.db_type,
                )
                source = "LLM_REPAIRED"
                sql_cache.set(sql_cache_key, sql_query)   # cache the repaired SQL
                logger.info("Pre-exec repair succeeded.")
            except Exception as repair_err:
                logger.error(f"Pre-exec repair failed: {repair_err}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"SQL generation failed: referenced tables {unknown} do not exist in schema.",
                )

    # ── 4b. Query execution (with result cache) ───────────────────────────────
    execution_status = "SUCCESS"
    error_msg = None
    data = []
    start_time = time.time()
    max_rows = nlp_result.get("limit") or executor.DEFAULT_MAX_ROWS

    result_cache_key = make_result_key(connection_id, sql_query)
    cached_result = result_cache.get(result_cache_key)

    if cached_result is not None:
        logger.info(f"Result cache HIT for connection {connection_id}.")
        data = cached_result
        source = f"{source}+RCACHE"
    else:
        try:
            data = await executor.run_query(sql_query, connection, max_rows=max_rows)
            # Only cache non-empty results — empty results can be transient
            if data:
                result_cache.set(result_cache_key, data)
        except Exception as e:
            raw_error = str(e)

            # One-shot repair for schema errors from LLM-generated SQL
            if source in ("LLM_FALLBACK", "LLM_REPAIRED") and _is_schema_error(raw_error):
                logger.warning(f"Post-exec schema error — attempting repair: {raw_error}")
                try:
                    repaired_sql = await llm.repair_sql(
                        sql_query, raw_error, user_query, schema_str, connection.db_type
                    )
                    data = await executor.run_query(repaired_sql, connection, max_rows=max_rows)
                    sql_query = repaired_sql
                    source = "LLM_REPAIRED"
                    # Cache the working repaired SQL and its results
                    sql_cache.set(sql_cache_key, sql_query)
                    if data:
                        result_cache.set(make_result_key(connection_id, sql_query), data)
                    logger.info("Post-exec repair succeeded.")
                except Exception as repair_err:
                    execution_status = "ERROR"
                    error_msg = raw_error
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

    # ── 6. Post-processing ────────────────────────────────────────────────────
    columns = list(data[0].keys()) if data else []

    # Chart type is pure heuristics — no LLM call, resolves instantly.
    chart_rec = await llm.recommend_chart_type(columns, data, user_query)

    # Pre-compute exact statistics from the full result set, then fire one
    # combined LLM call for insights + explanation.  This replaces the previous
    # three parallel LLM calls (generate_insights, recommend_chart_type, explain_query)
    # with a single grounded call.
    result_stats = _compute_result_stats(data)
    try:
        combined = await llm.generate_insights_and_explanation(
            user_query, sql_query, result_stats, connection.db_type
        )
        explanation = combined.pop("explanation", "Query executed successfully.")
        insights = combined  # remainder is the insights dict
    except Exception as e:
        logger.error(f"Post-processing LLM call failed: {e}")
        explanation = "Query executed successfully."
        insights = {
            "summary": f"Returned {len(data):,} rows.",
            "key_patterns": [], "anomalies": [],
            "business_implications": "", "recommendations": [],
        }

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