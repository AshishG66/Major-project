import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_samples=5000, output_path="ai/data/heart_data.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    np.random.seed(42)

    # Generate features
    age = np.random.randint(18, 85, size=num_samples)
    gender = np.random.choice([0, 1], size=num_samples, p=[0.52, 0.48]) # 0: Male, 1: Female
    height = np.random.normal(170, 10, size=num_samples) # in cm
    # Adjust height based on gender
    height = np.where(gender == 0, height + 6, height - 6)
    
    weight = np.random.normal(75, 15, size=num_samples) # in kg
    # Correlate weight with height
    weight = weight + (height - 170) * 0.5
    
    bmi = weight / ((height / 100) ** 2)
    
    # Blood pressure
    systolic_bp = np.random.randint(90, 180, size=num_samples)
    diastolic_bp = np.random.randint(60, 110, size=num_samples)
    # Ensure systolic > diastolic
    diastolic_bp = np.minimum(diastolic_bp, systolic_bp - 20)
    
    cholesterol = np.random.randint(120, 320, size=num_samples)
    heart_rate = np.random.randint(50, 110, size=num_samples)
    blood_sugar = np.random.randint(70, 250, size=num_samples)
    
    ecg_result = np.random.choice([0, 1, 2], size=num_samples, p=[0.6, 0.25, 0.15]) # 0: Normal, 1: ST-T, 2: LVH
    exercise_frequency = np.random.randint(0, 8, size=num_samples) # Days per week (0-7)
    smoking = np.random.choice([0, 1], size=num_samples, p=[0.75, 0.25])
    alcohol = np.random.choice([0, 1], size=num_samples, p=[0.6, 0.4])
    diabetes = np.random.choice([0, 1], size=num_samples, p=[0.88, 0.12])
    family_history = np.random.choice([0, 1], size=num_samples, p=[0.7, 0.3])
    
    # Chest pain type: 0: Typical Angina, 1: Atypical Angina, 2: Non-Anginal, 3: Asymptomatic
    chest_pain_type = np.random.choice([0, 1, 2, 3], size=num_samples, p=[0.1, 0.2, 0.3, 0.4])
    
    sleep_duration = np.random.normal(7, 1.2, size=num_samples)
    sleep_duration = np.clip(sleep_duration, 4, 10)
    
    stress_level = np.random.randint(1, 11, size=num_samples)

    # Heart disease risk formula (medical probability simulation)
    # Start with base score
    risk_logit = -4.5
    
    risk_logit += (age - 45) * 0.05
    risk_logit += np.where(gender == 0, 0.3, 0.0) # males slightly higher risk
    risk_logit += (bmi - 24) * 0.08
    risk_logit += (systolic_bp - 120) * 0.02 + (diastolic_bp - 80) * 0.015
    risk_logit += (cholesterol - 190) * 0.01
    risk_logit += (heart_rate - 72) * 0.01
    risk_logit += (blood_sugar - 100) * 0.008
    
    risk_logit += np.where(ecg_result > 0, 0.4, 0.0)
    risk_logit -= exercise_frequency * 0.25 # exercise lowers risk
    risk_logit += smoking * 0.8
    risk_logit += alcohol * 0.2
    risk_logit += diabetes * 0.7
    risk_logit += family_history * 0.9
    
    # Typical/Atypical Angina chest pain increases probability
    risk_logit += np.where(chest_pain_type == 0, 0.9, 0.0)
    risk_logit += np.where(chest_pain_type == 1, 0.5, 0.0)
    
    # Sleep and stress
    risk_logit += np.where(sleep_duration < 6, 0.4, 0.0)
    risk_logit += (stress_level - 5) * 0.12

    # Sigmoid function for probability
    probability = 1 / (1 + np.exp(-risk_logit))
    
    # Classify risk level: 0: Low Risk, 1: Moderate Risk, 2: High Risk
    risk_level = np.zeros(num_samples, dtype=int)
    risk_level[probability >= 0.30] = 1 # Moderate Risk
    risk_level[probability >= 0.65] = 2 # High Risk

    # Save to dataframe
    df = pd.DataFrame({
        'age': age,
        'gender': gender,
        'height': np.round(height, 1),
        'weight': np.round(weight, 1),
        'bmi': np.round(bmi, 1),
        'systolicBP': systolic_bp,
        'diastolicBP': diastolic_bp,
        'cholesterol': cholesterol,
        'heartRate': heart_rate,
        'bloodSugar': blood_sugar,
        'ecgResult': ecg_result,
        'exerciseFrequency': exercise_frequency,
        'smoking': smoking,
        'alcohol': alcohol,
        'diabetes': diabetes,
        'familyHistory': family_history,
        'chestPainType': chest_pain_type,
        'sleepDuration': np.round(sleep_duration, 1),
        'stressLevel': stress_level,
        'probability': np.round(probability, 4),
        'riskLevel': risk_level
    })

    df.to_csv(output_path, index=False)
    print(f"Synthetic dataset generated successfully at {output_path} with {num_samples} samples.")
    print("Class distribution:")
    print(df['riskLevel'].value_counts())

if __name__ == "__main__":
    generate_synthetic_data()
