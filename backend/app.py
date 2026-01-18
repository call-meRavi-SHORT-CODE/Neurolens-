import gradio as gr
from PIL import Image
import tempfile
import os
import sys

# Ensure backend package path is available
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Lazy model loader
models_loaded = False

def load_models():
    global models_loaded
    if not models_loaded:
        try:
            from models import predict_eye_stroke, predict_cimt, predict_brain_stroke, calculate_ePWV_scale
            globals()['predict_eye_stroke'] = predict_eye_stroke
            globals()['predict_cimt'] = predict_cimt
            globals()['predict_brain_stroke'] = predict_brain_stroke
            globals()['calculate_ePWV_scale'] = calculate_ePWV_scale
            models_loaded = True
            print("Models loaded successfully!")
        except Exception as e:
            print(f"Error loading models: {e}")
            raise


def predict_stroke_risk(img_path: str, age: int, SBP: float, DBP: float) -> dict:
    """Compute combined stroke risk using the same weighting as the FastAPI backend."""
    load_models()
    ER = predict_eye_stroke(img_path)
    CR = predict_cimt(img_path)
    BR = predict_brain_stroke(img_path)
    PR = calculate_ePWV_scale(age, SBP, DBP)
    StrokeRiskScore = 0.22 * ER + 0.35 * CR + 0.10 * BR + 0.33 * PR
    return {
        "final_risk": StrokeRiskScore,
        "eye_risk": ER,
        "cimt_value": CR,
        "brain_risk": BR,
        "epwv_value": PR,
        "retinal_occlusion_prob": ER,
    }


def gradio_predict(image: Image.Image, age: int, systolic_bp: float, diastolic_bp: float):
    # Basic input validation
    if age is None or age < 0 or age > 120:
        return {"error":"Age must be between 0 and 120"}
    if systolic_bp is None or systolic_bp < 50 or systolic_bp > 300:
        return {"error":"Systolic blood pressure must be between 50-300 mmHg"}
    if diastolic_bp is None or diastolic_bp < 30 or diastolic_bp > 200:
        return {"error":"Diastolic blood pressure must be between 30-200 mmHg"}
    if diastolic_bp >= systolic_bp:
        return {"error":"Diastolic blood pressure must be less than systolic blood pressure"}

    # Save uploaded PIL image to temporary file
    tmp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
            tmp_file_path = tmp_file.name
            image.save(tmp_file_path, format="JPEG")

        results = predict_stroke_risk(tmp_file_path, age, systolic_bp, diastolic_bp)
        risk_percentage = round(results["final_risk"] * 100, 2)
        if risk_percentage < 30:
            risk_level = "Low"
        elif risk_percentage < 60:
            risk_level = "Medium"
        else:
            risk_level = "High"

        out = {
            "success": True,
            "risk_score_%": risk_percentage,
            "risk_level": risk_level,
            "cimt_value": round(results["cimt_value"], 3),
            "epwv_value": round(results["epwv_value"], 2),
            "retinal_occlusion_prob": round(results["retinal_occlusion_prob"], 3),
            "eye_risk": round(results["eye_risk"], 3),
            "brain_risk": round(results["brain_risk"], 3),
        }
        return out
    except Exception as e:
        return {"error": str(e)}
    finally:
        if tmp_file_path and os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


def build_interface():
    inputs = [
        gr.Image(type="pil", label="Retinal Image"),
        gr.Number(value=45, label="Age (years)"),
        gr.Number(value=120, label="Systolic BP (mmHg)"),
        gr.Number(value=80, label="Diastolic BP (mmHg)"),
    ]

    outputs = gr.JSON(label="Prediction Result")

    title = "NeuroLens - Stroke Risk (Gradio)"
    description = "Upload a retinal image and provide age & blood pressure to get an estimated stroke risk. Models are lazy-loaded on first run."

    iface = gr.Interface(fn=gradio_predict, inputs=inputs, outputs=outputs, title=title, description=description)
    return iface


if __name__ == "__main__":
    iface = build_interface()
    iface.launch(server_name="0.0.0.0", server_port=7860, share=False)