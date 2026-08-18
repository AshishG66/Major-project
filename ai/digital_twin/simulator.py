"""
Synthetic Data Simulator for Digital Twin Demo Mode

Generates clinically plausible wearable data streams and lab result
arrivals so the Digital Twin page works without real wearable devices.
"""

import numpy as np
import time
from typing import Dict, Optional

from .state_vector import DIM_NAMES, NORMAL_RANGES


class CardiovascularSimulator:
    """
    Generates realistic synthetic patient data for demo purposes.
    Simulates circadian HR/BP patterns, activity cycles, and
    occasional physiological perturbations.
    """

    def __init__(self, patient_profile: str = "moderate_risk"):
        """
        patient_profile: 'healthy', 'moderate_risk', 'high_risk'
        """
        self.profile = patient_profile
        self.t = 0  # Simulation tick counter
        self.base_values = self._create_base_profile()

    def _create_base_profile(self) -> Dict[str, float]:
        profiles = {
            "healthy": {
                "heart_rate": 68, "hrv_sdnn": 55, "hrv_rmssd": 42, "spo2": 98,
                "resp_rate": 15, "step_count": 800, "skin_temp": 36.6,
                "activity_level": 2.5,
                "total_chol": 185, "ldl": 95, "hdl": 62, "triglycerides": 110,
                "hba1c": 5.2, "troponin_i": 0.01, "bnp": 45, "creatinine": 0.9,
                "fasting_glucose": 88,
                "age": 42, "sex": 1, "bmi": 23.5, "smoking_status": 0,
                "systolic_bp": 118, "diastolic_bp": 76, "ejection_fraction": 62,
            },
            "moderate_risk": {
                "heart_rate": 78, "hrv_sdnn": 38, "hrv_rmssd": 28, "spo2": 96,
                "resp_rate": 17, "step_count": 400, "skin_temp": 36.8,
                "activity_level": 1.8,
                "total_chol": 235, "ldl": 145, "hdl": 42, "triglycerides": 180,
                "hba1c": 6.1, "troponin_i": 0.02, "bnp": 95, "creatinine": 1.1,
                "fasting_glucose": 112,
                "age": 56, "sex": 0, "bmi": 28.5, "smoking_status": 1,
                "systolic_bp": 142, "diastolic_bp": 88, "ejection_fraction": 52,
            },
            "high_risk": {
                "heart_rate": 92, "hrv_sdnn": 22, "hrv_rmssd": 15, "spo2": 93,
                "resp_rate": 22, "step_count": 150, "skin_temp": 37.2,
                "activity_level": 1.2,
                "total_chol": 280, "ldl": 185, "hdl": 34, "triglycerides": 250,
                "hba1c": 7.8, "troponin_i": 0.06, "bnp": 350, "creatinine": 1.6,
                "fasting_glucose": 165,
                "age": 67, "sex": 0, "bmi": 32.0, "smoking_status": 1,
                "systolic_bp": 165, "diastolic_bp": 95, "ejection_fraction": 38,
            },
        }
        return profiles.get(patient_profile, profiles["moderate_risk"])

    def generate_wearable_reading(self) -> Dict[str, float]:
        """Generate a single wearable sensor reading with realistic noise."""
        self.t += 1
        base = self.base_values

        # Circadian variation (simulated time-of-day effect)
        circadian = np.sin(2 * np.pi * self.t / 288)  # 288 ticks = 24h

        # Activity burst simulation (occasional)
        activity_burst = 1.0
        if np.random.random() < 0.08:  # 8% chance of activity burst
            activity_burst = np.random.uniform(1.5, 3.0)

        hr_noise = np.random.normal(0, 2.5)
        reading = {
            "heart_rate": base["heart_rate"] + circadian * 5 + hr_noise + (activity_burst - 1) * 15,
            "hrv_sdnn": max(5, base["hrv_sdnn"] + np.random.normal(0, 4) - circadian * 3),
            "hrv_rmssd": max(3, base["hrv_rmssd"] + np.random.normal(0, 3)),
            "spo2": np.clip(base["spo2"] + np.random.normal(0, 0.5), 85, 100),
            "resp_rate": max(8, base["resp_rate"] + np.random.normal(0, 1.2)),
            "step_count": max(0, base["step_count"] * activity_burst + np.random.normal(0, 50)),
            "skin_temp": base["skin_temp"] + np.random.normal(0, 0.15),
            "activity_level": np.clip(base["activity_level"] * activity_burst + np.random.normal(0, 0.3), 0.8, 10),
        }

        # Occasional SpO2 dip for high-risk patients
        if self.profile == "high_risk" and np.random.random() < 0.05:
            reading["spo2"] = np.clip(reading["spo2"] - np.random.uniform(2, 5), 85, 100)

        return {k: round(v, 2) for k, v in reading.items()}

    def generate_lab_results(self) -> Dict[str, float]:
        """Generate lab results (these change slowly)."""
        base = self.base_values
        labs = {
            "total_chol": base["total_chol"] + np.random.normal(0, 3),
            "ldl": base["ldl"] + np.random.normal(0, 2),
            "hdl": base["hdl"] + np.random.normal(0, 1.5),
            "triglycerides": base["triglycerides"] + np.random.normal(0, 5),
            "hba1c": base["hba1c"] + np.random.normal(0, 0.05),
            "troponin_i": max(0, base["troponin_i"] + np.random.normal(0, 0.003)),
            "bnp": max(0, base["bnp"] + np.random.normal(0, 8)),
            "creatinine": max(0.3, base["creatinine"] + np.random.normal(0, 0.05)),
            "fasting_glucose": max(50, base["fasting_glucose"] + np.random.normal(0, 4)),
        }
        return {k: round(v, 3) for k, v in labs.items()}

    def generate_demographics(self) -> Dict[str, float]:
        """Return static demographics."""
        base = self.base_values
        return {
            "age": base["age"],
            "sex": base["sex"],
            "bmi": base["bmi"],
            "smoking_status": base["smoking_status"],
            "systolic_bp": round(base["systolic_bp"] + np.random.normal(0, 3), 1),
            "diastolic_bp": round(base["diastolic_bp"] + np.random.normal(0, 2), 1),
            "ejection_fraction": round(base["ejection_fraction"] + np.random.normal(0, 1), 1),
        }

    def generate_full_initial_state(self) -> Dict[str, float]:
        """Generate complete initial state for all 24 dimensions."""
        state = {}
        state.update(self.generate_demographics())
        state.update(self.generate_lab_results())
        state.update(self.generate_wearable_reading())
        return state

    def generate_history(self, n_ticks: int = 72) -> list:
        """
        Generate n_ticks worth of historical wearable readings.
        Each tick = 5 minutes. Default 72 ticks = 6 hours.
        """
        readings = []
        for _ in range(n_ticks):
            readings.append(self.generate_wearable_reading())
        return readings
