# debug_schema.py
from app.db.session import SessionLocal
from app.models.core import DbConnection

db = SessionLocal()
conn = db.query(DbConnection).filter(DbConnection.id == 15).first()

if conn:
    print(f"--- Debugging Connection {conn.id} ---")
    print(f"Name: {conn.name}")
    print(f"Host: {conn.host}")
    print(f"Cached Schema: {conn.cached_schema}") 
    
    if not conn.cached_schema:
        print("CRITICAL: Schema is EMPTY. The Mapper failed to find tables.")
    else:
        print("Schema found. The LLM should see these tables:")
        print(conn.cached_schema.keys())
else:
    print("Connection not found.")
db.close()