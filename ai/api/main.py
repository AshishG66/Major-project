from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import sys

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from preprocessing.generate_data import generate_synthetic_data
from models.prediction.train import train_model
from models.prediction.predict import HeartDiseasePredictor
from api.explainability import router as explainability_router

app = FastAPI(
    title="HridyaDarpan AI Service",
    description="Microservice for cardiovascular prediction, SHAP explainable features, what-if simulations, trend analysis, and rule-based prevention recommendations.",
    version="2.0.0"
)

# Mount explainability router
app.include_router(explainability_router, tags=["Explainability"])

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class PredictionRequest(BaseModel):
    age: int = Field(..., ge=0, le=120)
    gender: int = Field(..., ge=0, le=1) # 0: Male, 1: Female
    height: float = Field(..., ge=50, le=250)
    weight: float = Field(..., ge=10, le=300)
    bmi: float = Field(..., ge=5, le=100)
    systolicBP: int = Field(..., ge=50, le=250)
    diastolicBP: int = Field(..., ge=30, le=150)
    cholesterol: int = Field(..., ge=50, le=500)
    heartRate: int = Field(..., ge=30, le=220)
    bloodSugar: int = Field(..., ge=30, le=500)
    ecgResult: int = Field(..., ge=0, le=2) # 0: Normal, 1: ST-T, 2: LVH
    exerciseFrequency: int = Field(..., ge=0, le=7)
    smoking: int = Field(..., ge=0, le=1)
    alcohol: int = Field(..., ge=0, le=1)
    diabetes: int = Field(..., ge=0, le=1)
    familyHistory: int = Field(..., ge=0, le=1)
    chestPainType: int = Field(..., ge=0, le=3) # 0: Typical, 1: Atypical, 2: Non-Anginal, 3: Asymptomatic
    sleepDuration: float = Field(..., ge=0, le=24)
    stressLevel: int = Field(..., ge=1, le=10)

class RecommendationRequest(BaseModel):
    riskLevel: str
    age: int
    gender: int
    systolicBP: int
    diastolicBP: int
    cholesterol: int
    bloodSugar: int
    bmi: float
    exerciseFrequency: int
    smoking: int

# Initialize predictor globally
predictor = None

def get_predictor():
    global predictor
    if predictor is not None:
        return predictor
        
    model_dir = "ai/models/prediction/"
    model_path = os.path.join(model_dir, "heart_best_model.joblib")
    
    if not os.path.exists(model_path):
        print("Model assets not found. Autogen/training triggered...")
        data_path = "ai/data/heart_data.csv"
        if not os.path.exists(data_path):
            generate_synthetic_data(num_samples=5000, output_path=data_path)
        train_model(data_path=data_path, model_dir=model_dir)
        
    predictor = HeartDiseasePredictor(model_dir=model_dir)
    return predictor

@app.on_event("startup")
def startup_event():
    # Trigger predictor initialization to train model if not present
    try:
        get_predictor()
        print("FastAPI Predictor loaded successfully.")
    except Exception as e:
        print(f"Error during startup predictor initialization: {e}")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "HridyaDarpan AI"}

@app.post("/predict")
def run_prediction(request: PredictionRequest):
    try:
        p = get_predictor()
        result = p.predict(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommendations")
def get_recommendations(request: RecommendationRequest):
    """
    Generate rule-based cardiovascular disease prevention guidelines.
    """
    risk = request.riskLevel.upper()
    diet = []
    exercise = []
    lifestyle = []
    
    # Diet suggestions
    if request.cholesterol > 200:
        diet.append("Reduce saturated fats and dietary cholesterol. Limit red meat, butter, and processed foods.")
        diet.append("Increase soluble fiber intake by consuming oats, barley, beans, and lentils.")
    if request.systolicBP > 130 or request.diastolicBP > 80:
        diet.append("Follow the DASH diet. Restrict daily sodium intake to under 1,500 - 2,000 mg.")
        diet.append("Eat potassium-rich foods like bananas, spinach, avocados, and sweet potatoes to help lower blood pressure.")
    if request.bloodSugar > 100:
        diet.append("Avoid refined carbohydrates and sugar-sweetened beverages. Emphasize low-glycemic complex carbs.")
        diet.append("Ensure balanced meals containing healthy fats, clean protein, and fiber to stabilize insulin curves.")
    if request.bmi > 25:
        diet.append("Aim for a caloric deficit (reduce 300-500 kcal/day). Control portion sizes.")
        
    if not diet:
        diet.append("Maintain a balanced Mediterranean diet rich in fresh vegetables, fruits, whole grains, nuts, and olive oil.")
        diet.append("Stay hydrated. Drink 2.5 to 3 liters of water daily.")

    # Exercise recommendations
    if risk == "HIGH":
        exercise.append("Avoid heavy, high-intensity workouts without physician clearance.")
        exercise.append("Aim for 30 minutes of low-impact cardiovascular activity (brisk walking, light cycling, swimming) 5 days a week.")
    elif risk == "MODERATE":
        exercise.append("Perform moderate-intensity aerobic exercise for 30-45 minutes (jogging, active cycling, rowing) 4-5 days a week.")
        exercise.append("Include light resistance training 2 days a week to build cardiovascular endurance.")
    else: # LOW
        exercise.append("Engage in 150 minutes of moderate or 75 minutes of vigorous cardiovascular exercise weekly.")
        exercise.append("Include strength training exercises (bodyweight, weights, or resistance bands) at least 2-3 times per week.")

    if request.exerciseFrequency < 3:
        exercise.append("Start slow: initiate with 10-15 minute walk intervals and progressively build duration.")

    # Lifestyle advice
    if request.smoking == 1:
        lifestyle.append("Smoking is a critical heart disease accelerator. Seek counseling or nicotine replacement therapies to quit completely.")
    if request.bmi > 25:
        lifestyle.append(f"Your BMI is {request.bmi:.1f} (Overweight/Obese). Target a gradual 5-10% body weight reduction to lower strain on the heart.")
    if request.age > 50:
        lifestyle.append("Schedule yearly electrocardiograms (ECG) and lipid profiles.")
        
    lifestyle.append("Maintain consistent sleep routines, targeting 7-8 hours of uninterrupted rest to regulate stress hormones.")
    lifestyle.append("Implement daily stress reduction practices (mindfulness meditation, deep breathing exercises, yoga) for 10-15 minutes.")

    return {
        "diet": diet,
        "exercise": exercise,
        "lifestyle": lifestyle,
        "weeklyGoal": "Increase cardio active minutes by 15% and track daily blood pressure trends." if risk != "LOW" else "Maintain current activity levels and complete weekly cardiovascular reviews."
    }
