import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
import joblib

class ClinicalDataPreprocessor:
    """
    Hospital-grade Data Preprocessing Engine for Clinical Datasets.
    Performs missing value imputation, duplicate removal, IQR outlier treatment,
    categorical encoding, feature scaling, clinical feature engineering, and stratified splitting.
    """

    def __init__(self, target_column: str, scale_features: bool = True):
        self.target_column = target_column
        self.scale_features = scale_features
        self.imputer_num = SimpleImputer(strategy="median")
        self.imputer_cat = SimpleImputer(strategy="most_frequent")
        self.scaler = StandardScaler()
        self.encoder = None
        self.feature_names = []
        self.numerical_cols = []
        self.categorical_cols = []
        self.is_fitted = False

    def remove_duplicates(self, df: pd.DataFrame) -> pd.DataFrame:
        initial_len = len(df)
        df_clean = df.drop_duplicates().reset_index(drop=True)
        dropped = initial_len - len(df_clean)
        if dropped > 0:
            print(f"[Preprocessor] Removed {dropped} duplicate rows.")
        return df_clean

    def handle_outliers_iqr(self, df: pd.DataFrame, num_cols: list) -> pd.DataFrame:
        df_out = df.copy()
        for col in num_cols:
            if col == self.target_column:
                continue
            Q1 = df_out[col].quantile(0.25)
            Q3 = df_out[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            df_out[col] = df_out[col].clip(lower_bound, upper_bound)
        return df_out

    def engineer_clinical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df_eng = df.copy()
        
        # 1. Systolic & Diastolic BP -> MAP & Pulse Pressure
        if "sysBP" in df_eng.columns and "diaBP" in df_eng.columns:
            df_eng["mean_arterial_pressure"] = (2 * df_eng["diaBP"] + df_eng["sysBP"]) / 3.0
            df_eng["pulse_pressure"] = df_eng["sysBP"] - df_eng["diaBP"]

        if "ap_hi" in df_eng.columns and "ap_lo" in df_eng.columns:
            df_eng["mean_arterial_pressure"] = (2 * df_eng["ap_lo"] + df_eng["ap_hi"]) / 3.0
            df_eng["pulse_pressure"] = df_eng["ap_hi"] - df_eng["ap_lo"]

        # 2. BMI calculation if height and weight present
        if "height" in df_eng.columns and "weight" in df_eng.columns and "bmi" not in df_eng.columns:
            df_eng["bmi"] = df_eng["weight"] / ((df_eng["height"] / 100) ** 2)

        # 3. Cardiac Risk Interaction Index
        if "sysBP" in df_eng.columns and "totChol" in df_eng.columns and "BMI" in df_eng.columns:
            df_eng["cardiac_risk_interaction"] = (
                (df_eng["sysBP"] / 120.0) * (df_eng["totChol"] / 200.0) * (df_eng["BMI"] / 25.0)
            )

        # 4. Heart Failure Pumping Efficiency Index
        if "ejection_fraction" in df_eng.columns and "serum_creatinine" in df_eng.columns:
            df_eng["pumping_efficiency_index"] = (
                df_eng["ejection_fraction"] * 0.85 + (1.0 / (df_eng["serum_creatinine"] + 0.1)) * 15.0
            )

        # 5. ECG Rhythm Stability Index
        if "rr_interval" in df_eng.columns and "qrs_duration" in df_eng.columns:
            df_eng["ventricular_conduction_ratio"] = df_eng["qrs_duration"] / (df_eng["rr_interval"] + 1e-5)

        return df_eng

    def fit_transform(self, df: pd.DataFrame):
        df_clean = self.remove_duplicates(df)
        df_eng = self.engineer_clinical_features(df_clean)

        y = df_eng[self.target_column].values
        X_raw = df_eng.drop(columns=[self.target_column])

        # Identify numerical and categorical columns
        self.numerical_cols = X_raw.select_dtypes(include=[np.number]).columns.tolist()
        self.categorical_cols = X_raw.select_dtypes(exclude=[np.number]).columns.tolist()

        # Outlier treatment on numerical features
        X_out = self.handle_outliers_iqr(X_raw, self.numerical_cols)

        # Impute numerical
        if self.numerical_cols:
            X_num_imp = self.imputer_num.fit_transform(X_out[self.numerical_cols])
        else:
            X_num_imp = np.empty((len(X_out), 0))

        # Categorical Encoding
        if self.categorical_cols:
            X_cat_imp = self.imputer_cat.fit_transform(X_out[self.categorical_cols])
            self.encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
            X_cat_enc = self.encoder.fit_transform(X_cat_imp)
            cat_feature_names = self.encoder.get_feature_names_out(self.categorical_cols).tolist()
        else:
            X_cat_enc = np.empty((len(X_out), 0))
            cat_feature_names = []

        self.feature_names = self.numerical_cols + cat_feature_names
        X_combined = np.hstack([X_num_imp, X_cat_enc]) if self.categorical_cols else X_num_imp

        # Scaling
        if self.scale_features:
            X_scaled = self.scaler.fit_transform(X_combined)
        else:
            X_scaled = X_combined

        self.is_fitted = True
        return X_scaled, y

    def transform(self, df: pd.DataFrame):
        if not self.is_fitted:
            raise ValueError("[Preprocessor] Preprocessor must be fitted before transforming new data.")

        df_eng = self.engineer_clinical_features(df)
        if self.target_column in df_eng.columns:
            X_raw = df_eng.drop(columns=[self.target_column])
        else:
            X_raw = df_eng.copy()

        # Handle missing columns if any
        for col in self.numerical_cols:
            if col not in X_raw.columns:
                X_raw[col] = np.nan
        for col in self.categorical_cols:
            if col not in X_raw.columns:
                X_raw[col] = "Missing"

        # Outlier treatment
        X_out = self.handle_outliers_iqr(X_raw, self.numerical_cols)

        if self.numerical_cols:
            X_num_imp = self.imputer_num.transform(X_out[self.numerical_cols])
        else:
            X_num_imp = np.empty((len(X_out), 0))

        if self.categorical_cols and self.encoder is not None:
            X_cat_imp = self.imputer_cat.transform(X_out[self.categorical_cols])
            X_cat_enc = self.encoder.transform(X_cat_imp)
        else:
            X_cat_enc = np.empty((len(X_out), 0))

        X_combined = np.hstack([X_num_imp, X_cat_enc]) if self.categorical_cols else X_num_imp

        if self.scale_features:
            return self.scaler.transform(X_combined)
        return X_combined

    def split_data(self, X: np.ndarray, y: np.ndarray, train_size=0.8, val_size=0.1, test_size=0.1, random_state=42):
        """
        Splits data into Stratified Train (80%), Validation (10%), and Test (10%) sets.
        """
        assert abs((train_size + val_size + test_size) - 1.0) < 1e-5, "Sizes must sum to 1.0"
        
        # First split into Train + Val and Test
        X_train_val, X_test, y_train_val, y_test = train_test_split(
            X, y, test_size=test_size, stratify=y, random_state=random_state
        )
        
        # Then split Train + Val into Train and Val
        val_relative_ratio = val_size / (train_size + val_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_train_val, y_train_val, test_size=val_relative_ratio, stratify=y_train_val, random_state=random_state
        )

        return X_train, X_val, X_test, y_train, y_val, y_test

    def get_cv_folds(self, X: np.ndarray, y: np.ndarray, n_splits=5, random_state=42):
        skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        return list(skf.split(X, y))

    def save(self, filepath: str):
        joblib.dump(self, filepath)
        print(f"[Preprocessor] Saved preprocessor artifact to {filepath}")

    @staticmethod
    def load(filepath: str):
        return joblib.load(filepath)
