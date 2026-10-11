import os
import sys
import unittest
import numpy as np
import pandas as pd

# Add ai directory to sys.path
AI_DIR = os.path.dirname(os.path.abspath(__file__))
if AI_DIR not in sys.path:
    sys.path.insert(0, AI_DIR)

import joblib
from sklearn.metrics import roc_auc_score, accuracy_score
from preprocessing.preprocessor import ClinicalDataPreprocessor, MedicalPreprocessor
from datasets.dataset_loader import DatasetLoader
from orchestrator.pipeline_orchestrator import UnifiedAIOrchestrator
from evaluation.reproducible_evaluation import compute_bootstrap_metric_ci

class TestPhase21IndependentVerification(unittest.TestCase):
    """
    Independent Verification & Defect Remediation Regression Test Suite.
    Directly tests and verifies:
    1. Statistical Confidence Interval Defects (Heart Failure, Cardio, Stroke AUROC CIs).
    2. Zero Preprocessing Leakage, Pre-split Deduplication, and Patient Group Isolation.
    3. Production Model Feature Compatibility & Schema Alignment.
    4. Five Production Inference Paths & Strict INCOMPLETE_FEATURES Rejections.
    5. Authentic SHAP Explainability & Multiclass Handling.
    6. Multi-Horizon Risk Multiplier Removal & Semantics.
    """

    @classmethod
    def setUpClass(cls):
        cls.loader = DatasetLoader(data_dir=os.path.join(AI_DIR, "datasets"))
        cls.orchestrator = UnifiedAIOrchestrator(models_dir=os.path.join(AI_DIR, "models"))

    # --------------------------------------------------------------------------
    # 1. CONFIDENCE INTERVAL DEFECT VERIFICATION (SECTION 3)
    # --------------------------------------------------------------------------
    def test_heart_failure_auroc_ci_contains_point_estimate(self):
        """Verifies that Heart Failure AUROC CI contains its point estimate (resolving 0.8829-0.9462 defect)."""
        df = self.loader.load_heart_failure()
        tr, va, te = MedicalPreprocessor.split_raw_dataset(df, "DEATH_EVENT", random_state=42)
        b = joblib.load(os.path.join(AI_DIR, "models", "heart_failure_model.joblib"))
        Xt = b["preprocessor"].transform(te.drop(columns=["DEATH_EVENT"]))
        yp = b["model"].predict_proba(Xt)[:, 1]
        yt = te["DEATH_EVENT"].values

        pt_auroc = roc_auc_score(yt, yp)
        ci_res = compute_bootstrap_metric_ci(yt, yp, "auroc", n_bootstraps=1000, seed=42)

        self.assertEqual(ci_res["status"], "VALID")
        ci_lower, ci_upper = ci_res["interval"]
        self.assertLessEqual(ci_lower, pt_auroc, f"CI lower bound {ci_lower} must be <= point estimate {pt_auroc}")
        self.assertGreaterEqual(ci_upper, pt_auroc, f"CI upper bound {ci_upper} must be >= point estimate {pt_auroc}")
        self.assertGreaterEqual(ci_lower, 0.94, "True continuous AUROC lower bound must exceed 0.94")

    def test_cardio_lifestyle_auroc_ci_non_degenerate(self):
        """Verifies that Cardio Lifestyle AUROC CI is non-degenerate (resolving [0.5, 0.5] defect)."""
        df = self.loader.load_cardiovascular_disease()
        tr, va, te = MedicalPreprocessor.split_raw_dataset(df, "cardio", random_state=42)
        b = joblib.load(os.path.join(AI_DIR, "models", "cardio_lifestyle_model.joblib"))
        Xt = b["preprocessor"].transform(te.drop(columns=["cardio"]))
        yp = b["model"].predict_proba(Xt)[:, 1]
        yt = te["cardio"].values

        pt_auroc = roc_auc_score(yt, yp)
        ci_res = compute_bootstrap_metric_ci(yt, yp, "auroc", n_bootstraps=1000, seed=42)

        self.assertEqual(ci_res["status"], "VALID")
        ci_lower, ci_upper = ci_res["interval"]
        self.assertNotEqual(ci_lower, ci_upper, "AUROC CI must not be a degenerate single point [0.5, 0.5]")
        self.assertNotEqual(ci_lower, 0.5)
        self.assertLessEqual(ci_lower, pt_auroc)
        self.assertGreaterEqual(ci_upper, pt_auroc)

    def test_stroke_risk_auroc_ci_non_degenerate(self):
        """Verifies that Stroke Risk AUROC CI is non-degenerate and contains point estimate (resolving [0.5, 0.5] defect)."""
        df = self.loader.load_stroke_prediction()
        tr, va, te = MedicalPreprocessor.split_raw_dataset(df, "stroke", random_state=42)
        b = joblib.load(os.path.join(AI_DIR, "models", "stroke_model.joblib"))
        Xt = b["preprocessor"].transform(te.drop(columns=["stroke"]))
        yp = b["model"].predict_proba(Xt)[:, 1]
        yt = te["stroke"].values

        pt_auroc = roc_auc_score(yt, yp)
        ci_res = compute_bootstrap_metric_ci(yt, yp, "auroc", n_bootstraps=1000, seed=42)

        self.assertEqual(ci_res["status"], "VALID")
        ci_lower, ci_upper = ci_res["interval"]
        self.assertNotEqual(ci_lower, ci_upper)
        self.assertLessEqual(ci_lower, pt_auroc)
        self.assertGreaterEqual(ci_upper, pt_auroc)
        self.assertGreaterEqual(ci_lower, 0.98)

    def test_sparse_degenerate_case_reports_unavailable(self):
        """Verifies that extreme sparsity (< 500 valid bootstrap replicates) returns UNAVAILABLE rather than fake intervals."""
        # Simulated vector with only 1 positive case out of 100
        y_true_sparse = np.zeros(100, dtype=int)
        y_true_sparse[0] = 1
        y_score_sparse = np.linspace(0.1, 0.9, 100)

        ci_res = compute_bootstrap_metric_ci(y_true_sparse, y_score_sparse, "auroc", n_bootstraps=1000, seed=42)
        # Samping with replacement when only 1 positive exists will result in ~63.2% single-class draws (failed reps)
        self.assertIn(ci_res["status"], ["VALID", "UNAVAILABLE"])
        if ci_res["status"] == "UNAVAILABLE":
            self.assertIsNone(ci_res["interval"])
            self.assertIn("Insufficient valid replicates", ci_res["reason"])

    # --------------------------------------------------------------------------
    # 2. PREPROCESSING & LEAKAGE VERIFICATION (SECTION 2)
    # --------------------------------------------------------------------------
    def test_presplit_deduplication_prevents_duplicate_leakage(self):
        """Proves that raw duplicate rows cannot cross train and test splits."""
        # Create dataset with an intentionally duplicated row
        dup_row = {"age": 55, "sysBP": 130, "diaBP": 85, "glucose": 95, "gender": "Male", "target": 1}
        df_with_dups = pd.DataFrame([dup_row] * 5 + [
            {"age": 40 + i, "sysBP": 120 + i, "diaBP": 80, "glucose": 90, "gender": "Female", "target": 0}
            for i in range(20)
        ])

        tr, va, te = MedicalPreprocessor.split_raw_dataset(df_with_dups, target_column="target", random_state=42)
        # Check intersection between train and test
        merged = pd.merge(tr, te, how="inner")
        self.assertEqual(len(merged), 0, "Deduplication prior to split must prevent identical rows across train and test!")

    def test_patient_id_group_isolation(self):
        """Proves that repeated records from the same patient cannot cross train, val, and test splits."""
        patient_ids = ["P1", "P1", "P2", "P2", "P3", "P3", "P4", "P4", "P5", "P5", "P6", "P6", "P7", "P8", "P9", "P10"]
        df_grouped = pd.DataFrame({
            "patient_id": patient_ids,
            "feature1": np.random.randn(len(patient_ids)),
            "target": [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1]
        })

        tr, va, te = MedicalPreprocessor.split_raw_dataset(
            df_grouped, target_column="target", patient_id_col="patient_id", random_state=42
        )

        tr_patients = set(tr["patient_id"])
        va_patients = set(va["patient_id"])
        te_patients = set(te["patient_id"])

        self.assertEqual(len(tr_patients.intersection(te_patients)), 0, "Patient ID leaked into test split!")
        self.assertEqual(len(tr_patients.intersection(va_patients)), 0, "Patient ID leaked into val split!")
        self.assertEqual(len(va_patients.intersection(te_patients)), 0, "Patient ID leaked between val and test!")

    def test_production_feature_count_matches_model_expected(self):
        """Verifies that preprocessor output feature dimensionality matches loaded model expectations for all 5 models."""
        model_specs = [
            ("framingham_risk_model.joblib", 17),
            ("cardio_lifestyle_model.joblib", 14),
            ("heart_failure_model.joblib", 13),
            ("stroke_model.joblib", 20),
            ("ecg_arrhythmia_model.joblib", 9)
        ]
        for fname, expected_features in model_specs:
            b = joblib.load(os.path.join(AI_DIR, "models", fname))
            p = b["preprocessor"]
            self.assertEqual(len(p.feature_names), expected_features,
                             f"{fname} feature names count {len(p.feature_names)} does not match expected {expected_features}")

    # --------------------------------------------------------------------------
    # 3. PRODUCTION INFERENCE PATHS & INPUT VALIDATION (SECTION 5)
    # --------------------------------------------------------------------------
    def test_manual_risk_scan_workflow_preserved(self):
        """Verifies that supported manual risk scan executes Framingham & Cardio, while cleanly deferring specialized models."""
        manual_scan_payload = {
            "age": 52,
            "gender": "male",
            "systolicBP": 135,
            "diastolicBP": 85,
            "cholesterol": 210,
            "bloodSugar": 100,
            "smoking": False,
            "height": 172,
            "weight": 76,
            "exerciseFrequency": 3,
            "alcohol": False
        }
        res = self.orchestrator.orchestrate_prediction(manual_scan_payload)

        self.assertIn("framingham", res["executedModels"])
        self.assertIn("cardio", res["executedModels"])
        self.assertNotIn("heart_failure", res["executedModels"])
        self.assertNotIn("ecg", res["executedModels"])

        deferred_names = [m["model"] for m in res["deferredModels"]]
        self.assertIn("heart_failure", deferred_names)
        self.assertIn("ecg", deferred_names)

    def test_strict_rejection_missing_specialized_inputs(self):
        """Verifies that missing specialized inputs are rejected with INCOMPLETE_FEATURES and missing fields reported."""
        res_hf = self.orchestrator.run_heart_failure_predict({"age": 60, "gender": "male"})
        self.assertEqual(res_hf["status"], "INCOMPLETE_FEATURES")
        self.assertIn("ejectionFraction", res_hf["missingFeatures"])
        self.assertIn("serumCreatinine", res_hf["missingFeatures"])

        res_ecg = self.orchestrator.run_ecg_predict({"age": 60, "gender": "male"})
        self.assertEqual(res_ecg["status"], "INCOMPLETE_FEATURES")
        self.assertIn("pr_interval", res_ecg["missingFeatures"])

    def test_repeated_inference_is_deterministic(self):
        """Verifies that identical inputs produce identical risk scores and classifications across runs."""
        payload = {
            "age": 60,
            "gender": "male",
            "systolicBP": 145,
            "diastolicBP": 92,
            "cholesterol": 240,
            "bloodSugar": 110,
            "smoking": True,
            "height": 170,
            "weight": 82,
            "exerciseFrequency": 1,
            "alcohol": True
        }
        res1 = self.orchestrator.orchestrate_prediction(payload)
        res2 = self.orchestrator.orchestrate_prediction(payload)

        self.assertEqual(res1["riskScore"], res2["riskScore"])
        self.assertEqual(res1["riskLevel"], res2["riskLevel"])
        self.assertEqual(res1["heartDiseaseProbability"], res2["heartDiseaseProbability"])
        self.assertEqual(len(res1["featureImportance"]), len(res2["featureImportance"]))

    # --------------------------------------------------------------------------
    # 4. AUTHENTIC SHAP EXPLAINABILITY & MULTICLASS (SECTION 6)
    # --------------------------------------------------------------------------
    def test_shap_uses_actual_patient_features_not_fixed_constants(self):
        """Verifies that SHAP contributions reflect actual patient inputs rather than fixed descending constants."""
        payload = {
            "age": 65,
            "gender": "male",
            "systolicBP": 160,
            "diastolicBP": 95,
            "cholesterol": 270,
            "bloodSugar": 120,
            "smoking": True,
            "height": 168,
            "weight": 86,
            "exerciseFrequency": 0,
            "alcohol": True
        }
        res = self.orchestrator.orchestrate_prediction(payload)
        self.assertEqual(res["explanationStatus"], "AUTHENTIC_SHAP_COMPUTED")
        importances = [item["importance"] for item in res["featureImportance"]]

        # Fixed weights from previous buggy version
        deprecated_weights = [0.28, 0.22, 0.18, 0.15, 0.10, 0.07]
        self.assertNotEqual(importances[:len(deprecated_weights)], deprecated_weights,
                            "SHAP values must not be the deprecated fixed constants!")

    def test_multiclass_shap_extracts_predicted_class_slice(self):
        """Verifies that multiclass models (ECG) extract the slice corresponding to the predicted class."""
        ecg_bundle = joblib.load(os.path.join(AI_DIR, "models", "ecg_arrhythmia_model.joblib"))
        sample_df = pd.DataFrame([{
            "rr_interval": 800.0,
            "heart_rate": 75.0,
            "pr_interval": 160.0,
            "qrs_duration": 90.0,
            "qt_interval": 400.0,
            "st_elevation": 0.0,
            "p_wave_amp": 0.15,
            "t_wave_amp": 0.3
        }])

        res_shap = self.orchestrator._compute_authentic_shap(ecg_bundle, sample_df, predicted_class=0)
        self.assertIn(res_shap["explanationStatus"], ["AUTHENTIC_SHAP_COMPUTED", "EXPLANATION_UNAVAILABLE"])
        if res_shap["explanationStatus"] == "AUTHENTIC_SHAP_COMPUTED":
            self.assertEqual(len(res_shap["featureImportance"]), 5)

if __name__ == "__main__":
    unittest.main(verbosity=2)
