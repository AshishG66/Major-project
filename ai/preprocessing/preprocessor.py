import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, GroupShuffleSplit
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
import joblib
from typing import Tuple, List, Dict, Optional

class ClinicalDataPreprocessor:
    """
    Leak-Free Clinical Data Preprocessing Engine for HridyaDarpan.
    
    Guarantees:
    1. Zero Data Leakage: Outlier IQR thresholds, imputation statistics (medians/modes),
       one-hot encoding categories, and scaling moments (mean/std) are learned STRICTLY
       from training data splits.
    2. Patient Boundary Isolation: Where patient identifiers exist, records are grouped
       at the patient level to eliminate cross-split patient leakage.
    3. Reproducibility: All operations accept deterministic random seeds.
    """

    def __init__(self, target_column: str, scale_features: bool = True):
        self.target_column = target_column
        self.scale_features = scale_features
        self.imputer_num = SimpleImputer(strategy="median")
        self.imputer_cat = SimpleImputer(strategy="most_frequent")
        self.scaler = StandardScaler()
        self.encoder = None
        self.feature_names: List[str] = []
        self.numerical_cols: List[str] = []
        self.categorical_cols: List[str] = []
        self.outlier_bounds_: Dict[str, Tuple[float, float]] = {}
        self.is_fitted: bool = False
        self.fitted_on_split: Optional[str] = None
        self.fitted_sample_count: int = 0

    @staticmethod
    def split_raw_dataset(
        df: pd.DataFrame,
        target_column: str,
        patient_id_col: Optional[str] = None,
        train_size: float = 0.8,
        val_size: float = 0.1,
        test_size: float = 0.1,
        random_state: int = 42
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Splits RAW clinical DataFrame BEFORE any preprocessing transformations or fitting.
        
        Args:
            df: Raw DataFrame
            target_column: Name of target column
            patient_id_col: Optional patient identifier for group-isolated splits
            train_size: Fraction for training set (default 0.8)
            val_size: Fraction for validation set (default 0.1)
            test_size: Fraction for holdout test set (default 0.1)
            random_state: Random seed for deterministic reproducibility
        
        Returns:
            df_train, df_val, df_test as un-transformed, raw DataFrames
        """
        assert abs((train_size + val_size + test_size) - 1.0) < 1e-5, "Split fractions must sum to 1.0"

        # Deduplicate raw dataset prior to partitioning to prevent cross-split duplicate leakage
        df = df.drop_duplicates().reset_index(drop=True)
        if patient_id_col and patient_id_col in df.columns:
            gss_test = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
            train_val_idx, test_idx = next(gss_test.split(df, groups=df[patient_id_col]))
            df_train_val = df.iloc[train_val_idx].reset_index(drop=True)
            df_test = df.iloc[test_idx].reset_index(drop=True)

            val_relative = val_size / (train_size + val_size)
            gss_val = GroupShuffleSplit(n_splits=1, test_size=val_relative, random_state=random_state)
            train_idx, val_idx = next(gss_val.split(df_train_val, groups=df_train_val[patient_id_col]))
            df_train = df_train_val.iloc[train_idx].reset_index(drop=True)
            df_val = df_train_val.iloc[val_idx].reset_index(drop=True)

            return df_train, df_val, df_test

        # Standard Stratified Split (by target for classification if each class has >= 2 members)
        can_stratify = (
            target_column in df.columns
            and df[target_column].nunique() < 20
            and df[target_column].value_counts().min() >= 2
        )
        stratify_col = df[target_column] if can_stratify else None

        df_train_val, df_test = train_test_split(
            df, test_size=test_size, stratify=stratify_col, random_state=random_state
        )

        val_relative = val_size / (train_size + val_size)
        can_stratify_tv = (
            stratify_col is not None
            and df_train_val[target_column].value_counts().min() >= 2
        )
        stratify_train_val = df_train_val[target_column] if can_stratify_tv else None

        df_train, df_val = train_test_split(
            df_train_val, test_size=val_relative, stratify=stratify_train_val, random_state=random_state
        )

        return (
            df_train.reset_index(drop=True),
            df_val.reset_index(drop=True),
            df_test.reset_index(drop=True)
        )

    def remove_duplicates(self, df: pd.DataFrame) -> pd.DataFrame:
        initial_len = len(df)
        df_clean = df.drop_duplicates().reset_index(drop=True)
        dropped = initial_len - len(df_clean)
        if dropped > 0:
            print(f"[Preprocessor] Removed {dropped} duplicate rows from training data.")
        return df_clean

    def _fit_outlier_bounds(self, df_num: pd.DataFrame):
        """Calculates IQR outlier thresholds STRICTLY on training split."""
        self.outlier_bounds_ = {}
        for col in df_num.columns:
            if col == self.target_column:
                continue
            series = df_num[col].dropna()
            if len(series) == 0:
                continue
            Q1 = float(series.quantile(0.25))
            Q3 = float(series.quantile(0.75))
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            self.outlier_bounds_[col] = (lower_bound, upper_bound)

    def _apply_outlier_bounds(self, df_num: pd.DataFrame) -> pd.DataFrame:
        """Applies previously learned training bounds to numerical features."""
        df_out = df_num.copy()
        bounds = getattr(self, "outlier_bounds_", {})
        for col in df_num.columns:
            if col in bounds:
                lower_bound, upper_bound = bounds[col]
                df_out[col] = df_out[col].clip(lower_bound, upper_bound)
        return df_out

    def engineer_clinical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Stateless row-wise clinical feature transformations."""
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
            df_eng["bmi"] = df_eng["weight"] / ((df_eng["height"] / 100.0) ** 2)

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

    def fit(self, df_train: pd.DataFrame):
        """
        Fits transformers STRICTLY on training split data.
        Never learns statistics, medians, outlier bounds, or scaling parameters from validation or test splits.
        """
        df_clean = self.remove_duplicates(df_train)
        df_eng = self.engineer_clinical_features(df_clean)

        if self.target_column in df_eng.columns:
            X_raw = df_eng.drop(columns=[self.target_column])
        else:
            X_raw = df_eng.copy()

        # Identify numerical and categorical columns from training data
        self.numerical_cols = X_raw.select_dtypes(include=[np.number]).columns.tolist()
        self.categorical_cols = X_raw.select_dtypes(exclude=[np.number]).columns.tolist()

        # 1. Fit outlier bounds strictly on training data
        if self.numerical_cols:
            self._fit_outlier_bounds(X_raw[self.numerical_cols])
            X_num_clipped = self._apply_outlier_bounds(X_raw[self.numerical_cols])
            X_num_imp = self.imputer_num.fit_transform(X_num_clipped)
        else:
            X_num_imp = np.empty((len(X_raw), 0))

        # 2. Fit categorical imputer and OneHotEncoder strictly on training data
        if self.categorical_cols:
            X_cat_imp = self.imputer_cat.fit_transform(X_raw[self.categorical_cols])
            self.encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
            X_cat_enc = self.encoder.fit_transform(X_cat_imp)
            cat_feature_names = self.encoder.get_feature_names_out(self.categorical_cols).tolist()
        else:
            X_cat_enc = np.empty((len(X_raw), 0))
            cat_feature_names = []

        self.feature_names = self.numerical_cols + cat_feature_names
        X_combined = np.hstack([X_num_imp, X_cat_enc]) if self.categorical_cols else X_num_imp

        # 3. Fit scaler strictly on training data
        if self.scale_features:
            self.scaler.fit(X_combined)

        self.is_fitted = True
        self.fitted_on_split = "train_only"
        self.fitted_sample_count = len(df_clean)
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Applies fitted transformations to unseen or holdout evaluation data.
        """
        if not self.is_fitted:
            raise ValueError("[Preprocessor] Preprocessor must be fitted on training data before transforming new data.")

        df_eng = self.engineer_clinical_features(df)
        if self.target_column in df_eng.columns:
            X_raw = df_eng.drop(columns=[self.target_column])
        else:
            X_raw = df_eng.copy()

        # Ensure column alignment with training schema
        for col in self.numerical_cols:
            if col not in X_raw.columns:
                X_raw[col] = np.nan
        for col in self.categorical_cols:
            if col not in X_raw.columns:
                X_raw[col] = "Missing"

        # Apply training-derived outlier bounds
        if self.numerical_cols:
            X_num_clipped = self._apply_outlier_bounds(X_raw[self.numerical_cols])
            X_num_imp = self.imputer_num.transform(X_num_clipped)
        else:
            X_num_imp = np.empty((len(X_raw), 0))

        # Apply training-derived categorical encodings
        if self.categorical_cols and self.encoder is not None:
            X_cat_imp = self.imputer_cat.transform(X_raw[self.categorical_cols])
            X_cat_enc = self.encoder.transform(X_cat_imp)
        else:
            X_cat_enc = np.empty((len(X_raw), 0))

        X_combined = np.hstack([X_num_imp, X_cat_enc]) if self.categorical_cols else X_num_imp

        if self.scale_features:
            return self.scaler.transform(X_combined)
        return X_combined

    def fit_transform(self, df_train: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fits on training DataFrame and transforms it. Target column must be present.
        """
        assert self.target_column in df_train.columns, f"Target '{self.target_column}' must be present in training dataframe."
        self.fit(df_train)
        df_clean = self.remove_duplicates(df_train)
        y = df_clean[self.target_column].values
        X_trans = self.transform(df_clean)
        return X_trans, y

    def get_cv_folds(self, X: np.ndarray, y: np.ndarray, n_splits: int = 5, random_state: int = 42):
        skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        return list(skf.split(X, y))

    def save(self, filepath: str):
        joblib.dump(self, filepath)
        print(f"[Preprocessor] Saved leak-free preprocessor artifact to {filepath}")

    @staticmethod
    def load(filepath: str):
        return joblib.load(filepath)

# Backward-compatible alias for legacy artifacts and references
MedicalPreprocessor = ClinicalDataPreprocessor
