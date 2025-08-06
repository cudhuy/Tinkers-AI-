import uvicorn
from fastapi import FastAPI

from routes.main import api_router

app = FastAPI()

app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Hello World"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
