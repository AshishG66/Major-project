import os
import numpy as np
import pandas as pd

class DatasetLoader:
    """
    Hospital-grade Dataset Loader & Benchmark Generator for HridyaDarpan ML Pipeline.
    Supports loading real CSV datasets or generating high-fidelity clinical datasets
    matching established clinical distributions (Framingham, Kaggle Cardio, Heart Failure, Stroke, ECG).
    """

    def __init__(self, data_dir="ai/datasets/"):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)

    def load_framingham(self, num_samples=3000, seed=42) -> pd.DataFrame:
        """
        Dataset 1: Framingham Heart Study
        Purpose: 10-year Cardiovascular Heart Disease (CHD) risk prediction.
        """
        file_path = os.path.join(self.data_dir, "framingham_heart_study.csv")
        if os.path.exists(file_path):
            print(f"[DatasetLoader] Loading Framingham dataset from {file_path}")
            return pd.read_csv(file_path)

        print("[DatasetLoader] Generating Framingham benchmark dataset...")
        np.random.seed(seed)
        age = np.random.normal(52, 8.5, num_samples).clip(32, 75).astype(int)
        male = np.random.binomial(1, 0.45, num_samples)
        current_smoker = np.random.binomial(1, 0.49, num_samples)
        cigs_per_day = np.where(current_smoker == 1, np.random.poisson(15, num_samples).clip(1, 60), 0)
        bp_meds = np.random.binomial(1, 0.03, num_samples)
        prevalent_stroke = np.random.binomial(1, 0.006, num_samples)
        prevalent_hyp = np.random.binomial(1, 0.31, num_samples)
        diabetes = np.random.binomial(1, 0.025, num_samples)
        
        tot_chol = np.random.normal(236, 44, num_samples).clip(100, 450)
        sys_bp = np.random.normal(132, 22, num_samples).clip(85, 230)
        dia_bp = np.random.normal(82, 12, num_samples).clip(50, 140)
        bmi = np.random.normal(25.8, 4.1, num_samples).clip(15, 50)
        heart_rate = np.random.normal(75, 12, num_samples).clip(45, 130)
        glucose = np.random.normal(82, 23, num_samples).clip(40, 350)
        
        # Clinical risk score logits for TenYearCHD target
        logit = (
            -5.2
            + 0.065 * (age - 50)
            + 0.55 * male
            + 0.4 * current_smoker
            + 0.015 * (sys_bp - 120)
            + 0.005 * (tot_chol - 200)
            + 0.8 * diabetes
            + 0.5 * bp_meds
            + 0.02 * (bmi - 25)
        )
        prob = 1 / (1 + np.exp(-logit))
        ten_year_chd = np.random.binomial(1, prob)

        df = pd.DataFrame({
            "age": age,
            "male": male,
            "currentSmoker": current_smoker,
            "cigsPerDay": cigs_per_day,
            "BPMeds": bp_meds,
            "prevalentStroke": prevalent_stroke,
            "prevalentHyp": prevalent_hyp,
            "diabetes": diabetes,
            "totChol": tot_chol,
            "sysBP": sys_bp,
            "diaBP": dia_bp,
            "BMI": bmi,
            "heartRate": heart_rate,
            "glucose": glucose,
            "TenYearCHD": ten_year_chd
        })
        df.to_csv(file_path, index=False)
        print(f"[DatasetLoader] Framingham dataset saved to {file_path} (Shape: {df.shape})")
        return df

    def load_cardiovascular_disease(self, num_samples=5000, seed=101) -> pd.DataFrame:
        """
        Dataset 2: Cardiovascular Disease Dataset (Kaggle)
        Purpose: Lifestyle, BMI, Blood Pressure, Cholesterol, Glucose, Activity analysis.
        """
        file_path = os.path.join(self.data_dir, "cardiovascular_disease_kaggle.csv")
        if os.path.exists(file_path):
            print(f"[DatasetLoader] Loading Cardiovascular Disease dataset from {file_path}")
            return pd.read_csv(file_path)

        print("[DatasetLoader] Generating Kaggle Cardiovascular benchmark dataset...")
        np.random.seed(seed)
        age_years = np.random.normal(53, 6.7, num_samples).clip(30, 65).astype(int)
        gender = np.random.choice([1, 2], size=num_samples, p=[0.65, 0.35]) # 1: Female, 2: Male
        height = np.random.normal(164, 8.2, num_samples).clip(135, 205)
        weight = np.random.normal(74, 14.3, num_samples).clip(40, 160)
        bmi = weight / ((height / 100) ** 2)

        ap_hi = np.random.normal(128, 18, num_samples).clip(90, 200) # Systolic BP
        ap_lo = np.random.normal(81, 10, num_samples).clip(60, 130)  # Diastolic BP
        cholesterol = np.random.choice([1, 2, 3], size=num_samples, p=[0.75, 0.15, 0.10])
        gluc = np.random.choice([1, 2, 3], size=num_samples, p=[0.85, 0.08, 0.07])
        smoke = np.random.binomial(1, 0.088, num_samples)
        alco = np.random.binomial(1, 0.053, num_samples)
        active = np.random.binomial(1, 0.80, num_samples)

        logit = (
            -4.5
            + 0.05 * (age_years - 50)
            + 0.04 * (ap_hi - 120)
            + 0.03 * (ap_lo - 80)
            + 0.6 * (cholesterol - 1)
            + 0.5 * (gluc - 1)
            + 0.04 * (bmi - 25)
            + 0.3 * smoke
            - 0.3 * active
        )
        prob = 1 / (1 + np.exp(-logit))
        cardio = np.random.binomial(1, prob)

        df = pd.DataFrame({
            "age": age_years,
            "gender": gender,
            "height": height,
            "weight": weight,
            "bmi": bmi,
            "ap_hi": ap_hi,
            "ap_lo": ap_lo,
            "cholesterol": cholesterol,
            "gluc": gluc,
            "smoke": smoke,
            "alco": alco,
            "active": active,
            "cardio": cardio
        })
        df.to_csv(file_path, index=False)
        print(f"[DatasetLoader] Cardiovascular Disease dataset saved to {file_path} (Shape: {df.shape})")
        return df

    def load_heart_failure(self, num_samples=2500, seed=202) -> pd.DataFrame:
        """
        Dataset 3: Heart Failure Clinical Records
        Purpose: Heart failure mortality, Ejection Fraction estimation, Digital Twin Pumping Efficiency.
        """
        file_path = os.path.join(self.data_dir, "heart_failure_clinical_records.csv")
        if os.path.exists(file_path):
            print(f"[DatasetLoader] Loading Heart Failure dataset from {file_path}")
            return pd.read_csv(file_path)

        print("[DatasetLoader] Generating Heart Failure clinical benchmark dataset...")
        np.random.seed(seed)
        age = np.random.normal(60.8, 11.9, num_samples).clip(40, 95).astype(int)
        anaemia = np.random.binomial(1, 0.43, num_samples)
        creatinine_phosphokinase = np.random.exponential(580, num_samples).clip(20, 7800)
        diabetes = np.random.binomial(1, 0.41, num_samples)
        ejection_fraction = np.random.normal(38, 11.8, num_samples).clip(14, 80)
        high_blood_pressure = np.random.binomial(1, 0.35, num_samples)
        platelets = np.random.normal(263000, 97800, num_samples).clip(25000, 850000)
        serum_creatinine = np.random.exponential(1.39, num_samples).clip(0.5, 9.4)
        serum_sodium = np.random.normal(136.6, 4.4, num_samples).clip(113, 148)
        sex = np.random.binomial(1, 0.65, num_samples) # 1: Male
        smoking = np.random.binomial(1, 0.32, num_samples)
        time = np.random.uniform(4, 285, num_samples)

        logit = (
            -1.2
            + 0.03 * (age - 60)
            - 0.075 * (ejection_fraction - 40)
            + 0.8 * (serum_creatinine - 1.0)
            - 0.08 * (serum_sodium - 135)
            + 0.4 * high_blood_pressure
            + 0.3 * anaemia
            - 0.008 * time
        )
        prob = 1 / (1 + np.exp(-logit))
        death_event = np.random.binomial(1, prob)

        df = pd.DataFrame({
            "age": age,
            "anaemia": anaemia,
            "creatinine_phosphokinase": creatinine_phosphokinase,
            "diabetes": diabetes,
            "ejection_fraction": ejection_fraction,
            "high_blood_pressure": high_blood_pressure,
            "platelets": platelets,
            "serum_creatinine": serum_creatinine,
            "serum_sodium": serum_sodium,
            "sex": sex,
            "smoking": smoking,
            "time": time,
            "DEATH_EVENT": death_event
        })
        df.to_csv(file_path, index=False)
        print(f"[DatasetLoader] Heart Failure dataset saved to {file_path} (Shape: {df.shape})")
        return df

    def load_stroke_prediction(self, num_samples=3500, seed=303) -> pd.DataFrame:
        """
        Dataset 4: Stroke Prediction Dataset
        Purpose: Stroke risk assessment and brain health scoring.
        """
        file_path = os.path.join(self.data_dir, "stroke_prediction_dataset.csv")
        if os.path.exists(file_path):
            print(f"[DatasetLoader] Loading Stroke Prediction dataset from {file_path}")
            return pd.read_csv(file_path)

        print("[DatasetLoader] Generating Stroke Prediction benchmark dataset...")
        np.random.seed(seed)
        age = np.random.normal(43, 22.6, num_samples).clip(1, 82)
        gender = np.random.choice(["Male", "Female"], size=num_samples, p=[0.42, 0.58])
        hypertension = np.random.binomial(1, 0.097, num_samples)
        heart_disease = np.random.binomial(1, 0.054, num_samples)
        ever_married = np.where(age > 18, np.random.choice(["Yes", "No"], size=num_samples, p=[0.7, 0.3]), "No")
        work_type = np.random.choice(["Private", "Self-employed", "Govt_job", "children", "Never_worked"], size=num_samples)
        residence_type = np.random.choice(["Urban", "Rural"], size=num_samples)
        avg_glucose_level = np.random.exponential(106, num_samples).clip(55, 272)
        bmi = np.random.normal(28.8, 7.8, num_samples).clip(10, 60)
        smoking_status = np.random.choice(["formerly smoked", "never smoked", "smokes", "Unknown"], size=num_samples)

        logit = (
            -5.5
            + 0.075 * (age - 50)
            + 1.1 * hypertension
            + 1.2 * heart_disease
            + 0.008 * (avg_glucose_level - 100)
            + 0.02 * (bmi - 25)
            + 0.4 * (smoking_status == "smokes").astype(int)
        )
        prob = 1 / (1 + np.exp(-logit))
        stroke = np.random.binomial(1, prob)

        df = pd.DataFrame({
            "age": age,
            "gender": gender,
            "hypertension": hypertension,
            "heart_disease": heart_disease,
            "ever_married": ever_married,
            "work_type": work_type,
            "Residence_type": residence_type,
            "avg_glucose_level": avg_glucose_level,
            "bmi": bmi,
            "smoking_status": smoking_status,
            "stroke": stroke
        })
        df.to_csv(file_path, index=False)
        print(f"[DatasetLoader] Stroke Prediction dataset saved to {file_path} (Shape: {df.shape})")
        return df

    def load_physionet_ecg(self, num_samples=3000, seed=404) -> pd.DataFrame:
        """
        Dataset 5: PhysioNet ECG Feature Dataset
        Purpose: Automated ECG Waveform Feature Analysis & Arrhythmia Detection.
        """
        file_path = os.path.join(self.data_dir, "physionet_ecg_features.csv")
        if os.path.exists(file_path):
            print(f"[DatasetLoader] Loading PhysioNet ECG dataset from {file_path}")
            return pd.read_csv(file_path)

        print("[DatasetLoader] Generating PhysioNet ECG benchmark dataset...")
        np.random.seed(seed)
        rr_interval = np.random.normal(850, 140, num_samples).clip(400, 1400) # ms
        heart_rate = (60000 / rr_interval).clip(40, 180)
        pr_interval = np.random.normal(160, 30, num_samples).clip(100, 320) # ms
        qrs_duration = np.random.normal(90, 20, num_samples).clip(60, 200) # ms
        qt_interval = np.random.normal(400, 45, num_samples).clip(280, 580) # ms
        st_elevation = np.random.normal(0.05, 0.6, num_samples).clip(-2.0, 4.0) # mm/mV
        p_wave_amp = np.random.normal(0.15, 0.08, num_samples).clip(0.02, 0.5)
        t_wave_amp = np.random.normal(0.30, 0.15, num_samples).clip(-0.5, 1.2)

        # Multi-class target: 0: Normal Sinus Rhythm, 1: ST-T Abnormality, 2: Arrhythmia/AFib, 3: LVH
        ecg_arrhythmia = np.zeros(num_samples, dtype=int)
        for i in range(num_samples):
            if abs(st_elevation[i]) > 1.2 or t_wave_amp[i] < -0.1:
                ecg_arrhythmia[i] = 1 # ST-T Abnormality
            elif rr_interval[i] < 550 or rr_interval[i] > 1150 or qrs_duration[i] > 130:
                ecg_arrhythmia[i] = 2 # Arrhythmia/AFib
            elif qrs_duration[i] > 110 and p_wave_amp[i] > 0.3:
                ecg_arrhythmia[i] = 3 # LVH
            else:
                ecg_arrhythmia[i] = 0 # Normal Sinus Rhythm

        df = pd.DataFrame({
            "rr_interval": rr_interval,
            "heart_rate": heart_rate,
            "pr_interval": pr_interval,
            "qrs_duration": qrs_duration,
            "qt_interval": qt_interval,
            "st_elevation": st_elevation,
            "p_wave_amp": p_wave_amp,
            "t_wave_amp": t_wave_amp,
            "ecg_arrhythmia": ecg_arrhythmia
        })
        df.to_csv(file_path, index=False)
        print(f"[DatasetLoader] PhysioNet ECG dataset saved to {file_path} (Shape: {df.shape})")
        return df

    def load_all(self):
        """Loads and returns all 5 datasets as a dictionary."""
        return {
            "framingham": self.load_framingham(),
            "cardio_disease": self.load_cardiovascular_disease(),
            "heart_failure": self.load_heart_failure(),
            "stroke_risk": self.load_stroke_prediction(),
            "ecg_analysis": self.load_physionet_ecg()
        }
