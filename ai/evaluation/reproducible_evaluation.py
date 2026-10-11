import os
import sys
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional

# Ensure ai directory is on sys.path
AI_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if AI_DIR not in sys.path:
    sys.path.insert(0, AI_DIR)

import joblib
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix
)
from datasets.dataset_loader import DatasetLoader
from preprocessing.preprocessor import MedicalPreprocessor

def compute_bootstrap_metric_ci(
    y_true: np.ndarray,
    y_input: np.ndarray,
    metric_type: str,
    n_bootstraps: int = 1000,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Computes a statistically rigorous non-parametric empirical percentile bootstrap 95% confidence interval.
    
    Guarantees:
    - Pass continuous probabilities for 'auroc', 'auprc', 'brier'.
    - Pass binary/multiclass predictions for 'accuracy', 'precision', 'recall', 'specificity', 'f1'.
    - Tracks and reports valid_replicates vs failed_replicates (e.g. single-class bootstrap draws).
    - If valid replicates < 500, explicitly marks interval as UNAVAILABLE rather than fabricating values.
    """
    rng = np.random.RandomState(seed)
    scores = []
    n = len(y_true)
    failed_replicates = 0

    for _ in range(n_bootstraps):
        idx = rng.randint(0, n, size=n)
        yt_sample = y_true[idx]
        yi_sample = y_input[idx]

        # Multi-class or binary single-class check
        if len(np.unique(yt_sample)) < 2:
            failed_replicates += 1
            continue

        try:
            if metric_type == "auroc":
                val = roc_auc_score(yt_sample, yi_sample)
            elif metric_type == "auprc":
                val = average_precision_score(yt_sample, yi_sample)
            elif metric_type == "brier":
                val = brier_score_loss(yt_sample, yi_sample)
            elif metric_type == "accuracy":
                val = accuracy_score(yt_sample, yi_sample)
            elif metric_type == "recall":
                val = recall_score(yt_sample, yi_sample, zero_division=0)
            elif metric_type == "precision":
                val = precision_score(yt_sample, yi_sample, zero_division=0)
            elif metric_type == "f1":
                val = f1_score(yt_sample, yi_sample, zero_division=0)
            elif metric_type == "specificity":
                cm = confusion_matrix(yt_sample, yi_sample, labels=[0, 1])
                tn, fp, fn, tp = cm.ravel()
                val = tn / (tn + fp) if (tn + fp) > 0 else 0.0
            else:
                raise ValueError(f"Unknown metric type: {metric_type}")

            if not np.isnan(val):
                scores.append(float(val))
            else:
                failed_replicates += 1
        except Exception:
            failed_replicates += 1
            continue

    valid_replicates = len(scores)

    if valid_replicates < 500:
        return {
            "interval": None,
            "status": "UNAVAILABLE",
            "reason": f"Extreme class sparsity resulted in insufficient valid replicates ({valid_replicates}/{n_bootstraps}).",
            "valid_replicates": valid_replicates,
            "failed_replicates": failed_replicates
        }

    ci_lower = round(float(np.percentile(scores, 2.5)), 4)
    ci_upper = round(float(np.percentile(scores, 97.5)), 4)

    return {
        "interval": [ci_lower, ci_upper],
        "status": "VALID",
        "valid_replicates": valid_replicates,
        "failed_replicates": failed_replicates
    }

def evaluate_all_models():
    loader = DatasetLoader(data_dir=os.path.join(AI_DIR, "datasets"))
    reports_dir = os.path.join(AI_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)

    configs = [
        {
            "key": "framingham",
            "display_name": "Framingham 10-Year CHD Risk",
            "model_file": os.path.join(AI_DIR, "models", "framingham_risk_model.joblib"),
            "load_fn": loader.load_framingham,
            "target_col": "TenYearCHD",
            "provenance_key": "framingham",
            "is_multiclass": False
        },
        {
            "key": "cardio_disease",
            "display_name": "Cardiovascular Disease Lifestyle Model",
            "model_file": os.path.join(AI_DIR, "models", "cardio_lifestyle_model.joblib"),
            "load_fn": loader.load_cardiovascular_disease,
            "target_col": "cardio",
            "provenance_key": "cardio_disease",
            "is_multiclass": False
        },
        {
            "key": "heart_failure",
            "display_name": "Heart Failure Survival Risk Model",
            "model_file": os.path.join(AI_DIR, "models", "heart_failure_model.joblib"),
            "load_fn": loader.load_heart_failure,
            "target_col": "DEATH_EVENT",
            "provenance_key": "heart_failure",
            "is_multiclass": False
        },
        {
            "key": "stroke_risk",
            "display_name": "Stroke Risk Assessment Model",
            "model_file": os.path.join(AI_DIR, "models", "stroke_model.joblib"),
            "load_fn": loader.load_stroke_prediction,
            "target_col": "stroke",
            "provenance_key": "stroke_risk",
            "is_multiclass": False
        },
        {
            "key": "ecg_analysis",
            "display_name": "PhysioNet ECG Arrhythmia Feature Model",
            "model_file": os.path.join(AI_DIR, "models", "ecg_arrhythmia_model.joblib"),
            "load_fn": loader.load_physionet_ecg,
            "target_col": "ecg_arrhythmia",
            "provenance_key": "ecg_analysis",
            "is_multiclass": True
        }
    ]

    evaluation_report = {
        "pipeline_version": "v2.2_rigorous_evaluation_verified",
        "evaluation_timestamp": pd.Timestamp.now().isoformat(),
        "clinical_status": "SYNTHETIC_DEMO_EVALUATION — NOT CLINICALLY VALIDATED",
        "statistical_methodology": {
            "bootstrap_method": "Non-parametric empirical percentile bootstrap (B=1000, seed=42)",
            "auroc_input": "Continuous predicted probability of positive class (NOT binary thresholded predictions)",
            "classification_input": "Binary/Multiclass thresholded predictions",
            "minimum_valid_replicates_threshold": 500,
            "partitioning": "Strict raw dataset partition (80% train, 10% val, 10% holdout test) prior to transformation fitting"
        },
        "models": {}
    }

    print("\n================================================================================")
    print("HRIDAYADARPANA PHASE 2.1: INDEPENDENT REPRODUCIBLE ML AUDIT & EVALUATION")
    print("STATUS: SYNTHETIC_DEMO_EVALUATION — NOT CLINICALLY VALIDATED")
    print("================================================================================\n")

    for cfg in configs:
        k = cfg["key"]
        print(f"\n---> Auditing & Evaluating [{cfg['display_name']}] on Untouched Test Set...")

        if not os.path.exists(cfg["model_file"]):
            print(f"     [ERROR] Model artifact missing: {cfg['model_file']}")
            continue

        bundle = joblib.load(cfg["model_file"])
        model = bundle["model"]
        preprocessor = bundle["preprocessor"]
        optimal_threshold = bundle.get("optimal_threshold", 0.5)

        raw_df = cfg["load_fn"]()
        provenance = loader.get_dataset_provenance(cfg["provenance_key"])

        # Strict leak-free split: 80% train, 10% val, 10% test
        df_train, df_val, df_test = MedicalPreprocessor.split_raw_dataset(
            raw_df,
            target_column=cfg["target_col"],
            train_size=0.8,
            val_size=0.1,
            test_size=0.1,
            random_state=42
        )

        X_test_raw = df_test.drop(columns=[cfg["target_col"]])
        y_test = df_test[cfg["target_col"]].values

        # Record split class distributions
        train_dist = df_train[cfg["target_col"]].value_counts().to_dict()
        val_dist = df_val[cfg["target_col"]].value_counts().to_dict()
        test_dist = df_test[cfg["target_col"]].value_counts().to_dict()

        # Transform using training-learned parameters only
        X_test_trans = preprocessor.transform(X_test_raw)

        # Predict
        if hasattr(model, "predict_proba"):
            y_proba = model.predict_proba(X_test_trans)
        else:
            y_proba = model.predict(X_test_trans)

        is_multiclass = cfg["is_multiclass"]

        if not is_multiclass:
            y_prob_pos = y_proba[:, 1] if y_proba.ndim == 2 else y_proba
            y_pred = (y_prob_pos >= optimal_threshold).astype(int)

            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, zero_division=0))
            rec = float(recall_score(y_test, y_pred, zero_division=0))
            f1 = float(f1_score(y_test, y_pred, zero_division=0))

            cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
            tn, fp, fn, tp = cm.ravel()
            spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

            try:
                auroc = float(roc_auc_score(y_test, y_prob_pos))
            except Exception:
                auroc = float("nan")

            try:
                auprc = float(average_precision_score(y_test, y_prob_pos))
            except Exception:
                auprc = float("nan")

            try:
                brier = float(brier_score_loss(y_test, y_prob_pos))
            except Exception:
                brier = float("nan")

            # Bootstrap CIs with explicit separation between probabilities and predictions
            ci_auroc_data = compute_bootstrap_metric_ci(y_test, y_prob_pos, "auroc", n_bootstraps=1000, seed=42)
            ci_acc_data = compute_bootstrap_metric_ci(y_test, y_pred, "accuracy", n_bootstraps=1000, seed=42)
            ci_rec_data = compute_bootstrap_metric_ci(y_test, y_pred, "recall", n_bootstraps=1000, seed=42)
            ci_spec_data = compute_bootstrap_metric_ci(y_test, y_pred, "specificity", n_bootstraps=1000, seed=42)
            ci_f1_data = compute_bootstrap_metric_ci(y_test, y_pred, "f1", n_bootstraps=1000, seed=42)

            n_pos = int(np.sum(y_test == 1))
            n_neg = int(np.sum(y_test == 0))
            pos_prev = round(n_pos / len(y_test) * 100, 2)

            # Audit note on threshold & zero-positive classifications
            if tp + fp == 0:
                audit_note = (
                    f"THRESHOLD DEFECT: Decision threshold {optimal_threshold} resulted in 0 positive predictions. "
                    f"Sensitivity=0.0, Precision is undefined (reported as 0.0). Threshold requires re-tuning."
                )
            elif rec < 0.5:
                audit_note = (
                    f"IMBALANCE WARNING: Model Sensitivity is low ({rec:.4f}) under threshold {optimal_threshold}. "
                    f"Misses {fn} out of {n_pos} positive cases."
                )
            else:
                audit_note = f"Model executed with sensitivity {rec:.4f} and specificity {spec:.4f} under threshold {optimal_threshold}."

            metrics = {
                "metric_status": "SYNTHETIC_DEMO_EVALUATION — NOT CLINICALLY VALIDATED",
                "accuracy": round(acc, 4),
                "accuracy_ci_95": ci_acc_data["interval"],
                "accuracy_bootstrap_details": {
                    "valid_replicates": ci_acc_data["valid_replicates"],
                    "failed_replicates": ci_acc_data["failed_replicates"]
                },
                "precision": round(prec, 4),
                "recall_sensitivity": round(rec, 4),
                "recall_ci_95": ci_rec_data["interval"],
                "specificity": round(spec, 4),
                "specificity_ci_95": ci_spec_data["interval"],
                "f1_score": round(f1, 4),
                "f1_ci_95": ci_f1_data["interval"],
                "auroc": round(auroc, 4) if not np.isnan(auroc) else None,
                "auroc_ci_95": ci_auroc_data["interval"],
                "auroc_bootstrap_details": {
                    "valid_replicates": ci_auroc_data["valid_replicates"],
                    "failed_replicates": ci_auroc_data["failed_replicates"]
                },
                "auprc": round(auprc, 4) if not np.isnan(auprc) else None,
                "brier_score": round(brier, 4) if not np.isnan(brier) else None,
                "confusion_matrix": {
                    "tn": int(tn),
                    "fp": int(fp),
                    "fn": int(fn),
                    "tp": int(tp)
                },
                "decision_threshold": round(optimal_threshold, 4),
                "threshold_selection_source": "Training / cross-validation optimization in model bundle (Holdout test set unobserved)",
                "audit_note": audit_note,
                "class_distribution": {
                    "negative_count": n_neg,
                    "positive_count": n_pos,
                    "positive_prevalence_pct": pos_prev
                }
            }
        else:
            # Multiclass (ECG)
            y_pred = np.argmax(y_proba, axis=1) if y_proba.ndim == 2 else model.predict(X_test_trans)
            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
            rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
            f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
            cm = confusion_matrix(y_test, y_pred).tolist()

            try:
                auroc = float(roc_auc_score(y_test, y_proba, multi_class="ovr"))
            except Exception:
                auroc = None

            unique, counts = np.unique(y_test, return_counts=True)
            class_dist = {int(u): int(c) for u, c in zip(unique, counts)}

            ci_acc_data = compute_bootstrap_metric_ci(y_test, y_pred, "accuracy", n_bootstraps=1000, seed=42)

            metrics = {
                "metric_status": "SYNTHETIC_DEMO_EVALUATION — NOT CLINICALLY VALIDATED",
                "accuracy": round(acc, 4),
                "accuracy_ci_95": ci_acc_data["interval"],
                "accuracy_bootstrap_details": {
                    "valid_replicates": ci_acc_data["valid_replicates"],
                    "failed_replicates": ci_acc_data["failed_replicates"]
                },
                "precision_weighted": round(prec, 4),
                "recall_weighted": round(rec, 4),
                "specificity": "N/A (Multiclass OVR weighted)",
                "f1_score_weighted": round(f1, 4),
                "auroc_ovr": round(auroc, 4) if auroc else None,
                "auroc_ci_95": "N/A (Multiclass OVR; reported via point estimate)",
                "auprc": None,
                "brier_score": None,
                "confusion_matrix": cm,
                "decision_threshold": "ArgMax (Multiclass)",
                "threshold_selection_source": "ArgMax probability selection",
                "audit_note": "Multiclass 4-state electrophysiological rhythm classification.",
                "class_distribution": class_dist
            }

        split_details = {
            "train": {
                "total_samples": len(df_train),
                "class_counts": {str(k): int(v) for k, v in train_dist.items()}
            },
            "validation": {
                "total_samples": len(df_val),
                "class_counts": {str(k): int(v) for k, v in val_dist.items()}
            },
            "holdout_test": {
                "total_samples": len(df_test),
                "class_counts": {str(k): int(v) for k, v in test_dist.items()}
            }
        }

        model_entry = {
            "model_name": bundle.get("model_name", type(model).__name__),
            "algorithm": type(model).__name__,
            "version": bundle.get("version", "v2.1"),
            "dataset_provenance": provenance,
            "split_details": split_details,
            "metrics": metrics
        }

        evaluation_report["models"][k] = model_entry

        print(f"     Algorithm:        {type(model).__name__}")
        print(f"     Accuracy:         {metrics['accuracy']} (95% CI: {metrics['accuracy_ci_95']})")
        if not is_multiclass:
            print(f"     Sensitivity:      {metrics['recall_sensitivity']}")
            print(f"     Specificity:      {metrics['specificity']}")
            print(f"     AUROC (Continuous): {metrics['auroc']} (95% CI: {metrics['auroc_ci_95']})")
            print(f"     Valid Replicates: {metrics['auroc_bootstrap_details']['valid_replicates']}/1000")
            print(f"     Audit Note:       {metrics['audit_note']}")
        else:
            print(f"     F1 Weighted:      {metrics['f1_score_weighted']}")
            print(f"     AUROC OVR:        {metrics['auroc_ovr']}")

    # Save JSON report
    json_path = os.path.join(reports_dir, "reproducible_evaluation_report.json")
    with open(json_path, "w") as f:
        json.dump(evaluation_report, f, indent=2)
    print(f"\n[Saved JSON Evaluation Report] -> {json_path}")

    # Generate Markdown summary table
    md_path = os.path.join(reports_dir, "reproducible_evaluation_report.md")
    with open(md_path, "w") as f:
        f.write("# HridayaDarpana Phase 2.1 — Independent Reproducible ML Audit & Evaluation Report\n\n")
        f.write(f"**Generated:** {evaluation_report['evaluation_timestamp']}  \n")
        f.write(f"**Clinical Status:** **`SYNTHETIC_DEMO_EVALUATION — NOT CLINICALLY VALIDATED`**  \n")
        f.write(f"**Statistical Integrity:** Non-parametric Percentile Bootstrap (B=1000, seed=42) on Continuous Model Probabilities | Untouched Holdout Test Splits | Preprocessing Fitted Exclusively on Training Splits  \n\n")
        
        f.write("## 1. Verified Performance Metrics Across Untouched Test Sets\n\n")
        f.write("| Pipeline Domain | Algorithm | Test N (Pos/Neg) | Accuracy (95% CI) | Sensitivity (Recall) | Specificity | F1 Score | AUROC (95% CI) [Valid/Failed Reps] | AUPRC | Brier Score | Decision Threshold |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n")
        
        for k, m in evaluation_report["models"].items():
            mets = m["metrics"]
            algo = m["algorithm"]
            n_test = m["split_details"]["holdout_test"]["total_samples"]
            ci_acc_str = f"{mets['accuracy']} [{mets['accuracy_ci_95'][0]}-{mets['accuracy_ci_95'][1]}]" if mets['accuracy_ci_95'] else str(mets['accuracy'])
            
            if k != "ecg_analysis":
                pos_ev = f"{mets['class_distribution']['positive_count']}/{mets['class_distribution']['negative_count']}"
                boot = mets["auroc_bootstrap_details"]
                ci_auc_str = f"{mets['auroc']} [{mets['auroc_ci_95'][0]}-{mets['auroc_ci_95'][1]}] ({boot['valid_replicates']}/{boot['failed_replicates']})" if mets['auroc_ci_95'] else f"{mets['auroc']} [N/A]"
                f.write(f"| **{m['model_name']}** | `{algo}` | {n_test} ({pos_ev}) | {ci_acc_str} | {mets['recall_sensitivity']} | {mets['specificity']} | {mets['f1_score']} | {ci_auc_str} | {mets['auprc']} | {mets['brier_score']} | {mets['decision_threshold']} |\n")
            else:
                f.write(f"| **{m['model_name']}** | `{algo}` | {n_test} (Multiclass 4-state) | {ci_acc_str} | {mets['recall_weighted']} (weighted) | N/A | {mets['f1_score_weighted']} | {mets['auroc_ovr']} (OVR) | N/A | N/A | ArgMax |\n")

        f.write("\n## 2. Split Sample & Class Distribution Breakdown\n\n")
        f.write("| Pipeline Domain | Raw Total | Train Split (Pos / Neg) | Validation Split (Pos / Neg) | Holdout Test Split (Pos / Neg) | Test Pos Prevalence |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
        for k, m in evaluation_report["models"].items():
            splits = m["split_details"]
            tot = splits["train"]["total_samples"] + splits["validation"]["total_samples"] + splits["holdout_test"]["total_samples"]
            tr_counts = splits["train"]["class_counts"]
            va_counts = splits["validation"]["class_counts"]
            te_counts = splits["holdout_test"]["class_counts"]
            if k != "ecg_analysis":
                f.write(f"| **{k}** | {tot} | {splits['train']['total_samples']} ({tr_counts.get('1', 0)} / {tr_counts.get('0', 0)}) | {splits['validation']['total_samples']} ({va_counts.get('1', 0)} / {va_counts.get('0', 0)}) | {splits['holdout_test']['total_samples']} ({te_counts.get('1', 0)} / {te_counts.get('0', 0)}) | {m['metrics']['class_distribution']['positive_prevalence_pct']}% |\n")
            else:
                f.write(f"| **{k}** | {tot} | {splits['train']['total_samples']} (Multiclass) | {splits['validation']['total_samples']} (Multiclass) | {splits['holdout_test']['total_samples']} (Multiclass) | N/A (Multiclass) |\n")

        f.write("\n## 3. Threshold Audit & Class Imbalance Analysis\n\n")
        f.write("| Pipeline Domain | Decision Threshold | Threshold Selection Method | Technical Audit Finding |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        for k, m in evaluation_report["models"].items():
            mets = m["metrics"]
            f.write(f"| **{k}** | `{mets['decision_threshold']}` | {mets['threshold_selection_source']} | {mets['audit_note']} |\n")

        f.write("\n## 4. Dataset Provenance and Clinical Limitations\n\n")
        f.write("| Pipeline Domain | Provenance Type | Synthetic Simulation? | Clinical Validation Available? | Reference Attribution | Inherent Limitations |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
        for k, m in evaluation_report["models"].items():
            prov = m["dataset_provenance"]
            f.write(f"| **{k}** | `{prov.get('provenance_type')}` | {prov.get('is_synthetic_demonstration')} | **{prov.get('clinical_validation_available')}** | {prov.get('original_research_reference')} | {prov.get('limitations')} |\n")

        f.write("\n## 5. Mandatory Clinical Warning\n\n")
        f.write("> [!WARNING]\n")
        f.write("> **SYNTHETIC_DEMO_EVALUATION — NOT CLINICALLY VALIDATED**  \n")
        f.write("> All five benchmark datasets in this repository are synthetic simulations generated using parametric approximations. **These software development and pipeline verification metrics do not constitute clinical validation.** True clinical validity requires prospective trials on institutional IRB-approved real patient cohorts.\n")

    print(f"[Saved Markdown Evaluation Report] -> {md_path}")
    print("\n================================================================================")
    print("INDEPENDENT REPRODUCIBLE EVALUATION PIPELINE COMPLETED")
    print("================================================================================\n")

if __name__ == "__main__":
    evaluate_all_models()
