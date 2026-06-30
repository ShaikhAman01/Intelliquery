import time
import asyncio
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Depends, status
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

# Instantiate core execution services
nlp = NLPProcessor()
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


def _build_schema_context_string(cached_schema: Any) -> str:
    """
    Safely builds an explicit schema map prompt string for the LLM.
    Handles both updated dictionary formats and legacy list formats.
    """
    if not cached_schema:
        return ""
        
    schema_str_parts = []
    
    # Handle the upgraded high-performance dictionary layout
    if isinstance(cached_schema, dict):
        for table, columns_map in cached_schema.items():
            col_details_list = []
            for col_name, col_meta in columns_map.items():
                # Extract structural parameters safely with fallback metrics
                c_type = col_meta.get("type", "unknown") if isinstance(col_meta, dict) else str(col_meta)
                c_pk = col_meta.get("is_pk", False) if isinstance(col_meta, dict) else False
                c_fk = col_meta.get("fk_target", None) if isinstance(col_meta, dict) else None
                
                badges = []
                if c_pk:
                    badges.append("PK")
                if c_fk:
                    badges.append(f"FK -> {c_fk}")
                    
                badge_str = f" [{', '.join(badges)}]" if badges else ""
                col_details_list.append(f'"{col_name}" ({c_type}{badge_str})')
                
            col_details = ", ".join(col_details_list)
            schema_str_parts.append(f'Table "{table}": ({col_details})')
            
    # Fallback to handle old array-of-objects list formats seamlessly
    elif isinstance(cached_schema, list):
        for table_obj in cached_schema:
            table = table_obj.get("name", "unknown")
            cols = table_obj.get("columns", [])
            col_details = ", ".join([f'"{c["name"]}" ({c.get("type", "unknown")})' for c in cols])
            schema_str_parts.append(f'Table "{table}": ({col_details})')
            
    return "\n".join(schema_str_parts)


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

    # ── 2. Parse Schema Context (Fixed for Dictionary Layout) ────────────────
    schema_str = _build_schema_context_string(connection.cached_schema)
    real_schema_map = {"tables": connection.cached_schema}

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