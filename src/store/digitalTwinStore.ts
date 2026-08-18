import { create } from 'zustand';

/**
 * Digital Twin State Store
 *
 * Manages the 24-dimensional cardiovascular state vector,
 * rolling history, MACE prediction results, and the 5-minute
 * auto-refresh simulation cycle.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface StateValues {
  [key: string]: number;
}

export interface MACEPrediction {
  mace_probability: number;
  mace_percentage: number;
  risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number;
  xgb_contribution: number;
  lstm_contribution: number;
  top_features: Array<{
    feature: string;
    value: number;
    weight: number;
    contribution: number;
    direction: 'risk' | 'protective';
  }>;
  threshold: number;
  fp_reduction_pct: number;
  static_baseline_score: number;
}

export interface StateSummary {
  initialized: boolean;
  patient_id?: string;
  timestamp?: number;
  values?: StateValues;
  units?: Record<string, string>;
  normal_ranges?: Record<string, [number, number]>;
  deviations?: Record<string, 'normal' | 'above_normal' | 'below_normal'>;
  uncertainty?: StateValues;
  history_length?: number;
}

export interface HistoryEntry {
  timestamp: number;
  values: StateValues;
  uncertainty: StateValues;
}

// ── Dimension metadata (matches Python backend) ──────────────────────────

export const DIM_LABELS: Record<string, string> = {
  heart_rate: 'Heart Rate', hrv_sdnn: 'HRV (SDNN)', hrv_rmssd: 'HRV (RMSSD)',
  spo2: 'SpO₂', resp_rate: 'Resp. Rate', step_count: 'Step Count',
  skin_temp: 'Skin Temp', activity_level: 'Activity',
  total_chol: 'Total Chol', ldl: 'LDL', hdl: 'HDL',
  triglycerides: 'Triglycerides', hba1c: 'HbA1c', troponin_i: 'Troponin I',
  bnp: 'BNP', creatinine: 'Creatinine', fasting_glucose: 'Fasting Glucose',
  age: 'Age', sex: 'Sex', bmi: 'BMI', smoking_status: 'Smoking',
  systolic_bp: 'Systolic BP', diastolic_bp: 'Diastolic BP',
  ejection_fraction: 'Ejection Fraction',
};

export const DIM_GROUPS: Record<string, string[]> = {
  Wearable: ['heart_rate', 'hrv_sdnn', 'hrv_rmssd', 'spo2', 'resp_rate', 'step_count', 'skin_temp', 'activity_level'],
  Laboratory: ['total_chol', 'ldl', 'hdl', 'triglycerides', 'hba1c', 'troponin_i', 'bnp', 'creatinine', 'fasting_glucose'],
  Demographics: ['age', 'sex', 'bmi', 'smoking_status', 'systolic_bp', 'diastolic_bp', 'ejection_fraction'],
};

export const NORMAL_RANGES: Record<string, [number, number]> = {
  heart_rate: [60, 100], hrv_sdnn: [30, 100], hrv_rmssd: [20, 80],
  spo2: [95, 100], resp_rate: [12, 20], step_count: [0, 15000],
  skin_temp: [35.5, 37.5], activity_level: [1.0, 8.0],
  total_chol: [125, 200], ldl: [0, 100], hdl: [40, 80],
  triglycerides: [0, 150], hba1c: [4.0, 5.7], troponin_i: [0, 0.04],
  bnp: [0, 100], creatinine: [0.6, 1.2], fasting_glucose: [70, 100],
  age: [18, 100], sex: [0, 1], bmi: [18.5, 24.9],
  smoking_status: [0, 1], systolic_bp: [90, 120],
  diastolic_bp: [60, 80], ejection_fraction: [55, 70],
};

export const DIM_UNITS: Record<string, string> = {
  heart_rate: 'bpm', hrv_sdnn: 'ms', hrv_rmssd: 'ms', spo2: '%',
  resp_rate: 'br/min', step_count: 'steps', skin_temp: '°C',
  activity_level: 'MET',
  total_chol: 'mg/dL', ldl: 'mg/dL', hdl: 'mg/dL',
  triglycerides: 'mg/dL', hba1c: '%', troponin_i: 'ng/mL',
  bnp: 'pg/mL', creatinine: 'mg/dL', fasting_glucose: 'mg/dL',
  age: 'years', sex: '', bmi: 'kg/m²',
  smoking_status: '', systolic_bp: 'mmHg',
  diastolic_bp: 'mmHg', ejection_fraction: '%',
};

// ── Simulation Engine (client-side for demo) ───────────────────────────────

function generateSimulatedWearable(base: StateValues, tick: number): StateValues {
  const circadian = Math.sin(2 * Math.PI * tick / 288);
  const activityBurst = Math.random() < 0.08 ? 1.5 + Math.random() * 1.5 : 1.0;
  const n = () => (Math.random() - 0.5) * 2; // gaussian-ish

  return {
    heart_rate: (base.heart_rate || 75) + circadian * 5 + n() * 2.5 + (activityBurst - 1) * 15,
    hrv_sdnn: Math.max(5, (base.hrv_sdnn || 40) + n() * 4 - circadian * 3),
    hrv_rmssd: Math.max(3, (base.hrv_rmssd || 30) + n() * 3),
    spo2: Math.min(100, Math.max(85, (base.spo2 || 97) + n() * 0.5)),
    resp_rate: Math.max(8, (base.resp_rate || 16) + n() * 1.2),
    step_count: Math.max(0, (base.step_count || 500) * activityBurst + n() * 50),
    skin_temp: (base.skin_temp || 36.7) + n() * 0.15,
    activity_level: Math.min(10, Math.max(0.8, (base.activity_level || 2) * activityBurst + n() * 0.3)),
  };
}

// ── Profiles ───────────────────────────────────────────────────────────────

const PROFILES: Record<string, StateValues> = {
  healthy: {
    heart_rate: 68, hrv_sdnn: 55, hrv_rmssd: 42, spo2: 98,
    resp_rate: 15, step_count: 800, skin_temp: 36.6, activity_level: 2.5,
    total_chol: 185, ldl: 95, hdl: 62, triglycerides: 110,
    hba1c: 5.2, troponin_i: 0.01, bnp: 45, creatinine: 0.9, fasting_glucose: 88,
    age: 42, sex: 1, bmi: 23.5, smoking_status: 0,
    systolic_bp: 118, diastolic_bp: 76, ejection_fraction: 62,
  },
  moderate_risk: {
    heart_rate: 78, hrv_sdnn: 38, hrv_rmssd: 28, spo2: 96,
    resp_rate: 17, step_count: 400, skin_temp: 36.8, activity_level: 1.8,
    total_chol: 235, ldl: 145, hdl: 42, triglycerides: 180,
    hba1c: 6.1, troponin_i: 0.02, bnp: 95, creatinine: 1.1, fasting_glucose: 112,
    age: 56, sex: 0, bmi: 28.5, smoking_status: 1,
    systolic_bp: 142, diastolic_bp: 88, ejection_fraction: 52,
  },
  high_risk: {
    heart_rate: 92, hrv_sdnn: 22, hrv_rmssd: 15, spo2: 93,
    resp_rate: 22, step_count: 150, skin_temp: 37.2, activity_level: 1.2,
    total_chol: 280, ldl: 185, hdl: 34, triglycerides: 250,
    hba1c: 7.8, troponin_i: 0.06, bnp: 350, creatinine: 1.6, fasting_glucose: 165,
    age: 67, sex: 0, bmi: 32.0, smoking_status: 1,
    systolic_bp: 165, diastolic_bp: 95, ejection_fraction: 38,
  },
};

// ── Simple EKF simulation (client-side fallback) ───────────────────────────

function computeMACELocally(values: StateValues, history: HistoryEntry[]): MACEPrediction {
  // XGBoost-style static scoring
  const weights: Record<string, number> = {
    age: 0.12, systolic_bp: 0.10, total_chol: 0.06, ldl: 0.07,
    hdl: -0.08, smoking_status: 0.09, hba1c: 0.06, troponin_i: 0.11,
    bnp: 0.09, ejection_fraction: -0.10, heart_rate: 0.03,
    creatinine: 0.05, bmi: 0.04,
  };

  let xgbRaw = 0;
  const topFeatures: MACEPrediction['top_features'] = [];

  for (const [feat, weight] of Object.entries(weights)) {
    const val = values[feat] ?? 0;
    const range = NORMAL_RANGES[feat] ?? [0, 100];
    const center = (range[0] + range[1]) / 2;
    const spread = Math.max((range[1] - range[0]) / 2, 0.01);
    const deviation = (val - center) / spread;
    const contribution = weight < 0 ? weight * deviation : weight * Math.max(deviation, 0) * 0.5;
    xgbRaw += contribution;
    topFeatures.push({
      feature: feat,
      value: Math.round(val * 100) / 100,
      weight: Math.round(Math.abs(weight) * 1000) / 1000,
      contribution: Math.round(contribution * 10000) / 10000,
      direction: weight < 0 ? 'protective' : 'risk',
    });
  }
  topFeatures.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const xgbScore = 1 / (1 + Math.exp(-xgbRaw));

  // LSTM-style temporal scoring
  let lstmScore = 0;
  if (history.length >= 2) {
    const recent = history.slice(-12);
    const hrValues = recent.map(h => h.values.heart_rate || 75);
    if (hrValues.length > 1) {
      const hrSlope = (hrValues[hrValues.length - 1] - hrValues[0]) / hrValues.length;
      if (hrSlope > 0.5) lstmScore += 0.15;
    }
    const sbpValues = recent.map(h => h.values.systolic_bp || 120);
    if (sbpValues.length > 1) {
      const sbpSlope = (sbpValues[sbpValues.length - 1] - sbpValues[0]) / sbpValues.length;
      if (sbpSlope > 0.3) lstmScore += 0.12;
    }
    const hrvValues = recent.map(h => h.values.hrv_sdnn || 40);
    if (hrvValues.length > 1) {
      const hrvSlope = (hrvValues[hrvValues.length - 1] - hrvValues[0]) / hrvValues.length;
      if (hrvSlope < -0.5) lstmScore += 0.18;
    }
    const spo2Values = recent.map(h => h.values.spo2 || 97);
    const spo2Min = Math.min(...spo2Values);
    if (spo2Min < 92) lstmScore += 0.20;
  }
  lstmScore = Math.min(lstmScore, 1.0);

  const xgbW = 0.65, lstmW = 0.35;
  const rawProb = xgbW * xgbScore + lstmW * lstmScore;
  const calibrated = 1 / (1 + Math.exp(-4 * (rawProb - 0.35)));
  const maceProb = Math.min(0.99, Math.max(0.01, calibrated));

  let riskTier: MACEPrediction['risk_tier'] = 'LOW';
  if (maceProb >= 0.55) riskTier = 'CRITICAL';
  else if (maceProb >= 0.32) riskTier = 'HIGH';
  else if (maceProb >= 0.15) riskTier = 'MODERATE';

  const staticFP = Math.max(xgbScore - 0.20, 0);
  const hybridFP = Math.max(maceProb - 0.32, 0);
  const fpReduction = staticFP > 0 ? Math.min(60, (1 - hybridFP / staticFP) * 100) : 30;

  return {
    mace_probability: Math.round(maceProb * 10000) / 10000,
    mace_percentage: Math.round(maceProb * 1000) / 10,
    risk_tier: riskTier,
    confidence: Math.round((0.75 + Math.random() * 0.15) * 1000) / 1000,
    xgb_contribution: Math.round(xgbW * xgbScore * 10000) / 10000,
    lstm_contribution: Math.round(lstmW * lstmScore * 10000) / 10000,
    top_features: topFeatures.slice(0, 5),
    threshold: 0.32,
    fp_reduction_pct: Math.round(fpReduction * 10) / 10,
    static_baseline_score: Math.round(xgbScore * 10000) / 10000,
  };
}

// ── Store ──────────────────────────────────────────────────────────────────

interface DigitalTwinState {
  // State
  initialized: boolean;
  profile: string;
  currentValues: StateValues;
  deviations: Record<string, string>;
  history: HistoryEntry[];
  macePrediction: MACEPrediction | null;
  simulationRunning: boolean;
  tick: number;
  lastUpdateTime: number;

  // Actions
  initialize: (profile: string) => void;
  runSimulationTick: () => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  setProfile: (profile: string) => void;
}

export const useDigitalTwinStore = create<DigitalTwinState>((set, get) => ({
  initialized: false,
  profile: 'moderate_risk',
  currentValues: {},
  deviations: {},
  history: [],
  macePrediction: null,
  simulationRunning: false,
  tick: 0,
  lastUpdateTime: 0,

  initialize: (profile: string) => {
    const base = PROFILES[profile] || PROFILES.moderate_risk;

    // Generate initial history (72 entries = 6 hours)
    const history: HistoryEntry[] = [];
    const now = Date.now() / 1000;
    for (let i = 72; i > 0; i--) {
      const simValues = { ...base };
      const wearable = generateSimulatedWearable(base, 72 - i);
      Object.assign(simValues, wearable);
      history.push({
        timestamp: now - i * 300,
        values: { ...simValues },
        uncertainty: Object.fromEntries(
          Object.keys(simValues).map(k => [k, Math.random() * 2 + 0.5])
        ),
      });
    }

    const currentValues = { ...history[history.length - 1].values };
    const deviations: Record<string, string> = {};
    for (const [key, val] of Object.entries(currentValues)) {
      const range = NORMAL_RANGES[key];
      if (!range) { deviations[key] = 'normal'; continue; }
      if (val < range[0]) deviations[key] = 'below_normal';
      else if (val > range[1]) deviations[key] = 'above_normal';
      else deviations[key] = 'normal';
    }

    const macePrediction = computeMACELocally(currentValues, history);

    set({
      initialized: true,
      profile,
      currentValues,
      deviations,
      history,
      macePrediction,
      tick: 72,
      lastUpdateTime: Date.now(),
    });
  },

  runSimulationTick: () => {
    const { currentValues, history, tick, profile } = get();
    const base = PROFILES[profile] || PROFILES.moderate_risk;

    // Generate new wearable reading
    const newWearable = generateSimulatedWearable(base, tick);
    const newValues = { ...currentValues, ...newWearable };

    // Slight BP drift
    newValues.systolic_bp = (currentValues.systolic_bp || 130) + (Math.random() - 0.5) * 3;
    newValues.diastolic_bp = (currentValues.diastolic_bp || 85) + (Math.random() - 0.5) * 2;

    const now = Date.now() / 1000;
    const newEntry: HistoryEntry = {
      timestamp: now,
      values: { ...newValues },
      uncertainty: Object.fromEntries(
        Object.keys(newValues).map(k => [k, Math.random() * 2 + 0.5])
      ),
    };

    const newHistory = [...history, newEntry].slice(-288);

    const deviations: Record<string, string> = {};
    for (const [key, val] of Object.entries(newValues)) {
      const range = NORMAL_RANGES[key];
      if (!range) { deviations[key] = 'normal'; continue; }
      if (val < range[0]) deviations[key] = 'below_normal';
      else if (val > range[1]) deviations[key] = 'above_normal';
      else deviations[key] = 'normal';
    }

    const macePrediction = computeMACELocally(newValues, newHistory);

    set({
      currentValues: newValues,
      deviations,
      history: newHistory,
      macePrediction,
      tick: tick + 1,
      lastUpdateTime: Date.now(),
    });
  },

  startSimulation: () => set({ simulationRunning: true }),
  stopSimulation: () => set({ simulationRunning: false }),

  setProfile: (profile: string) => {
    get().initialize(profile);
  },
}));
