import time

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.core import DbConnection, QueryHistory, User
from app.middleware.auth import get_current_user, require_viewer
from app.pipeline.nlp_processor import NLPProcessor
from app.pipeline.template_engine import DynamicSQLGenerator
from app.pipeline.llm_fallback import LLMService
from app.executor.sql_runner import SQLRunner
from app.core.logger import logger

router = APIRouter()

nlp = NLPProcessor()
dynamic_gen = DynamicSQLGenerator()
llm = LLMService()
executor = SQLRunner()


def _get_conversation_context(db: Session, user_id: str, connection_id: int, limit: int = 5) -> list:
    """Fetch recent query history for context-aware prompting."""
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
    # Reverse so oldest is first (chronological order)
    return [
        {"question": h.user_question, "sql": h.generated_sql}
        for h in reversed(recent)
    ]


@router.post("/generate")
async def process_query(
    user_query: str,
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    # ── 1. Validate connection ownership ─────────────────────────────────
    connection = db.query(DbConnection).filter(DbConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found.")

    if connection.user_id != current_user.id:
        if connection.org_id and connection.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="You don't have access to this connection.")

    if not connection.cached_schema:
        raise HTTPException(status_code=400, detail="Schema not ready. Please re-sync connection.")

    # ── 2. Prepare schema context ────────────────────────────────────────
    real_schema_map = {"tables": connection.cached_schema}
    schema_str_parts = []
    for table, cols in connection.cached_schema.items():
        col_details = ", ".join([f'"{c["name"]}" ({c.get("type", "unknown")})' for c in cols])
        schema_str_parts.append(f'Table "{table}": ({col_details})')
    schema_str = "\n".join(schema_str_parts)

    # ── 3. NLP Processing ────────────────────────────────────────────────
    nlp_result = nlp.process(user_query)

    sql_query = None
    source = "UNKNOWN"

    # 3a. Attempt Dynamic Generation (Rule-based)
    if not nlp_result["is_complex"]:
        logger.info("Attempting Dynamic SQL Generation...")
        sql_query = dynamic_gen.generate(nlp_result, real_schema_map)
        if sql_query:
            source = "DYNAMIC"

    # 3b. Fallback to LLM (with conversation context)
    if not sql_query:
        reason = "COMPLEX_FLAG" if nlp_result["is_complex"] else "DYNAMIC_FAILED"
        logger.info(f"Routing to LLM ({reason}).")

        # Fetch conversation context for context-aware generation
        conversation_history = _get_conversation_context(
            db, current_user.id, connection_id
        )

        sql_query = await llm.fallback_generate_sql(
            user_query, schema_str, connection.db_type,
            conversation_history=conversation_history,
        )
        source = "LLM_FALLBACK"

    # ── 4. Secure Execution ──────────────────────────────────────────────
    execution_status = "SUCCESS"
    error_msg = None
    data = []
    start_time = time.time()

    try:
        max_rows = nlp_result.get("limit") or executor.DEFAULT_MAX_ROWS
        data = await executor.run_query(sql_query, connection, max_rows=max_rows)
    except Exception as e:
        execution_status = "ERROR"
        error_msg = str(e)
        logger.error(f"Execution failed: {error_msg}")

    execution_time_ms = int((time.time() - start_time) * 1000)

    # ── 5. Save History ──────────────────────────────────────────────────
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
    db.add(history_entry)
    db.commit()

    if execution_status == "ERROR":
        raise HTTPException(status_code=400, detail=error_msg)

    # ── 6. Insights + Chart Recommendation ───────────────────────────────
    insights = await llm.generate_insights(user_query, data)

    # Heuristic chart recommendation (fast, no LLM call)
    columns = list(data[0].keys()) if data else []
    chart_rec = await llm.recommend_chart_type(columns, data, user_query)

    # Explanation (async, non-blocking)
    explanation = await llm.explain_query(sql_query, user_query, connection.db_type)

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


@router.post("/explain")
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
    explanation = await llm.explain_query(sql, user_question, db_type)
    return {"explanation": explanation}