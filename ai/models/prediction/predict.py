import joblib
import pandas as pd
import numpy as np
import os
import shap

class HeartDiseasePredictor:
    def __init__(self, model_dir="ai/models/prediction/"):
        self.model_path = os.path.join(model_dir, "heart_best_model.joblib")
        self.metadata_path = os.path.join(model_dir, "model_metadata.joblib")
        self.background_path = os.path.join(model_dir, "shap_background.joblib")
        self.features_path = os.path.join(model_dir, "feature_names.joblib")
        
        # Load assets
        if not os.path.exists(self.model_path) or not os.path.exists(self.background_path):
            raise FileNotFoundError("Model assets not found. Train the model first.")
            
        self.model = joblib.load(self.model_path)
        self.metadata = joblib.load(self.metadata_path) if os.path.exists(self.metadata_path) else {"model_name": "RANDOM_FOREST"}
        self.background_data = joblib.load(self.background_path)
        self.feature_names = joblib.load(self.features_path)
        
        # Initialize SHAP TreeExplainer (TreeExplainer natively supports RF, GB, and XGBoost!)
        self.explainer = shap.TreeExplainer(self.model, data=self.background_data)

    def predict(self, input_data: dict):
        """
        input_data keys must match the feature names.
        """
        # Convert dictionary to DataFrame with correct column order
        df = pd.DataFrame([input_data])[self.feature_names]
        
        # Run prediction
        risk_level_id = int(self.model.predict(df)[0])
        probabilities = self.model.predict_proba(df)[0]
        
        risk_levels = ["LOW", "MODERATE", "HIGH"]
        predicted_risk = risk_levels[risk_level_id]
        confidence = float(probabilities[risk_level_id])
        
        # Calculate SHAP values
        shap_res = self.explainer.shap_values(df)
        
        # For some tree versions (e.g. newer XGBoost or lightgbm), SHAP values might be a single 3D array 
        # (N, D, C) instead of a list of class matrices.
        # Let's write robust handling to extract the SHAP vector for the predicted class:
        if isinstance(shap_res, list):
            class_shap_values = shap_res[risk_level_id][0]
        else:
            # If shape is (N, D, C)
            if len(shap_res.shape) == 3:
                class_shap_values = shap_res[0, :, risk_level_id]
            else:
                # Shape (N, D)
                class_shap_values = shap_res[0]
        
        # Combine feature names and values
        contributions = []
        for name, val in zip(self.feature_names, class_shap_values):
            contributions.append({
                "feature": name,
                "value": float(df[name].values[0]),
                "shap_value": float(val),
                "impact": "INCREASES_RISK" if val > 0 else "DECREASES_RISK",
                "importance": abs(float(val))
            })
            
        # Sort by importance (absolute SHAP value)
        contributions = sorted(contributions, key=lambda x: x["importance"], reverse=True)
        
        # Generate plain language summary
        top_positive = [c for c in contributions if c["impact"] == "INCREASES_RISK"][:3]
        top_negative = [c for c in contributions if c["impact"] == "DECREASES_RISK"][:3]
        
        calculated_risk_score = float(np.dot(probabilities, [15.0, 50.0, 90.0]))

        if calculated_risk_score >= 65 or predicted_risk == "HIGH":
            pos_str = ", ".join([f"{c['feature']} ({c['value']})" for c in top_positive]) or "elevated arterial pressure"
            explanation = f"The patient demonstrates severe cardiovascular risk ({calculated_risk_score:.0f}%) primarily due to {pos_str}."
        elif calculated_risk_score >= 30 or predicted_risk == "MODERATE":
            pos_str = ", ".join([f"{c['feature']} ({c['value']})" for c in top_positive]) or "borderline physiological vitals"
            explanation = f"The patient demonstrates moderate cardiovascular risk ({calculated_risk_score:.0f}%) driven by {pos_str}."
        else:
            neg_str = ", ".join([f"healthy {c['feature']} ({c['value']})" for c in top_negative]) or "optimal vital signs"
            explanation = f"The patient's cardiovascular profile appears healthy ({calculated_risk_score:.0f}% risk) with {neg_str}."

        return {
            "riskLevel": predicted_risk,
            "riskScore": float(np.dot(probabilities, [15.0, 50.0, 90.0])), # Scaled index
            "confidenceScore": confidence,
            "modelName": self.metadata['model_name'],
            "probabilities": {
                "LOW": float(probabilities[0]),
                "MODERATE": float(probabilities[1]),
                "HIGH": float(probabilities[2])
            },
            "contributions": contributions,
            "plainExplanation": explanation
        }
