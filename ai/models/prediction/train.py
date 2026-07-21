import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
import xgboost as xgb
import joblib
import os

def train_model(data_path="ai/data/heart_data.csv", model_dir="ai/models/prediction/"):
    os.makedirs(model_dir, exist_ok=True)
    
    # Load dataset
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Data file not found at {data_path}. Run generate_data.py first.")
        
    df = pd.read_csv(data_path)
    
    # Features and labels
    feature_cols = [
        'age', 'gender', 'height', 'weight', 'bmi', 'systolicBP', 'diastolicBP',
        'cholesterol', 'heartRate', 'bloodSugar', 'ecgResult', 'exerciseFrequency',
        'smoking', 'alcohol', 'diabetes', 'familyHistory', 'chestPainType',
        'sleepDuration', 'stressLevel'
    ]
    
    X = df[feature_cols]
    y = df['riskLevel'] # 0: Low, 1: Moderate, 2: High
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("\n--- MODEL COMPARISON PIPELINE ---")
    
    # 1. Random Forest
    print("\nTraining Random Forest Classifier...")
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    rf_model.fit(X_train, y_train)
    rf_probs = rf_model.predict_proba(X_test)
    rf_auc = roc_auc_score(y_test, rf_probs, multi_class='ovr', average='weighted')
    rf_acc = accuracy_score(y_test, rf_model.predict(X_test))
    print(f"Random Forest - ROC-AUC: {rf_auc:.4f}, Accuracy: {rf_acc:.4f}")

    # 2. Gradient Boosting
    print("Training Gradient Boosting Classifier...")
    gb_model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
    gb_model.fit(X_train, y_train)
    gb_probs = gb_model.predict_proba(X_test)
    gb_auc = roc_auc_score(y_test, gb_probs, multi_class='ovr', average='weighted')
    gb_acc = accuracy_score(y_test, gb_model.predict(X_test))
    print(f"Gradient Boosting - ROC-AUC: {gb_auc:.4f}, Accuracy: {gb_acc:.4f}")

    # 3. XGBoost
    print("Training XGBoost Classifier...")
    xgb_model = xgb.XGBClassifier(n_estimators=100, max_depth=6, random_state=42, eval_metric='mlogloss')
    xgb_model.fit(X_train, y_train)
    xgb_probs = xgb_model.predict_proba(X_test)
    xgb_auc = roc_auc_score(y_test, xgb_probs, multi_class='ovr', average='weighted')
    xgb_acc = accuracy_score(y_test, xgb_model.predict(X_test))
    print(f"XGBoost - ROC-AUC: {xgb_auc:.4f}, Accuracy: {xgb_acc:.4f}")

    # Compare ROC-AUC and select Champion
    models_summary = [
        {"name": "RANDOM_FOREST", "model": rf_model, "auc": rf_auc, "accuracy": rf_acc},
        {"name": "GRADIENT_BOOSTING", "model": gb_model, "auc": gb_auc, "accuracy": gb_acc},
        {"name": "XGBOOST", "model": xgb_model, "auc": xgb_auc, "accuracy": xgb_acc}
    ]
    
    # Sort descending by ROC-AUC
    models_summary = sorted(models_summary, key=lambda x: x["auc"], reverse=True)
    champion = models_summary[0]
    
    print("\n--- COMPARATIVE SUMMARY ---")
    for idx, m in enumerate(models_summary):
        print(f"{idx+1}. {m['name']} | ROC-AUC: {m['auc']:.4f} | Accuracy: {m['accuracy']:.4f}")
        
    print(f"\nCHAMPION SELECTION: {champion['name']} (ROC-AUC: {champion['auc']:.4f})")
    
    # Save the Champion Model
    model_path = os.path.join(model_dir, "heart_best_model.joblib")
    joblib.dump(champion['model'], model_path)
    print(f"Champion Model saved successfully to {model_path}")
    
    # Save Model metadata
    metadata = {
        "model_name": champion['name'],
        "roc_auc": float(champion['auc']),
        "accuracy": float(champion['accuracy'])
    }
    joblib.dump(metadata, os.path.join(model_dir, "model_metadata.joblib"))
    
    # Save background dataset for SHAP (e.g. 200 random samples from training set)
    background_data = X_train.sample(200, random_state=42)
    background_path = os.path.join(model_dir, "shap_background.joblib")
    joblib.dump(background_data, background_path)
    print(f"SHAP background data saved successfully to {background_path}")
    
    # Save feature names list
    features_path = os.path.join(model_dir, "feature_names.joblib")
    joblib.dump(feature_cols, features_path)
    print(f"Feature names saved successfully to {features_path}")

if __name__ == "__main__":
    train_model()
