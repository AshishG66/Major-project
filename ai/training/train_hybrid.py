import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, brier_score_loss
)
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

# Ensure imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.lstm_model import LongitudinalHeartLSTM

def generate_synthetic_longitudinal_trajectories(n_patients=1200, seq_len=3, seed=42):
    """
    Generates synthetic longitudinal patient visit trajectories [SYNTHETIC_DEMO].
    Each patient has static demographics + sequential laboratory visits over time.
    """
    np.random.seed(seed)
    patients = []
    sequences = []
    labels = []

    for i in range(n_patients):
        age = np.random.randint(30, 80)
        gender = np.random.choice([0, 1])
        height = np.random.normal(170, 10)
        weight = np.random.normal(75, 15)
        bmi = weight / ((height / 100.0) ** 2)
        smoking = np.random.choice([0, 1], p=[0.75, 0.25])
        family_hist = np.random.choice([0, 1], p=[0.7, 0.3])
        diabetes = np.random.choice([0, 1], p=[0.85, 0.15])
        exercise = np.random.randint(0, 6)
        stress = np.random.randint(1, 10)

        # Baseline vitals
        base_sys = np.random.normal(122, 16) + (10 if smoking else 0) + (8 if diabetes else 0)
        base_dia = base_sys * 0.65 + np.random.normal(0, 5)
        base_chol = np.random.normal(205, 38)
        base_bs = np.random.normal(95, 20) + (40 if diabetes else 0)
        base_hr = np.random.normal(73, 11)

        # Determine true latent risk trajectory drift
        trajectory_drift = np.random.choice([-1, 0, 1], p=[0.2, 0.3, 0.5]) # 50% worsening, 30% stable, 20% improving

        patient_visits = []
        for t in range(seq_len):
            # Evolve vitals over sequential checkups
            drift_factor = t * trajectory_drift
            sys_t = float(np.clip(base_sys + drift_factor * 6.0 + np.random.normal(0, 3), 90, 210))
            dia_t = float(np.clip(base_dia + drift_factor * 3.5 + np.random.normal(0, 2), 60, 130))
            chol_t = float(np.clip(base_chol + drift_factor * 12.0 + np.random.normal(0, 5), 120, 360))
            bs_t = float(np.clip(base_bs + drift_factor * 5.0 + np.random.normal(0, 4), 65, 280))
            hr_t = float(np.clip(base_hr + drift_factor * 2.0 + np.random.normal(0, 3), 45, 140))
            bmi_t = float(np.clip(bmi + drift_factor * 0.5, 16, 45))

            patient_visits.append([sys_t, dia_t, chol_t, bs_t, hr_t, bmi_t])

        # Overall cardiovascular event outcome (ground truth label)
        final_sys = patient_visits[-1][0]
        final_chol = patient_visits[-1][2]
        latent_score = (
            (age / 100.0) * 1.5 +
            (final_sys - 120.0) / 25.0 +
            (final_chol - 200.0) / 45.0 +
            smoking * 1.2 +
            diabetes * 1.0 +
            family_hist * 0.8 +
            (trajectory_drift * 1.1)
        )
        prob_event = 1.0 / (1.0 + np.exp(-(latent_score - 2.2)))
        y = 1 if np.random.rand() < prob_event else 0

        # Static baseline features vector (matching standard 19 features)
        static_record = {
            'patient_id': f'patient_{i}',
            'age': age,
            'gender': gender,
            'height': round(height, 1),
            'weight': round(weight, 1),
            'bmi': round(bmi, 1),
            'systolicBP': round(base_sys, 0),
            'diastolicBP': round(base_dia, 0),
            'cholesterol': round(base_chol, 0),
            'heartRate': round(base_hr, 0),
            'bloodSugar': round(base_bs, 0),
            'ecgResult': 1 if final_sys > 150 else 0,
            'exerciseFrequency': exercise,
            'smoking': smoking,
            'alcohol': 0,
            'diabetes': diabetes,
            'familyHistory': family_hist,
            'chestPainType': 1 if final_sys > 160 else 0,
            'sleepDuration': 7.0,
            'stressLevel': stress,
            'target': y
        }

        patients.append(static_record)
        sequences.append(patient_visits)
        labels.append(y)

    df_static = pd.DataFrame(patients)
    X_seq = np.array(sequences, dtype=np.float32)
    y_all = np.array(labels, dtype=np.int64)

    return df_static, X_seq, y_all

def train_and_evaluate_hybrid():
    print("=" * 70)
    print("HridayaDarpana: Hybrid XGBoost-LSTM Training & Evaluation Pipeline")
    print("PROVENANCE: SYNTHETIC_DEMO (Clinical Validation Pending)")
    print("=" * 70)

    # 1. Generate patient cohorts with patient isolation
    df_static, X_seq, y = generate_synthetic_longitudinal_trajectories(n_patients=1500, seq_len=3, seed=42)

    # Patient-grouped train/val/test split (80% train, 10% val, 10% holdout test)
    idx = np.arange(len(df_static))
    train_idx, test_idx = train_test_split(idx, test_size=0.20, random_state=42, stratify=y)
    val_idx, test_idx = train_test_split(test_idx, test_size=0.50, random_state=42, stratify=y[test_idx])

    feature_cols = [
        'age', 'gender', 'height', 'weight', 'bmi', 'systolicBP', 'diastolicBP',
        'cholesterol', 'heartRate', 'bloodSugar', 'ecgResult', 'exerciseFrequency',
        'smoking', 'alcohol', 'diabetes', 'familyHistory', 'chestPainType',
        'sleepDuration', 'stressLevel'
    ]

    # Normalize sequence inputs with training distribution moments
    means = np.mean(X_seq[train_idx], axis=(0, 1))
    stds = np.std(X_seq[train_idx], axis=(0, 1)) + 1e-6
    X_seq_norm = (X_seq - means) / stds

    # 2. Train XGBoost Branch
    print("\n[Step 1] Training Static XGBoost Branch...")
    xgb_train = df_static.iloc[train_idx][feature_cols]
    y_train = y[train_idx]
    xgb_val = df_static.iloc[val_idx][feature_cols]
    y_val = y[val_idx]
    xgb_test = df_static.iloc[test_idx][feature_cols]
    y_test = y[test_idx]

    xgb_model = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        eval_metric='logloss'
    )
    xgb_model.fit(xgb_train, y_train)

    p_val_xgb = xgb_model.predict_proba(xgb_val)[:, 1]
    p_test_xgb = xgb_model.predict_proba(xgb_test)[:, 1]

    # 3. Train LSTM Branch with Additive Attention
    print("\n[Step 2] Training Longitudinal LSTM Branch with Additive Attention...")
    torch.manual_seed(42)
    device = torch.device('cpu')

    train_ds = TensorDataset(torch.tensor(X_seq_norm[train_idx]), torch.tensor(y_train, dtype=torch.float32))
    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)

    lstm_model = LongitudinalHeartLSTM(input_dim=6, hidden_dim=32, dropout=0.2).to(device)
    optimizer = torch.optim.Adam(lstm_model.parameters(), lr=0.008, weight_decay=1e-4)
    criterion = nn.BCEWithLogitsLoss()

    lstm_model.train()
    for epoch in range(15):
        epoch_loss = 0.0
        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            logits, _ = lstm_model(batch_x)
            loss = criterion(logits.squeeze(-1), batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

    lstm_model.eval()
    with torch.no_grad():
        logits_val, _ = lstm_model(torch.tensor(X_seq_norm[val_idx]))
        p_val_lstm = torch.sigmoid(logits_val).squeeze(-1).numpy()

        logits_test, _ = lstm_model(torch.tensor(X_seq_norm[test_idx]))
        p_test_lstm = torch.sigmoid(logits_test).squeeze(-1).numpy()

    # 4. Train Stacking Meta-Learner Fusion Layer
    print("\n[Step 3] Fitting Meta-Learner Fusion Layer...")
    X_val_fusion = np.column_stack([p_val_xgb, p_val_lstm])
    meta_learner = LogisticRegression(random_state=42)
    meta_learner.fit(X_val_fusion, y_val)

    X_test_fusion = np.column_stack([p_test_xgb, p_test_lstm])
    p_test_hybrid = meta_learner.predict_proba(X_test_fusion)[:, 1]

    # 5. Evaluate All Three Configurations on Unseen Holdout Test Split
    print("\n[Step 4] Evaluating Performance on Holdout Test Set (N=150)...")
    def compute_metrics(y_true, y_probs, threshold=0.5):
        y_pred = (y_probs >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        return {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
            "recall_sensitivity": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
            "specificity": round(float(tn / (tn + fp + 1e-9)), 4),
            "f1_score": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_true, y_probs)), 4),
            "brier_score": round(float(brier_score_loss(y_true, y_probs)), 4),
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}
        }

    metrics_xgb = compute_metrics(y_test, p_test_xgb)
    metrics_lstm = compute_metrics(y_test, p_test_lstm)
    metrics_hybrid = compute_metrics(y_test, p_test_hybrid)

    print("\n--- TEST EVALUATION COMPARISON ---")
    print(f"XGBoost Branch   | ROC-AUC: {metrics_xgb['roc_auc']} | F1: {metrics_xgb['f1_score']} | Sensitivity: {metrics_xgb['recall_sensitivity']}")
    print(f"LSTM Branch      | ROC-AUC: {metrics_lstm['roc_auc']} | F1: {metrics_lstm['f1_score']} | Sensitivity: {metrics_lstm['recall_sensitivity']}")
    print(f"Hybrid XGB+LSTM  | ROC-AUC: {metrics_hybrid['roc_auc']} | F1: {metrics_hybrid['f1_score']} | Sensitivity: {metrics_hybrid['recall_sensitivity']}")

    # 6. Save Model Artifacts
    models_dir = "ai/models/"
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs("ai/reports/", exist_ok=True)

    joblib.dump(xgb_model, os.path.join(models_dir, "hybrid_xgboost.joblib"))
    torch.save(lstm_model.state_dict(), os.path.join(models_dir, "hybrid_lstm.pt"))
    joblib.dump(meta_learner, os.path.join(models_dir, "hybrid_meta_learner.joblib"))

    evaluation_report = {
        "pipeline_version": "v3.0_hybrid_xgboost_lstm",
        "provenance": "SYNTHETIC_DEMO",
        "clinical_validation": "PENDING_INSTITUTIONAL_TRIAL",
        "dataset_size": len(df_static),
        "split": {"train": len(train_idx), "val": len(val_idx), "test": len(test_idx)},
        "metrics": {
            "xgboost_static_branch": metrics_xgb,
            "lstm_sequential_branch": metrics_lstm,
            "hybrid_fused_system": metrics_hybrid
        },
        "meta_learner_weights": {
            "coef_xgb": round(float(meta_learner.coef_[0][0]), 4),
            "coef_lstm": round(float(meta_learner.coef_[0][1]), 4),
            "intercept": round(float(meta_learner.intercept_[0]), 4)
        }
    }

    with open(os.path.join(models_dir, "hybrid_metadata.json"), "w") as f:
        json.dump(evaluation_report, f, indent=2)

    with open("ai/reports/hybrid_model_evaluation.json", "w") as f:
        json.dump(evaluation_report, f, indent=2)

    print("\n[Step 5] Saved model artifacts to ai/models/ and reports to ai/reports/hybrid_model_evaluation.json")
    print("=" * 70)

if __name__ == "__main__":
    train_and_evaluate_hybrid()
