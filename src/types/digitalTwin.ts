export type DigitalTwinCondition =
  | 'NORMAL'
  | 'CORONARY_FLOW_RISK'
  | 'ARRHYTHMIA_RISK'
  | 'REDUCED_CARDIAC_FUNCTION';

export type DigitalTwinSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type DigitalTwinBeatMode = 'NORMAL' | 'IRREGULAR' | 'WEAK';

export type DigitalTwinFlowMode = 'NORMAL' | 'REDUCED' | 'TURBULENT';

export type DigitalTwinHighlightRegion = 'CORONARY' | 'HEART' | null;

export type DigitalTwinEcgMode = 'NORMAL' | 'IRREGULAR' | 'WEAK' | 'LV_HYPERTROPHY';

export interface DigitalTwinSimulationState {
  condition: DigitalTwinCondition;
  severity: DigitalTwinSeverity;
  confidence: number;
  beatMode: DigitalTwinBeatMode;
  contractionStrength: number; // 1.0 = normal, 0.95 = irregular, 0.62 = weak
  flowMode: DigitalTwinFlowMode;
  highlightRegion: DigitalTwinHighlightRegion;
  ecgMode: DigitalTwinEcgMode;
  sourceFactors: string[];
  explanation: string;
  patientExplanation: string;
  isStrokeRiskElevated?: boolean;
  strokeRiskNote?: string;
  generatedAt: string;
  isDemo?: boolean;
  demoScenario?: string;
}
