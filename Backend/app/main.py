from fastapi import FastAPI

app = FastAPI(title="IntelliQuery")

@app.get("/")
async def root():
    return {"status": "ok"}
