import os
import sys
import unittest
import numpy as np
import pandas as pd

# Add ai directory to sys.path
AI_DIR = os.path.dirname(os.path.abspath(__file__))
if AI_DIR not in sys.path:
    sys.path.insert(0, AI_DIR)

from preprocessing.preprocessor import ClinicalDataPreprocessor, MedicalPreprocessor
from datasets.dataset_loader import DatasetLoader
from orchestrator.pipeline_orchestrator import UnifiedAIOrchestrator, PipelineOrchestrator

class TestPhase2MLIntegrity(unittest.TestCase):
    """
    Comprehensive ML Integrity and Prediction Honesty Regression Test Suite.
    Verifies that all Phase 2 requirements are strictly met:
    1. Zero Preprocessing Data Leakage.
    2. Zero Input Feature Fabrication and Structured INCOMPLETE_FEATURES Rejection.
    3. Dataset Provenance and Synthetic Demonstration Declarations.
    4. Deterministic and Reproducible Inference.
    5. Authentic Patient-Specific SHAP Explanations (No Hardcoded Weights).
    6. Output Semantics and Multiplier Removal.
    """

    def setUp(self):
        self.orchestrator = UnifiedAIOrchestrator(models_dir=os.path.join(AI_DIR, "models"))
        self.loader = DatasetLoader(data_dir=os.path.join(AI_DIR, "datasets"))

    # --------------------------------------------------------------------------
    # STEP 2: ZERO DATA LEAKAGE TESTS
    # --------------------------------------------------------------------------
    def test_zero_preprocessing_leakage(self):
        """Proves that test data does NOT alter training-fitted transformations or outlier bounds."""
        df_raw = pd.DataFrame({
            "age": [45, 50, 55, 60, 65, 48, 52, 58, 62, 70],
            "sysBP": [120, 130, 125, 140, 135, 122, 128, 138, 142, 130],
            "diaBP": [80, 85, 82, 90, 88, 81, 84, 88, 92, 85],
            "glucose": [90, 95, 100, 110, 105, 92, 98, 104, 112, 96],
            "gender": ["Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female"],
            "target": [0, 0, 1, 0, 1, 0, 0, 1, 1, 0]
        })

        # Split before fitting
        df_train, df_val, df_test = ClinicalDataPreprocessor.split_raw_dataset(
            df_raw, target_column="target", train_size=0.6, val_size=0.2, test_size=0.2, random_state=42
        )

        preprocessor = ClinicalDataPreprocessor(target_column="target")
        preprocessor.fit(df_train)

        # Record fitted parameters from training data
        fitted_median_sysbp = preprocessor.imputer_num.statistics_[preprocessor.numerical_cols.index("sysBP")]
        fitted_scaler_mean_sysbp = preprocessor.scaler.mean_[preprocessor.numerical_cols.index("sysBP")]
        fitted_bounds = dict(preprocessor.outlier_bounds_)

        self.assertEqual(preprocessor.fitted_on_split, "train_only")
        self.assertEqual(preprocessor.fitted_sample_count, len(df_train))

        # Create severely contaminated / mutated test data with extreme outliers
        df_test_mutated = df_test.copy()
        df_test_mutated["sysBP"] = [9999.0, 8888.0]
        df_test_mutated["glucose"] = [5000.0, 6000.0]

        # Transform mutated test data
        _ = preprocessor.transform(df_test_mutated)

        # Verify that preprocessor parameters remained UNTOUCHED and unchanged
        post_median_sysbp = preprocessor.imputer_num.statistics_[preprocessor.numerical_cols.index("sysBP")]
        post_scaler_mean_sysbp = preprocessor.scaler.mean_[preprocessor.numerical_cols.index("sysBP")]
        post_bounds = dict(preprocessor.outlier_bounds_)

        self.assertEqual(fitted_median_sysbp, post_median_sysbp, "Imputer statistics leaked from test data!")
        self.assertEqual(fitted_scaler_mean_sysbp, post_scaler_mean_sysbp, "Scaler moments leaked from test data!")
        self.assertEqual(fitted_bounds, post_bounds, "Outlier IQR bounds leaked from test data!")

    def test_preprocessor_backward_compatibility_alias(self):
        """Verifies that MedicalPreprocessor is available as an alias to ClinicalDataPreprocessor."""
        self.assertIs(MedicalPreprocessor, ClinicalDataPreprocessor)
        self.assertIs(PipelineOrchestrator, UnifiedAIOrchestrator)

    # --------------------------------------------------------------------------
    # STEP 3: DATASET PROVENANCE TESTS
    # --------------------------------------------------------------------------
    def test_dataset_provenance_integrity(self):
        """Verifies that all 5 datasets are explicitly marked SYNTHETIC_DEMO with clinical validation unavailable."""
        registry = DatasetLoader.PROVENANCE_REGISTRY
        self.assertEqual(len(registry), 5)
        for key, meta in registry.items():
            self.assertEqual(meta["provenance_type"], "SYNTHETIC_DEMO", f"{key} provenance must be SYNTHETIC_DEMO")
            self.assertTrue(meta["is_synthetic_demonstration"], f"{key} must be marked is_synthetic_demonstration")
            self.assertFalse(meta["clinical_validation_available"], f"{key} must have clinical_validation_available=False")
            self.assertIn("limitations", meta, f"{key} must document limitations")
            self.assertIn("original_research_reference", meta, f"{key} must document academic reference")

    # --------------------------------------------------------------------------
    # STEP 4: INPUT FEATURE FABRICATION REMOVAL & INCOMPLETE REJECTION
    # --------------------------------------------------------------------------
    def test_incomplete_features_rejection_heart_failure(self):
        """Verifies that Heart Failure model cleanly rejects records missing clinical lab values without fabricating defaults."""
        # Standard manual risk scan lacks echocardiogram and lab tests
        payload = {
            "age": 55,
            "gender": "male",
            "systolicBP": 135,
            "diastolicBP": 85,
            "cholesterol": 210,
            "bloodSugar": 95,
            "smoking": False
        }
        res = self.orchestrator.orchestrate_prediction(payload)
        deferred_names = [m["model"] for m in res["deferredModels"]]
        
        self.assertIn("heart_failure", deferred_names)
        self.assertNotIn("heart_failure", res["executedModels"])
        
        hf_deferred = next(m for m in res["deferredModels"] if m["model"] == "heart_failure")
        self.assertEqual(hf_deferred["status"], "INCOMPLETE_FEATURES")
        self.assertIn("ejectionFraction", hf_deferred["missingFeatures"])
        self.assertIn("serumCreatinine", hf_deferred["missingFeatures"])

    def test_incomplete_features_rejection_ecg(self):
        """Verifies that ECG model cleanly rejects records missing 12-lead intervals without fabricating PR/QRS."""
        payload = {
            "age": 55,
            "gender": "male",
            "systolicBP": 135,
            "diastolicBP": 85
        }
        res = self.orchestrator.orchestrate_prediction(payload)
        deferred_names = [m["model"] for m in res["deferredModels"]]
        
        self.assertIn("ecg", deferred_names)
        self.assertNotIn("ecg", res["executedModels"])
        
        ecg_deferred = next(m for m in res["deferredModels"] if m["model"] == "ecg")
        self.assertEqual(ecg_deferred["status"], "INCOMPLETE_FEATURES")
        self.assertIn("pr_interval", ecg_deferred["missingFeatures"])
        self.assertIn("qrs_duration", ecg_deferred["missingFeatures"])

    def test_legitimate_execution_when_inputs_provided(self):
        """Verifies that models execute legitimately when genuine clinical measurements are supplied."""
        full_payload = {
            "age": 58,
            "gender": "male",
            "systolicBP": 138,
            "diastolicBP": 88,
            "cholesterol": 220,
            "bloodSugar": 96,
            "smoking": False,
            "height": 175,
            "weight": 78,
            "exerciseFrequency": 3,
            "alcohol": False,
            # Genuine HF inputs:
            "ejectionFraction": 35,
            "serumCreatinine": 1.2,
            "serumSodium": 137,
            "platelets": 240000,
            "creatininePhosphokinase": 450,
            "highBloodPressure": 1,
            "anaemia": 0,
            # Genuine ECG inputs:
            "rr_interval": 820,
            "heart_rate": 72,
            "pr_interval": 160,
            "qrs_duration": 92,
            "qt_interval": 410,
            "st_elevation": 0.0,
            "p_wave_amp": 0.15,
            "t_wave_amp": 0.35
        }
        res = self.orchestrator.orchestrate_prediction(full_payload)
        
        self.assertIn("framingham", res["executedModels"])
        self.assertIn("cardio", res["executedModels"])
        self.assertIn("heart_failure", res["executedModels"])
        self.assertIn("ecg", res["executedModels"])

    # --------------------------------------------------------------------------
    # STEP 5: OUTPUT SEMANTICS TESTS
    # --------------------------------------------------------------------------
    def test_no_unsupported_horizon_multipliers(self):
        """Verifies that multi-horizon fixed multipliers (0.28, 0.65, 0.95) are NOT in the orchestrator output."""
        payload = {
            "age": 60,
            "gender": "male",
            "systolicBP": 140,
            "diastolicBP": 90,
            "cholesterol": 230,
            "bloodSugar": 100,
            "smoking": True
        }
        res = self.orchestrator.orchestrate_prediction(payload)
        
        # Verify response structure conforms to strict clinical semantics
        self.assertIn("riskScore", res)
        self.assertIn("riskLevel", res)
        self.assertIn("executedModels", res)
        self.assertIn("deferredModels", res)
        self.assertIn("provenanceNotice", res)
        # Verify fixed multiplier keys are not produced by the orchestrator
        self.assertNotIn("risk30Day", res)
        self.assertNotIn("risk1Year", res)
        self.assertNotIn("risk5Year", res)

    # --------------------------------------------------------------------------
    # STEP 6: AUTHENTIC SHAP EXPLAINABILITY TESTS
    # --------------------------------------------------------------------------
    def test_authentic_shap_or_explicit_unavailable(self):
        """Verifies that SHAP explanations are either patient-specific from model or explicitly EXPLANATION_UNAVAILABLE."""
        payload = {
            "age": 62,
            "gender": "male",
            "systolicBP": 155,
            "diastolicBP": 95,
            "cholesterol": 260,
            "bloodSugar": 115,
            "smoking": True,
            "height": 170,
            "weight": 85,
            "exerciseFrequency": 1,
            "alcohol": True
        }
        res = self.orchestrator.orchestrate_prediction(payload)
        shap_explanation = res.get("featureImportance", [])

        # Verify that explanation does not use the deprecated fixed constants (0.28, 0.22, 0.18...)
        if isinstance(shap_explanation, list) and len(shap_explanation) > 0:
            importances = [item.get("importance") for item in shap_explanation if "importance" in item]
            hardcoded_weights = [0.28, 0.22, 0.18, 0.15, 0.10, 0.07]
            self.assertNotEqual(importances[:len(hardcoded_weights)], hardcoded_weights,
                                "SHAP output matches deprecated hardcoded importance weights!")
        else:
            # Explicit unavailable state
            self.assertEqual(res.get("explanationStatus"), "EXPLANATION_UNAVAILABLE")

    # --------------------------------------------------------------------------
    # STEP 7: DETERMINISTIC INFERENCE TESTS
    # --------------------------------------------------------------------------
    def test_deterministic_inference(self):
        """Verifies that identical patient inputs produce identical outputs across repeated runs."""
        payload = {
            "age": 52,
            "gender": "female",
            "systolicBP": 128,
            "diastolicBP": 82,
            "cholesterol": 195,
            "bloodSugar": 88,
            "smoking": False,
            "height": 162,
            "weight": 64,
            "exerciseFrequency": 4,
            "alcohol": False
        }
        res1 = self.orchestrator.orchestrate_prediction(payload)
        res2 = self.orchestrator.orchestrate_prediction(payload)

        self.assertEqual(res1["riskScore"], res2["riskScore"])
        self.assertEqual(res1["riskLevel"], res2["riskLevel"])
        self.assertEqual(res1["executedModels"], res2["executedModels"])
        self.assertEqual(res1["deferredModels"], res2["deferredModels"])

if __name__ == "__main__":
    unittest.main(verbosity=2)
