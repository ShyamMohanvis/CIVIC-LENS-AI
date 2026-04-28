import logging
import cv2
import numpy as np
import os
from classifier import get_classifier

logger = logging.getLogger(__name__)

# Fallback basic heuristics if the CNN model failed to load
def _stub_inference(image_bgr):
    """
    CV2-based civic issue classifier used as an absolute fallback.
    """
    h, w = image_bgr.shape[:2]
    total = h * w

    hsv  = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    # Signal extraction
    sat_var   = float(np.var(S)) / (128 ** 2)
    mean_sat  = float(np.mean(S)) / 255.0

    hue_hist  = np.histogram(H[S > 40], bins=12, range=(0, 180))[0].astype(float)
    hue_div   = float(np.sum(hue_hist > (total * 0.01))) / 12.0

    gray_mask = (S < 40) & (V > 70) & (V < 220)
    gray_dom  = float(np.count_nonzero(gray_mask)) / total

    blue_mask  = (H > 90) & (H < 130) & (S > 60)
    blue_ratio = float(np.count_nonzero(blue_mask)) / total

    green_mask = (H > 35) & (H < 85) & (S > 50)
    green_dom  = float(np.count_nonzero(green_mask)) / total

    # Per-category score
    scores = {}

    scores["garbage"] = (sat_var * 2.5 + hue_div * 2.0 + blue_ratio * 3.0 + mean_sat * 1.5)
    scores["pothole"] = (gray_dom * 2.5 + (1 - sat_var) * 1.0)
    scores["road_damage"] = (gray_dom * 2.0 + (1 - blue_ratio) * 0.5)
    scores["encroachment"] = (green_dom * 4.0 + (1 - gray_dom) * 1.0)

    winner    = max(scores, key=scores.get)
    scores_sorted = sorted(scores.values(), reverse=True)
    margin     = (scores_sorted[0] - scores_sorted[1]) / max(scores_sorted[0], 0.001)
    confidence = min(0.45 + margin * 0.40, 0.82)

    return winner, round(confidence, 3)

def run_inference(image_bgr):
    """
    Run EfficientNet-B0 inference on a BGR numpy image.
    Returns dict with civic classification.
    """
    classifier = get_classifier()
    
    if classifier.model_loaded:
        civic_label, civic_confidence = classifier.predict(image_bgr)
        mode = "efficientnet"
    else:
        # Fallback to heuristics
        civic_label, civic_confidence = _stub_inference(image_bgr)
        mode = "stub_cv2"

    return {
        "mode": mode,
        "detections": [], # Bounding boxes not supported in this image classification model
        "detection_count": 0,
        "civic_classification": civic_label,
        "civic_confidence": round(civic_confidence, 3),
        "load_error": None if classifier.model_loaded else "Model weights not found"
    }

# Load on module import
get_classifier()
