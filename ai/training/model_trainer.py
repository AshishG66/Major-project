import time
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

class MultiModelTrainer:
    """
    Hospital-grade Multi-Model Trainer for HridyaDarpan ML Pipeline.
    Trains 8 machine learning models per dataset and logs training performance.
    """

    def __init__(self, random_state=42):
        self.random_state = random_state

    def get_models(self, is_multiclass=False):
        """
        Instantiates the 8 required algorithms.
        """
        models = {
            "Logistic Regression": LogisticRegression(
                max_iter=1000, random_state=self.random_state
            ),
            "Decision Tree": DecisionTreeClassifier(
                max_depth=8, random_state=self.random_state
            ),
            "Random Forest": RandomForestClassifier(
                n_estimators=150, max_depth=10, random_state=self.random_state, n_jobs=-1
            ),
            "Gradient Boosting": GradientBoostingClassifier(
                n_estimators=120, learning_rate=0.08, random_state=self.random_state
            ),
            "XGBoost": XGBClassifier(
                n_estimators=120, max_depth=6, learning_rate=0.08,
                random_state=self.random_state, eval_metric="logloss", n_jobs=-1
            ),
            "LightGBM": LGBMClassifier(
                n_estimators=120, max_depth=6, learning_rate=0.08,
                random_state=self.random_state, verbose=-1, n_jobs=-1
            ),
            "CatBoost": CatBoostClassifier(
                iterations=150, depth=6, learning_rate=0.08,
                random_state=self.random_state, verbose=0
            ),
            "MLP Neural Network": MLPClassifier(
                hidden_layer_sizes=(64, 32), max_iter=500, alpha=0.001,
                random_state=self.random_state, early_stopping=True
            )
        }
        return models

    def train_all(self, X_train: np.ndarray, y_train: np.ndarray) -> dict:
        """
        Trains all 8 models on the given training set and returns fitted instances with fit time.
        """
        is_multiclass = len(np.unique(y_train)) > 2
        models_dict = self.get_models(is_multiclass=is_multiclass)
        trained_models = {}

        for name, model in models_dict.items():
            print(f"[MultiModelTrainer] Training {name}...")
            start_time = time.time()
            try:
                model.fit(X_train, y_train)
                elapsed = time.time() - start_time
                trained_models[name] = {
                    "model": model,
                    "train_time_sec": round(elapsed, 4)
                }
                print(f"[MultiModelTrainer] {name} trained in {elapsed:.2f}s.")
            except Exception as e:
                print(f"[MultiModelTrainer] Error training {name}: {e}")

        return trained_models
