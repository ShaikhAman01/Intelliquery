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

    # ── 4. Isolated Query Execution ──────────────────────────────────────────
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
        logger.error(f"Isolated connection pipeline engine failure: {error_msg}")

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