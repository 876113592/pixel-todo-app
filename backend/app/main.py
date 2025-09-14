from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from starlette.responses import Response
from starlette.types import Scope, Receive, Send
from .api import todos
from .database import engine, Base
import os
import mimetypes

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Pixel Todo API",
    description="A pixel-art style todo app API",
    version="1.0.0"
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(todos.router, prefix="/api", tags=["todos"])

class UTF8StaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set UTF-8 encoding for text files
        mimetypes.add_type('text/html', '.html')
        mimetypes.add_type('text/css', '.css')
        mimetypes.add_type('application/javascript', '.js')
        mimetypes.add_type('application/json', '.json')

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)

        # Add UTF-8 charset to text content types
        if hasattr(response, 'headers') and 'content-type' in response.headers:
            content_type = response.headers['content-type']
            if any(text_type in content_type for text_type in ['text/', 'application/javascript', 'application/json']):
                if 'charset' not in content_type:
                    response.headers['content-type'] = f"{content_type}; charset=utf-8"

        return response

# Serve static files (frontend) with UTF-8 encoding
frontend_dir = os.getenv("FRONTEND_DIR", "../frontend")
if not os.path.exists(frontend_dir):
    # Try different paths for Railway deployment
    frontend_dir = "frontend"
    if not os.path.exists(frontend_dir):
        frontend_dir = "./frontend"

app.mount("/", UTF8StaticFiles(directory=frontend_dir, html=True), name="static")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Pixel Todo API is running"}