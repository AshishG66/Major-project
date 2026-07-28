import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

AI_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(AI_DIR)

from datasets.dataset_loader import DatasetLoader
from preprocessing.preprocessor import ClinicalDataPreprocessor
from fastapi.testclient import TestClient
from api.main import app

def run_v2_verification():
    print("=" * 80)
    print("   HRIDYADARPAN CLINICAL AI PIPELINE v2.0 EMPIRICAL VERIFICATION EVIDENCE")
    print("=" * 80)

    loader = DatasetLoader(data_dir=os.path.join(AI_DIR, "datasets"))
    
    datasets = [
        ("Framingham Heart Study", loader.load_framingham, "TenYearCHD", "framingham_risk_model.joblib"),
        ("Cardiovascular Disease (Kaggle)", loader.load_cardiovascular_disease, "cardio", "cardio_lifestyle_model.joblib"),
        ("Heart Failure Clinical Records", loader.load_heart_failure, "DEATH_EVENT", "heart_failure_model.joblib"),
        ("Stroke Prediction Dataset", loader.load_stroke_prediction, "stroke", "stroke_model.joblib"),
        ("PhysioNet ECG Features", loader.load_physionet_ecg, "ecg_arrhythmia", "ecg_arrhythmia_model.joblib"),
    ]

    for name, load_fn, target_col, joblib_name in datasets:
        print("\n" + "=" * 80)
        print(f"DATASET VERIFICATION v2.0: {name.upper()}")
        print("=" * 80)

        df = load_fn()
        n_samples, n_cols = df.shape
        preprocessor = ClinicalDataPreprocessor(target_column=target_col)
        X_proc, y_proc = preprocessor.fit_transform(df)
        n_features = len(preprocessor.feature_names)

        X_train, X_val, X_test, y_train, y_val, y_test = preprocessor.split_data(
            X_proc, y_proc, train_size=0.8, val_size=0.1, test_size=0.1, random_state=42
        )

        class_dist = pd.Series(y_proc).value_counts().to_dict()

        model_path = os.path.join(AI_DIR, "models", joblib_name)
        assert os.path.exists(model_path), f"ERROR: Missing model bundle {model_path}"
        bundle = joblib.load(model_path)
        
        best_model_name = bundle["model_name"]
        winning_model = bundle["model"]
        metrics = bundle["metrics"]
        opt_tau = bundle.get("optimal_threshold", 0.50)
        calib_meth = bundle.get("calibration_method", "Uncalibrated Baseline")
        imb_meth = bundle.get("imbalance_method", "None")
        cv_5fold = bundle.get("cv_metrics_5fold", {})
        cv_10fold = bundle.get("cv_metrics_10fold", {})
        bootstrap_ci = bundle.get("bootstrap_ci_95", {})
        err_analysis = bundle.get("error_analysis", {})

        print(f"1. Dataset Name:            {name}")
        print(f"2. Number of Samples:        {n_samples}")
        print(f"3. Number of Features:       {n_features} (Processed from {n_cols - 1} raw attributes)")
        print(f"4. Train/Val/Test Split:     Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")
        print(f"5. Class Distribution:       {class_dist}")
        print(f"6. Class Imbalance Handling: {imb_meth}")
        print(f"7. Best Model Selected:      {best_model_name}")
        print(f"8. Calibration Method:       {calib_meth}")
        print(f"9. Optimal Decision tau*:   {opt_tau:.2f}")
        print(f"10. Accuracy:                {metrics['accuracy']:.4f}")
        print(f"11. Precision:               {metrics['precision']:.4f}")
        print(f"12. Recall (Sensitivity):    {metrics['recall']:.4f}")
        print(f"13. F1 Score:                {metrics['f1_score']:.4f}")
        print(f"14. ROC-AUC Score:          {metrics['roc_auc']:.4f}")
        print(f"15. False Negative Rate:     {metrics['false_negative_rate']:.4f}")
        print(f"16. 5-Fold CV ROC-AUC:       {cv_5fold.get('roc_auc', {}).get('formatted_ci', 'N/A')}")
        print(f"17. 10-Fold CV ROC-AUC:      {cv_10fold.get('roc_auc', {}).get('formatted_ci', 'N/A')}")
        print(f"18. Bootstrap 95% CI (AUC):  {bootstrap_ci.get('roc_auc_ci', {}).get('formatted_ci', 'N/A')}")
        print(f"19. Permutation Importance:  {err_analysis.get('permutation_importance', 'N/A')}")

    print("\n" + "=" * 80)
    print("DIRECTORY & ARTIFACT MANIFEST VERIFICATION")
    print("=" * 80)

    # Confirm models/ files
    print("\n[AI/MODELS/]")
    models_path = os.path.join(AI_DIR, "models")
    for f in os.listdir(models_path):
        fp = os.path.join(models_path, f)
        if os.path.isfile(fp):
            print(f"  - ai/models/{f} ({os.path.getsize(fp) / 1024:.1f} KB)")

    expected_models = [
        "framingham_risk_model.joblib",
        "cardio_lifestyle_model.joblib",
        "heart_failure_model.joblib",
        "stroke_model.joblib",
        "ecg_arrhythmia_model.joblib"
    ]
    for em in expected_models:
        exists = os.path.exists(os.path.join(models_path, em))
        print(f"  Confirming {em}: {'[VERIFIED EXISTS]' if exists else '[MISSING]'}")

    # Confirm reports/ files
    print("\n[AI/REPORTS/]")
    reports_path = os.path.join(AI_DIR, "reports")
    for f in os.listdir(reports_path):
        fp = os.path.join(reports_path, f)
        if os.path.isfile(fp):
            print(f"  - ai/reports/{f} ({os.path.getsize(fp) / 1024:.1f} KB)")

    confirm_reports = [
        "data_leakage_report.md",
        "final_model_report.md",
        "model_benchmark_metrics.json",
        "framingham_roc_curves.png",
        "cardio_disease_roc_curves.png",
        "heart_failure_roc_curves.png",
        "stroke_risk_roc_curves.png",
        "framingham_threshold_tuning.png",
        "cardio_disease_threshold_tuning.png",
        "heart_failure_threshold_tuning.png",
        "stroke_risk_threshold_tuning.png",
        "framingham_calibration_curve.png",
        "cardio_disease_calibration_curve.png",
        "heart_failure_calibration_curve.png",
        "stroke_risk_calibration_curve.png",
        "framingham_permutation_importance.png",
        "cardio_disease_permutation_importance.png",
        "heart_failure_permutation_importance.png",
        "stroke_risk_permutation_importance.png",
        "ecg_analysis_permutation_importance.png",
        "framingham_shap_summary.png",
        "cardio_disease_shap_summary.png",
        "stroke_risk_shap_summary.png",
        "ecg_analysis_shap_summary.png"
    ]
    for cr in confirm_reports:
        exists = os.path.exists(os.path.join(reports_path, cr))
        print(f"  Confirming {cr}: {'[VERIFIED EXISTS]' if exists else '[MISSING]'}")

    print("\n" + "=" * 80)
    print("EXECUTING 20 DIVERSE PATIENT PROFILE PREDICTIONS (POST /predict)")
    print("=" * 80)

    client = TestClient(app)
    
    profiles = [
        {"name": "Profile 1: Young Fit Female", "age": 24, "gender": 1, "systolicBP": 110, "diastolicBP": 70, "cholesterol": 165, "bmi": 21.0, "smoking": 0, "exerciseFrequency": 5, "ejectionFraction": 65.0},
        {"name": "Profile 2: Young Fit Male", "age": 28, "gender": 0, "systolicBP": 115, "diastolicBP": 75, "cholesterol": 175, "bmi": 22.5, "smoking": 0, "exerciseFrequency": 4, "ejectionFraction": 62.0},
        {"name": "Profile 3: Middle-Age Active", "age": 42, "gender": 1, "systolicBP": 122, "diastolicBP": 78, "cholesterol": 190, "bmi": 24.0, "smoking": 0, "exerciseFrequency": 3, "ejectionFraction": 60.0},
        {"name": "Profile 4: Borderline Hypertension", "age": 49, "gender": 0, "systolicBP": 136, "diastolicBP": 86, "cholesterol": 210, "bmi": 26.5, "smoking": 0, "exerciseFrequency": 2, "ejectionFraction": 56.0},
        {"name": "Profile 5: Hypertensive Smoker", "age": 54, "gender": 0, "systolicBP": 148, "diastolicBP": 94, "cholesterol": 235, "bmi": 28.2, "smoking": 1, "exerciseFrequency": 1, "ejectionFraction": 52.0},
        {"name": "Profile 6: Diabetic & Overweight", "age": 58, "gender": 1, "systolicBP": 142, "diastolicBP": 90, "cholesterol": 245, "bmi": 31.5, "smoking": 0, "exerciseFrequency": 1, "ejectionFraction": 50.0},
        {"name": "Profile 7: High Risk Male Smoker", "age": 62, "gender": 0, "systolicBP": 156, "diastolicBP": 98, "cholesterol": 265, "bmi": 29.8, "smoking": 1, "exerciseFrequency": 0, "ejectionFraction": 46.0},
        {"name": "Profile 8: Severe Cardiac Risk", "age": 67, "gender": 0, "systolicBP": 168, "diastolicBP": 104, "cholesterol": 285, "bmi": 33.0, "smoking": 1, "exerciseFrequency": 0, "ejectionFraction": 40.0},
        {"name": "Profile 9: Critical Heart Failure", "age": 72, "gender": 1, "systolicBP": 172, "diastolicBP": 108, "cholesterol": 295, "bmi": 34.5, "smoking": 1, "exerciseFrequency": 0, "ejectionFraction": 32.0},
        {"name": "Profile 10: Post-Stroke Senior", "age": 76, "gender": 0, "systolicBP": 162, "diastolicBP": 96, "cholesterol": 240, "bmi": 27.5, "smoking": 0, "exerciseFrequency": 0, "ejectionFraction": 44.0},
        {"name": "Profile 11: Young Smoker High Stress", "age": 31, "gender": 0, "systolicBP": 128, "diastolicBP": 82, "cholesterol": 205, "bmi": 25.0, "smoking": 1, "exerciseFrequency": 2, "ejectionFraction": 58.0},
        {"name": "Profile 12: Obese Non-Smoker", "age": 45, "gender": 1, "systolicBP": 138, "diastolicBP": 88, "cholesterol": 220, "bmi": 35.2, "smoking": 0, "exerciseFrequency": 1, "ejectionFraction": 54.0},
        {"name": "Profile 13: Athlete Low BP", "age": 26, "gender": 0, "systolicBP": 104, "diastolicBP": 66, "cholesterol": 155, "bmi": 21.8, "smoking": 0, "exerciseFrequency": 6, "ejectionFraction": 68.0},
        {"name": "Profile 14: Moderate Risk Female", "age": 53, "gender": 1, "systolicBP": 134, "diastolicBP": 84, "cholesterol": 215, "bmi": 26.0, "smoking": 0, "exerciseFrequency": 2, "ejectionFraction": 56.0},
        {"name": "Profile 15: Elderly Normal BP", "age": 70, "gender": 1, "systolicBP": 124, "diastolicBP": 76, "cholesterol": 195, "bmi": 23.5, "smoking": 0, "exerciseFrequency": 3, "ejectionFraction": 58.0},
        {"name": "Profile 16: Isolated Systolic HTN", "age": 65, "gender": 0, "systolicBP": 160, "diastolicBP": 78, "cholesterol": 230, "bmi": 26.8, "smoking": 0, "exerciseFrequency": 2, "ejectionFraction": 50.0},
        {"name": "Profile 17: Hypercholesterolemia", "age": 38, "gender": 0, "systolicBP": 120, "diastolicBP": 78, "cholesterol": 310, "bmi": 24.5, "smoking": 0, "exerciseFrequency": 3, "ejectionFraction": 60.0},
        {"name": "Profile 18: Heavy Alcohol & Smoking", "age": 51, "gender": 0, "systolicBP": 152, "diastolicBP": 95, "cholesterol": 255, "bmi": 29.0, "smoking": 1, "exerciseFrequency": 0, "ejectionFraction": 48.0},
        {"name": "Profile 19: Pre-Diabetic Male", "age": 47, "gender": 0, "systolicBP": 132, "diastolicBP": 84, "cholesterol": 210, "bmi": 27.0, "smoking": 0, "exerciseFrequency": 2, "ejectionFraction": 57.0},
        {"name": "Profile 20: Extreme Multi-Risk", "age": 78, "gender": 0, "systolicBP": 185, "diastolicBP": 115, "cholesterol": 340, "bmi": 36.0, "smoking": 1, "exerciseFrequency": 0, "ejectionFraction": 28.0}
    ]

    print(f"\nRunning {len(profiles)} Patient Profiles to confirm dynamic risk score variation:\n")
    print(f"{'Profile Name':<35} | {'Risk Score':<10} | {'Risk Level':<10} | {'10Y CHD Prob':<12} | {'HF Prob':<10} | {'Confidence':<10}")
    print("-" * 95)

    for p in profiles:
        payload = {
            "age": p["age"],
            "gender": p["gender"],
            "height": 172.0,
            "weight": p["bmi"] * (1.72**2),
            "bmi": p["bmi"],
            "systolicBP": p["systolicBP"],
            "diastolicBP": p["diastolicBP"],
            "cholesterol": p["cholesterol"],
            "heartRate": 72,
            "bloodSugar": 105,
            "exerciseFrequency": p["exerciseFrequency"],
            "smoking": p["smoking"],
            "alcohol": 0,
            "diabetes": 0,
            "familyHistory": 0,
            "chestPainType": 0,
            "sleepDuration": 7.0,
            "stressLevel": 5,
            "ejectionFraction": p["ejectionFraction"],
            "serumCreatinine": 1.0,
            "stElevation": 0.05
        }

        resp = client.post("/predict", json=payload)
        data = resp.json()

        print(f"{p['name']:<35} | {data['riskScore']:<10.1f} | {data['riskLevel']:<10} | {data['heartDiseaseProbability']:<12.4f} | {data['heartFailureProbability']:<10.4f} | {data['predictionConfidence']:<10.2f}")

    print("\n" + "=" * 80)
    print("ACTUAL DIGITAL TWIN JSON RESPONSE FOR PROFILE 8 (Severe Cardiac Risk):")
    print("=" * 80)
    
    sample_payload_8 = {
        "age": 67, "gender": 0, "height": 175.0, "weight": 101.0, "bmi": 33.0,
        "systolicBP": 168, "diastolicBP": 104, "cholesterol": 285, "heartRate": 88,
        "bloodSugar": 145, "exerciseFrequency": 0, "smoking": 1, "alcohol": 1,
        "diabetes": 1, "familyHistory": 1, "chestPainType": 2, "sleepDuration": 5.5,
        "stressLevel": 9, "ejectionFraction": 40.0, "serumCreatinine": 1.8, "stElevation": 0.8
    }
    resp_8 = client.post("/predict", json=sample_payload_8)
    print(json.dumps(resp_8.json(), indent=2))
    print("=" * 80)

if __name__ == "__main__":
    run_v2_verification()
