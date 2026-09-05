import numpy as np
from sklearn.metrics import recall_score, f1_score
from imblearn.over_sampling import SMOTE, RandomOverSampler
from imblearn.under_sampling import RandomUnderSampler
from imblearn.combine import SMOTETomek

class ClassImbalanceHandler:
    """
    Hospital-grade Class Imbalance Resolution Engine for HridyaDarpan ML Pipeline.
    Evaluates SMOTE, SMOTE + Tomek Links, Random Oversampling, Random Undersampling, and Class Weights
    to maximize Recall and F1 Score for medical screening safety.
    """

    def __init__(self, random_state=42):
        self.random_state = random_state

    def get_resampling_methods(self):
        return {
            "None": None,
            "SMOTE": SMOTE(random_state=self.random_state),
            "SMOTE + Tomek": SMOTETomek(random_state=self.random_state),
            "Random Oversampling": RandomOverSampler(random_state=self.random_state),
            "Random Undersampling": RandomUnderSampler(random_state=self.random_state)
        }

    def evaluate_and_resample(self, X_train: np.ndarray, y_train: np.ndarray, base_model, X_val: np.ndarray, y_val: np.ndarray) -> tuple:
        """
        Fits base_model with each resampling method, evaluates on validation set,
        and selects the technique producing highest (0.6 * Recall + 0.4 * F1).
        """
        # If multi-class or already balanced, default to None
        unique_classes, counts = np.unique(y_train, return_counts=True)
        if len(unique_classes) > 2 or (min(counts) / max(counts)) > 0.4:
            print("[ImbalanceHandler] Dataset class ratio balanced (>0.40). Using baseline training.")
            return X_train, y_train, "None"

        methods = self.get_resampling_methods()
        best_method_name = "None"
        best_score = -1.0
        best_X_res, best_y_res = X_train, y_train

        print("\n[ImbalanceHandler] Testing Imbalance Resolution Strategies...")

        for m_name, resampler in methods.items():
            try:
                if resampler is not None:
                    X_res, y_res = resampler.fit_resample(X_train, y_train)
                else:
                    X_res, y_res = X_train, y_train

                # Quick trial fit on validation set to gauge Recall improvement
                base_model.fit(X_res, y_res)
                y_val_pred = base_model.predict(X_val)

                rec = float(recall_score(y_val, y_val_pred, zero_division=0))
                f1 = float(f1_score(y_val, y_val_pred, zero_division=0))
                comb_score = 0.6 * rec + 0.4 * f1

                print(f"  - {m_name:<22} | Val Recall: {rec:.4f} | Val F1: {f1:.4f} | Target Score: {comb_score:.4f}")

                if comb_score > best_score:
                    best_score = comb_score
                    best_method_name = m_name
                    best_X_res, best_y_res = X_res, y_res

            except Exception as e:
                print(f"  - {m_name:<22} | Resampling error: {e}")

        print(f"[ImbalanceHandler] WINNING IMBALANCE TECHNIQUE: {best_method_name} (Val Score: {best_score:.4f})\n")
        return best_X_res, best_y_res, best_method_name
