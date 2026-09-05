import os
import time
import optuna
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_score
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from xgboost import XGBClassifier
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier

# Suppress Optuna logging noise
optuna.logging.set_verbosity(optuna.logging.WARNING)

class BayesianHyperparameterTuner:
    """
    Hospital-grade Optuna Bayesian Hyperparameter Optimization Engine for HridyaDarpan ML Pipeline.
    Performs fast, high-precision TPE Bayesian search over model hyperparameter spaces using 5-Fold Stratified CV.
    """

    def __init__(self, random_state=42, n_trials=10):
        self.random_state = random_state
        self.n_trials = n_trials

    def tune_lightgbm(self, X_train: np.ndarray, y_train: np.ndarray) -> tuple:
        def objective(trial):
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 100, 200, step=50),
                "learning_rate": trial.suggest_float("learning_rate", 0.02, 0.15, log=True),
                "max_depth": trial.suggest_int("max_depth", 3, 7),
                "num_leaves": trial.suggest_int("num_leaves", 15, 63),
                "subsample": trial.suggest_float("subsample", 0.7, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.7, 1.0),
                "reg_alpha": trial.suggest_float("reg_alpha", 1e-2, 5.0, log=True),
                "reg_lambda": trial.suggest_float("reg_lambda", 1e-2, 5.0, log=True),
                "random_state": self.random_state,
                "verbose": -1,
                "n_jobs": -1
            }
            model = LGBMClassifier(**params)
            skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
            scores = cross_val_score(model, X_train, y_train, cv=skf, scoring="roc_auc")
            return float(np.mean(scores))

        start_time = time.time()
        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=self.n_trials)
        tuning_time = time.time() - start_time

        best_params = study.best_params
        best_params.update({"random_state": self.random_state, "verbose": -1, "n_jobs": -1})
        tuned_model = LGBMClassifier(**best_params)
        tuned_model.fit(X_train, y_train)

        return tuned_model, best_params, tuning_time, study

    def tune_catboost(self, X_train: np.ndarray, y_train: np.ndarray) -> tuple:
        def objective(trial):
            params = {
                "iterations": trial.suggest_int("iterations", 100, 200, step=50),
                "learning_rate": trial.suggest_float("learning_rate", 0.03, 0.15, log=True),
                "depth": trial.suggest_int("depth", 4, 7),
                "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1.0, 5.0),
                "random_state": self.random_state,
                "verbose": 0,
                "thread_count": -1
            }
            model = CatBoostClassifier(**params)
            skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
            scores = cross_val_score(model, X_train, y_train, cv=skf, scoring="roc_auc")
            return float(np.mean(scores))

        start_time = time.time()
        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=self.n_trials)
        tuning_time = time.time() - start_time

        best_params = study.best_params
        best_params.update({"random_state": self.random_state, "verbose": 0, "thread_count": -1})
        tuned_model = CatBoostClassifier(**best_params)
        tuned_model.fit(X_train, y_train)

        return tuned_model, best_params, tuning_time, study

    def tune_xgboost(self, X_train: np.ndarray, y_train: np.ndarray) -> tuple:
        def objective(trial):
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 100, 200, step=50),
                "learning_rate": trial.suggest_float("learning_rate", 0.02, 0.15, log=True),
                "max_depth": trial.suggest_int("max_depth", 3, 7),
                "subsample": trial.suggest_float("subsample", 0.7, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.7, 1.0),
                "random_state": self.random_state,
                "eval_metric": "logloss",
                "n_jobs": -1
            }
            model = XGBClassifier(**params)
            skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
            scores = cross_val_score(model, X_train, y_train, cv=skf, scoring="roc_auc")
            return float(np.mean(scores))

        start_time = time.time()
        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=self.n_trials)
        tuning_time = time.time() - start_time

        best_params = study.best_params
        best_params.update({"random_state": self.random_state, "eval_metric": "logloss", "n_jobs": -1})
        tuned_model = XGBClassifier(**best_params)
        tuned_model.fit(X_train, y_train)

        return tuned_model, best_params, tuning_time, study

    def tune_gradient_boosting(self, X_train: np.ndarray, y_train: np.ndarray) -> tuple:
        def objective(trial):
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 100, 200, step=50),
                "learning_rate": trial.suggest_float("learning_rate", 0.02, 0.15, log=True),
                "max_depth": trial.suggest_int("max_depth", 3, 6),
                "subsample": trial.suggest_float("subsample", 0.7, 1.0),
                "random_state": self.random_state
            }
            model = GradientBoostingClassifier(**params)
            skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
            scores = cross_val_score(model, X_train, y_train, cv=skf, scoring="roc_auc")
            return float(np.mean(scores))

        start_time = time.time()
        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=self.n_trials)
        tuning_time = time.time() - start_time

        best_params = study.best_params
        best_params.update({"random_state": self.random_state})
        tuned_model = GradientBoostingClassifier(**best_params)
        tuned_model.fit(X_train, y_train)

        return tuned_model, best_params, tuning_time, study

    def tune_random_forest(self, X_train: np.ndarray, y_train: np.ndarray) -> tuple:
        def objective(trial):
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 100, 200, step=50),
                "max_depth": trial.suggest_int("max_depth", 6, 16),
                "min_samples_split": trial.suggest_int("min_samples_split", 2, 8),
                "random_state": self.random_state,
                "n_jobs": -1
            }
            model = RandomForestClassifier(**params)
            skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
            is_binary = len(np.unique(y_train)) == 2
            scoring_metric = "roc_auc" if is_binary else "accuracy"
            scores = cross_val_score(model, X_train, y_train, cv=skf, scoring=scoring_metric)
            return float(np.mean(scores))

        start_time = time.time()
        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=self.n_trials)
        tuning_time = time.time() - start_time

        best_params = study.best_params
        best_params.update({"random_state": self.random_state, "n_jobs": -1})
        tuned_model = RandomForestClassifier(**best_params)
        tuned_model.fit(X_train, y_train)

        return tuned_model, best_params, tuning_time, study
