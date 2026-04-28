"""
Civic Lens AI — Detectron2 Civic Issue Detection Service
=========================================================
Port  : 8001
Purpose: Analyse citizen-uploaded images for civic issues (potholes,
         garbage, road damage, encroachment, infrastructure faults).

Runs alongside the existing YOLO accident service (port 8000).
DO NOT modify ai_service/ — these are two independent pipelines.

Endpoints:
  GET  /              Health check + model status
  POST /detect        Analyse a single image
  GET  /labels        List all supported civic labels
"""

import os
import io
import logging
import numpy as np
import cv2

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from model import run_inference
from classifier import get_classifier
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── NodeJS backend URL for async event push ─────────────────────────
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

# ─── Civic label → friendly name + department mapping ────────────────
CIVIC_LABEL_META = {
    "pothole":           {"display": "Pothole / Road Damage",   "department": "Public Works Department", "severity": "medium"},
    "road_damage":       {"display": "Road Surface Damage",     "department": "Public Works Department", "severity": "medium"},
    "road_obstruction":  {"display": "Road Obstruction",        "department": "Traffic Police",          "severity": "high"},
    "garbage":           {"display": "Garbage / Littering",     "department": "Waste Management",        "severity": "low"},
    "garbage_dumping":   {"display": "Illegal Garbage Dumping", "department": "Waste Management",        "severity": "medium"},
    "encroachment":      {"display": "Encroachment",            "department": "Municipal Corporation",   "severity": "medium"},
    "infrastructure":    {"display": "Infrastructure Issue",    "department": "Urban Development",       "severity": "medium"},
    "unknown":           {"display": "Unknown Issue",           "department": "Municipal Corporation",   "severity": "low"},
}

app = FastAPI(
    title="Civic Lens — Detectron2 Civic Issue Detector",
    description="Analyses citizen-uploaded images for civic issues using Mask R-CNN + CV2 fallback.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health check ─────────────────────────────────────────────────────
@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "Civic Lens Detectron2",
        "model": "efficientnet_b0",
        "detectron2_loaded": get_classifier().model_loaded,
        "load_error": None if get_classifier().model_loaded else "Model weights not found."
    }


# ─── Label catalogue ─────────────────────────────────────────────────
@app.get("/labels")
def get_labels():
    """Returns all supported civic issue labels with metadata."""
    return {"labels": CIVIC_LABEL_META}


# ─── Main detection endpoint ─────────────────────────────────────────
@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    """
    Accepts an image (JPEG or PNG) and returns:
    - Raw COCO detections (class, confidence, bounding box)
    - Civic issue classification (pothole / garbage / road damage / etc.)
    - Department routing suggestion
    - Severity level

    Used by the Node.js backend when a citizen submits a complaint with image.
    """
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {file.content_type}. Use image/jpeg or image/png."
        )

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB).")

    # Decode image
    np_arr = np.frombuffer(contents, np.uint8)
    image  = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=422, detail="Could not decode image. File may be corrupt.")

    logger.info(f"📸 Analysing image: {file.filename} ({image.shape[1]}×{image.shape[0]}px)")

    # Run inference (Detectron2 or CV2 stub)
    result = run_inference(image)

    # Build civic meta
    civic_label = result.get("civic_classification", "unknown")
    civic_meta  = CIVIC_LABEL_META.get(civic_label, CIVIC_LABEL_META["unknown"])

    response = {
        "filename": file.filename,
        "image_size": {"width": image.shape[1], "height": image.shape[0]},
        "inference_mode": result["mode"],
        "detectron2_available": get_classifier().model_loaded,

        # ── Raw detection results ──
        "detections": result["detections"],
        "detection_count": result["detection_count"],

        # ── Civic classification ──
        "civic": {
            "label":       civic_label,
            "display":     civic_meta["display"],
            "confidence":  result["civic_confidence"],
            "department":  civic_meta["department"],
            "severity":    civic_meta["severity"],
        },

        # ── Backend hint for DB storage ──
        "suggested_category": civic_label,
        "suggested_department": civic_meta["department"],
    }

    logger.info(
        f"✅ Result: {civic_label} ({result['civic_confidence']:.0%} confidence) "
        f"via {result['mode']}"
    )
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
