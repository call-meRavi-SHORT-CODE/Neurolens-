# NeuroLens Risk Assessment Backend

FastAPI backend for the NeuroLens stroke risk assessment application.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start the server:**
   ```bash
   python start_server.py
   ```

   Or alternatively:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

- **GET** `/` - Health check
- **GET** `/health` - Health status
- **POST** `/predict-risk` - Predict stroke risk from retinal image

### Predict Risk Endpoint

**POST** `/predict-risk`

**Form Data:**
- `image`: Retinal image file (JPEG/PNG)
- `age`: Patient age (integer, 0-120)
- `systolic_bp`: Systolic blood pressure (float, 50-300)
- `diastolic_bp`: Diastolic blood pressure (float, 30-200)

**Response:**
```json
{
  "success": true,
  "risk_score": 43.25,
  "risk_level": "Medium",
  "risk_factors": {
    "retinal_vessel_analysis": true,
    "brain_stroke_indicators": true,
    "carotid_intima_media_thickness": true,
    "estimated_pulse_wave_velocity": true
  }
}
```

## Model Requirements

The backend expects the following model files in the `backend/models/` directory:
- `eye_stroke.h5` - Eye retinal analysis model
- `cimt_model.pth` - Carotid intima-media thickness model
- `brain_stroke.pth` - Brain stroke detection model

## Development

- Server runs on `http://localhost:8000`
- API documentation available at `http://localhost:8000/docs`
- Interactive API testing at `http://localhost:8000/redoc`
