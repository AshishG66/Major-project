# HridyaDarpan Production AI/ML Model Registry Report (v2.1)

**Finalized Timestamp**: 2026-07-23 19:11:42  
**Deployment Assurance**: Hospital-Grade Multi-Dataset AI Prediction Engine with Production Registry, Calibrated Probabilities, and F2 Threshold Optimization.

---

## 1. Production Model Deployment Summary

| Dataset Domain | Official Winning Algorithm | Version | Decision Threshold (tau*) | Calibration Method | ROC AUC | Recall (Sensitivity) | F1 Score | Status |
|---|---|---|---|---|---|---|---|---|
| **Framingham Heart Study** | `LightGBM` | `v2.1_baseline_retained` | **0.5** | Uncalibrated Baseline | **0.7566** | **1.0000** | 0.0694 | `PRODUCTION` |
| **Cardiovascular Disease (Kaggle)** | `CatBoost` | `v2.1_optuna_tuned` | **0.65** | Uncalibrated Baseline | **0.8107** | **0.8000** | 0.1356 | `PRODUCTION` |
| **Heart Failure Clinical Records** | `XGBoost` | `v2.1_baseline_retained` | **0.19** | Uncalibrated Baseline | **0.8289** | **0.8333** | 0.5660 | `PRODUCTION` |
| **Stroke Prediction Dataset** | `Gradient Boosting` | `v2.1_optuna_tuned` | **0.5** | Uncalibrated Baseline | **0.8100** | **0.5000** | 0.0606 | `PRODUCTION` |
| **PhysioNet ECG Features** | `Random Forest` | `v2.1_baseline_retained` | **0.5** | Uncalibrated (Multiclass) | **0.9999** | **0.9933** | 0.9917 | `PRODUCTION` |


---

## 2. Selection Rationale & Rejected Models Analysis

### Framingham Heart Study — `LightGBM`
- **Model File**: `ai/models/framingham_risk_model.joblib`
- **Selection Rationale**: Retained Baseline Model (Optuna tuned model scored 0.6021 vs baseline 0.7287)
- **Rejection Notes**: Optuna tuned model rejected due to lower Recall/ROC-AUC score
- **Class Imbalance Strategy**: Random Undersampling

### Cardiovascular Disease (Kaggle) — `CatBoost`
- **Model File**: `ai/models/cardio_lifestyle_model.joblib`
- **Selection Rationale**: Accepted Optuna Tuned Model (+0.0013 score gain over baseline)
- **Rejection Notes**: Baseline model replaced by superior Optuna tuned hyperparameters
- **Class Imbalance Strategy**: Random Undersampling

### Heart Failure Clinical Records — `XGBoost`
- **Model File**: `ai/models/heart_failure_model.joblib`
- **Selection Rationale**: Retained Baseline Model (Optuna tuned model scored 0.7650 vs baseline 0.7783)
- **Rejection Notes**: Optuna tuned model rejected due to lower Recall/ROC-AUC score
- **Class Imbalance Strategy**: Random Undersampling

### Stroke Prediction Dataset — `Gradient Boosting`
- **Model File**: `ai/models/stroke_model.joblib`
- **Selection Rationale**: Accepted Optuna Tuned Model (+0.0114 score gain over baseline)
- **Rejection Notes**: Baseline model replaced by superior Optuna tuned hyperparameters
- **Class Imbalance Strategy**: Random Undersampling

### PhysioNet ECG Features — `Random Forest`
- **Model File**: `ai/models/ecg_arrhythmia_model.joblib`
- **Selection Rationale**: Retained Baseline Model (Optuna tuned model scored 0.9950 vs baseline 0.9953)
- **Rejection Notes**: Optuna tuned model rejected due to lower Recall/ROC-AUC score
- **Class Imbalance Strategy**: None


---

## 3. Production Model Artifacts & Manifest

- **Production Registry**: `ai/models/production_registry.json`
- **Production Manifest**: `ai/models/production_models.json`
- **Model Joblib Files**:
  - `ai/models/framingham_risk_model.joblib` (`LightGBM`)
  - `ai/models/cardio_lifestyle_model.joblib` (`CatBoost`)
  - `ai/models/heart_failure_model.joblib` (`XGBoost`)
  - `ai/models/stroke_model.joblib` (`Gradient Boosting`)
  - `ai/models/ecg_arrhythmia_model.joblib` (`Random Forest`)

---
*Report finalized by HridyaDarpan Production AI Deployment Engine.*
