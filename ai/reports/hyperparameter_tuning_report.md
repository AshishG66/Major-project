# HridyaDarpan Optuna Bayesian Hyperparameter Optimization Report

**Generated Date**: 2026-07-23 18:56:17  
**Methodology**: 25-Trial Optuna TPE (Tree-structured Parzen Estimator) Bayesian Optimization with 5-Fold Stratified Cross-Validation on Training Splits.

---

## 1. Before vs After Performance Improvement Summary

| Dataset Domain | Winning Algorithm | Baseline ROC-AUC | Tuned ROC-AUC | ROC-AUC Delta | Baseline Recall | Tuned Recall | Recall Delta | Tuning Time (s) |
|---|---|---|---|---|---|---|---|---|
| **Framingham Heart Study** | `Logistic Regression` | 0.7641 | **0.7329** | **-0.0312** | 0.8000 | **0.6000** | **-0.2000** | 7.36s |
| **Cardiovascular Disease (Kaggle)** | `Logistic Regression` | 0.8363 | **0.8291** | **-0.0071** | 0.8000 | **0.8000** | **+0.0000** | 49.37s |
| **Heart Failure Clinical Records** | `Logistic Regression` | 0.8719 | **0.8510** | **-0.0209** | 0.8519 | **0.7963** | **-0.0556** | 32.98s |
| **Stroke Prediction Dataset** | `Logistic Regression` | 0.6618 | **0.7977** | **+0.1358** | 0.5000 | **0.5000** | **+0.0000** | 17.23s |
| **PhysioNet ECG Features** | `Logistic Regression` | 0.7908 | **1.0000** | **+0.2092** | 0.8967 | **0.9933** | **+0.0967** | 94.41s |


---

## 2. Optimal Hyperparameters Discovered by Optuna

### Framingham Heart Study — `Logistic Regression`
- **Optimization Method**: Optuna TPE Bayesian Search
- **Tuning Search Time**: 7.36 seconds
- **Optimal Threshold (tau*)**: 0.63
- **Calibration Method**: Uncalibrated Baseline
- **Discovered Best Hyperparameters**:
```json
{
  "n_estimators": 100,
  "learning_rate": 0.02068195742292623,
  "max_depth": 3,
  "num_leaves": 35,
  "subsample": 0.7527523570523583,
  "colsample_bytree": 0.8507847914805335,
  "reg_alpha": 2.4966983760053423,
  "reg_lambda": 0.010313543184332155,
  "random_state": 42,
  "verbose": -1,
  "n_jobs": -1
}
```

### Cardiovascular Disease (Kaggle) — `Logistic Regression`
- **Optimization Method**: Optuna TPE Bayesian Search
- **Tuning Search Time**: 49.37 seconds
- **Optimal Threshold (tau*)**: 0.65
- **Calibration Method**: Uncalibrated Baseline
- **Discovered Best Hyperparameters**:
```json
{
  "iterations": 100,
  "learning_rate": 0.036025262777007905,
  "depth": 4,
  "l2_leaf_reg": 4.905206061732787,
  "random_state": 42,
  "verbose": 0,
  "thread_count": -1
}
```

### Heart Failure Clinical Records — `Logistic Regression`
- **Optimization Method**: Optuna TPE Bayesian Search
- **Tuning Search Time**: 32.98 seconds
- **Optimal Threshold (tau*)**: 0.3
- **Calibration Method**: Uncalibrated Baseline
- **Discovered Best Hyperparameters**:
```json
{
  "n_estimators": 150,
  "learning_rate": 0.032380257176767395,
  "max_depth": 3,
  "subsample": 0.9014119787799524,
  "colsample_bytree": 0.9986145827365291,
  "random_state": 42,
  "eval_metric": "logloss",
  "n_jobs": -1
}
```

### Stroke Prediction Dataset — `Logistic Regression`
- **Optimization Method**: Optuna TPE Bayesian Search
- **Tuning Search Time**: 17.23 seconds
- **Optimal Threshold (tau*)**: 0.5
- **Calibration Method**: Uncalibrated Baseline
- **Discovered Best Hyperparameters**:
```json
{
  "n_estimators": 100,
  "learning_rate": 0.09308263560750392,
  "max_depth": 6,
  "subsample": 0.8293794097612022,
  "random_state": 42
}
```

### PhysioNet ECG Features — `Logistic Regression`
- **Optimization Method**: Optuna TPE Bayesian Search
- **Tuning Search Time**: 94.41 seconds
- **Optimal Threshold (tau*)**: 0.5
- **Calibration Method**: Uncalibrated (Multiclass)
- **Discovered Best Hyperparameters**:
```json
{
  "n_estimators": 100,
  "max_depth": 11,
  "min_samples_split": 3,
  "random_state": 42,
  "n_jobs": -1
}
```


---
*Report automatically compiled by HridyaDarpan Clinical AI Optimization Suite (v2.1).*
