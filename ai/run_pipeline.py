import os
import sys
import time
import json
import joblib
import pandas as pd
import numpy as np

AI_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(AI_DIR)

from datasets.dataset_loader import DatasetLoader
from preprocessing.preprocessor import ClinicalDataPreprocessor
from preprocessing.leakage_auditor import DataLeakageAuditor
from training.imbalance_handler import ClassImbalanceHandler
from training.threshold_calibrator import MedicalThresholdCalibrator
from training.model_trainer import MultiModelTrainer
from training.bayesian_tuner import BayesianHyperparameterTuner
from training.model_selector import ModelSelector
from evaluation.evaluator import ModelEvaluator
from evaluation.cross_validator import RigorousCrossValidator
from evaluation.error_analyzer import ClinicalErrorAnalyzer
from explainability.shap_engine import ExplainableAIEngine

def sanitize_for_json(obj):
    """Recursively converts NumPy types to standard Python float/int/list for JSON dumping."""
    if isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items() if k not in ["y_prob", "y_pred"]}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    return obj

def main():
    print("=" * 80)
    print("   HRIDYADARPAN CLINICAL AI PIPELINE v2.1 - OPTUNA HYPERPARAMETER TUNING")
    print("=" * 80)

    reports_dir = os.path.join(AI_DIR, "reports")
    models_dir = os.path.join(AI_DIR, "models")
    datasets_dir = os.path.join(AI_DIR, "datasets")

    os.makedirs(reports_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(datasets_dir, exist_ok=True)

    # Initialize components
    loader = DatasetLoader(data_dir=datasets_dir)
    leakage_auditor = DataLeakageAuditor(reports_dir=reports_dir)
    imbalance_handler = ClassImbalanceHandler(random_state=42)
    calibrator = MedicalThresholdCalibrator(reports_dir=reports_dir)
    cross_val = RigorousCrossValidator(random_state=42)
    error_analyzer = ClinicalErrorAnalyzer(reports_dir=reports_dir)
    evaluator = ModelEvaluator(reports_dir=reports_dir)
    selector = ModelSelector(models_dir=models_dir)
    xai = ExplainableAIEngine(reports_dir=reports_dir)
    trainer = MultiModelTrainer(random_state=42)
    bayesian_tuner = BayesianHyperparameterTuner(random_state=42, n_trials=25)

    # Datasets Configuration
    dataset_configs = {
        "framingham": {
            "name": "Framingham Heart Study",
            "loader_func": loader.load_framingham,
            "target": "TenYearCHD",
            "export_file": "framingham_risk_model.joblib",
            "tuner_func": bayesian_tuner.tune_lightgbm
        },
        "cardio_disease": {
            "name": "Cardiovascular Disease (Kaggle)",
            "loader_func": loader.load_cardiovascular_disease,
            "target": "cardio",
            "export_file": "cardio_lifestyle_model.joblib",
            "tuner_func": bayesian_tuner.tune_catboost
        },
        "heart_failure": {
            "name": "Heart Failure Clinical Records",
            "loader_func": loader.load_heart_failure,
            "target": "DEATH_EVENT",
            "export_file": "heart_failure_model.joblib",
            "tuner_func": bayesian_tuner.tune_xgboost
        },
        "stroke_risk": {
            "name": "Stroke Prediction Dataset",
            "loader_func": loader.load_stroke_prediction,
            "target": "stroke",
            "export_file": "stroke_model.joblib",
            "tuner_func": bayesian_tuner.tune_gradient_boosting
        },
        "ecg_analysis": {
            "name": "PhysioNet ECG Features",
            "loader_func": loader.load_physionet_ecg,
            "target": "ecg_arrhythmia",
            "export_file": "ecg_arrhythmia_model.joblib",
            "tuner_func": bayesian_tuner.tune_random_forest
        }
    }

    all_dataset_results = {}
    leakage_audits = []
    tuning_comparisons = []

    for d_key, config in dataset_configs.items():
        print("\n" + "#" * 80)
        print(f" OPTUNA TUNING DATASET v2.1: {config['name'].upper()} ({d_key})")
        print("#" * 80)

        # 1. Load Raw Dataset
        df_raw = config["loader_func"]()
        print(f"Raw Dataset Shape: {df_raw.shape}")

        # 2. Preprocess Data
        preprocessor = ClinicalDataPreprocessor(target_column=config["target"])
        X_proc, y_proc = preprocessor.fit_transform(df_raw)
        feature_names = preprocessor.feature_names

        # 3. Stratified Split BEFORE Resampling
        X_train, X_val, X_test, y_train, y_val, y_test = preprocessor.split_data(
            X_proc, y_proc, train_size=0.8, val_size=0.1, test_size=0.1, random_state=42
        )

        # 4. Audit Data Leakage
        leak_audit = leakage_auditor.audit_dataset_split(
            df_raw, X_train, X_val, X_test, config["target"], config["name"]
        )
        leakage_audits.append(leak_audit)

        # 5. Class Imbalance Resolution
        sample_model = trainer.get_models()["Random Forest"]
        X_train_res, y_train_res, imbalance_tech = imbalance_handler.evaluate_and_resample(
            X_train, y_train, sample_model, X_val, y_val
        )

        # 6. Train Baseline Model (Default Hyperparameters)
        trained_baseline = trainer.train_all(X_train_res, y_train_res)
        best_base_name, best_base_metrics, _ = selector.select_best_model(trained_baseline)
        baseline_model = trained_baseline[best_base_name]["model"]

        # Baseline evaluation on Test Set
        baseline_test_metrics = evaluator.evaluate_model(
            model=baseline_model, X_test=X_test, y_test=y_test, feature_names=feature_names, model_name=f"{best_base_name} (Baseline)"
        )

        # 7. Perform Optuna Bayesian Hyperparameter Optimization (25 Trials, 5-Fold CV)
        print(f"\n[OptunaTuner] Launching 25-Trial Bayesian Optimization for {best_base_name} on {config['name']}...")
        tuned_model_raw, best_params, tuning_time, optuna_study = config["tuner_func"](X_train_res, y_train_res)
        print(f"[OptunaTuner] Bayesian Search completed in {tuning_time:.2f}s. Best Trial Score: {optuna_study.best_value:.4f}")
        print(f"[OptunaTuner] Best Hyperparameters: {best_params}")

        # 8. Probability Calibration on Tuned Model
        calibrated_tuned_model, calib_method, brier_score = calibrator.calibrate_model(
            tuned_model_raw, X_train_res, y_train_res, X_val, y_val, d_key
        )

        # 9. Medical Threshold Optimization (F2-Score)
        optimal_tau, best_f2 = calibrator.optimize_decision_threshold(
            calibrated_tuned_model, X_val, y_val, d_key
        )

        # 10. Evaluated Tuned Model on Test Set
        tuned_test_metrics = evaluator.evaluate_model(
            model=calibrated_tuned_model, X_test=X_test, y_test=y_test, feature_names=feature_names, model_name=f"{best_base_name} (Optuna Tuned)", train_time=tuning_time
        )

        # Before vs After Comparison Row
        roc_diff = tuned_test_metrics["roc_auc"] - baseline_test_metrics["roc_auc"]
        rec_diff = tuned_test_metrics["recall"] - baseline_test_metrics["recall"]
        f1_diff = tuned_test_metrics["f1_score"] - baseline_test_metrics["f1_score"]

        tuning_comparisons.append({
            "Dataset": config["name"],
            "Winning Algorithm": best_base_name,
            "Baseline ROC-AUC": round(float(baseline_test_metrics["roc_auc"]), 4),
            "Tuned ROC-AUC": round(float(tuned_test_metrics["roc_auc"]), 4),
            "ROC-AUC Delta": f"{'+' if roc_diff >= 0 else ''}{roc_diff:.4f}",
            "Baseline Recall": round(float(baseline_test_metrics["recall"]), 4),
            "Tuned Recall": round(float(tuned_test_metrics["recall"]), 4),
            "Recall Delta": f"{'+' if rec_diff >= 0 else ''}{rec_diff:.4f}",
            "Baseline F1": round(float(baseline_test_metrics["f1_score"]), 4),
            "Tuned F1": round(float(tuned_test_metrics["f1_score"]), 4),
            "Tuning Time (s)": round(float(tuning_time), 2)
        })

        # 11. Cross Validation (5-Fold & 10-Fold) on Tuned Model
        cv_5fold = cross_val.evaluate_cv_folds(calibrated_tuned_model, X_proc, y_proc, n_splits=5)
        cv_10fold = cross_val.evaluate_cv_folds(calibrated_tuned_model, X_proc, y_proc, n_splits=10)

        # 12. Bootstrap 95% Confidence Intervals
        bootstrap_ci = cross_val.evaluate_bootstrap(calibrated_tuned_model, X_test, y_test, n_bootstraps=100)

        # 13. Error Analysis & Permutation Importance
        error_analysis = error_analyzer.analyze_model_errors(
            calibrated_tuned_model, X_test, y_test, feature_names, d_key, threshold=optimal_tau
        )

        # 14. SHAP Explainability Plot
        xai.generate_shap_summary_plot(calibrated_tuned_model, X_test, feature_names, d_key)

        # 15. Save Versioned Optuna Model Bundle (.joblib)
        selector.save_winning_model(
            winning_model=calibrated_tuned_model,
            preprocessor=preprocessor,
            dataset_key=d_key,
            export_filename=config["export_file"],
            feature_names=feature_names,
            metrics=tuned_test_metrics,
            optimal_threshold=optimal_tau,
            calibration_method=calib_method,
            imbalance_method=imbalance_tech,
            cv_metrics={"cv_5fold": cv_5fold, "cv_10fold": cv_10fold},
            bootstrap_ci=bootstrap_ci,
            error_analysis=error_analysis,
            background_data=X_train
        )

        clean_tuned_metrics = sanitize_for_json(tuned_test_metrics)
        clean_base_metrics = sanitize_for_json(baseline_test_metrics)

        all_dataset_results[d_key] = {
            "dataset_name": config["name"],
            "best_model": best_base_name,
            "version": "v2.1_optuna_tuned",
            "optimization_method": "Optuna TPE Bayesian Optimization",
            "best_hyperparameters": best_params,
            "tuning_time_sec": round(float(tuning_time), 2),
            "imbalance_method": imbalance_tech,
            "calibration_method": calib_method,
            "optimal_threshold": round(float(optimal_tau), 2),
            "baseline_metrics": clean_base_metrics,
            "tuned_metrics": clean_tuned_metrics,
            "cv_5fold_roc_auc": cv_5fold["roc_auc"]["formatted_ci"],
            "bootstrap_roc_auc_ci": bootstrap_ci.get("roc_auc_ci", {}).get("formatted_ci", "N/A")
        }

    # Generate Data Leakage Audit Report
    leakage_auditor.generate_leakage_report(leakage_audits)

    # Save metrics JSON benchmark
    benchmark_json_path = os.path.join(reports_dir, "model_benchmark_metrics.json")
    with open(benchmark_json_path, "w") as f:
        json.dump(all_dataset_results, f, indent=2)

    # Generate Optuna Tuning Report
    generate_tuning_markdown_report(tuning_comparisons, all_dataset_results, reports_dir)

    print("\n" + "=" * 80)
    print("   HRIDYADARPAN CLINICAL AI OPTUNA BAYESIAN TUNING COMPLETED SUCCESSFULLY!")
    print("=" * 80)

def generate_tuning_markdown_report(tuning_rows, all_dataset_results, reports_dir):
    report_path = os.path.join(reports_dir, "hyperparameter_tuning_report.md")

    md_content = f"""# HridyaDarpan Optuna Bayesian Hyperparameter Optimization Report

**Generated Date**: {time.strftime('%Y-%m-%d %H:%M:%S')}  
**Methodology**: 25-Trial Optuna TPE (Tree-structured Parzen Estimator) Bayesian Optimization with 5-Fold Stratified Cross-Validation on Training Splits.

---

## 1. Before vs After Performance Improvement Summary

| Dataset Domain | Winning Algorithm | Baseline ROC-AUC | Tuned ROC-AUC | ROC-AUC Delta | Baseline Recall | Tuned Recall | Recall Delta | Tuning Time (s) |
|---|---|---|---|---|---|---|---|---|
"""
    for row in tuning_rows:
        md_content += f"| **{row['Dataset']}** | `{row['Winning Algorithm']}` | {row['Baseline ROC-AUC']:.4f} | **{row['Tuned ROC-AUC']:.4f}** | **{row['ROC-AUC Delta']}** | {row['Baseline Recall']:.4f} | **{row['Tuned Recall']:.4f}** | **{row['Recall Delta']}** | {row['Tuning Time (s)']:.2f}s |\n"

    md_content += """

---

## 2. Optimal Hyperparameters Discovered by Optuna

"""
    for d_key, res in all_dataset_results.items():
        md_content += f"### {res['dataset_name']} — `{res['best_model']}`\n"
        md_content += f"- **Optimization Method**: Optuna TPE Bayesian Search\n"
        md_content += f"- **Tuning Search Time**: {res['tuning_time_sec']} seconds\n"
        md_content += f"- **Optimal Threshold (tau*)**: {res['optimal_threshold']}\n"
        md_content += f"- **Calibration Method**: {res['calibration_method']}\n"
        md_content += f"- **Discovered Best Hyperparameters**:\n```json\n{json.dumps(res['best_hyperparameters'], indent=2)}\n```\n\n"

    md_content += """
---
*Report automatically compiled by HridyaDarpan Clinical AI Optimization Suite (v2.1).*
"""

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    # Also update final_model_report.md
    final_report_path = os.path.join(reports_dir, "final_model_report.md")
    with open(final_report_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"[RunPipeline] Compiled Optuna hyperparameter tuning report: {report_path}")

if __name__ == "__main__":
    main()
