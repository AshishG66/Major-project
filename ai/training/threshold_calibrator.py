import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import brier_score_loss, log_loss, precision_recall_curve, fbeta_score, recall_score, precision_score

class MedicalThresholdCalibrator:
    """
    Hospital-grade Threshold Optimizer & Probability Calibration Engine for HridyaDarpan ML Pipeline.
    Performs probability calibration (Platt Sigmoid & Isotonic Regression) and F2-Score Threshold Optimization
    to minimize False Negatives for high-stakes medical screening.
    """

    def __init__(self, reports_dir="ai/reports/"):
        self.reports_dir = reports_dir
        os.makedirs(self.reports_dir, exist_ok=True)

    def calibrate_model(self, model, X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray, dataset_name: str) -> tuple:
        """
        Calibrates model output probabilities using Platt Sigmoid & Isotonic Regression.
        Selects calibrated model with lowest Brier Score.
        """
        if len(np.unique(y_train)) > 2:
            # Multiclass return uncalibrated wrapper or Platt
            return model, "Uncalibrated (Multiclass)", 0.0

        # Uncalibrated baseline
        y_prob_uncal = model.predict_proba(X_val)[:, 1] if hasattr(model, "predict_proba") else model.predict(X_val)
        brier_uncal = float(brier_score_loss(y_val, y_prob_uncal))

        # 1. Platt Sigmoid Calibration
        try:
            calibrator_sigmoid = CalibratedClassifierCV(estimator=model, method="sigmoid", cv="prefit")
            calibrator_sigmoid.fit(X_train, y_train)
            y_prob_sig = calibrator_sigmoid.predict_proba(X_val)[:, 1]
            brier_sig = float(brier_score_loss(y_val, y_prob_sig))
        except Exception as e:
            calibrator_sigmoid = model
            brier_sig = 999.0

        # 2. Isotonic Calibration
        try:
            calibrator_iso = CalibratedClassifierCV(estimator=model, method="isotonic", cv="prefit")
            calibrator_iso.fit(X_train, y_train)
            y_prob_iso = calibrator_iso.predict_proba(X_val)[:, 1]
            brier_iso = float(brier_score_loss(y_val, y_prob_iso))
        except Exception as e:
            calibrator_iso = model
            brier_iso = 999.0

        # Choose best calibration
        if brier_sig <= brier_uncal and brier_sig <= brier_iso:
            best_calib_model = calibrator_sigmoid
            best_method = "Platt Sigmoidal"
            best_brier = brier_sig
        elif brier_iso <= brier_uncal and brier_iso <= brier_sig:
            best_calib_model = calibrator_iso
            best_method = "Isotonic Regression"
            best_brier = brier_iso
        else:
            best_calib_model = model
            best_method = "Uncalibrated Baseline"
            best_brier = brier_uncal

        print(f"[ThresholdCalibrator] Selected Calibration Method for {dataset_name}: {best_method} (Brier Score: {best_brier:.4f})")

        # Plot Reliability Curve
        self.plot_calibration_curve(model, calibrator_sigmoid, calibrator_iso, X_val, y_val, dataset_name)

        return best_calib_model, best_method, best_brier

    def optimize_decision_threshold(self, model, X_val: np.ndarray, y_val: np.ndarray, dataset_name: str) -> tuple:
        """
        Sweeps decision thresholds tau in [0.05, 0.90] to maximize F2 Score (Recall weighted 2x heavier than Precision).
        """
        if len(np.unique(y_val)) > 2:
            return 0.50, 1.0

        y_probs = model.predict_proba(X_val)[:, 1] if hasattr(model, "predict_proba") else model.predict(X_val)

        thresholds = np.linspace(0.05, 0.90, 86)
        best_tau = 0.50
        best_f2 = -1.0

        prec_list, rec_list, f2_list = [], [], []

        for tau in thresholds:
            y_pred_tau = (y_probs >= tau).astype(int)
            rec = float(recall_score(y_val, y_pred_tau, zero_division=0))
            prec = float(precision_score(y_val, y_pred_tau, zero_division=0))
            f2 = float(fbeta_score(y_val, y_pred_tau, beta=2.0, zero_division=0))

            rec_list.append(rec)
            prec_list.append(prec)
            f2_list.append(f2)

            if f2 > best_f2 and prec >= 0.10:
                best_f2 = f2
                best_tau = float(tau)

        print(f"[ThresholdCalibrator] Optimal Medical Decision Threshold for {dataset_name}: tau* = {best_tau:.2f} (Val F2 Score: {best_f2:.4f})")

        # Plot Threshold Curve
        self.plot_threshold_tuning_curve(thresholds, prec_list, rec_list, f2_list, best_tau, dataset_name)

        return best_tau, best_f2

    def plot_calibration_curve(self, uncal_model, sig_model, iso_model, X_val, y_val, dataset_name):
        try:
            plt.figure(figsize=(7, 6))
            plt.plot([0, 1], [0, 1], "k:", label="Perfectly Calibrated")

            if hasattr(uncal_model, "predict_proba"):
                prob_uncal = uncal_model.predict_proba(X_val)[:, 1]
                fraction_of_positives, mean_predicted_value = calibration_curve(y_val, prob_uncal, n_bins=10)
                plt.plot(mean_predicted_value, fraction_of_positives, "s-", label="Uncalibrated")

            if hasattr(sig_model, "predict_proba"):
                prob_sig = sig_model.predict_proba(X_val)[:, 1]
                fraction_of_positives, mean_predicted_value = calibration_curve(y_val, prob_sig, n_bins=10)
                plt.plot(mean_predicted_value, fraction_of_positives, "o-", label="Platt Sigmoid")

            plt.title(f"Probability Calibration Reliability Curve - {dataset_name.title()}", fontsize=12, fontweight="bold")
            plt.xlabel("Mean Predicted Probability")
            plt.ylabel("Fraction of Positives")
            plt.legend(loc="lower right")
            plt.tight_layout()
            
            save_path = os.path.join(self.reports_dir, f"{dataset_name}_calibration_curve.png")
            plt.savefig(save_path, dpi=300)
            plt.close()
        except Exception as e:
            print(f"[ThresholdCalibrator] Could not render calibration curve for {dataset_name}: {e}")

    def plot_threshold_tuning_curve(self, thresholds, precisions, recalls, f2_scores, best_tau, dataset_name):
        try:
            plt.figure(figsize=(8, 5))
            plt.plot(thresholds, precisions, "b--", label="Precision", linewidth=2)
            plt.plot(thresholds, recalls, "g-", label="Recall (Sensitivity)", linewidth=2)
            plt.plot(thresholds, f2_scores, "r-", label="F2 Score (Medical Screening Metric)", linewidth=2.5)
            plt.axvline(best_tau, color="k", linestyle=":", label=f"Optimal tau* = {best_tau:.2f}")

            plt.title(f"Medical Threshold Optimization (F2-Score) - {dataset_name.title()}", fontsize=12, fontweight="bold")
            plt.xlabel("Probability Decision Threshold (tau)")
            plt.ylabel("Score")
            plt.legend(loc="center right")
            plt.tight_layout()

            save_path = os.path.join(self.reports_dir, f"{dataset_name}_threshold_tuning.png")
            plt.savefig(save_path, dpi=300)
            plt.close()
        except Exception as e:
            print(f"[ThresholdCalibrator] Could not render threshold curve for {dataset_name}: {e}")
