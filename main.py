# Simplified Pixel Todo App for Railway
import os
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app
app = FastAPI(title="Pixel Todo API")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple root endpoint
@app.get("/")
async def root():
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎮 Pixel Todo App</title>
        <style>
            body {
                font-family: 'Courier New', monospace;
                background: #1a1a1a;
                color: #00ff41;
                padding: 40px;
                text-align: center;
            }
            h1 { color: #8b5cf6; font-size: 2.5em; }
            p { font-size: 1.2em; margin: 20px 0; }
            a { color: #00ff41; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .status { background: #333; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <h1>🎮 Pixel Todo App</h1>
        <div class="status">
            <p>✅ API服务正在运行！</p>
            <p>🚀 部署成功到Railway云平台</p>
            <p>🌐 可以通过任何设备访问</p>
        </div>
        <p>📋 <a href="/api/health">健康检查</a></p>
        <p>📊 <a href="/docs">API文档</a></p>
    </body>
    </html>
    """)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Pixel Todo API is running successfully",
        "port": os.environ.get("PORT", "unknown"),
        "environment": os.environ.get("ENVIRONMENT", "unknown")
    }

# Run the app
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting Pixel Todo App on port {port}")
    print(f"🌐 Environment: {os.environ.get('ENVIRONMENT', 'development')}")

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")