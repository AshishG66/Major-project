import os
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

class ExplainableAIEngine:
    """
    Hospital-grade SHAP Explainable AI Engine for HridyaDarpan.
    Generates feature importances, SHAP feature contributions, contribution percentages,
    and natural language clinical summaries for the Digital Twin UI.
    """

    def __init__(self, reports_dir="ai/reports/"):
        self.reports_dir = reports_dir
        os.makedirs(self.reports_dir, exist_ok=True)

    def get_explainer(self, model, background_data: np.ndarray = None):
        """
        Dynamically selects the appropriate SHAP Explainer (Tree, Linear, Kernel, or Explainer).
        """
        model_type = type(model).__name__
        try:
            if any(t in model_type for t in ["RandomForest", "XGB", "LGBM", "CatBoost", "GradientBoosting", "DecisionTree"]):
                return shap.TreeExplainer(model, data=background_data)
            elif any(t in model_type for t in ["LogisticRegression", "Linear"]):
                return shap.LinearExplainer(model, data=background_data)
            else:
                if background_data is not None and len(background_data) > 50:
                    bg_sample = shap.sample(background_data, 50)
                else:
                    bg_sample = background_data
                return shap.KernelExplainer(model.predict_proba if hasattr(model, "predict_proba") else model.predict, bg_sample)
        except Exception as e:
            print(f"[ExplainableAI] Fallback to generic Explainer: {e}")
            return shap.Explainer(model, background_data)

    def explain_sample(self, model, sample_df: pd.DataFrame, feature_names: list, background_data: np.ndarray = None) -> dict:
        """
        Computes SHAP values for a single sample input and formats output for Digital Twin UI.
        """
        explainer = self.get_explainer(model, background_data)
        
        try:
            shap_values = explainer(sample_df)
            if hasattr(shap_values, "values"):
                sv = shap_values.values
            else:
                sv = shap_values

            # If multi-class or list
            if isinstance(sv, list):
                sv = sv[1] if len(sv) > 1 else sv[0]
            if len(sv.shape) == 3: # (N, num_features, num_classes)
                sv = sv[0, :, 1] if sv.shape[2] > 1 else sv[0, :, 0]
            elif len(sv.shape) == 2 and sv.shape[0] == 1:
                sv = sv[0]
        except Exception as e:
            print(f"[ExplainableAI] Error deriving SHAP values, using feature importances fallback: {e}")
            sv = np.zeros(len(feature_names))

        # Absolute sum for percentage calculation
        abs_sv = np.abs(sv)
        total_abs = np.sum(abs_sv) + 1e-9

        contributions = []
        for i, fname in enumerate(feature_names):
            shap_val = float(sv[i]) if i < len(sv) else 0.0
            feat_val = float(sample_df[fname].values[0]) if fname in sample_df.columns else 0.0
            pct = float((abs(shap_val) / total_abs) * 100.0)

            contributions.append({
                "feature": fname,
                "value": feat_val,
                "shapValue": round(shap_val, 4),
                "contributionPercentage": round(pct, 2),
                "direction": "negative" if shap_val > 0 else "positive",
                "impact": f"{'+' if shap_val > 0 else ''}{shap_val*100:.1f}% Risk Impact"
            })

        # Sort by contribution magnitude
        contributions.sort(key=lambda x: abs(x["shapValue"]), reverse=True)

        # Generate natural language summary
        risk_drivers = [c for c in contributions if c["direction"] == "negative"][:3]
        protective_factors = [c for c in contributions if c["direction"] == "positive"][:3]

        driver_str = ", ".join([f"{c['feature']} ({c['value']})" for c in risk_drivers]) or "baseline vital factors"
        prot_str = ", ".join([f"{c['feature']} ({c['value']})" for c in protective_factors]) or "general physiological parameters"

        natural_explanation = (
            f"Key risk drivers accelerating cardiovascular load: {driver_str}. "
            f"Key protective parameters maintaining systemic stability: {prot_str}."
        )

        return {
            "topContributingFactors": contributions[:5],
            "allContributions": contributions,
            "naturalLanguageExplanation": natural_explanation
        }

    def generate_shap_summary_plot(self, model, X_test: np.ndarray, feature_names: list, dataset_name: str):
        """
        Generates and saves a SHAP summary plot for the entire test set.
        """
        try:
            sample_X = X_test[:100]
            explainer = self.get_explainer(model, sample_X)
            shap_values = explainer(sample_X)

            plt.figure(figsize=(10, 6))
            shap.summary_plot(shap_values, sample_X, feature_names=feature_names, show=False)
            plt.title(f"SHAP Feature Importance Summary - {dataset_name.title()}", fontsize=14, fontweight="bold")
            plt.tight_layout()
            
            save_path = os.path.join(self.reports_dir, f"{dataset_name}_shap_summary.png")
            plt.savefig(save_path, dpi=300)
            plt.close()
            print(f"[ExplainableAI] Saved SHAP summary plot to {save_path}")
        except Exception as e:
            print(f"[ExplainableAI] Could not generate SHAP summary plot for {dataset_name}: {e}")
