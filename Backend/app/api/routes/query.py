from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.models.schemas import QueryRequest, QueryResponse
from core.database import get_db
from services.sql_generator import sql_generator
import time

router = APIRouter(prefix="/api/query", tags=["Query"])


@router.post("/", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db)
):

    start_time = time.time()
    
    try:
        sql = sql_generator.generate(request.query)
        
        if not sql:
            return QueryResponse(
                success=False,
                query=request.query,
                sql="",
                results=[],
                row_count=0,
                execution_time=0,
                error="Could not understand query. Try: 'show all products' or 'count users'"
            )
        
        result = await db.execute(text(sql))
        rows = result.mappings().all()
        
        results = [dict(row) for row in rows]
        
        execution_time = time.time() - start_time
        
        return QueryResponse(
            success=True,
            query=request.query,
            sql=sql,
            results=results,
            row_count=len(results),
            execution_time=round(execution_time, 3),
            error=None
        )
        
    except Exception as e:
        execution_time = time.time() - start_time
        return QueryResponse(
            success=False,
            query=request.query,
            sql=sql if 'sql' in locals() else "",
            results=[],
            row_count=0,
            execution_time=round(execution_time, 3),
            error=str(e)
        )