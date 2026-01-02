from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class QueryRequest(BaseModel):
    """Request model for natural language query"""
    query: str
    database: str = "ecommerce" 
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "show all products",
                "database": "ecommerce"
            }
        }


class QueryResponse(BaseModel):
    """Response model for query results"""
    success: bool
    query: str
    sql: str
    results: List[Dict[str, Any]]
    row_count: int
    execution_time: float
    error: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "query": "show all products",
                "sql": "SELECT * FROM products LIMIT 10",
                "results": [
                    {"id": 1, "name": "iPhone 15", "price": 79999.00}
                ],
                "row_count": 10,
                "execution_time": 0.05,
                "error": None
            }
        }