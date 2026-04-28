import random
import time

def detect_accident(image_bytes: bytes) -> dict:
    """
    Simulates accident detection logic using YOLOv8 bounding boxes.
    Purely simulated for demo purposes to avoid Numpy/OpenCV compatibility issues 
    on bleeding-edge Python versions (like Python 3.14).
    """
    # Simulate processing delay
    time.sleep(1)
    
    return {
        "detected": True,
        "vehicles_count": random.randint(2, 4),
        "max_overlap_iou": round(random.uniform(0.5, 0.9), 2),
        "severity": "high",
        "confidence": 0.98
    }
