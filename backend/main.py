from models import predict_eye_stroke, predict_cimt, predict_brain_stroke, calculate_ePWV_scale





def predict_stroke_risk(img_path: str, age: int, SBP: float, DBP: float, brain_model_path: str = "backend/models/brain_stroke_model.pth") -> float:
    """
    Accepts image, age, SBP, DBP as input and returns stroke risk score (0.0 to 1.0)
    
    Args:
        img_path: Path to the input image
        age: Patient age in years
        SBP: Systolic Blood Pressure
        DBP: Diastolic Blood Pressure
        brain_model_path: Path to brain stroke model file
    
    Returns:
        float: Stroke risk score between 0.0 and 1.0
    """
    # Get predictions from all models
    ER = predict_eye_stroke(img_path)  # Eye Retinal
    CR = predict_cimt(img_path)  # Carotid Intima-Media Thickness
    PR = calculate_ePWV_scale(age, SBP, DBP)  # Pulse Wave Velocity

    # Calculate weighted stroke risk score
    StrokeRiskScore = 0.33*ER + 0.33*CR + 0.33*PR
    
    return StrokeRiskScore

"""
# Example usage
if __name__ == "__main__":
    result = predict_stroke_risk("C://Users//USER//Downloads//NEUROLENS//Neurolens-//backend//test.jpg", 20, 120, 80)
    print(f"Stroke Risk Score: {result:.3f}") """