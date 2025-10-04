r"""
NeuroLens Inference (single-file)
- Part A (retinal, 4-class): Normal / BRVO / CRVO / RAO  → Risk level mapping
- Part B (CIMT, regression): Predicted value + risk bucket + metrics (if GT provided)
- Part C (brain-stroke, binary): Normal / Abnormal → Risk level mapping

USAGE EXAMPLES (Anaconda Prompt):
---------------------------------
# Single images (Torch backend, default)
python inference.py --retinal_img "D:\NeuroLens\sample\eye_a.jpg" ^
                    --cimt_img "D:\NeuroLens\sample\eye_b.jpg" ^
                    --brain_img "D:\NeuroLens\sample\eye_c.jpg"

# Provide a ground-truth CIMT (gets MAE/RMSE/R2 and risk accuracy for that one item)
python inference.py --cimt_img "D:\NeuroLens\sample\eye_b.jpg" --cimt_gt 0.72

# Batch CIMT evaluation CSV (columns: image,cimt) – prints overall metrics
python inference.py --b_csv "D:\NeuroLens\cimt_eval.csv"

# Use ONNX instead of Torch
python inference.py --backend onnx

REQUIRES:
- torch, timm, opencv-python, numpy
- (optional for ONNX backend) onnxruntime  [works best with numpy < 2.0]
"""

import os
import math
import json
import argparse
from pathlib import Path

import numpy as np
import cv2

# Default to Torch backend (no NumPy 2.x issues); ONNX runtime is optional
def _lazy_import_onnxruntime():
    try:
        import onnxruntime as ort
        return ort
    except Exception as e:
        return None

import torch
import torch.nn as nn
import timm


# --------------------------- Paths & Labels -----------------------------

DROOT = r"D:\NeuroLens"
DEFAULTS = {
    "A_pth": rf"{DROOT}\runs\part_a_best.pth",
    "B_pth": rf"{DROOT}\runs\part_b_best.pth",
    "C_pth": rf"{DROOT}\runs\part_c_best.pth",
    "A_onnx": rf"{DROOT}\exports\part_a.onnx",
    "B_onnx": rf"{DROOT}\exports\part_b.onnx",
    "C_onnx": rf"{DROOT}\exports\part_c.onnx",
}
A_CLASSES = ["normal", "rao", "brvo", "crvo"]        # training order
C_CLASSES = ["normal", "abnormal"]

A_DISPLAY = {"normal":"Normal","rao":"RAO","brvo":"BRVO","crvo":"CRVO"}
A_RISK = {"normal":"Low Risk", "brvo":"Medium Risk", "crvo":"High Risk", "rao":"Very High Risk"}
C_DISPLAY = {"normal":"Normal","abnormal":"Abnormal"}
C_RISK = {"normal":"Low Risk","abnormal":"High Risk"}

# CIMT thresholds
def cimt_bucket(mm: float):
    if mm < 0.6: return "Low"
    if mm <= 0.8: return "Medium"
    return "High"


# --------------------------- Preprocessing -----------------------------

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

def load_preprocess(img_path: str, size: int = 512) -> np.ndarray:
    """
    Load image, keep aspect ratio, resize longest side to `size`,
    pad to square (size x size), normalize, NCHW float32.
    """
    bgr = cv2.imread(img_path)
    if bgr is None:
        raise FileNotFoundError(f"Cannot read image: {img_path}")
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

    h, w = rgb.shape[:2]
    scale = size / max(h, w)
    nh, nw = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA)

    canvas = np.zeros((size, size, 3), dtype=np.float32)
    top = (size - nh) // 2
    left = (size - nw) // 2
    canvas[top:top+nh, left:left+nw, :] = resized

    norm = (canvas - MEAN) / STD
    chw = np.transpose(norm, (0, 1, 2)).transpose(2, 0, 1)  # HWC->CHW
    return chw[np.newaxis, ...].astype(np.float32)           # NCHW


# ------------------------- Torch model builders ------------------------

class HeadCls(nn.Module):
    def __init__(self, in_features, n_classes):
        super().__init__()
        self.fc = nn.Linear(in_features, n_classes)
    def forward(self, x): return self.fc(x)

class HeadReg(nn.Module):
    def __init__(self, in_features):
        super().__init__()
        self.fc = nn.Linear(in_features, 1)
    def forward(self, x): return self.fc(x).squeeze(1)

def make_backbone(name_primary="tf_efficientnet_b0.ns_jft_in1k", name_fallback="efficientnet_b0"):
    try:
        m = timm.create_model(name_primary, pretrained=True, num_classes=0, global_pool="avg")
    except Exception:
        m = timm.create_model(name_fallback, pretrained=True, num_classes=0, global_pool="avg")
    return m, m.num_features

def build_torch_A():
    bb, feat = make_backbone()
    return nn.Sequential(bb, HeadCls(feat, len(A_CLASSES)))

def build_torch_B():
    bb, feat = make_backbone()
    return nn.Sequential(bb, HeadReg(feat))

def build_torch_C():
    bb, feat = make_backbone()
    return nn.Sequential(bb, HeadCls(feat, len(C_CLASSES)))


# ------------------------------ Inference ------------------------------

def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e / np.clip(e.sum(axis=-1, keepdims=True), 1e-9, None)

def predict_A_torch(img_path: str, pth_path: str) -> tuple[str, float]:
    arr = load_preprocess(img_path, 512)
    t = torch.from_numpy(arr)
    model = build_torch_A()
    state = torch.load(pth_path, map_location="cpu")
    try:
        model.load_state_dict(state, strict=True)
    except Exception:
        model.load_state_dict(state, strict=False)
    model.eval()
    with torch.no_grad():
        logits = model(t).numpy()
    probs = softmax(logits)[0]
    idx = int(np.argmax(probs))
    return A_CLASSES[idx], float(probs[idx]*100.0)

def predict_C_torch(img_path: str, pth_path: str) -> tuple[str, float]:
    arr = load_preprocess(img_path, 512)
    t = torch.from_numpy(arr)
    model = build_torch_C()
    state = torch.load(pth_path, map_location="cpu")
    try:
        model.load_state_dict(state, strict=True)
    except Exception:
        model.load_state_dict(state, strict=False)
    model.eval()
    with torch.no_grad():
        logits = model(t).numpy()
    probs = softmax(logits)[0]
    idx = int(np.argmax(probs))
    return C_CLASSES[idx], float(probs[idx]*100.0)

def predict_B_torch(img_path: str, pth_path: str) -> float:
    arr = load_preprocess(img_path, 512)
    t = torch.from_numpy(arr)
    model = build_torch_B()
    state = torch.load(pth_path, map_location="cpu")
    try:
        model.load_state_dict(state, strict=True)
    except Exception:
        model.load_state_dict(state, strict=False)
    model.eval()
    with torch.no_grad():
        pred = model(t).numpy()[0]
    return float(pred)


def predict_A_onnx(img_path: str, onnx_path: str) -> tuple[str, float]:
    ort = _lazy_import_onnxruntime()
    if ort is None:
        raise RuntimeError("onnxruntime not available. Install it or use --backend torch.")
    arr = load_preprocess(img_path, 512)
    sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    inp = {sess.get_inputs()[0].name: arr}
    logits = sess.run(None, inp)[0]
    probs = softmax(logits)[0]
    idx = int(np.argmax(probs))
    return A_CLASSES[idx], float(probs[idx]*100.0)

def predict_C_onnx(img_path: str, onnx_path: str) -> tuple[str, float]:
    ort = _lazy_import_onnxruntime()
    if ort is None:
        raise RuntimeError("onnxruntime not available. Install it or use --backend torch.")
    arr = load_preprocess(img_path, 512)
    sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    inp = {sess.get_inputs()[0].name: arr}
    logits = sess.run(None, inp)[0]
    probs = softmax(logits)[0]
    idx = int(np.argmax(probs))
    return C_CLASSES[idx], float(probs[idx]*100.0)

def predict_B_onnx(img_path: str, onnx_path: str) -> float:
    ort = _lazy_import_onnxruntime()
    if ort is None:
        raise RuntimeError("onnxruntime not available. Install it or use --backend torch.")
    arr = load_preprocess(img_path, 512)
    sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    inp = {sess.get_inputs()[0].name: arr}
    pred = sess.run(None, inp)[0][0]
    return float(pred)


# -------------------------- Metrics (Part B) ---------------------------

def mae(y, yhat): return float(np.mean(np.abs(np.array(y) - np.array(yhat))))
def rmse(y, yhat): return float(np.sqrt(np.mean((np.array(y) - np.array(yhat))**2)))
def r2(y, yhat):
    y = np.array(y); yhat = np.array(yhat)
    ss_res = np.sum((y - yhat)**2)
    ss_tot = np.sum((y - np.mean(y))**2) + 1e-12
    return float(1 - ss_res/ss_tot)

def risk_acc(y, yhat):
    true_b = [cimt_bucket(v) for v in y]
    pred_b = [cimt_bucket(v) for v in yhat]
    return float(np.mean(np.array(true_b) == np.array(pred_b)))


# ------------------------------- CLI -----------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", choices=["torch","onnx"], default="torch")

    ap.add_argument("--retinal_img", default="")
    ap.add_argument("--cimt_img", default="")
    ap.add_argument("--brain_img", default="")

    ap.add_argument("--cimt_gt", type=float, default=None)
    ap.add_argument("--b_csv", default="")   # CSV with columns: image,cimt

    ap.add_argument("--a_pth", default=DEFAULTS["A_pth"])
    ap.add_argument("--b_pth", default=DEFAULTS["B_pth"])
    ap.add_argument("--c_pth", default=DEFAULTS["C_pth"])

    ap.add_argument("--a_onnx", default=DEFAULTS["A_onnx"])
    ap.add_argument("--b_onnx", default=DEFAULTS["B_onnx"])
    ap.add_argument("--c_onnx", default=DEFAULTS["C_onnx"])

    args = ap.parse_args()

    # ------------------- Part A: Retinal multi-class -------------------
    if args.retinal_img:
        if args.backend == "onnx":
            label, conf = predict_A_onnx(args.retinal_img, args.a_onnx)
        else:
            label, conf = predict_A_torch(args.retinal_img, args.a_pth)

        print("retinal:")
        print(f"Prediction: {A_DISPLAY[label]}")
        print(f"Confidence: {conf:.2f}%")
        print(f"Risk Level: {A_RISK[label]}")
        print()

    # ------------------- Part B: CIMT regression ----------------------
    if args.cimt_img or args.b_csv:
        if args.b_csv:
            # Batch evaluation on CSV
            import csv
            y_true, y_pred = [], []
            with open(args.b_csv, "r", encoding="utf-8") as f:
                for i, row in enumerate(csv.DictReader(f)):
                    img = row.get("image") or row.get("img") or row.get("path")
                    gt  = row.get("cimt") or row.get("cimt_mm") or row.get("thickness")
                    if not img or gt is None:
                        continue
                    img = img.strip('"').strip()
                    gt_val = float(gt)
                    if args.backend == "onnx":
                        p = predict_B_onnx(img, args.b_onnx)
                    else:
                        p = predict_B_torch(img, args.b_pth)
                    y_true.append(gt_val); y_pred.append(p)
            _mae = mae(y_true, y_pred); _rmse = rmse(y_true, y_pred); _r2 = r2(y_true, y_pred); _acc = risk_acc(y_true, y_pred)
            print("cimt (batch):")
            print(f"Evaluation Metrics: MAE={_mae:.4f}  RMSE={_rmse:.4f}  R²={_r2:.4f}  Risk accuracy={_acc:.4f}")
            print("Risk Thresholds:")
            print("  Low:    < 0.6 mm")
            print("  Medium: 0.6 - 0.8 mm")
            print("  High:   > 0.8 mm")
            print()

        if args.cimt_img:
            if args.backend == "onnx":
                cimt_pred = predict_B_onnx(args.cimt_img, args.b_onnx)
            else:
                cimt_pred = predict_B_torch(args.cimt_img, args.b_pth)
            bucket = cimt_bucket(cimt_pred)

            print("cimt:")
            print(f"Predicted CIMT: {cimt_pred:.3f} mm")
            print(f"Risk Category:  {bucket} Risk")
            print("Risk Thresholds:")
            print("  Low:    < 0.6 mm")
            print("  Medium: 0.6 - 0.8 mm")
            print("  High:   > 0.8 mm")
            if args.cimt_gt is not None:
                _mae = mae([args.cimt_gt],[cimt_pred])
                _rmse = rmse([args.cimt_gt],[cimt_pred])
                _r2 = r2([args.cimt_gt],[cimt_pred])
                _acc = risk_acc([args.cimt_gt],[cimt_pred])
                print(f"Evaluation Metrics: MAE={_mae:.4f}  RMSE={_rmse:.4f}  R²={_r2:.4f}  Risk accuracy={_acc:.4f}")
            print()

    # ------------------- Part C: Brain-stroke binary ------------------
    if args.brain_img:
        if args.backend == "onnx":
            label, conf = predict_C_onnx(args.brain_img, args.c_onnx)
        else:
            label, conf = predict_C_torch(args.brain_img, args.c_pth)

        print("brain:")
        print(f"Prediction: {C_DISPLAY[label]}")
        print(f"Confidence: {conf:.2f}%")
        print(f"Risk Level: {C_RISK[label]}")
        print()

if __name__ == "__main__":
    main()
