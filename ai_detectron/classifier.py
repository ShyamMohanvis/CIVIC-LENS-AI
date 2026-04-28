import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os
import cv2

class CivicClassifier:
    def __init__(self, model_path='civic_model.pth', classes_path='classes.txt'):
        self.device = torch.device("cpu")
        self.model_loaded = False
        self.class_names = []
        
        try:
            # Load classes
            if os.path.exists(classes_path):
                with open(classes_path, 'r') as f:
                    self.class_names = f.read().splitlines()
            else:
                self.class_names = ["encroachment", "garbage", "garbage_dumping", "infrastructure", "pothole", "road_damage"]
                
            # Initialize model
            self.model = models.efficientnet_b0(weights=None)
            num_ftrs = self.model.classifier[1].in_features
            self.model.classifier[1] = nn.Linear(num_ftrs, len(self.class_names))
            
            if os.path.exists(model_path):
                self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
                self.model.eval()
                self.model.to(self.device)
                self.model_loaded = True
                print("Success: EfficientNet civic classifier loaded successfully.")
            else:
                print(f"Warning: Model weights not found at {model_path}.")
        except Exception as e:
            print(f"Failed to load model: {e}")
            
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        
    def predict(self, image_bgr):
        if not self.model_loaded:
            return "unknown", 0.0
            
        # Convert CV2 BGR to PIL RGB
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(image_rgb)
        
        input_tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            top_prob, top_class_idx = torch.max(probabilities, 0)
            
        confidence = float(top_prob.item())
        predicted_class = self.class_names[top_class_idx.item()]
        
        return predicted_class, confidence

# Singleton instance
classifier_instance = None

def get_classifier():
    global classifier_instance
    if classifier_instance is None:
        classifier_instance = CivicClassifier()
    return classifier_instance
