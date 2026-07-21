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
        
        explanation = f"Your cardiovascular risk is assessed as {predicted_risk} using the {self.metadata['model_name']} model (Confidence: {confidence * 100:.1f}%)."
        
        if predicted_risk == "HIGH" or predicted_risk == "MODERATE":
            factors = ", ".join([f"higher {c['feature']} ({c['value']})" for c in top_positive])
            explanation += f" The primary factors increasing your risk score are {factors}."
            if top_negative:
                reductions = ", ".join([f"{c['feature']} ({c['value']})" for c in top_negative])
                explanation += f" On the positive side, your {reductions} are helping lower your risk."
        else:
            reductions = ", ".join([f"healthy {c['feature']} ({c['value']})" for c in top_negative])
            explanation += f" Your low risk assessment is primarily driven by your {reductions}."
            if top_positive:
                warnings = ", ".join([f"higher {c['feature']} ({c['value']})" for c in top_positive])
                explanation += f" However, keep an eye on {warnings} as they are slight negative contributors."

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
