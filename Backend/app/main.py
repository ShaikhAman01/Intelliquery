from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import query
from app.api import test_query

app = FastAPI(
    title="IntelliQuery - NL to SQL",
    description="AI-powered natural language interface to databases",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test_query.router)
app.include_router(query.router)

@app.get("/")
def root():
    return {
        "message": "IntelliQuery API",
        "docs": "/docs",
        "health": "/test/tables"
    }