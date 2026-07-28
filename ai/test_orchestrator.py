import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from orchestrator.pipeline_orchestrator import UnifiedAIOrchestrator

def test_pipeline():
    print("Initializing Unified AI Orchestrator...")
    orch = UnifiedAIOrchestrator(models_dir="ai/models/")
    
    sample_patient = {
        "age": 55,
        "gender": 0, # Male
        "height": 175.0,
        "weight": 82.0,
        "bmi": 26.8,
        "systolicBP": 138,
        "diastolicBP": 88,
        "cholesterol": 225,
        "heartRate": 76,
        "bloodSugar": 110,
        "exerciseFrequency": 2,
        "smoking": 1,
        "alcohol": 0,
        "diabetes": 0,
        "familyHistory": 1,
        "chestPainType": 0,
        "sleepDuration": 6.5,
        "stressLevel": 7,
        "ejectionFraction": 52.0,
        "serumCreatinine": 1.2,
        "stElevation": 0.1
    }

    print("\nExecuting Orchestrated Prediction...")
    result = orch.orchestrate_prediction(sample_patient)
    
    print("\n" + "=" * 60)
    print("UNIFIED AI PREDICTION RESPONSE (DIGITAL TWIN UI PAYLOAD)")
    print("=" * 60)
    print(json.dumps(result, indent=2))
    print("=" * 60)

    # Verification Assertions
    assert "riskScore" in result
    assert "riskLevel" in result
    assert "heartDiseaseProbability" in result
    assert "heartFailureProbability" in result
    assert "strokeProbability" in result
    assert "heartHealth" in result
    assert "organHealth" in result
    assert "predictedSymptoms" in result
    assert "affectedOrgans" in result
    assert "diseaseProgression" in result
    assert "recoveryScore" in result
    assert "featureImportance" in result
    assert "recommendations" in result
    assert "clinicalSummary" in result
    print("\n[PASSED] All required JSON schema fields successfully validated!")

if __name__ == "__main__":
    test_pipeline()
