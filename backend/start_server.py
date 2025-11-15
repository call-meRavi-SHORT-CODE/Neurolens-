#!/usr/bin/env python3
"""
Startup script for the NeuroLens FastAPI backend server
"""

import uvicorn
import os
import sys

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("Starting NeuroLens Risk Assessment API...")
    print("Backend will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")
    print("Loading models... This may take a moment on first startup.")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload for development
        log_level="info",
        access_log=True,  # Enable access logging
        workers=1  # Single worker to avoid model loading issues
    )
