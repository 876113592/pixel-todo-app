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
    print(f"🚀 Starting Pixel Todo App on port {port}")
    print(f"🌐 Environment: {os.environ.get('ENVIRONMENT', 'development')}")

    # Debug port info
    all_ports = [key for key in os.environ.keys() if 'PORT' in key.upper()]
    for port_key in all_ports:
        print(f"📍 {port_key}: {os.environ.get(port_key)}")

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")