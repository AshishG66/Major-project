import os
import sys
import unittest
import numpy as np
import pandas as pd
import torch

AI_DIR = os.path.dirname(os.path.abspath(__file__))
if AI_DIR not in sys.path:
    sys.path.insert(0, AI_DIR)

from models.lstm_model import LongitudinalHeartLSTM, AdditiveAttention
from models.hybrid_architecture import HybridXGBoostLSTMSystem
from datasets.dataset_loader import DatasetLoader
from preprocessing.preprocessor import MedicalPreprocessor

class TestHybridObjective2Audit(unittest.TestCase):
    """
    Independent Verification & Integrity Audit for Objective 2:
    Hybrid XGBoost-LSTM Machine Learning Architecture.
    """

    @classmethod
    def setUpClass(cls):
        cls.models_dir = os.path.join(AI_DIR, "models")
        cls.hybrid_system = HybridXGBoostLSTMSystem(models_dir=cls.models_dir)

    def test_01_xgboost_tabular_branch_and_tree_shap(self):
        """Verify XGBoost branch processes static demographic and lab inputs with true Tree-SHAP."""
        patient_data = {
            "age": 58, "gender": 0, "height": 172.0, "weight": 82.0, "bmi": 27.7,
            "systolicBP": 145, "diastolicBP": 92, "cholesterol": 245, "heartRate": 80,
            "bloodSugar": 115, "ecgResult": 0, "exerciseFrequency": 1, "smoking": 1,
            "alcohol": 0, "diabetes": 0, "familyHistory": 1, "chestPainType": 0,
            "sleepDuration": 6.5, "stressLevel": 7
        }
        res = self.hybrid_system.run_prediction(patient_data, history=None)
        
        self.assertIn("xgboostBranch", res)
        xgb = res["xgboostBranch"]
        self.assertGreater(xgb["probability"], 0.0)
        self.assertLess(xgb["probability"], 1.0)
        
        # Verify authentic Tree-SHAP feature attributions
        self.assertIn("featureAttributions", xgb)
        self.assertGreater(len(xgb["featureAttributions"]), 0)
        first_attr = xgb["featureAttributions"][0]
        self.assertIn("feature", first_attr)
        self.assertIn("shapValue", first_attr)
        self.assertIn("importance", first_attr)

    def test_02_insufficient_history_triggers_documented_fallback(self):
        """Verify new patient without longitudinal history triggers FALLBACK_STATIC_XGBOOST."""
        patient_data = {"age": 50, "gender": 1, "systolicBP": 120, "diastolicBP": 80, "cholesterol": 190}
        
        # Single initial visit (no prior visit history)
        res = self.hybrid_system.run_prediction(patient_data, history=None)
        
        self.assertEqual(res["hybridStatus"], "FALLBACK_STATIC_XGBOOST")
        self.assertFalse(res["lstmBranch"]["available"])
        self.assertIn("Insufficient", res["fusionStrategy"])

    def test_03_longitudinal_history_engages_meta_learner_stacking(self):
        """Verify patient with >=2 visits engages HYBRID_FUSION_ACTIVE with LSTM attention."""
        patient_data = {"age": 55, "gender": 0, "systolicBP": 140, "diastolicBP": 90, "cholesterol": 240}
        visits = [
            {"systolicBP": 122, "diastolicBP": 80, "cholesterol": 195, "bloodSugar": 95, "heartRate": 70, "bmi": 24.2, "timestamp": "2025-01-10"},
            {"systolicBP": 138, "diastolicBP": 88, "cholesterol": 235, "bloodSugar": 110, "heartRate": 82, "bmi": 26.5, "timestamp": "2025-06-15"},
        ]
        res = self.hybrid_system.run_prediction(patient_data, history=visits)
        
        self.assertEqual(res["hybridStatus"], "HYBRID_FUSION_ACTIVE")
        self.assertTrue(res["lstmBranch"]["available"])
        
        # Verify LSTM attention weights sum to ~1.0
        details = res["lstmBranch"]["details"]
        weights = details["attentionWeights"]
        self.assertEqual(len(weights), 3) # 2 past visits + current visit
        self.assertAlmostEqual(sum(weights), 1.0, places=3)
        
        # Verify temporal step explanations
        steps = details["temporalStepAttribution"]
        self.assertEqual(len(steps), 3)
        self.assertIn("relativeSignificance", steps[0])

    def test_04_monte_carlo_dropout_uncertainty_and_ci(self):
        """Verify test-time stochastic Monte Carlo Dropout produces true 95% predictive interval."""
        visits = [
            {"systolicBP": 125, "diastolicBP": 82, "cholesterol": 200, "bloodSugar": 100, "heartRate": 74, "bmi": 25.0},
            {"systolicBP": 142, "diastolicBP": 90, "cholesterol": 240, "bloodSugar": 120, "heartRate": 85, "bmi": 27.0},
        ]
        patient_data = {"age": 60, "gender": 0, "systolicBP": 145, "diastolicBP": 92, "cholesterol": 250}
        
        res = self.hybrid_system.run_prediction(patient_data, history=visits)
        uncertainty = res.get("uncertainty", {})
        
        self.assertIn("confidenceInterval95", uncertainty)
        ci = uncertainty["confidenceInterval95"]
        self.assertIsNotNone(ci)
        self.assertEqual(len(ci), 2)
        lower_ci, upper_ci = ci[0], ci[1]
        
        self.assertGreaterEqual(lower_ci, 0.0)
        self.assertLessEqual(upper_ci, 1.0)
        self.assertLessEqual(lower_ci, upper_ci)
        self.assertEqual(uncertainty["monteCarloPasses"], 30)

    def test_05_reproducibility_under_controlled_seed(self):
        """Verify Monte Carlo Dropout produces identical CI under identical torch seed."""
        x = torch.randn(1, 4, 6)
        lstm = self.hybrid_system.lstm_model
        
        torch.manual_seed(42)
        res1 = lstm.predict_monte_carlo(x, n_passes=20)
        
        torch.manual_seed(42)
        res2 = lstm.predict_monte_carlo(x, n_passes=20)
        
        self.assertAlmostEqual(res1["mean_probability"], res2["mean_probability"], places=5)
        self.assertAlmostEqual(res1["std_error"], res2["std_error"], places=5)
        self.assertEqual(res1["confidence_interval_95"], res2["confidence_interval_95"])

    def test_06_synthetic_provenance_and_limitations_labeled(self):
        """Verify provenance notice explicitly warns that dataset is synthetic demo."""
        patient_data = {"age": 50, "gender": 0, "systolicBP": 120, "diastolicBP": 80, "cholesterol": 190}
        res = self.hybrid_system.run_prediction(patient_data)
        
        self.assertIn("provenanceNotice", res)
        self.assertIn("SYNTHETIC_DEMO", res["provenanceNotice"])
        self.assertIn("Clinical validation pending", res["provenanceNotice"])

if __name__ == "__main__":
    unittest.main()
