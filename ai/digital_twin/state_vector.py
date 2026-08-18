"""
Reduced-Order Cardiovascular Digital Twin — State Vector Engine

Implements a 24-dimensional state vector updated every 5 minutes via an
Extended Kalman Filter (EKF). Fuses three data streams:
  - Wearable (8 dims): HR, HRV_SDNN, HRV_RMSSD, SpO2, resp_rate, step_count,
                        skin_temp, activity_level
  - Laboratory (9 dims): total_chol, LDL, HDL, triglycerides, HbA1c,
                          troponin_I, BNP, creatinine, fasting_glucose
  - Demographics (7 dims): age, sex, BMI, smoking_status, systolicBP,
                            diastolicBP, ejection_fraction

Process model: simplified Windkessel-derived cardiovascular dynamics.
"""

import numpy as np
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# ── State vector dimension indices ──────────────────────────────────────────

DIM_NAMES: List[str] = [
    # Wearable (0–7)
    "heart_rate", "hrv_sdnn", "hrv_rmssd", "spo2",
    "resp_rate", "step_count", "skin_temp", "activity_level",
    # Laboratory (8–16)
    "total_chol", "ldl", "hdl", "triglycerides", "hba1c",
    "troponin_i", "bnp", "creatinine", "fasting_glucose",
    # Demographics (17–23)
    "age", "sex", "bmi", "smoking_status",
    "systolic_bp", "diastolic_bp", "ejection_fraction",
]

DIM_UNITS: Dict[str, str] = {
    "heart_rate": "bpm", "hrv_sdnn": "ms", "hrv_rmssd": "ms", "spo2": "%",
    "resp_rate": "br/min", "step_count": "steps", "skin_temp": "°C",
    "activity_level": "MET",
    "total_chol": "mg/dL", "ldl": "mg/dL", "hdl": "mg/dL",
    "triglycerides": "mg/dL", "hba1c": "%", "troponin_i": "ng/mL",
    "bnp": "pg/mL", "creatinine": "mg/dL", "fasting_glucose": "mg/dL",
    "age": "years", "sex": "binary", "bmi": "kg/m²",
    "smoking_status": "binary", "systolic_bp": "mmHg",
    "diastolic_bp": "mmHg", "ejection_fraction": "%",
}

# Normal reference ranges [low, high]
NORMAL_RANGES: Dict[str, Tuple[float, float]] = {
    "heart_rate": (60, 100), "hrv_sdnn": (30, 100), "hrv_rmssd": (20, 80),
    "spo2": (95, 100), "resp_rate": (12, 20), "step_count": (0, 15000),
    "skin_temp": (35.5, 37.5), "activity_level": (1.0, 8.0),
    "total_chol": (125, 200), "ldl": (0, 100), "hdl": (40, 80),
    "triglycerides": (0, 150), "hba1c": (4.0, 5.7), "troponin_i": (0, 0.04),
    "bnp": (0, 100), "creatinine": (0.6, 1.2), "fasting_glucose": (70, 100),
    "age": (18, 100), "sex": (0, 1), "bmi": (18.5, 24.9),
    "smoking_status": (0, 1), "systolic_bp": (90, 120),
    "diastolic_bp": (60, 80), "ejection_fraction": (55, 70),
}

N_DIM = len(DIM_NAMES)  # 24

# ── Data Classes ────────────────────────────────────────────────────────────

@dataclass
class StateSnapshot:
    """Single time-stamped state vector."""
    timestamp: float  # Unix epoch seconds
    x: np.ndarray     # (24,) state vector
    P_diag: np.ndarray  # (24,) diagonal of covariance matrix (uncertainty)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "values": {name: round(float(self.x[i]), 4) for i, name in enumerate(DIM_NAMES)},
            "uncertainty": {name: round(float(self.P_diag[i]), 4) for i, name in enumerate(DIM_NAMES)},
        }


# ── Extended Kalman Filter ──────────────────────────────────────────────────

class CardiovascularEKF:
    """
    Extended Kalman Filter for cardiovascular state estimation.

    Process model encodes simplified physiological coupling:
    - HR ↔ BP via baroreflex gain
    - BP ↔ Ejection fraction via Frank-Starling mechanism
    - Metabolic markers evolve with slow drift (labs change over days)
    - Demographics are quasi-static
    """

    def __init__(self):
        self.x = np.zeros(N_DIM)       # State mean
        self.P = np.eye(N_DIM) * 10.0  # State covariance

        # Process noise (Q) — higher for dynamic wearable signals
        self.Q = np.diag(self._build_process_noise())

        # Measurement noise defaults (R) — per-dimension
        self.R_defaults = np.diag(self._build_measurement_noise())

    def _build_process_noise(self) -> np.ndarray:
        q = np.zeros(N_DIM)
        # Wearable dims: moderate process noise (change every 5 min)
        q[0] = 4.0    # HR
        q[1] = 9.0    # HRV SDNN
        q[2] = 9.0    # HRV RMSSD
        q[3] = 0.5    # SpO2
        q[4] = 1.0    # resp rate
        q[5] = 100.0  # step count
        q[6] = 0.04   # skin temp
        q[7] = 0.25   # activity level
        # Lab dims: very low process noise (change over days/weeks)
        q[8:17] = 0.01
        # Demographics: near-zero (quasi-static)
        q[17:] = 0.001
        return q

    def _build_measurement_noise(self) -> np.ndarray:
        r = np.ones(N_DIM) * 1.0
        # Wearable sensors
        r[0] = 4.0    # HR sensor ± 2 bpm
        r[1] = 25.0   # HRV SDNN
        r[2] = 16.0   # HRV RMSSD
        r[3] = 1.0    # SpO2
        r[4] = 2.0    # resp rate
        r[5] = 50.0   # step count
        r[6] = 0.1    # skin temp
        r[7] = 0.5    # activity
        # Lab results: high precision
        r[8:17] = 0.25
        # Demographics: very precise (user-entered)
        r[17:] = 0.01
        return r

    def initialize(self, initial_values: Dict[str, float]):
        """Set initial state from patient data."""
        for i, name in enumerate(DIM_NAMES):
            if name in initial_values:
                self.x[i] = initial_values[name]
            else:
                lo, hi = NORMAL_RANGES.get(name, (0, 1))
                self.x[i] = (lo + hi) / 2.0
        # Set initial covariance based on normal range spread
        for i, name in enumerate(DIM_NAMES):
            lo, hi = NORMAL_RANGES.get(name, (0, 1))
            self.P[i, i] = ((hi - lo) / 4.0) ** 2

    def predict(self, dt: float = 300.0):
        """
        State prediction step (process model).
        dt = time delta in seconds (default 300 = 5 minutes).

        Simplified cardiovascular coupling:
        - Baroreflex: ΔHR ∝ -gain × (SBP - setpoint)
        - Frank-Starling: ΔEF ∝ preload proxy
        """
        x_pred = self.x.copy()

        # Baroreflex coupling: HR adjusts based on BP deviation
        sbp_setpoint = 120.0
        baroreflex_gain = 0.02 * (dt / 300.0)
        bp_deviation = self.x[21] - sbp_setpoint  # systolic_bp index=21
        x_pred[0] -= baroreflex_gain * bp_deviation  # HR compensates

        # Frank-Starling: EF slightly adjusts with HR
        hr_setpoint = 72.0
        fs_gain = 0.01 * (dt / 300.0)
        x_pred[23] -= fs_gain * (self.x[0] - hr_setpoint)  # EF index=23

        # SpO2 recovery toward normal
        spo2_recovery = 0.005 * (dt / 300.0)
        x_pred[3] += spo2_recovery * (98.0 - self.x[3])

        # Slow metabolic drift (labs): mean-revert slightly
        for i in range(8, 17):
            lo, hi = NORMAL_RANGES[DIM_NAMES[i]]
            center = (lo + hi) / 2.0
            x_pred[i] += 0.001 * (dt / 300.0) * (center - self.x[i])

        # Clamp physiological bounds
        x_pred[0] = np.clip(x_pred[0], 30, 220)    # HR
        x_pred[3] = np.clip(x_pred[3], 70, 100)     # SpO2
        x_pred[23] = np.clip(x_pred[23], 10, 80)    # EF

        self.x = x_pred

        # Covariance prediction: P = F*P*F' + Q (with F ≈ I for small coupling)
        self.P = self.P + self.Q * (dt / 300.0)

    def update(self, observations: Dict[str, float]):
        """
        Measurement update step.
        observations: dict mapping dimension name → observed value.
        Only updates dimensions that have new measurements.
        """
        if not observations:
            return

        # Build observation vector and matrices for observed dims only
        obs_indices = []
        z = []
        for name, value in observations.items():
            if name in DIM_NAMES:
                idx = DIM_NAMES.index(name)
                obs_indices.append(idx)
                z.append(value)

        if not obs_indices:
            return

        n_obs = len(obs_indices)
        z = np.array(z)

        # H matrix: selects observed dimensions
        H = np.zeros((n_obs, N_DIM))
        for j, idx in enumerate(obs_indices):
            H[j, idx] = 1.0

        # R: measurement noise for observed dims
        R = np.diag([self.R_defaults[idx, idx] for idx in obs_indices])

        # Innovation
        y = z - H @ self.x

        # Innovation covariance
        S = H @ self.P @ H.T + R

        # Kalman gain
        K = self.P @ H.T @ np.linalg.inv(S)

        # State update
        self.x = self.x + K @ y

        # Covariance update (Joseph form for numerical stability)
        I_KH = np.eye(N_DIM) - K @ H
        self.P = I_KH @ self.P @ I_KH.T + K @ R @ K.T

    def get_snapshot(self) -> StateSnapshot:
        """Return current state as a snapshot."""
        return StateSnapshot(
            timestamp=time.time(),
            x=self.x.copy(),
            P_diag=np.diag(self.P).copy(),
        )


# ── State Vector Manager ───────────────────────────────────────────────────

class StateVectorManager:
    """
    Manages a patient's rolling state vector history.
    Keeps last 288 snapshots (= 24 hours at 5-min intervals).
    """

    MAX_HISTORY = 288

    def __init__(self, patient_id: str):
        self.patient_id = patient_id
        self.ekf = CardiovascularEKF()
        self.history: List[StateSnapshot] = []
        self.initialized = False
        self.last_update: float = 0

    def initialize(self, demographics: Dict[str, float], labs: Optional[Dict[str, float]] = None,
                   wearable: Optional[Dict[str, float]] = None):
        """Initialize state vector from available data."""
        initial = {}
        initial.update(demographics)
        if labs:
            initial.update(labs)
        if wearable:
            initial.update(wearable)
        self.ekf.initialize(initial)
        snapshot = self.ekf.get_snapshot()
        self.history.append(snapshot)
        self.last_update = snapshot.timestamp
        self.initialized = True

    def update(self, observations: Dict[str, float]) -> StateSnapshot:
        """
        Push new observations and run EKF predict+update cycle.
        Returns the new state snapshot.
        """
        now = time.time()
        dt = now - self.last_update if self.last_update > 0 else 300.0
        dt = max(dt, 1.0)  # At least 1 second

        # Predict forward
        self.ekf.predict(dt=dt)

        # Update with observations
        self.ekf.update(observations)

        # Store snapshot
        snapshot = self.ekf.get_snapshot()
        self.history.append(snapshot)
        if len(self.history) > self.MAX_HISTORY:
            self.history = self.history[-self.MAX_HISTORY:]
        self.last_update = now

        return snapshot

    def get_current_state(self) -> Optional[StateSnapshot]:
        return self.history[-1] if self.history else None

    def get_history(self, n: int = 288) -> List[dict]:
        """Return last n snapshots as serializable dicts."""
        return [s.to_dict() for s in self.history[-n:]]

    def get_state_summary(self) -> dict:
        """Compact summary: current values + deviation flags."""
        if not self.history:
            return {"initialized": False}

        current = self.history[-1]
        deviations = {}
        for i, name in enumerate(DIM_NAMES):
            lo, hi = NORMAL_RANGES.get(name, (0, 1))
            val = current.x[i]
            if val < lo:
                deviations[name] = "below_normal"
            elif val > hi:
                deviations[name] = "above_normal"
            else:
                deviations[name] = "normal"

        return {
            "initialized": True,
            "patient_id": self.patient_id,
            "timestamp": current.timestamp,
            "values": {name: round(float(current.x[i]), 4) for i, name in enumerate(DIM_NAMES)},
            "units": DIM_UNITS,
            "normal_ranges": {name: list(NORMAL_RANGES[name]) for name in DIM_NAMES},
            "deviations": deviations,
            "uncertainty": {name: round(float(current.P_diag[i]), 4) for i, name in enumerate(DIM_NAMES)},
            "history_length": len(self.history),
        }
