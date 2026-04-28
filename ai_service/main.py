import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import requests
from inference import detect_accident

# Known CCTV camera feeds with their geo-coordinates
CAMERA_REGISTRY = [
    {"id": "cam-001", "name": "MG Road Junction",      "lat": 26.8467, "lng": 80.9462, "active": True},
    {"id": "cam-002", "name": "Hazratganj Circle",     "lat": 26.8553, "lng": 80.9478, "active": True},
    {"id": "cam-003", "name": "Charbagh Station",     "lat": 26.8380, "lng": 80.9090, "active": True},
    {"id": "cam-004", "name": "Gomti Nagar Flyover",  "lat": 26.8600, "lng": 81.0100, "active": True},
    {"id": "cam-005", "name": "Alambagh Bus Stand",   "lat": 26.8018, "lng": 80.9095, "active": False},
]

app = FastAPI(title="Civic Lens AI 2.0 - Inference Service")

# Allow all origins for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Civic Lens AI"}

@app.get("/cameras")
def list_cameras():
    """Returns the list of registered CCTV cameras and their geo-coordinates."""
    return {"cameras": CAMERA_REGISTRY}


@app.post("/detect/frame")
async def process_frame(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    camera_id: Optional[str] = Form(None)
):
    """
    Receives an image frame, runs YOLOv8 accident detection on it.
    Accepts optional latitude, longitude, and camera_id form fields.
    Falls back to the camera registry or default Lucknow coords when not provided.
    If an accident is detected, sends the event to the Node.js backend.
    """
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid image type. Use image/jpeg or image/png.")

    # Resolve location: form field → camera registry → default coords
    resolved_lat = latitude
    resolved_lng = longitude

    if resolved_lat is None or resolved_lng is None:
        if camera_id:
            cam = next((c for c in CAMERA_REGISTRY if c["id"] == camera_id), None)
            if cam:
                resolved_lat = cam["lat"]
                resolved_lng = cam["lng"]

    # Absolute fallback
    if resolved_lat is None:
        resolved_lat = 26.8467  # Default: Lucknow
    if resolved_lng is None:
        resolved_lng = 80.9462

    # Read image bytes and run inference
    contents = await file.read()
    result = detect_accident(contents)

    meta = {
        "camera_id": camera_id,
        "latitude": resolved_lat,
        "longitude": resolved_lng,
        "location_source": "form" if latitude else ("registry" if camera_id else "default")
    }

    # If high severity accident detected, trigger backend
    if result["detected"] and result["severity"] == "high":
        try:
            payload = {
                "type": "accident",
                "severity": result["severity"],
                "confidence": result["confidence"],
                "latitude": resolved_lat,
                "longitude": resolved_lng,
                "cameraId": camera_id
            }
            res = requests.post(f"{BACKEND_URL}/api/events/accident", json=payload, timeout=5)
            return {
                "status": "accident_detected",
                "backend_triggered": res.status_code == 200,
                "data": result,
                "meta": meta
            }
        except Exception as e:
            return {
                "status": "accident_detected",
                "backend_triggered": False,
                "error": str(e),
                "data": result,
                "meta": meta
            }

    return {"status": "no_high_severity_accident", "data": result, "meta": meta}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
