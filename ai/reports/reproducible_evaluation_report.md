# HridayaDarpana Phase 2.1 — Independent Reproducible ML Audit & Evaluation Report

**Generated:** 2026-10-11T11:06:11.660197  
**Clinical Status:** **`SYNTHETIC_DEMO_EVALUATION — NOT CLINICALLY VALIDATED`**  
**Statistical Integrity:** Non-parametric Percentile Bootstrap (B=1000, seed=42) on Continuous Model Probabilities | Untouched Holdout Test Splits | Preprocessing Fitted Exclusively on Training Splits  

## 1. Verified Performance Metrics Across Untouched Test Sets

| Pipeline Domain | Algorithm | Test N (Pos/Neg) | Accuracy (95% CI) | Sensitivity (Recall) | Specificity | F1 Score | AUROC (95% CI) [Valid/Failed Reps] | AUPRC | Brier Score | Decision Threshold |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LightGBM (Baseline)** | `LGBMClassifier` | 300 (5/295) | 0.9967 [0.9867-1.0] | 0.8 | 1.0 | 0.8889 | 0.981 [0.9344-1.0] (992/8) | 0.8303 | 0.0037 | 0.5 |
| **CatBoost (Optuna Tuned)** | `CatBoostClassifier` | 500 (15/485) | 0.97 [0.954-0.984] | 0.0 | 1.0 | 0.0 | 0.8948 [0.8166-0.9583] (1000/0) | 0.3386 | 0.0276 | 0.65 |
| **XGBoost (Baseline)** | `XGBClassifier` | 250 (54/196) | 0.88 [0.84-0.92] | 0.9815 | 0.852 | 0.7794 | 0.9843 [0.9614-0.999] (1000/0) | 0.9585 | 0.0411 | 0.19 |
| **Gradient Boosting (Optuna Tuned)** | `GradientBoostingClassifier` | 350 (4/346) | 0.9886 [0.9771-0.9971] | 0.0 | 1.0 | 0.0 | 0.9978 [0.9918-1.0] (981/19) | 0.8542 | 0.0065 | 0.5 |
| **Random Forest (Baseline)** | `RandomForestClassifier` | 300 (Multiclass 4-state) | 0.9967 [0.99-1.0] | 0.9967 (weighted) | N/A | 0.995 | 1.0 (OVR) | N/A | N/A | ArgMax |

## 2. Split Sample & Class Distribution Breakdown

| Pipeline Domain | Raw Total | Train Split (Pos / Neg) | Validation Split (Pos / Neg) | Holdout Test Split (Pos / Neg) | Test Pos Prevalence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **framingham** | 3000 | 2400 (44 / 2356) | 300 (6 / 294) | 300 (5 / 295) | 1.67% |
| **cardio_disease** | 5000 | 3999 (122 / 3877) | 501 (15 / 486) | 500 (15 / 485) | 3.0% |
| **heart_failure** | 2500 | 1999 (435 / 1564) | 251 (55 / 196) | 250 (54 / 196) | 21.6% |
| **stroke_risk** | 3500 | 2800 (30 / 2770) | 350 (4 / 346) | 350 (4 / 346) | 1.14% |
| **ecg_analysis** | 3000 | 2400 (Multiclass) | 300 (Multiclass) | 300 (Multiclass) | N/A (Multiclass) |

## 3. Threshold Audit & Class Imbalance Analysis

| Pipeline Domain | Decision Threshold | Threshold Selection Method | Technical Audit Finding |
| :--- | :--- | :--- | :--- |
| **framingham** | `0.5` | Training / cross-validation optimization in model bundle (Holdout test set unobserved) | Model executed with sensitivity 0.8000 and specificity 1.0000 under threshold 0.5. |
| **cardio_disease** | `0.65` | Training / cross-validation optimization in model bundle (Holdout test set unobserved) | THRESHOLD DEFECT: Decision threshold 0.65 resulted in 0 positive predictions. Sensitivity=0.0, Precision is undefined (reported as 0.0). Threshold requires re-tuning. |
| **heart_failure** | `0.19` | Training / cross-validation optimization in model bundle (Holdout test set unobserved) | Model executed with sensitivity 0.9815 and specificity 0.8520 under threshold 0.19. |
| **stroke_risk** | `0.5` | Training / cross-validation optimization in model bundle (Holdout test set unobserved) | THRESHOLD DEFECT: Decision threshold 0.5 resulted in 0 positive predictions. Sensitivity=0.0, Precision is undefined (reported as 0.0). Threshold requires re-tuning. |
| **ecg_analysis** | `ArgMax (Multiclass)` | ArgMax probability selection | Multiclass 4-state electrophysiological rhythm classification. |

## 4. Dataset Provenance and Clinical Limitations

| Pipeline Domain | Provenance Type | Synthetic Simulation? | Clinical Validation Available? | Reference Attribution | Inherent Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **framingham** | `SYNTHETIC_DEMO` | True | **False** | National Heart, Lung, and Blood Institute (NHLBI) & Boston University Framingham Heart Study (1948-present). | Parametric normal/binomial synthetic data. Does not reflect true multi-ethnic clinical variability. |
| **cardio_disease** | `SYNTHETIC_DEMO` | True | **False** | Kaggle Cardiovascular Disease dataset (Sulkova et al., 70,000 patient records distribution). | Synthetic parametric generation. Clinical cutoffs for cholesterol/glucose are discrete approximations. |
| **heart_failure** | `SYNTHETIC_DEMO` | True | **False** | Chicco & Jurman (2020), Machine learning can predict survival of patients with heart failure from serum creatinine and ejection fraction alone. BMC Medical Informatics and Decision Making 20, 16. | Synthetic parametric simulation. 'time' variable is a survival follow-up duration artifact not available at point-of-care baseline. |
| **stroke_risk** | `SYNTHETIC_DEMO` | True | **False** | Kaggle Healthcare Stroke Prediction Dataset (Fedesoriano et al., Electronic Health Record distribution). | Synthetic generation. Contains non-clinical socio-demographic features (residence type, work type, marital status). |
| **ecg_analysis** | `SYNTHETIC_DEMO` | True | **False** | PhysioNet MIT-BIH Arrhythmia Database (Goldberger AL, et al., 2000. Circulation 101(23):e215-e220). | Pre-computed synthetic feature intervals (RR, PR, QRS, QT). Not raw continuous electrogram time series. |

## 5. Mandatory Clinical Warning

> [!WARNING]
> **SYNTHETIC_DEMO_EVALUATION — NOT CLINICALLY VALIDATED**  
> All five benchmark datasets in this repository are synthetic simulations generated using parametric approximations. **These software development and pipeline verification metrics do not constitute clinical validation.** True clinical validity requires prospective trials on institutional IRB-approved real patient cohorts.
