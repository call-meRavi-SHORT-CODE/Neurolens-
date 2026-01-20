# Model 1
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model
import torch
import torch.nn as nn
import timm
from PIL import Image
import torchvision.transforms as transforms
import cv2
import numpy as np
import torch
import torch.nn as nn
import timm





def predict_eye_stroke(img_path, model_path="models/eye_stroke.h5", class_names=["NORMAL", "RAO", "CRVO", "BRVO"]):
    """
    Load an image, preprocess, predict class using the given model,
    and return the scaled value.
    """
    # ---------------------------
    # Load model
    # ---------------------------
    model = load_model(model_path)
    
    # ---------------------------
    # Preprocess image
    # ---------------------------
    img = Image.open(img_path).convert('RGB')
    img = img.resize((128, 128))
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)  # batch dimension
    
    # ---------------------------
    # Predict
    # ---------------------------
    predictions = model.predict(img_array)
    predicted_class = class_names[np.argmax(predictions)]
    
    # ---------------------------
    # Map to scaled value
    # ---------------------------
    if strokeResults.retinal_occlusion_prob  == 0.1:
      return "Normal"
    elif strokeResults.retinal_occlusion_prob  ==  1.0:
      return  "RAO"
    elif strokeResults.retinal_occlusion_prob  == 0.8:
      return  "CRVO"
    elif strokeResults.retinal_occlusion_prob  == 0.5:
      return  "BRVO"
    else:
      return 0



# MODEL 2


def predict_cimt(eye_image_path, model_path="models/cimt_model.pth", eye_side='left', output_type='regression'):
    # ---------------------------
    # Define device
    # ---------------------------
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # ---------------------------
    # Define model architecture
    # ---------------------------
    class SiameseSeResNeXt(nn.Module):
        def __init__(self, dropout_p=0.3, spatial_dropout_p=0.3, output_type='regression'):
            super(SiameseSeResNeXt, self).__init__()
            self.output_type = output_type
            model_name = 'seresnext50_32x4d'
            base_model = timm.create_model(model_name, pretrained=True)

            self.initial_layers = nn.Sequential(*list(base_model.children())[:3])
            self.blocks = list(base_model.children())[3:-2]
            self.avgpool = list(base_model.children())[-2]
            self.spatial_dropout_initial = nn.Dropout2d(p=spatial_dropout_p)

            enhanced_blocks = []
            for block in self.blocks:
                enhanced_blocks.append(nn.Sequential(block, nn.Dropout2d(p=spatial_dropout_p)))
            self.enhanced_blocks = nn.Sequential(*enhanced_blocks)

            self.dropout = nn.Dropout(p=dropout_p)
            num_features = base_model.fc.in_features

            if output_type == 'regression':
                self.fc = nn.Linear(num_features * 2, 1)
            else:
                self.fc = nn.Linear(num_features * 2, 3)

        def forward(self, combined_image):
            left_eye, right_eye = combined_image[:, :3, :, :], combined_image[:, 3:6, :, :]
            left_features = self.avgpool(self.enhanced_blocks(self.spatial_dropout_initial(self.initial_layers(left_eye))))
            left_features = torch.flatten(left_features, 1)
            right_features = self.avgpool(self.enhanced_blocks(self.spatial_dropout_initial(self.initial_layers(right_eye))))
            right_features = torch.flatten(right_features, 1)
            combined_features = self.dropout(torch.cat([left_features, right_features], dim=1))
            output = self.fc(combined_features)
            return output.squeeze() if self.output_type == 'regression' else output

    # ---------------------------
    # Load model
    # ---------------------------
    model = SiameseSeResNeXt(output_type=output_type).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    print(f"✅ Model loaded from: {model_path}")

    # ---------------------------
    # Define image transforms
    # ---------------------------
    valid_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    # ---------------------------
    # Load and preprocess image
    # ---------------------------
    eye_img = Image.open(eye_image_path).convert('RGB')
    eye_tensor = valid_transform(eye_img)
    combined = torch.cat([eye_tensor, eye_tensor], dim=0).unsqueeze(0).to(device)

    # ---------------------------
    # Run prediction
    # ---------------------------
    with torch.no_grad():
        cimt_pred = model(combined).item()

    # ---------------------------
    # Determine risk category & scaled value
    # ---------------------------
        # --- Determine risk category ---
    if 0 < cimt_pred < 0.6:
        risk = "Low Risk"
        scaled_value = 0.2
    elif 0.6 <= cimt_pred <= 0.8:
        risk = "Medium Risk"
        scaled_value = 0.55
    elif cimt_pred > 0.8:
        risk = "High Risk"
        scaled_value = 0.9
    else:
        # fallback case (shouldn't happen)
        risk = "Undefined"
        scaled_value = 0.0

    return scaled_value


# MODEL 3

def calculate_ePWV_scale(age, SBP, DBP):
    MBP = DBP + 0.4 * (SBP - DBP)
    ePWV = (0.587
            - (0.402 * age)
            + (4.560 * 0.001 * (age ** 2))
            - (2.621 * 0.00001 * (age ** 2) * MBP)
            + (3.176 * 0.001 * age * MBP)
            - (1.832 * 0.01 * MBP))

    if age < 40:
        if ePWV < 7:
            scale = 0.2
        elif 7 <= ePWV <= 8:
            scale = 0.55
        else:  # ePWV > 8
            scale = 0.9
    elif 40 <= age <= 59:
        if ePWV < 9:
            scale = 0.2
        elif 9 <= ePWV <= 10:
            scale = 0.55
        else:  # ePWV > 10
            scale = 0.9
    else:  # age >= 60
        if ePWV < 11:
            scale = 0.2
        elif 11 <= ePWV <= 12:
            scale = 0.55
        else:  # ePWV > 12
            scale = 0.9


    return scale











