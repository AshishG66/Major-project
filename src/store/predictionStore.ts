import { create } from 'zustand';

export interface PatientFactors {
  age: number;
  gender: string;
  height: number;
  weight: number;
  bmi: number;
  systolicBP: number;
  diastolicBP: number;
  cholesterol: number;
  heartRate: number;
  bloodSugar: number;
  ecgResult: string;
  exerciseFrequency: number;
  smoking: boolean;
  alcohol: boolean;
  diabetes: boolean;
  familyHistory: boolean;
  chestPainType: string;
  sleepDuration: number;
  stressLevel: number;
}

export interface ShapFactor {
  feature: string;
  impact: string;
  value?: any;
  importance?: number;
  shap_value?: number;
}

export interface Recommendations {
  diet?: string[];
  exercise?: string[];
  lifestyle?: string[];
  medications?: string[];
  weeklyGoal?: string;
}

export interface PredictionData {
  id?: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  confidenceScore: number;
  modelName?: string;
  plainExplanation?: string;
  shapExplanation?: ShapFactor[];
  healthScore?: number;
  factors: PatientFactors;
  recommendations?: Recommendations;
  createdAt?: string;
}

export interface DashboardStats {
  totalScans: number;
  avgRiskScore: number;
  avgHealthScore: number;
  highRiskCount: number;
  lowRiskCount: number;
  todayScansCount: number;
}

interface PredictionState {
  latestPrediction: PredictionData | null;
  predictionHistory: PredictionData[];
  stats: DashboardStats;
  isScanning: boolean;
  setLatestPrediction: (data: PredictionData) => void;
  setPredictionHistory: (history: PredictionData[]) => void;
  addPrediction: (data: PredictionData) => void;
  setIsScanning: (scanning: boolean) => void;
  recalculateStats: () => void;
  resetPredictionStore: () => void;
}

const STORAGE_KEY = 'hridya_latest_prediction';
const HISTORY_KEY = 'hridya_prediction_history';

// Helper to calculate statistics from prediction history
function computeStats(history: PredictionData[], latest: PredictionData | null): DashboardStats {
  const all = [...history];
  if (latest && !all.some((p) => p.id === latest.id && latest.id !== undefined)) {
    all.unshift(latest);
  }

  const totalScans = all.length;
  if (totalScans === 0) {
    return {
      totalScans: 0,
      avgRiskScore: 0,
      avgHealthScore: 100,
      highRiskCount: 0,
      lowRiskCount: 0,
      todayScansCount: 0,
    };
  }

  const totalRisk = all.reduce((acc, curr) => acc + (curr.riskScore || 0), 0);
  const totalHealth = all.reduce((acc, curr) => acc + (curr.healthScore ?? (100 - (curr.riskScore || 0))), 0);
  const highRisk = all.filter((p) => (p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL' || p.riskScore >= 65)).length;
  const lowRisk = all.filter((p) => (p.riskLevel === 'LOW' || p.riskScore < 35)).length;

  const todayStr = new Date().toDateString();
  const todayScans = all.filter((p) => p.createdAt && new Date(p.createdAt).toDateString() === todayStr).length;

  return {
    totalScans,
    avgRiskScore: Math.round(totalRisk / totalScans),
    avgHealthScore: Math.round(totalHealth / totalScans),
    highRiskCount: highRisk,
    lowRiskCount: lowRisk,
    todayScansCount: Math.max(1, todayScans),
  };
}

// Load initial prediction from localStorage
function getInitialPrediction(): PredictionData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('latest_scan_result');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.prediction) {
        return {
          ...parsed.prediction,
          healthScore: parsed.healthScore ?? parsed.prediction.healthScore ?? (100 - (parsed.prediction.riskScore || 0)),
          recommendations: parsed.recommendations || parsed.prediction.recommendations,
        };
      }
      return parsed;
    }
  } catch {}
  return null;
}

function getInitialHistory(): PredictionData[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return [];
}

export const usePredictionStore = create<PredictionState>((set, get) => {
  const initialLatest = getInitialPrediction();
  const initialHistory = getInitialHistory();
  const initialStats = computeStats(initialHistory, initialLatest);

  return {
    latestPrediction: initialLatest,
    predictionHistory: initialHistory,
    stats: initialStats,
    isScanning: false,

    setLatestPrediction: (data: PredictionData) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}

      const history = get().predictionHistory;
      const updatedHistory = [data, ...history.filter((p) => p.id !== data.id)].slice(0, 30);

      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      } catch {}

      const newStats = computeStats(updatedHistory, data);

      set({
        latestPrediction: data,
        predictionHistory: updatedHistory,
        stats: newStats,
      });
    },

    setPredictionHistory: (history: PredictionData[]) => {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch {}

      const latest = get().latestPrediction || history[0] || null;
      const newStats = computeStats(history, latest);

      set({
        predictionHistory: history,
        stats: newStats,
        latestPrediction: latest,
      });
    },

    addPrediction: (data: PredictionData) => {
      const currentHistory = get().predictionHistory;
      const updatedHistory = [data, ...currentHistory.filter((p) => p.id !== data.id)].slice(0, 30);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      } catch {}

      const newStats = computeStats(updatedHistory, data);

      set({
        latestPrediction: data,
        predictionHistory: updatedHistory,
        stats: newStats,
      });
    },

    setIsScanning: (scanning: boolean) => set({ isScanning: scanning }),

    recalculateStats: () => {
      const { predictionHistory, latestPrediction } = get();
      set({ stats: computeStats(predictionHistory, latestPrediction) });
    },

    resetPredictionStore: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(HISTORY_KEY);
        localStorage.removeItem('latest_scan_result');
      } catch {}
      set({
        latestPrediction: null,
        predictionHistory: [],
        stats: {
          totalScans: 0,
          avgRiskScore: 0,
          avgHealthScore: 100,
          highRiskCount: 0,
          lowRiskCount: 0,
          todayScansCount: 0,
        },
        isScanning: false,
      });
    },
  };
});
