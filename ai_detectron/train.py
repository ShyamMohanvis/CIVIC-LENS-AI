import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
import os

def train_model():
    data_dir = 'dataset'
    
    # Check if dataset exists
    if not os.path.exists(data_dir):
        print("Dataset not found. Please run dataset_download.py first.")
        return

    # Transformations for EfficientNet
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    image_datasets = {x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x]) for x in ['train', 'val']}
    dataloaders = {x: torch.utils.data.DataLoader(image_datasets[x], batch_size=4, shuffle=True) for x in ['train', 'val']}
    class_names = image_datasets['train'].classes
    print(f"Loaded {len(class_names)} classes: {class_names}")

    device = torch.device("cpu")

    # Load EfficientNet B0 (pretrained on ImageNet)
    print("Loading pretrained EfficientNet-B0...")
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    
    # Freeze base model weights
    for param in model.parameters():
        param.requires_grad = False
        
    # Replace top classifier head for our number of classes
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, len(class_names))

    model = model.to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=0.001)

    print("Training model (1 epoch for demo)...")
    model.train()
    for inputs, labels in dataloaders['train']:
        inputs, labels = inputs.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
    print("Saving model weights...")
    torch.save(model.state_dict(), 'civic_model.pth')
    
    # Save classes list so inference script knows the mapping
    with open('classes.txt', 'w') as f:
        f.write('\n'.join(class_names))
        
    print("Success: Training complete. artifacts saved to civic_model.pth and classes.txt.")

if __name__ == '__main__':
    train_model()
