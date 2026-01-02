from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/test", tags=["Test"])

@router.get("/tables")
async def list_tables(db: AsyncSession = Depends(get_db)):
    query = """
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    """
    result = await db.execute(text(query))
    return result.scalars().all()
