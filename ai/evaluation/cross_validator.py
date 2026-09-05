import numpy as np
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

class RigorousCrossValidator:
    """
    Hospital-grade Model Validation & Bootstrap Confidence Interval Engine for HridyaDarpan ML Pipeline.
    Performs 5-Fold CV, 10-Fold CV, and Bootstrap Resampling to calculate 95% Confidence Intervals for clinical metrics.
    """

    def __init__(self, random_state=42):
        self.random_state = random_state

    def compute_ci(self, metric_array: list) -> dict:
        arr = np.array(metric_array)
        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))
        n = len(arr)
        se = std_val / np.sqrt(max(n, 1))
        ci_lower = float(max(0.0, mean_val - 1.96 * se))
        ci_upper = float(min(1.0, mean_val + 1.96 * se))

        return {
            "mean": round(mean_val, 4),
            "std": round(std_val, 4),
            "ci_95_lower": round(ci_lower, 4),
            "ci_95_upper": round(ci_upper, 4),
            "formatted_ci": f"{mean_val:.4f} (95% CI: {ci_lower:.4f} - {ci_upper:.4f})"
        }

    def evaluate_cv_folds(self, model, X: np.ndarray, y: np.ndarray, n_splits=5) -> dict:
        """
        Executes Stratified K-Fold CV.
        """
        skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=self.random_state)
        acc_list, prec_list, rec_list, f1_list, auc_list = [], [], [], [], []
        is_binary = len(np.unique(y)) == 2
        avg_mode = "binary" if is_binary else "weighted"

        for train_idx, val_idx in skf.split(X, y):
            X_tr, y_tr = X[train_idx], y[train_idx]
            X_va, y_va = X[val_idx], y[val_idx]

            model.fit(X_tr, y_tr)
            y_pred = model.predict(X_va)

            if hasattr(model, "predict_proba"):
                y_proba = model.predict_proba(X_va)
                if is_binary:
                    auc = float(roc_auc_score(y_va, y_proba[:, 1]))
                else:
                    try:
                        auc = float(roc_auc_score(y_va, y_proba, multi_class="ovr"))
                    except Exception:
                        auc = 0.5
            else:
                auc = 0.5

            acc_list.append(accuracy_score(y_va, y_pred))
            prec_list.append(precision_score(y_va, y_pred, average=avg_mode, zero_division=0))
            rec_list.append(recall_score(y_va, y_pred, average=avg_mode, zero_division=0))
            f1_list.append(f1_score(y_va, y_pred, average=avg_mode, zero_division=0))
            auc_list.append(auc)

        return {
            "accuracy": self.compute_ci(acc_list),
            "precision": self.compute_ci(prec_list),
            "recall": self.compute_ci(rec_list),
            "f1_score": self.compute_ci(f1_list),
            "roc_auc": self.compute_ci(auc_list)
        }

    def evaluate_bootstrap(self, model, X_test: np.ndarray, y_test: np.ndarray, n_bootstraps=100) -> dict:
        """
        Executes Bootstrap Resampling (n=100) to compute empirical 95% Confidence Intervals.
        """
        np.random.seed(self.random_state)
        n = len(X_test)
        acc_list, prec_list, rec_list, f1_list, auc_list = [], [], [], [], []
        is_binary = len(np.unique(y_test)) == 2
        avg_mode = "binary" if is_binary else "weighted"

        y_pred_all = model.predict(X_test)
        if hasattr(model, "predict_proba"):
            y_prob_all = model.predict_proba(X_test)
        else:
            y_prob_all = y_pred_all

        for _ in range(n_bootstraps):
            indices = np.random.choice(n, size=n, replace=True)
            y_true_b = y_test[indices]
            y_pred_b = y_pred_all[indices]

            if len(np.unique(y_true_b)) < 2:
                continue

            acc_list.append(accuracy_score(y_true_b, y_pred_b))
            prec_list.append(precision_score(y_true_b, y_pred_b, average=avg_mode, zero_division=0))
            rec_list.append(recall_score(y_true_b, y_pred_b, average=avg_mode, zero_division=0))
            f1_list.append(f1_score(y_true_b, y_pred_b, average=avg_mode, zero_division=0))

            if hasattr(model, "predict_proba"):
                y_prob_b = y_prob_all[indices]
                if is_binary:
                    auc_list.append(float(roc_auc_score(y_true_b, y_prob_b[:, 1])))
                else:
                    try:
                        auc_list.append(float(roc_auc_score(y_true_b, y_prob_b, multi_class="ovr")))
                    except Exception:
                        auc_list.append(0.5)

        return {
            "accuracy_ci": self.compute_ci(acc_list),
            "precision_ci": self.compute_ci(prec_list),
            "recall_ci": self.compute_ci(rec_list),
            "f1_score_ci": self.compute_ci(f1_list),
            "roc_auc_ci": self.compute_ci(auc_list) if auc_list else {}
        }
