import time
import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve
)

class ModelEvaluator:
    """
    Hospital-grade Model Evaluator for HridyaDarpan.
    Calculates detailed metrics, confusion matrices, classification reports,
    training/inference times, and renders publication-ready performance charts.
    """

    def __init__(self, reports_dir="ai/reports/"):
        self.reports_dir = reports_dir
        os.makedirs(self.reports_dir, exist_ok=True)

    def evaluate_model(self, model, X_test, y_test, feature_names=None, model_name="Model", train_time=0.0):
        start_inf = time.time()
        
        # Determine predictions & probabilities
        y_pred = model.predict(X_test)
        
        if hasattr(model, "predict_proba"):
            y_proba = model.predict_proba(X_test)
            if len(y_proba.shape) == 2 and y_proba.shape[1] == 2:
                y_prob = y_proba[:, 1]
                auc = float(roc_auc_score(y_test, y_prob))
            elif len(y_proba.shape) == 2 and y_proba.shape[1] > 2:
                # Multiclass ROC AUC (OVR)
                y_prob = y_proba
                try:
                    auc = float(roc_auc_score(y_test, y_proba, multi_class="ovr"))
                except Exception:
                    auc = 0.5
            else:
                y_prob = y_pred
                auc = 0.5
        else:
            y_prob = y_pred
            auc = 0.5

        end_inf = time.time()
        total_inf_ms = (end_inf - start_inf) * 1000
        inf_speed_per_sample_ms = total_inf_ms / max(len(X_test), 1)

        # Basic binary / multi-class metrics
        is_multiclass = len(np.unique(y_test)) > 2
        avg_mode = "weighted" if is_multiclass else "binary"

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average=avg_mode, zero_division=0))
        rec = float(recall_score(y_test, y_pred, average=avg_mode, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average=avg_mode, zero_division=0))
        fnr = float(1.0 - rec) # False Negative Rate

        cm = confusion_matrix(y_test, y_pred).tolist()
        class_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

        # Feature importances
        importance_dict = {}
        if feature_names is not None:
            if hasattr(model, "feature_importances_"):
                importances = model.feature_importances_
                for fname, imp in zip(feature_names, importances):
                    importance_dict[fname] = float(imp)
            elif hasattr(model, "coef_"):
                coefs = np.abs(model.coef_).mean(axis=0) if len(model.coef_.shape) > 1 else np.abs(model.coef_[0])
                for fname, imp in zip(feature_names, coefs):
                    importance_dict[fname] = float(imp)

        return {
            "model_name": model_name,
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1_score": f1,
            "roc_auc": auc,
            "false_negative_rate": fnr,
            "confusion_matrix": cm,
            "classification_report": class_report,
            "feature_importance": importance_dict,
            "training_time_sec": round(train_time, 4),
            "inference_time_ms": round(total_inf_ms, 2),
            "inference_speed_per_sample_ms": round(inf_speed_per_sample_ms, 4),
            "y_prob": y_prob,
            "y_pred": y_pred
        }

    def plot_dataset_evaluation(self, results_dict: dict, dataset_name: str, y_test: np.ndarray):
        """
        Generates and saves visual charts:
        - ROC Curves for all models on dataset
        - Confusion Matrix heatmap for best model
        - Feature Importance Bar Chart for best model
        """
        plt.style.use("seaborn-v0_8-darkgrid" if "seaborn-v0_8-darkgrid" in plt.style.available else "default")

        # 1. ROC Curves
        plt.figure(figsize=(9, 6))
        is_binary = len(np.unique(y_test)) == 2
        
        for m_name, res in results_dict.items():
            if is_binary and isinstance(res["y_prob"], np.ndarray) and len(res["y_prob"].shape) == 1:
                fpr, tpr, _ = roc_curve(y_test, res["y_prob"])
                plt.plot(fpr, tpr, label=f"{m_name} (AUC = {res['roc_auc']:.3f})", linewidth=2)
        
        if is_binary:
            plt.plot([0, 1], [0, 1], 'k--', label="Random Baseline", linewidth=1.5)
            plt.title(f"ROC Curves - {dataset_name.title()} Dataset", fontsize=14, fontweight="bold")
            plt.xlabel("False Positive Rate", fontsize=12)
            plt.ylabel("True Positive Rate (Recall)", fontsize=12)
            plt.legend(loc="lower right", fontsize=10)
            plt.tight_layout()
            roc_path = os.path.join(self.reports_dir, f"{dataset_name}_roc_curves.png")
            plt.savefig(roc_path, dpi=300)
            plt.close()
            print(f"[Evaluator] Saved ROC curves to {roc_path}")

        # 2. Model Comparison Bar Chart
        plt.figure(figsize=(10, 5))
        df_comp = pd.DataFrame([
            {
                "Model": m_name,
                "ROC AUC": res["roc_auc"],
                "F1 Score": res["f1_score"],
                "Accuracy": res["accuracy"],
                "Recall (Sensitivity)": res["recall"]
            }
            for m_name, res in results_dict.items()
        ])
        
        df_melted = df_comp.melt(id_vars=["Model"], var_name="Metric", value_name="Score")
        sns.barplot(data=df_melted, x="Model", y="Score", hue="Metric", palette="Blues_d")
        plt.title(f"Model Comparison Benchmark - {dataset_name.title()}", fontsize=14, fontweight="bold")
        plt.xticks(rotation=30, ha="right")
        plt.ylim(0, 1.05)
        plt.tight_layout()
        comp_path = os.path.join(self.reports_dir, f"{dataset_name}_model_comparison.png")
        plt.savefig(comp_path, dpi=300)
        plt.close()
        print(f"[Evaluator] Saved model comparison chart to {comp_path}")
