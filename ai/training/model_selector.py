import os
import time
import joblib
import numpy as np
import pandas as pd

class ModelSelector:
    """
    Hospital-grade Automated Model Selection, Versioning & Export Engine for HridyaDarpan ML Pipeline.
    Ranks candidates using clinical metrics (ROC AUC, Recall, F1, FNR, Inference latency),
    applies medical threshold calibration, and serializes versioned .joblib model bundles.
    """

    def __init__(self, models_dir="ai/models/"):
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)

    def select_best_model(self, evaluation_results: dict) -> tuple:
        """
        Ranks all trained models using a weighted clinical screening score:
        Score = 0.35 * ROC_AUC + 0.35 * Recall + 0.20 * F1 + 0.10 * (1 - False_Negative_Rate)
        """
        best_name = None
        best_score = -1.0
        best_metrics = None

        print("\n" + "=" * 80)
        print("  HOSPITAL-GRADE MODEL SELECTION SCOREBOARD")
        print("=" * 80)
        print(f"{'Model Name':<22} | {'ROC AUC':<8} | {'Recall':<8} | {'F1':<8} | {'FNR':<8} | {'Composite Score':<15}")
        print("-" * 80)

        for name, metrics in evaluation_results.items():
            auc = metrics.get("roc_auc", 0.5)
            rec = metrics.get("recall", 0.0)
            f1 = metrics.get("f1_score", 0.0)
            fnr = metrics.get("false_negative_rate", 1.0)

            composite_score = 0.35 * auc + 0.35 * rec + 0.20 * f1 + 0.10 * (1.0 - fnr)
            print(f"{name:<22} | {auc:<8.4f} | {rec:<8.4f} | {f1:<8.4f} | {fnr:<8.4f} | {composite_score:<15.4f}")

            if composite_score > best_score:
                best_score = composite_score
                best_name = name
                best_metrics = metrics

        print("=" * 80)
        print(f"[ModelSelector] WINNER SELECTED: {best_name} (Composite Clinical Score: {best_score:.4f})")
        print("=" * 80 + "\n")

        return best_name, best_metrics, best_score

    def save_winning_model(
        self,
        winning_model,
        preprocessor,
        dataset_key: str,
        export_filename: str,
        feature_names: list,
        metrics: dict,
        optimal_threshold: float = 0.50,
        calibration_method: str = "Uncalibrated Baseline",
        imbalance_method: str = "None",
        cv_metrics: dict = None,
        bootstrap_ci: dict = None,
        error_analysis: dict = None,
        background_data: np.ndarray = None
    ):
        """
        Exports versioned .joblib model bundle with complete metadata payload.
        """
        base_path = os.path.join(self.models_dir, export_filename)
        
        model_payload = {
            "version": "v2.0",
            "training_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "dataset_key": dataset_key,
            "model_name": metrics["model_name"],
            "model": winning_model,
            "preprocessor": preprocessor,
            "feature_names": feature_names,
            "optimal_threshold": float(optimal_threshold),
            "calibration_method": calibration_method,
            "imbalance_method": imbalance_method,
            "metrics": {
                "accuracy": metrics["accuracy"],
                "precision": metrics["precision"],
                "recall": metrics["recall"],
                "f1_score": metrics["f1_score"],
                "roc_auc": metrics["roc_auc"],
                "false_negative_rate": metrics["false_negative_rate"],
                "training_time_sec": metrics["training_time_sec"],
                "inference_time_ms": metrics["inference_time_ms"]
            },
            "cv_metrics_5fold": cv_metrics.get("cv_5fold") if cv_metrics else {},
            "cv_metrics_10fold": cv_metrics.get("cv_10fold") if cv_metrics else {},
            "bootstrap_ci_95": bootstrap_ci or {},
            "error_analysis": error_analysis or {},
            "background_data": background_data[:100] if background_data is not None else None
        }

        joblib.dump(model_payload, base_path)
        print(f"[ModelSelector] Exported versioned model bundle: {base_path} (Size: {os.path.getsize(base_path)/1024:.1f} KB)")

        # Create aliases for Framingham and Heart Failure
        if export_filename == "framingham_risk_model.joblib":
            alias_path = os.path.join(self.models_dir, "heart_risk_model.joblib")
            joblib.dump(model_payload, alias_path)
            print(f"[ModelSelector] Created alias bundle: {alias_path}")
        elif export_filename == "heart_failure_model.joblib":
            alias_path = os.path.join(self.models_dir, "heart_failure_model.joblib")
            joblib.dump(model_payload, alias_path)

        return base_path
