# Pixel Todo App - Railway Entry Point
import sys
import os

# Add backend to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Import the FastAPI app
from backend.app.main import app

# Make app available for uvicorn
# This allows "uvicorn main:app" to work

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)