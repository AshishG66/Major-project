import os
import sys
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from orchestrator.pipeline_orchestrator import UnifiedAIOrchestrator
from api.explainability import router as explainability_router

app = FastAPI(
    title="HridyaDarpan Clinical AI Platform",
    description="Hospital-grade Multi-Dataset AI Prediction Engine & Clinical Digital Twin Microservice.",
    version="3.0.0"
)

# Mount Explainability router (/what-if, /trends)
app.include_router(explainability_router, tags=["Explainability & What-If"])

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Orchestrator instance
orchestrator = None

def get_orchestrator():
    global orchestrator
    if orchestrator is None:
        orchestrator = UnifiedAIOrchestrator(models_dir="ai/models/")
    return orchestrator

@app.on_event("startup")
def startup_event():
    try:
        get_orchestrator()
        print("[FastAPI] Unified AI Orchestrator initialized on startup.")
    except Exception as e:
        print(f"[FastAPI] Error initializing orchestrator on startup: {e}")

# Data Schemas
class UnifiedPatientRequest(BaseModel):
    age: int = Field(..., ge=0, le=120, example=52)
    gender: int = Field(..., ge=0, le=1, description="0: Male, 1: Female", example=0)
    height: float = Field(default=172.0, ge=50, le=250, example=175.0)
    weight: float = Field(default=75.0, ge=10, le=300, example=78.0)
    bmi: float = Field(default=25.5, ge=5, le=100, example=25.5)
    systolicBP: int = Field(..., ge=50, le=250, example=135)
    diastolicBP: int = Field(..., ge=30, le=150, example=85)
    cholesterol: int = Field(..., ge=50, le=500, example=215)
    heartRate: int = Field(default=72, ge=30, le=220, example=74)
    bloodSugar: int = Field(default=95, ge=30, le=500, example=105)
    exerciseFrequency: int = Field(default=3, ge=0, le=7, example=2)
    smoking: int = Field(default=0, ge=0, le=1, example=0)
    alcohol: int = Field(default=0, ge=0, le=1, example=0)
    diabetes: int = Field(default=0, ge=0, le=1, example=0)
    familyHistory: int = Field(default=0, ge=0, le=1, example=1)
    chestPainType: int = Field(default=0, ge=0, le=3, example=0)
    sleepDuration: float = Field(default=7.5, ge=0, le=24, example=7.0)
    stressLevel: int = Field(default=5, ge=1, le=10, example=6)
    ejectionFraction: Optional[float] = Field(default=58.0, ge=10, le=80, example=58.0)
    serumCreatinine: Optional[float] = Field(default=1.0, ge=0.1, le=10.0, example=1.0)
    stElevation: Optional[float] = Field(default=0.05, ge=-3.0, le=5.0, example=0.05)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "HridyaDarpan AI Platform",
        "version": "3.0.0"
    }

class RecommendationRequest(BaseModel):
    riskLevel: str = Field(..., example="MODERATE")
    age: int = Field(..., ge=0, le=120, example=52)
    gender: int = Field(default=0, ge=0, le=1, example=0)
    systolicBP: int = Field(..., ge=50, le=250, example=135)
    diastolicBP: int = Field(..., ge=30, le=150, example=85)
    cholesterol: int = Field(..., ge=50, le=500, example=215)
    bloodSugar: int = Field(default=95, ge=30, le=500, example=105)
    bmi: float = Field(default=25.5, ge=5, le=100, example=25.5)
    exerciseFrequency: int = Field(default=3, ge=0, le=7, example=2)
    smoking: int = Field(default=0, ge=0, le=1, example=0)

@app.post("/recommendations")
def get_recommendations(request: RecommendationRequest):
    """
    Returns personalized lifestyle, diet, and exercise recommendations
    based on patient risk level and biometric factors.
    """
    risk = request.riskLevel.upper()
    smoking = request.smoking == 1
    high_bp = request.systolicBP >= 140 or request.diastolicBP >= 90
    high_chol = request.cholesterol >= 240
    obese = request.bmi >= 30
    low_exercise = request.exerciseFrequency < 2

    diet = ["Maintain DASH / Mediterranean diet low in saturated fats and refined sugars.",
            "Restrict daily sodium intake to under 1,500 - 2,000 mg."]
    if high_chol:
        diet.append("Limit dietary cholesterol. Avoid trans fats and processed meats.")
    if obese:
        diet.append("Reduce daily caloric intake by 500 kcal. Increase fibre intake from whole grains.")
    if request.bloodSugar > 126:
        diet.append("Follow a low-glycaemic-index diet. Restrict simple sugars and sweetened beverages.")

    exercise = ["Engage in 150 minutes of moderate-intensity aerobic exercise (brisk walking, cycling) weekly.",
                "Include light resistance training 2 days per week."]
    if risk in ("HIGH", "CRITICAL"):
        exercise = ["Begin with 20-30 minutes of low-intensity walking daily under physician supervision.",
                    "Avoid strenuous exertion. Schedule a cardiac stress test before escalating intensity."]
    elif low_exercise:
        exercise.append("Start with 10-minute walks, gradually increasing duration each week.")

    lifestyle = ["Target 7-8 hours of restful sleep daily to regulate cortisol and resting heart rate.",
                 "Schedule annual lipid profiles and ECG screenings."]
    if smoking:
        lifestyle.insert(0, "Immediate smoking cessation is the single most impactful cardiovascular intervention.")
    if high_bp:
        lifestyle.append("Monitor blood pressure at home twice daily. Report readings above 140/90 mmHg to your physician.")
    if risk in ("HIGH", "CRITICAL"):
        lifestyle.append("Consult a cardiologist for a comprehensive cardiac risk evaluation within 30 days.")

    weekly_goal = "Complete 150 minutes of light active exercise."
    if risk in ("HIGH", "CRITICAL"):
        weekly_goal = "Complete 3 guided low-intensity walks of 20 minutes each, with physician clearance."
    elif risk == "MODERATE":
        weekly_goal = "Complete 5 brisk 30-minute aerobic sessions and 2 resistance training sessions."

    return {
        "diet": diet,
        "exercise": exercise,
        "lifestyle": lifestyle,
        "weeklyGoal": weekly_goal
    }


@app.post("/predict")
def run_unified_prediction(request: UnifiedPatientRequest):
    """
    Master AI Pipeline Orchestrator Endpoint.
    Runs all 5 multi-dataset models and returns full Digital Twin prediction response.
    """
    try:
        patient_data = request.dict()
        print(f"[FastAPI /predict] Received patient features: {patient_data}", flush=True)
        orch = get_orchestrator()
        result = orch.orchestrate_prediction(patient_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict-heart-risk")
def predict_heart_risk(request: UnifiedPatientRequest):
    """Dataset 1: Framingham 10-Year Cardiovascular Disease Risk Model."""
    try:
        orch = get_orchestrator()
        prob = orch.run_framingham_predict(request.dict())
        return {
            "modelDomain": "Framingham Heart Study",
            "tenYearCHDProbability": round(prob, 4),
            "riskScore": round(prob * 100.0, 1),
            "riskLevel": "HIGH" if prob > 0.3 else "MODERATE" if prob > 0.15 else "LOW"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-heart-failure")
def predict_heart_failure(request: UnifiedPatientRequest):
    """Dataset 3: Heart Failure Clinical Records & Pumping Efficiency Model."""
    try:
        orch = get_orchestrator()
        prob, ef = orch.run_heart_failure_predict(request.dict())
        return {
            "modelDomain": "Heart Failure Clinical Records",
            "heartFailureProbability": round(prob, 4),
            "estimatedEjectionFraction": round(ef, 1),
            "pumpingEfficiency": round(ef * 0.95 + (1.0 - prob) * 10, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-stroke")
def predict_stroke(request: UnifiedPatientRequest):
    """Dataset 4: Stroke Risk & Brain Health Model."""
    try:
        orch = get_orchestrator()
        prob = orch.run_stroke_predict(request.dict())
        return {
            "modelDomain": "Stroke Prediction Dataset",
            "strokeProbability": round(prob, 4),
            "brainHealthScore": int(max(20, 100 - prob * 80))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-ecg")
def predict_ecg(request: UnifiedPatientRequest):
    """Dataset 5: PhysioNet ECG Waveform Feature Model."""
    try:
        orch = get_orchestrator()
        status = orch.run_ecg_predict(request.dict())
        return {
            "modelDomain": "PhysioNet ECG Feature Dataset",
            "ecgStatus": status,
            "restingHeartRate": request.heartRate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-status")
def get_model_status():
    """Returns active loaded models, versions, and system readiness."""
    orch = get_orchestrator()
    loaded = list(orch.models.keys())
    return {
        "status": "online",
        "loaded_models_count": len(loaded),
        "loaded_models": loaded,
        "supported_datasets": [
            "Framingham Heart Study",
            "Cardiovascular Disease (Kaggle)",
            "Heart Failure Clinical Records",
            "Stroke Prediction Dataset",
            "PhysioNet ECG Feature Dataset"
        ],
        "explainable_ai_enabled": True
    }

@app.get("/model-metrics")
def get_model_metrics():
    """Returns stored training & evaluation metrics benchmark table."""
    metrics_path = "ai/reports/model_benchmark_metrics.json"
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            data = json.load(f)
        return data
    return {"message": "Metrics report not generated yet. Run pipeline training first."}


# ── Digital Twin Endpoints ──────────────────────────────────────────────────

from digital_twin.state_vector import StateVectorManager, DIM_NAMES, DIM_UNITS, NORMAL_RANGES
from digital_twin.mace_predictor import HybridMACEPredictor
from digital_twin.simulator import CardiovascularSimulator

# In-memory patient state managers
_patient_states: Dict[str, StateVectorManager] = {}
_mace_predictor = HybridMACEPredictor()


class DigitalTwinInitRequest(BaseModel):
    patient_id: str = Field(default="demo_patient", example="demo_patient")
    profile: str = Field(default="moderate_risk", description="healthy | moderate_risk | high_risk")
    demographics: Optional[Dict[str, float]] = None
    labs: Optional[Dict[str, float]] = None
    wearable: Optional[Dict[str, float]] = None


class DigitalTwinUpdateRequest(BaseModel):
    patient_id: str = Field(default="demo_patient")
    observations: Dict[str, float] = Field(..., example={"heart_rate": 76, "spo2": 97})


@app.post("/digital-twin/initialize")
def initialize_digital_twin(request: DigitalTwinInitRequest):
    """Initialize a patient's digital twin state vector."""
    pid = request.patient_id

    # Create simulator for initial data if not provided
    sim = CardiovascularSimulator(request.profile)

    demographics = request.demographics or sim.generate_demographics()
    labs = request.labs or sim.generate_lab_results()
    wearable = request.wearable or sim.generate_wearable_reading()

    manager = StateVectorManager(pid)
    manager.initialize(demographics, labs, wearable)

    # Pre-populate with simulated history (6 hours = 72 ticks)
    history_readings = sim.generate_history(72)
    for reading in history_readings:
        manager.update(reading)

    _patient_states[pid] = manager

    # Run initial MACE prediction
    current = manager.get_current_state()
    mace_result = _mace_predictor.predict(current, manager.history)

    return {
        "status": "initialized",
        "patient_id": pid,
        "profile": request.profile,
        "state_summary": manager.get_state_summary(),
        "mace_prediction": mace_result.to_dict(),
        "history_length": len(manager.history),
    }


@app.post("/digital-twin/update")
def update_digital_twin(request: DigitalTwinUpdateRequest):
    """Push new wearable/lab observations and trigger EKF update."""
    pid = request.patient_id
    if pid not in _patient_states:
        raise HTTPException(status_code=404, detail=f"Patient {pid} not initialized. Call /digital-twin/initialize first.")

    manager = _patient_states[pid]
    snapshot = manager.update(request.observations)

    # Re-run MACE prediction
    mace_result = _mace_predictor.predict(snapshot, manager.history)

    return {
        "status": "updated",
        "patient_id": pid,
        "state_summary": manager.get_state_summary(),
        "mace_prediction": mace_result.to_dict(),
    }


@app.get("/digital-twin/state/{patient_id}")
def get_digital_twin_state(patient_id: str, history_length: int = 72):
    """Get current state vector and recent history."""
    if patient_id not in _patient_states:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    manager = _patient_states[patient_id]
    current = manager.get_current_state()

    mace_result = _mace_predictor.predict(current, manager.history)

    return {
        "patient_id": patient_id,
        "state_summary": manager.get_state_summary(),
        "mace_prediction": mace_result.to_dict(),
        "history": manager.get_history(history_length),
        "dim_names": DIM_NAMES,
        "dim_units": DIM_UNITS,
        "normal_ranges": {name: list(NORMAL_RANGES[name]) for name in DIM_NAMES},
    }


@app.post("/digital-twin/predict-mace")
def predict_mace(patient_id: str = "demo_patient"):
    """Run hybrid XGBoost-LSTM MACE prediction on current state."""
    if patient_id not in _patient_states:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    manager = _patient_states[patient_id]
    current = manager.get_current_state()
    result = _mace_predictor.predict(current, manager.history)

    return {
        "patient_id": patient_id,
        "prediction": result.to_dict(),
    }
