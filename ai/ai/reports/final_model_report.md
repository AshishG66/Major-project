# HridyaDarpan Clinical AI/ML Pipeline Benchmark Report

**Generated Date**: 2026-07-23 18:36:02  
**Architecture**: Hospital-Grade Multi-Dataset AI Prediction Engine with Automated Model Selection & SHAP XAI.

---

## 1. Executive Summary & Winning Models

| Dataset Domain | Winning Model | ROC AUC | F1 Score | Recall (Sensitivity) | FNR | Inference Speed (ms) |
|---|---|---|---|---|---|---|
| **Framingham Heart Study** | `CatBoost` | **0.7837** | **0.0000** | 0.0000 | 1.0000 | 5.92 ms |
| **Cardiovascular Disease (Kaggle)** | `Decision Tree` | **0.7219** | **0.1739** | 0.1333 | 0.8667 | 1.35 ms |
| **Heart Failure Clinical Records** | `XGBoost` | **0.8353** | **0.6095** | 0.5926 | 0.4074 | 8.07 ms |
| **Stroke Prediction Dataset** | `Gradient Boosting` | **0.7626** | **0.0000** | 0.0000 | 1.0000 | 3.16 ms |
| **PhysioNet ECG Features** | `Random Forest` | **0.9999** | **0.9917** | 0.9933 | 0.0067 | 136.01 ms |


---

## 2. Complete 40-Model Benchmark Comparison Table

| Dataset | Model | ROC AUC | F1 Score | Accuracy | Recall | FNR | Train Time (s) | Inference (ms) |
|---|---|---|---|---|---|---|---|---|
| Framingham Heart Study | Logistic Regression | 0.7634 | 0.0000 | 0.9833 | 0.0000 | 1.0000 | 0.008 | 1.89 |
| Framingham Heart Study | Decision Tree | 0.5685 | 0.0000 | 0.9733 | 0.0000 | 1.0000 | 0.016 | 2.31 |
| Framingham Heart Study | Random Forest | 0.6007 | 0.0000 | 0.9833 | 0.0000 | 1.0000 | 0.342 | 80.79 |
| Framingham Heart Study | Gradient Boosting | 0.7180 | 0.0000 | 0.9800 | 0.0000 | 1.0000 | 0.672 | 2.30 |
| Framingham Heart Study | XGBoost | 0.6095 | 0.0000 | 0.9833 | 0.0000 | 1.0000 | 0.106 | 6.35 |
| Framingham Heart Study | LightGBM | 0.5763 | 0.0000 | 0.9833 | 0.0000 | 1.0000 | 0.081 | 8.14 |
| Framingham Heart Study | CatBoost | 0.7837 | 0.0000 | 0.9833 | 0.0000 | 1.0000 | 0.584 | 5.92 |
| Framingham Heart Study | MLP Neural Network | 0.7573 | 0.0000 | 0.9833 | 0.0000 | 1.0000 | 0.161 | 4.60 |
| Cardiovascular Disease (Kaggle) | Logistic Regression | 0.8543 | 0.0000 | 0.9700 | 0.0000 | 1.0000 | 0.008 | 1.50 |
| Cardiovascular Disease (Kaggle) | Decision Tree | 0.7219 | 0.1739 | 0.9620 | 0.1333 | 0.8667 | 0.018 | 1.35 |
| Cardiovascular Disease (Kaggle) | Random Forest | 0.7542 | 0.0000 | 0.9700 | 0.0000 | 1.0000 | 0.327 | 89.41 |
| Cardiovascular Disease (Kaggle) | Gradient Boosting | 0.7131 | 0.1176 | 0.9700 | 0.0667 | 0.9333 | 0.916 | 2.56 |
| Cardiovascular Disease (Kaggle) | XGBoost | 0.7699 | 0.0000 | 0.9700 | 0.0000 | 1.0000 | 0.150 | 6.95 |
| Cardiovascular Disease (Kaggle) | LightGBM | 0.7522 | 0.0000 | 0.9700 | 0.0000 | 1.0000 | 0.171 | 8.16 |
| Cardiovascular Disease (Kaggle) | CatBoost | 0.8463 | 0.0000 | 0.9700 | 0.0000 | 1.0000 | 0.424 | 6.47 |
| Cardiovascular Disease (Kaggle) | MLP Neural Network | 0.3491 | 0.0000 | 0.9700 | 0.0000 | 1.0000 | 0.154 | 5.07 |
| Heart Failure Clinical Records | Logistic Regression | 0.8718 | 0.5333 | 0.8320 | 0.4444 | 0.5556 | 0.005 | 1.67 |
| Heart Failure Clinical Records | Decision Tree | 0.7265 | 0.4554 | 0.7800 | 0.4259 | 0.5741 | 0.009 | 1.50 |
| Heart Failure Clinical Records | Random Forest | 0.8660 | 0.6042 | 0.8480 | 0.5370 | 0.4630 | 0.300 | 79.72 |
| Heart Failure Clinical Records | Gradient Boosting | 0.8469 | 0.5417 | 0.8240 | 0.4815 | 0.5185 | 0.490 | 2.57 |
| Heart Failure Clinical Records | XGBoost | 0.8353 | 0.6095 | 0.8360 | 0.5926 | 0.4074 | 0.125 | 8.07 |
| Heart Failure Clinical Records | LightGBM | 0.8348 | 0.5208 | 0.8160 | 0.4630 | 0.5370 | 0.078 | 10.06 |
| Heart Failure Clinical Records | CatBoost | 0.8640 | 0.5319 | 0.8240 | 0.4630 | 0.5370 | 0.348 | 7.01 |
| Heart Failure Clinical Records | MLP Neural Network | 0.8628 | 0.5417 | 0.8240 | 0.4815 | 0.5185 | 0.114 | 3.33 |
| Stroke Prediction Dataset | Logistic Regression | 0.7009 | 0.0000 | 0.9886 | 0.0000 | 1.0000 | 0.011 | 3.24 |
| Stroke Prediction Dataset | Decision Tree | 0.4783 | 0.0000 | 0.9800 | 0.0000 | 1.0000 | 0.008 | 3.33 |
| Stroke Prediction Dataset | Random Forest | 0.5173 | 0.0000 | 0.9886 | 0.0000 | 1.0000 | 0.360 | 93.90 |
| Stroke Prediction Dataset | Gradient Boosting | 0.7626 | 0.0000 | 0.9886 | 0.0000 | 1.0000 | 0.488 | 3.16 |
| Stroke Prediction Dataset | XGBoost | 0.5542 | 0.0000 | 0.9886 | 0.0000 | 1.0000 | 0.096 | 6.41 |
| Stroke Prediction Dataset | LightGBM | 0.6503 | 0.0000 | 0.9857 | 0.0000 | 1.0000 | 0.115 | 8.18 |
| Stroke Prediction Dataset | CatBoost | 0.6329 | 0.0000 | 0.9886 | 0.0000 | 1.0000 | 0.559 | 8.04 |
| Stroke Prediction Dataset | MLP Neural Network | 0.5520 | 0.0000 | 0.9886 | 0.0000 | 1.0000 | 0.182 | 4.26 |
| PhysioNet ECG Features | Logistic Regression | 0.7908 | 0.8578 | 0.8967 | 0.8967 | 0.1033 | 0.022 | 5.41 |
| PhysioNet ECG Features | Decision Tree | 0.8705 | 0.9950 | 0.9967 | 0.9967 | 0.0033 | 0.015 | 4.97 |
| PhysioNet ECG Features | Random Forest | 0.9999 | 0.9917 | 0.9933 | 0.9933 | 0.0067 | 0.373 | 136.01 |
| PhysioNet ECG Features | Gradient Boosting | 0.8784 | 0.9950 | 0.9967 | 0.9967 | 0.0033 | 2.901 | 7.62 |
| PhysioNet ECG Features | XGBoost | 0.9998 | 0.9902 | 0.9900 | 0.9900 | 0.0100 | 0.278 | 11.74 |
| PhysioNet ECG Features | LightGBM | 0.9929 | 0.9819 | 0.9833 | 0.9833 | 0.0167 | 0.245 | 16.81 |
| PhysioNet ECG Features | CatBoost | 0.9997 | 0.9850 | 0.9867 | 0.9867 | 0.0133 | 1.226 | 10.16 |
| PhysioNet ECG Features | MLP Neural Network | 0.1801 | 0.8478 | 0.8967 | 0.8967 | 0.1033 | 0.168 | 7.02 |


---

## 3. Directory & Artifact Manifest

### Exported `.joblib` Models in `ai/models/`
- `framingham_risk_model.joblib` (and `heart_risk_model.joblib`)
- `cardio_lifestyle_model.joblib`
- `heart_failure_model.joblib`
- `stroke_model.joblib`
- `ecg_arrhythmia_model.joblib`

### Evaluation Performance Charts in `ai/reports/`
- `framingham_roc_curves.png` & `framingham_model_comparison.png` & `framingham_shap_summary.png`
- `cardio_disease_roc_curves.png` & `cardio_disease_model_comparison.png` & `cardio_disease_shap_summary.png`
- `heart_failure_roc_curves.png` & `heart_failure_model_comparison.png` & `heart_failure_shap_summary.png`
- `stroke_risk_roc_curves.png` & `stroke_risk_model_comparison.png` & `stroke_risk_shap_summary.png`
- `ecg_analysis_model_comparison.png` & `ecg_analysis_shap_summary.png`
- `model_benchmark_metrics.json`

---
*Report automatically compiled by HridyaDarpan AI Pipeline Engine.*
