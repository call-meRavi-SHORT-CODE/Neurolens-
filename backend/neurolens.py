import os, sys, json, yaml, random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler

from sklearn.metrics import f1_score, mean_absolute_error

import albumentations as A
from albumentations.pytorch import ToTensorV2
import cv2

import timm
import torch.onnx as onnx


# ============================ CONFIG LOADER ============================

def load_config(cfg_path: str):
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}
    paths = cfg.get("paths", {})

    # robust path resolver: works even if env=None
    def P(key, env=None, default=None):
        base = os.getenv(env, default) if (isinstance(env, str) and env) else default
        v = paths.get(key, base)
        return str(v).replace("\\", "/") if v is not None else ""

    # Roots & outputs
    cfg["_data_root"] = P("data_root", "NL_DATA_ROOT", "D:/NeuroLens/data")
    cfg["_runs_dir"]  = P("runs_dir",  None, "D:/NeuroLens/runs")
    cfg["_exp_dir"]   = P("export_dir",None, "D:/NeuroLens/exports")
    Path(cfg["_runs_dir"]).mkdir(parents=True, exist_ok=True)
    Path(cfg["_exp_dir"]).mkdir(parents=True, exist_ok=True)

    # Part A (Eye-stroke)
    cfg["_A_root"]   = P("eye_stroke_dir", "NL_EYE_STROKE", f"{cfg['_data_root']}/eye_stroke")
    cfg["_A_train"]  = P("eye_stroke_train", None, f"{cfg['_A_root']}/train")
    cfg["_A_val"]    = P("eye_stroke_val",   None, f"{cfg['_A_root']}/val")
    cfg["_A_test"]   = P("eye_stroke_test",  None, f"{cfg['_A_root']}/test")

    # Part B (CIMT)
    cfg["_B_dir"]    = P("cimt_dir", "NL_CIMT_DIR", f"{cfg['_data_root']}/cimt")
    cfg["_B_imgs"]   = P("cimt_data_images", None, f"{cfg['_B_dir']}/data")
    cfg["_B_info"]   = P("cimt_data_info",   None, f"{cfg['_B_dir']}/data_info.json")

    # Part C (Brain-stroke)
    cfg["_C_root"]   = P("brain_stroke_dir", "NL_BRAIN_STROKE", f"{cfg['_data_root']}/brain_stroke")

    # Hardware
    hw = cfg.get("hardware", {})
    cfg["_num_workers"] = int(hw.get("num_workers", 0))      # Windows-safe
    cfg["_pin_memory"]  = bool(hw.get("pin_memory", False))
    bs_auto = hw.get("batch_sizes", {}).get("auto", {"A": 8, "B": 8, "C": 8})
    cfg["_bsA"] = int(bs_auto.get("A", 8))
    cfg["_bsB"] = int(bs_auto.get("B", 8))
    cfg["_bsC"] = int(bs_auto.get("C", 8))

    # Data settings
    da = cfg.get("data", {}).get("part_a", {})
    cfg["_A_img"]      = int(da.get("image_size", 512))
    cfg["_A_classes"]  = list(da.get("classes", ["normal", "rao", "brvo", "crvo"]))
    cfg["_A_cw"]       = da.get("class_weights", None)  # dict name->weight
    cfg["_A_use_split"]= bool(da.get("use_split_subdirs", True))

    db = cfg.get("data", {}).get("part_b", {})
    cfg["_B_img"]      = int(db.get("image_size", 512))
    cfg["_B_target"]   = str(db.get("target", "thickness"))

    dc = cfg.get("data", {}).get("part_c", {})
    cfg["_C_img"]      = int(dc.get("image_size", 512))
    cfg["_C_classes"]  = list(dc.get("classes", ["normal", "abnormal"]))
    cfg["_C_cw"]       = dc.get("class_weights", None)

    # Training/optim
    tr = cfg.get("training", {})
    cfg["_epochs"] = int(tr.get("epochs", 2))
    opt = tr.get("optimizer", {})
    cfg["_lr"]     = float(opt.get("lr", 2e-4))
    cfg["_wd"]     = float(opt.get("weight_decay", 1e-2))

    return cfg


# ============================ AUGMENTATION =============================

def tf_image(img_size: int, split: str, part: str = "A"):
    norm = A.Normalize(mean=[0.485, 0.456, 0.406],
                       std=[0.229, 0.224, 0.225])
    base = [
        A.LongestMaxSize(img_size),
        A.PadIfNeeded(min_height=img_size, min_width=img_size, border_mode=0, value=0)
    ]
    if split == "train":
        if part in ("A", "C"):
            aug = [
                A.OneOf([
                    A.RandomResizedCrop(size=(img_size, img_size), scale=(0.9, 1.0), ratio=(0.95, 1.05)),
                    A.CenterCrop(height=img_size, width=img_size)
                ], p=0.7),
                A.HorizontalFlip(p=0.5),
                A.Rotate(limit=15, border_mode=0, value=0, p=0.6),
                A.ColorJitter(0.1, 0.1, 0.1, 0.02, p=0.4),
            ]
        else:  # Part B
            aug = [
                A.RandomResizedCrop(size=(img_size, img_size), scale=(0.95, 1.0), ratio=(0.98, 1.02), p=0.6),
                A.HorizontalFlip(p=0.5),
                A.Rotate(limit=10, border_mode=0, value=0, p=0.4),
            ]
    else:
        aug = [A.CenterCrop(height=img_size, width=img_size)]
    return A.Compose(base + aug + [norm, ToTensorV2()])


# =============================== DATASETS ==============================

EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff")

class FolderDataset(Dataset):
    def __init__(self, items, transform):
        self.items = items
        self.tf = transform

    def __len__(self): return len(self.items)

    def __getitem__(self, i):
        p, y = self.items[i]
        img_bgr = cv2.imread(p)
        if img_bgr is None:
            raise FileNotFoundError(f"Failed to read image: {p}")
        img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        x = self.tf(image=img)["image"]
        return x, y


def scan_split_dir(split_dir: Path, classes):
    items = []
    idx = {c: i for i, c in enumerate(classes)}
    for c in classes:
        d = split_dir / c
        if not d.exists():
            continue
        for f in d.iterdir():
            if f.is_file() and f.suffix.lower() in EXTS:
                items.append((str(f), idx[c]))
    return items


def scan_raw_dir(root: Path, classes, train_ratio=0.8):
    items = []
    idx = {c: i for i, c in enumerate(classes)}
    for c in classes:
        d = root / c
        if not d.exists():
            continue
        for f in d.iterdir():
            if f.is_file() and f.suffix.lower() in EXTS:
                items.append((str(f), idx[c]))
    random.seed(42)
    random.shuffle(items)
    cut = int(len(items) * train_ratio)
    return items[:cut], items[cut:]


# --------- CIMT dataset (robust JSON reading for varied schemas) ---------
class CIMTDataset(Dataset):
    def __init__(self, info_path: str, img_dir: str, subject_ids, img_size: int, split="train", target_key="thickness"):
        self.rows = []
        self.tf = tf_image(img_size, split, part="B")
        self.img_dir = Path(img_dir)

        with open(info_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        # Meta can be dict[id]->info OR a list of dicts with "id"
        if isinstance(meta, dict):
            by_id = meta
        elif isinstance(meta, list):
            by_id = {str(m.get("id", i)): m for i, m in enumerate(meta)}
        else:
            by_id = {}

        for sid in subject_ids:
            sid_str = str(sid)
            if sid_str not in by_id:
                continue
            m = by_id[sid_str]

            # Best-effort to get CIMT value
            cimt = (m.get(target_key) or m.get("thickness_mm") or m.get("CIMT") or m.get("cimt_mm") or 0.0)
            try:
                cimt = float(cimt)
            except Exception:
                continue

            # Try common fields for image filenames
            candidates = []
            for k in ("left_eye", "right_eye", "left_image", "right_image", "image", "img", "fundus"):
                v = m.get(k)
                if isinstance(v, str) and v:
                    candidates.append(v)

            added = 0
            for fn in candidates:
                p = self.img_dir / fn
                if p.exists():
                    self.rows.append((str(p).replace("\\", "/"), cimt))
                    added += 1

            if added == 0:
                # fallback: try common patterns: <sid>_L/R or <sid>.<ext>
                for suffix in ["_L.png", "_R.png", "_L.jpg", "_R.jpg", ".png", ".jpg", ".jpeg"]:
                    p = self.img_dir / f"{sid_str}{suffix}"
                    if p.exists():
                        self.rows.append((str(p).replace("\\", "/"), cimt))
                        break

    def __len__(self): return len(self.rows)

    def __getitem__(self, i):
        p, y = self.rows[i]
        img_bgr = cv2.imread(p)
        if img_bgr is None:
            raise FileNotFoundError(f"Failed to read image: {p}")
        img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        x = self.tf(image=img)["image"]
        return x, np.float32(y)


# ================================ MODELS ===============================

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

def make_backbone(name_primary="tf_efficientnet_b0.ns_jft_in1k", name_fallback="efficientnet_b0",
                  drop=0.1, dp=0.1):
    try:
        m = timm.create_model(name_primary, pretrained=True, num_classes=0,
                              global_pool="avg", drop_rate=drop, drop_path_rate=dp)
    except Exception:
        m = timm.create_model(name_fallback, pretrained=True, num_classes=0,
                              global_pool="avg", drop_rate=drop, drop_path_rate=dp)
    return m, m.num_features

def make_model_A(n_classes):
    bb, feat = make_backbone()
    return nn.Sequential(bb, HeadCls(feat, n_classes))

def make_model_C(n_classes):
    bb, feat = make_backbone()
    return nn.Sequential(bb, HeadCls(feat, n_classes))

def make_model_B():
    bb, feat = make_backbone()
    return nn.Sequential(bb, HeadReg(feat))


# =============================== TRAIN LOOPS ===========================

def train_A(cfg, device):
    img_size = cfg["_A_img"]
    classes  = cfg["_A_classes"]

    tr_dir = Path(cfg["_A_train"])
    va_dir = Path(cfg["_A_val"])
    root   = Path(cfg["_A_root"])

    # Pick data source
    if cfg["_A_use_split"] and tr_dir.exists() and va_dir.exists():
        tr_items = scan_split_dir(tr_dir, classes)
        va_items = scan_split_dir(va_dir, classes)
        print(f"[A] using split dirs\n  train={tr_dir}\n  val  ={va_dir}")
    else:
        tr_items, va_items = scan_raw_dir(root, classes, train_ratio=0.8)
        print(f"[A] using raw dirs with 80/20 split\n  root ={root}")

    print(f"[A] counts: train={len(tr_items)}  val={len(va_items)}")
    if len(tr_items) == 0:
        print("[A][ERROR] no training images found — check your paths.")
        sys.exit(1)

    ds_tr = FolderDataset(tr_items, tf_image(img_size, "train", "A"))
    ds_va = FolderDataset(va_items, tf_image(img_size, "val", "A"))

    sampler = None
    if cfg["_A_cw"]:
        idx_w = {classes.index(name): float(w) for name, w in cfg["_A_cw"].items() if name in classes}
        weights = [idx_w.get(y, 1.0) for _, y in tr_items]
        if len(weights) > 0:
            sampler = WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)

    dl_tr = DataLoader(ds_tr, batch_size=cfg["_bsA"], shuffle=(sampler is None), sampler=sampler,
                       num_workers=cfg["_num_workers"], pin_memory=cfg["_pin_memory"], drop_last=False)
    dl_va = DataLoader(ds_va, batch_size=cfg["_bsA"], shuffle=False,
                       num_workers=cfg["_num_workers"], pin_memory=cfg["_pin_memory"], drop_last=False)

    model = make_model_A(len(classes)).to(device)

    class_weight_tensor = None
    if cfg["_A_cw"]:
        class_weight_tensor = torch.tensor(
            [cfg["_A_cw"].get(c, 1.0) for c in classes],
            dtype=torch.float32, device=device
        )
    criterion = nn.CrossEntropyLoss(weight=class_weight_tensor)
    optimizer = optim.AdamW(model.parameters(), lr=cfg["_lr"], weight_decay=cfg["_wd"])

    best_f1, best_state = -1.0, None
    for ep in range(1, cfg["_epochs"] + 1):
        model.train()
        tr_loss = 0.0
        for xb, yb in dl_tr:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            out = model(xb)
            loss = criterion(out, yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            tr_loss += float(loss.detach().cpu())

        # validate
        model.eval()
        preds, targs = [], []
        with torch.no_grad():
            for xb, yb in dl_va:
                xb = xb.to(device)
                p = model(xb).softmax(1).argmax(1).cpu().tolist()
                preds += p
                targs += yb.tolist()
        f1 = f1_score(targs, preds, average="macro") if len(targs) > 0 else 0.0
        print(f"[A] epoch {ep}/{cfg['_epochs']}  train_loss={tr_loss/max(1,len(dl_tr)):.4f}  val_macroF1={f1:.4f}")

        if f1 > best_f1:
            best_f1 = f1
            best_state = {k: v.cpu() for k, v in model.state_dict().items()}

    out = Path(cfg["_runs_dir"]) / "part_a_best.pth"
    torch.save(best_state, out)
    print(f"[A] saved → {out}  (best macroF1={best_f1:.4f})")


def subject_splits_from_json(info_json: str, train_ratio=0.8):
    with open(info_json, "r", encoding="utf-8") as f:
        meta = json.load(f)
    if isinstance(meta, dict):
        sids = list(meta.keys())
    elif isinstance(meta, list):
        sids = [str(m.get("id", i)) for i, m in enumerate(meta)]
    else:
        sids = []
    random.seed(42)
    random.shuffle(sids)
    cut = int(len(sids) * train_ratio)
    return sids[:cut], sids[cut:]


def train_B(cfg, device):
    img_size = cfg["_B_img"]
    info = cfg["_B_info"]
    imgs = cfg["_B_imgs"]
    if not Path(info).exists():
        print(f"[B][ERROR] data_info.json not found: {info}")
        sys.exit(1)

    tr_sids, va_sids = subject_splits_from_json(info, train_ratio=0.8)
    ds_tr = CIMTDataset(info, imgs, tr_sids, img_size, "train", target_key=cfg["_B_target"])
    ds_va = CIMTDataset(info, imgs, va_sids, img_size, "val", target_key=cfg["_B_target"])
    print(f"[B] subjects: train={len(tr_sids)} val={len(va_sids)}  rows: train={len(ds_tr)} val={len(ds_va)}")
    if len(ds_tr) == 0:
        print("[B][ERROR] no training rows found — check JSON/paths.")
        sys.exit(1)

    dl_tr = DataLoader(ds_tr, batch_size=cfg["_bsB"], shuffle=True,
                       num_workers=cfg["_num_workers"], pin_memory=cfg["_pin_memory"], drop_last=False)
    dl_va = DataLoader(ds_va, batch_size=cfg["_bsB"], shuffle=False,
                       num_workers=cfg["_num_workers"], pin_memory=cfg["_pin_memory"], drop_last=False)

    model = make_model_B().to(device)
    criterion = nn.SmoothL1Loss(beta=0.05)
    optimizer = optim.AdamW(model.parameters(), lr=cfg["_lr"], weight_decay=cfg["_wd"])

    best_mae, best_state = 1e9, None
    for ep in range(1, cfg["_epochs"] + 1):
        model.train()
        tr_loss = 0.0
        for xb, yb in dl_tr:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            pred = model(xb)
            loss = criterion(pred, yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            tr_loss += float(loss.detach().cpu())

        model.eval()
        preds, targs = [], []
        with torch.no_grad():
            for xb, yb in dl_va:
                xb = xb.to(device)
                pv = model(xb).cpu().tolist()
                preds += pv
                targs += yb.tolist()
        mae = mean_absolute_error(targs, preds) if len(targs) > 0 else 0.0
        print(f"[B] epoch {ep}/{cfg['_epochs']}  train_loss={tr_loss/max(1,len(dl_tr)):.4f}  val_MAE={mae:.4f}")

        if mae < best_mae:
            best_mae = mae
            best_state = {k: v.cpu() for k, v in model.state_dict().items()}

    out = Path(cfg["_runs_dir"]) / "part_b_best.pth"
    torch.save(best_state, out
               )
    print(f"[B] saved → {out}  (best MAE={best_mae:.4f})")


def train_C(cfg, device):
    img_size = cfg["_C_img"]
    classes  = cfg["_C_classes"]
    root     = Path(cfg["_C_root"])

    tr_items, va_items = scan_raw_dir(root, classes, train_ratio=0.8)
    print(f"[C] using raw dirs with 80/20 split\n  root={root}")
    print(f"[C] counts: train={len(tr_items)}  val={len(va_items)}")
    if len(tr_items) == 0:
        print("[C][ERROR] no training images found — check your paths.")
        sys.exit(1)

    ds_tr = FolderDataset(tr_items, tf_image(img_size, "train", "C"))
    ds_va = FolderDataset(va_items, tf_image(img_size, "val",   "C"))

    sampler = None
    if cfg["_C_cw"]:
        idx_w = {classes.index(name): float(w) for name, w in cfg["_C_cw"].items() if name in classes}
        weights = [idx_w.get(y, 1.0) for _, y in tr_items]
        if len(weights) > 0:
            sampler = WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)

    dl_tr = DataLoader(ds_tr, batch_size=cfg["_bsC"], shuffle=(sampler is None), sampler=sampler,
                       num_workers=cfg["_num_workers"], pin_memory=cfg["_pin_memory"], drop_last=False)
    dl_va = DataLoader(ds_va, batch_size=cfg["_bsC"], shuffle=False,
                       num_workers=cfg["_num_workers"], pin_memory=cfg["_pin_memory"], drop_last=False)

    model = make_model_C(len(classes)).to(device)
    class_weight_tensor = None
    if cfg["_C_cw"]:
        class_weight_tensor = torch.tensor(
            [cfg["_C_cw"].get(c, 1.0) for c in classes],
            dtype=torch.float32, device=device
        )
    criterion = nn.CrossEntropyLoss(weight=class_weight_tensor)
    optimizer = optim.AdamW(model.parameters(), lr=cfg["_lr"], weight_decay=cfg["_wd"])

    best_f1, best_state = -1.0, None
    for ep in range(1, cfg["_epochs"] + 1):
        model.train()
        tr_loss = 0.0
        for xb, yb in dl_tr:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            out = model(xb)
            loss = criterion(out, yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            tr_loss += float(loss.detach().cpu())

        model.eval()
        preds, targs = [], []
        with torch.no_grad():
            for xb, yb in dl_va:
                xb = xb.to(device)
                p = model(xb).softmax(1).argmax(1).cpu().tolist()
                preds += p
                targs += yb.tolist()
        f1 = f1_score(targs, preds, average="macro") if len(targs) > 0 else 0.0
        print(f"[C] epoch {ep}/{cfg['_epochs']}  train_loss={tr_loss/max(1,len(dl_tr)):.4f}  val_macroF1={f1:.4f}")

        if f1 > best_f1:
            best_f1 = f1
            best_state = {k: v.cpu() for k, v in model.state_dict().items()}

    out = Path(cfg["_runs_dir"]) / "part_c_best.pth"
    torch.save(best_state, out)
    print(f"[C] saved → {out}  (best macroF1={best_f1:.4f})")


# =============================== EXPORT ONNX ===========================

def export_onnx(cfg, part: str, ckpt_path: str = "", img_size: int = 512):
    part = part.upper()
    if part == "A":
        model = make_model_A(4)
    elif part == "B":
        model = make_model_B()
    elif part == "C":
        model = make_model_C(2)
    else:
        print("Unknown part for export")
        return

    if ckpt_path and Path(ckpt_path).exists():
        state = torch.load(ckpt_path, map_location="cpu")
        try:
            model.load_state_dict(state, strict=True)
        except Exception:
            model.load_state_dict(state, strict=False)

    model.eval()
    dummy = torch.randn(1, 3, img_size, img_size)
    out_path = Path(cfg["_exp_dir"]) / f"part_{part.lower()}.onnx"
    onnx.export(
        model, dummy, str(out_path),
        input_names=["input"], output_names=["output"],
        opset_version=17, dynamic_axes=None
    )
    print(f"[{part}] ONNX saved → {out_path}")


# ================================== CLI =================================

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["train", "export"])
    ap.add_argument("--part", choices=["A", "B", "C"], required=True)
    ap.add_argument("--config", required=True)
    ap.add_argument("--ckpt", default="")
    args = ap.parse_args()

    cfg = load_config(args.config)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if args.cmd == "train":
        if args.part == "A":
            train_A(cfg, device)
        elif args.part == "B":
            train_B(cfg, device)
        elif args.part == "C":
            train_C(cfg, device)
    elif args.cmd == "export":
        export_onnx(cfg, args.part, args.ckpt)


if __name__ == "__main__":
    main()
