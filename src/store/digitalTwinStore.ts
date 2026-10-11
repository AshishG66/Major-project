import { create } from 'zustand';
import { DigitalTwinCondition, DigitalTwinSimulationState } from '../types/digitalTwin';
import { calculateDigitalTwinState, DEMO_SCENARIOS } from '../utils/digitalTwinEngine';
import { PredictionData, usePredictionStore } from './predictionStore';

interface DigitalTwinStoreState {
  simulationState: DigitalTwinSimulationState | null;
  activeDemoScenario: DigitalTwinCondition | null;
  isDemoMode: boolean;
  setSimulationFromPrediction: (prediction: PredictionData | null, patientId?: string) => void;
  setDemoScenario: (scenario: DigitalTwinCondition | null) => void;
  recalculateFromLatest: () => void;
  resetDigitalTwinStore: () => void;
}

const STORAGE_KEY = 'hridya_digital_twin_state';
const DEMO_SCENARIO_KEY = 'hridya_demo_scenario';

function getInitialState(): DigitalTwinSimulationState | null {
  try {
    const isDemo = localStorage.getItem('demo_mode') === 'true';
    const savedScenario = localStorage.getItem(DEMO_SCENARIO_KEY) as DigitalTwinCondition | null;
    if (isDemo && savedScenario && DEMO_SCENARIOS[savedScenario]) {
      return DEMO_SCENARIOS[savedScenario];
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}

  // Derive from initial prediction store state if available
  try {
    const latestPred = usePredictionStore.getState().latestPrediction;
    if (latestPred) {
      return calculateDigitalTwinState(latestPred);
    }
  } catch {}

  return null;
}

export const useDigitalTwinStore = create<DigitalTwinStoreState>((set, get) => {
  const initialState = getInitialState();
  const savedScenario = typeof window !== 'undefined' ? (localStorage.getItem(DEMO_SCENARIO_KEY) as DigitalTwinCondition | null) : null;
  const isDemo = typeof window !== 'undefined' ? localStorage.getItem('demo_mode') === 'true' : false;

  return {
    simulationState: initialState,
    activeDemoScenario: savedScenario,
    isDemoMode: isDemo,

    setSimulationFromPrediction: (prediction: PredictionData | null) => {
      // If a demo scenario override is explicitly active, preserve scenario display
      const activeDemo = get().activeDemoScenario;
      if (activeDemo && get().isDemoMode && DEMO_SCENARIOS[activeDemo]) {
        return;
      }

      const newState = calculateDigitalTwinState(prediction, {
        isDemo: get().isDemoMode,
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch {}

      set({
        simulationState: newState,
        activeDemoScenario: null,
      });
    },

    setDemoScenario: (scenario: DigitalTwinCondition | null) => {
      if (!scenario) {
        try {
          localStorage.removeItem(DEMO_SCENARIO_KEY);
        } catch {}

        // Revert to authenticated patient's actual latest scan
        const latestPred = usePredictionStore.getState().latestPrediction;
        const realState = calculateDigitalTwinState(latestPred);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(realState));
        } catch {}

        set({
          activeDemoScenario: null,
          simulationState: realState,
        });
        return;
      }

      const scenarioData = DEMO_SCENARIOS[scenario];
      if (scenarioData) {
        try {
          localStorage.setItem(DEMO_SCENARIO_KEY, scenario);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarioData));
        } catch {}

        set({
          activeDemoScenario: scenario,
          simulationState: scenarioData,
        });
      }
    },

    recalculateFromLatest: () => {
      const latestPred = usePredictionStore.getState().latestPrediction;
      const newState = calculateDigitalTwinState(latestPred, {
        isDemo: get().isDemoMode,
      });
      set({ simulationState: newState });
    },

    resetDigitalTwinStore: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DEMO_SCENARIO_KEY);
      } catch {}

      set({
        simulationState: null,
        activeDemoScenario: null,
        isDemoMode: false,
      });
    },
  };
});
