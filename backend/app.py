from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import sys

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Lazy import models to avoid loading during startup
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
            raise e

app = FastAPI(title="NeuroLens Risk Assessment API", version="1.0.0")

# Add startup event to preload models
@app.on_event("startup")
async def startup_event():
    print("Starting up NeuroLens API...")
    print("Preloading models in background...")
    # Don't block startup, models will be loaded on first request
    print("API ready! Models will load on first prediction request.")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def predict_stroke_risk(img_path: str, age: int, SBP: float, DBP: float) -> dict:
    """
    Accepts image, age, SBP, DBP as input and returns detailed stroke risk analysis
    
    Args:
        img_path: Path to the input image
        age: Patient age in years
        SBP: Systolic Blood Pressure
        DBP: Diastolic Blood Pressure
    
    Returns:
        dict: Detailed analysis including individual model results and final risk score
    """
    try:
        # Load models if not already loaded
        load_models()
        
        # Get predictions from all models
        ER = predict_eye_stroke(img_path)  # Eye Retinal
        CR = predict_cimt(img_path)  # Carotid Intima-Media Thickness
        BR = predict_brain_stroke(img_path)  # Brain Retinal
        PR = calculate_ePWV_scale(age, SBP, DBP)  # Pulse Wave Velocity

        # Calculate weighted stroke risk score
        StrokeRiskScore = 0.22*ER + 0.35*CR + 0.10*BR + 0.33*PR
        
        return {
            "final_risk": StrokeRiskScore,
            "eye_risk": ER,
            "cimt_value": CR,
            "brain_risk": BR,
            "epwv_value": PR,
            "retinal_occlusion_prob": ER  # Using eye risk as retinal occlusion probability
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in risk prediction: {str(e)}")

@app.get("/")
async def root():
    return {"message": "NeuroLens Risk Assessment API is running"}

@app.get("/test")
async def test_endpoint():
    return {"status": "success", "message": "Backend is accessible from frontend"}

@app.post("/predict-risk")
async def predict_risk(
    image: UploadFile = File(...),
    age: int = Form(...),
    systolic_bp: float = Form(...),
    diastolic_bp: float = Form(...)
):
    """
    Predict stroke risk based on retinal image and patient data
    """
    try:
        # Validate inputs
        if age < 0 or age > 120:
            raise HTTPException(status_code=400, detail="Age must be between 0 and 120")
        
        if systolic_bp < 50 or systolic_bp > 300:
            raise HTTPException(status_code=400, detail="Systolic blood pressure must be between 50-300 mmHg")
        
        if diastolic_bp < 30 or diastolic_bp > 200:
            raise HTTPException(status_code=400, detail="Diastolic blood pressure must be between 30-200 mmHg")
        
        if diastolic_bp >= systolic_bp:
            raise HTTPException(status_code=400, detail="Diastolic blood pressure must be less than systolic blood pressure")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
            content = await image.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Predict stroke risk
            results = predict_stroke_risk(tmp_file_path, age, systolic_bp, diastolic_bp)
            
            # Convert to percentage and round to 2 decimal places
            risk_percentage = round(results["final_risk"] * 100, 2)
            
            # Determine risk level
            if risk_percentage < 30:
                risk_level = "Low"
                recommendation = "Your stroke risk is low. Maintain a healthy lifestyle with regular exercise, balanced diet, and routine check-ups."
            elif risk_percentage < 60:
                risk_level = "Medium"
                recommendation = "Your stroke risk is moderate. Consider lifestyle modifications, regular monitoring of blood pressure, and consultation with your healthcare provider."
            else:
                risk_level = "High"
                recommendation = "Your stroke risk is high. Immediate medical attention recommended. Please consult with a healthcare professional for comprehensive evaluation and treatment plan."
            
            return JSONResponse(content={
                "success": True,
                "risk_score": risk_percentage,
                "risk_level": risk_level,
                "cimt_value": round(results["cimt_value"], 3),
                "epwv_value": round(results["epwv_value"], 2),
                "retinal_occlusion_prob": round(results["retinal_occlusion_prob"], 3),
                "eye_risk": round(results["eye_risk"], 3),
                "brain_risk": round(results["brain_risk"], 3),
                "recommendation": recommendation,
                "risk_factors": {
                    "retinal_vessel_analysis": True,
                    "brain_stroke_indicators": True,
                    "carotid_intima_media_thickness": True,
                    "estimated_pulse_wave_velocity": True
                }
            })
        
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


"""if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)"""

