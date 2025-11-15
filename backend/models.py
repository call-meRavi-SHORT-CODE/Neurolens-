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





def predict_eye_stroke(img_path, model_path="C://Users//USER//Downloads//NEUROLENS//Neurolens-//backend//models//eye_stroke.h5", class_names=["NORMAL", "RAO", "CRVO", "BRVO"]):
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
    if predicted_class == "NORMAL":
      return 0.1
    elif predicted_class == "RAO":
      return 1.0
    elif predicted_class == "CRVO":
      return 0.8
    elif predicted_class == "BRVO":
      return 0.5
    else:
      return 0



# MODEL 2

model_path = "C://Users//USER//Downloads//NEUROLENS//Neurolens-//backend//models//cimt_model.pth"

def predict_cimt(eye_image_path, model_path="C://Users//USER//Downloads//NEUROLENS//Neurolens-//backend//models//cimt_model.pth", eye_side='left', output_type='regression'):
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


def predict_brain_stroke(img_path: str, pth_path: str = "C://Users//USER//Downloads//NEUROLENS//Neurolens-//backend//models//brain_stroke.pth", size: int = 512) -> float:
    """
    Predict C class (normal/abnormal) from image and return scaled value.
    Normal → 0.2, Abnormal → 0.9
    """
    MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    C_CLASSES = ["normal", "abnormal"]

    # --------- Image preprocessing ----------
    bgr = cv2.imread(img_path)
    if bgr is None:
        raise FileNotFoundError(f"Cannot read image: {img_path}")
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    h, w = rgb.shape[:2]
    scale = size / max(h, w)
    nh, nw = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((size, size, 3), dtype=np.float32)
    top, left = (size - nh) // 2, (size - nw) // 2
    canvas[top:top+nh, left:left+nw, :] = resized
    norm = (canvas - MEAN) / STD
    chw = np.transpose(norm, (2, 0, 1))  # HWC->CHW
    arr = np.expand_dims(chw, axis=0).astype(np.float32)  # NCHW

    # --------- Build model ----------
    def make_backbone(name_primary="tf_efficientnet_b0.ns_jft_in1k", name_fallback="efficientnet_b0"):
        try:
            m = timm.create_model(name_primary, pretrained=True, num_classes=0, global_pool="avg")
        except Exception:
            m = timm.create_model(name_fallback, pretrained=True, num_classes=0, global_pool="avg")
        return m, m.num_features

    class HeadCls(nn.Module):
        def __init__(self, in_features, n_classes):
            super().__init__()
            self.fc = nn.Linear(in_features, n_classes)
        def forward(self, x): return self.fc(x)

    bb, feat = make_backbone()
    model = nn.Sequential(bb, HeadCls(feat, len(C_CLASSES)))

    # --------- Load weights ----------
    state = torch.load(pth_path, map_location="cpu")
    try:
        model.load_state_dict(state, strict=True)
    except Exception:
        model.load_state_dict(state, strict=False)

    model.eval()

    # --------- Predict ----------
    t = torch.from_numpy(arr)
    with torch.no_grad():
        logits = model(t).numpy()
    e = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
    probs = e / np.clip(e.sum(axis=-1, keepdims=True), 1e-9, None)
    idx = int(np.argmax(probs))
    pred_class = C_CLASSES[idx]

    # --------- Map to scaled value ----------
    if pred_class == "normal":
        return 0.2
    elif pred_class == "abnormal":
        return 0.9





# MODEL 4

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