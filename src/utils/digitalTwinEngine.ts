import { PredictionData } from '../store/predictionStore';
import { DigitalTwinCondition, DigitalTwinSeverity, DigitalTwinSimulationState } from '../types/digitalTwin';

/**
 * Derives a deterministic, patient-specific Digital Twin simulation state
 * strictly from the patient's latest Risk Scan data (factors, SHAP values, and risk scores).
 * 
 * Non-diagnostic clinical simulation for decision support.
 */
export function calculateDigitalTwinState(
  prediction: PredictionData | null,
  options?: { isDemo?: boolean; demoScenario?: string }
): DigitalTwinSimulationState {
  // Fallback default state if unscanned
  if (!prediction || !prediction.factors) {
    return {
      condition: 'NORMAL',
      severity: 'LOW',
      confidence: 0.95,
      beatMode: 'NORMAL',
      contractionStrength: 1.0,
      flowMode: 'NORMAL',
      highlightRegion: null,
      ecgMode: 'NORMAL',
      sourceFactors: ['Baseline physiological parameters within normal limits'],
      explanation: 'Simulated Digital Twin State: Normal hemodynamic synchronization.',
      patientExplanation: 'The Digital Twin is operating in baseline synchronized mode awaiting your initial Risk Scan.',
      isStrokeRiskElevated: false,
      generatedAt: new Date().toISOString(),
      isDemo: options?.isDemo || false,
      demoScenario: options?.demoScenario
    };
  }

  const { factors, riskScore = 0, riskLevel = 'LOW', shapExplanation = [] } = prediction;
  const sys = factors.systolicBP || 120;
  const dia = factors.diastolicBP || 80;
  const chol = factors.cholesterol || 190;
  const hr = factors.heartRate || 72;
  const ecg = factors.ecgResult || 'NORMAL';
  const chestPain = factors.chestPainType || 'ASYMPTOMATIC';
  const bmi = factors.bmi || 24.5;
  const smoking = Boolean(factors.smoking);
  const diabetes = Boolean(factors.diabetes);

  // Check stroke risk elevation (Neurological risk context - NEVER represented as heart blockage)
  const isStrokeRiskElevated = (sys >= 160 && (smoking || diabetes)) || (sys >= 170) || (prediction.plainExplanation?.toLowerCase().includes('stroke') ?? false);
  const strokeRiskNote = isStrokeRiskElevated
    ? "Stroke Risk Elevated: Digital Twin is displaying cardiovascular risk context associated with the patient's stroke-risk prediction. (Neurological event - not represented as a physical blockage in the heart)."
    : undefined;

  // Extract top contributing SHAP factors
  const shapTopFeatures = shapExplanation
    .filter((s) => s.impact === 'INCREASES_RISK' || (s.shap_value && s.shap_value > 0) || (s.importance && s.importance > 0.15))
    .map((s) => s.feature);

  // Determine dominant condition based on actual Risk Scan factors
  let condition: DigitalTwinCondition = 'NORMAL';
  let severity: DigitalTwinSeverity = 'LOW';
  const sourceFactors: string[] = [];

  // Normalize severity
  const normRisk = (riskLevel || '').toUpperCase();
  if (normRisk.includes('CRIT') || riskScore >= 75) severity = 'CRITICAL';
  else if (normRisk.includes('HIGH') || riskScore >= 50) severity = 'HIGH';
  else if (normRisk.includes('MOD') || riskScore >= 25) severity = 'MODERATE';
  else severity = 'LOW';

  // Condition 1: ARRHYTHMIA / ABNORMAL RHYTHM RISK
  const isArrhythmia =
    ecg === 'ST_T_ABNORMAL' ||
    hr >= 100 ||
    hr <= 50 ||
    shapTopFeatures.some((f) => f.toLowerCase().includes('ecg') && !f.toLowerCase().includes('lvh')) ||
    (prediction.modelName?.toLowerCase().includes('ecg') || prediction.modelName?.toLowerCase().includes('physionet'));

  // Condition 2: REDUCED CARDIAC FUNCTION
  const isReducedCardiac =
    ecg === 'LV_HYPERTROPHY' ||
    shapTopFeatures.some((f) => f.toLowerCase().includes('lvh') || f.toLowerCase().includes('hypertrophy') || f.toLowerCase().includes('ejection')) ||
    (sys >= 165 && bmi >= 29) ||
    (sys >= 155 && ecg !== 'NORMAL');

  // Condition 3: CORONARY FLOW / BLOCKAGE RISK
  const isCoronary =
    chestPain === 'TYPICAL' ||
    chestPain === 'ATYPICAL' ||
    chol >= 240 ||
    (chol >= 210 && sys >= 140) ||
    shapTopFeatures.some((f) => f.toLowerCase().includes('cholesterol') || f.toLowerCase().includes('angina') || f.toLowerCase().includes('systolic')) ||
    sys >= 140;

  // Priority Determination:
  // 1. If explicit rhythm anomaly exists -> ARRHYTHMIA_RISK
  // 2. If myocardial hypertrophy / low pumping compliance -> REDUCED_CARDIAC_FUNCTION
  // 3. If coronary / lipid / ischemic load -> CORONARY_FLOW_RISK
  // 4. If none and risk is low -> NORMAL
  if (isArrhythmia && (ecg === 'ST_T_ABNORMAL' || hr >= 100 || hr <= 50)) {
    condition = 'ARRHYTHMIA_RISK';
    if (ecg === 'ST_T_ABNORMAL') sourceFactors.push(`ST-T Wave Abnormality (${ecg})`);
    if (hr >= 100) sourceFactors.push(`Elevated Heart Rate (${hr} BPM - Tachycardia strain)`);
    if (hr <= 50) sourceFactors.push(`Depressed Heart Rate (${hr} BPM - Bradycardia risk)`);
    if (shapTopFeatures.length > 0) sourceFactors.push(`Top SHAP Driver: ${shapTopFeatures[0]}`);
  } else if (isReducedCardiac) {
    condition = 'REDUCED_CARDIAC_FUNCTION';
    if (ecg === 'LV_HYPERTROPHY') sourceFactors.push(`Left Ventricular Hypertrophy (LVH confirmed on ECG)`);
    if (sys >= 150) sourceFactors.push(`Elevated Afterload Pressure (${sys}/${dia} mmHg)`);
    if (bmi >= 28) sourceFactors.push(`Elevated BMI Mass Index (${bmi} kg/m²)`);
    if (shapTopFeatures.length > 0) sourceFactors.push(`Top SHAP Factor: ${shapTopFeatures[0]}`);
  } else if (isCoronary && (chol >= 210 || sys >= 135 || chestPain !== 'ASYMPTOMATIC')) {
    condition = 'CORONARY_FLOW_RISK';
    if (chol >= 210) sourceFactors.push(`Serum Cholesterol (${chol} mg/dL - Intimal shear)`);
    if (sys >= 135) sourceFactors.push(`Arterial Wall Pressure (${sys} mmHg)`);
    if (chestPain !== 'ASYMPTOMATIC') sourceFactors.push(`Anginal Symptom: ${chestPain}`);
    if (smoking) sourceFactors.push(`Active Tobacco Endothelial Strain`);
    if (shapTopFeatures.length > 0) sourceFactors.push(`Top SHAP Factor: ${shapTopFeatures[0]}`);
  } else if (severity === 'LOW') {
    condition = 'NORMAL';
    sourceFactors.push(`Optimal Blood Pressure (${sys}/${dia} mmHg)`);
    sourceFactors.push(`Healthy Serum Lipids (${chol} mg/dL)`);
    sourceFactors.push(`Normal ECG Sinus Rhythm`);
  } else {
    // Moderate general vascular risk defaults to coronary flow risk simulation
    condition = 'CORONARY_FLOW_RISK';
    sourceFactors.push(`Systolic Blood Pressure (${sys} mmHg)`);
    sourceFactors.push(`Serum Cholesterol (${chol} mg/dL)`);
  }

  // Derive Mechanical & Flow Simulation Parameters
  let beatMode: DigitalTwinSimulationState['beatMode'] = 'NORMAL';
  let contractionStrength = 1.0;
  let flowMode: DigitalTwinSimulationState['flowMode'] = 'NORMAL';
  let highlightRegion: DigitalTwinSimulationState['highlightRegion'] = null;
  let ecgMode: DigitalTwinSimulationState['ecgMode'] = 'NORMAL';
  let explanation = '';
  let patientExplanation = '';

  switch (condition) {
    case 'CORONARY_FLOW_RISK':
      beatMode = 'NORMAL';
      contractionStrength = 1.0;
      flowMode = 'REDUCED';
      highlightRegion = 'CORONARY';
      ecgMode = 'NORMAL';
      explanation = 'Simulated Coronary Flow Risk: Localized coronary arterial perfusion resistance with synchronized ventricular hemodynamics.';
      patientExplanation = `The latest Risk Scan identified elevated coronary risk factors (${sourceFactors.slice(0, 2).join(', ')}). The Digital Twin is displaying a simulated coronary-flow-risk state to visualize localized perfusion context based on your contributing factors.`;
      break;

    case 'ARRHYTHMIA_RISK':
      beatMode = 'IRREGULAR';
      contractionStrength = 0.95;
      flowMode = 'NORMAL';
      highlightRegion = null;
      ecgMode = 'IRREGULAR';
      explanation = 'Simulated Irregular Rhythm: Controlled variable cadence (beat → beat → pause → beat → beat → pause) with synchronized conduction waveform.';
      patientExplanation = `The latest Risk Scan identified indicators associated with rhythm sensitivity (${sourceFactors.slice(0, 2).join(', ')}). The Digital Twin is displaying a simulated irregular rhythm state to illustrate conduction timing variability.`;
      break;

    case 'REDUCED_CARDIAC_FUNCTION':
      beatMode = 'WEAK';
      contractionStrength = 0.62;
      flowMode = 'REDUCED';
      highlightRegion = 'HEART';
      ecgMode = 'WEAK';
      explanation = 'Simulated Reduced Cardiac Function: Damped systolic contraction amplitude and softer ejection kinetics reflecting ventricular afterload strain.';
      patientExplanation = `The latest Risk Scan identified factors associated with elevated cardiac pumping strain (${sourceFactors.slice(0, 2).join(', ')}). The Digital Twin is displaying a simulated reduced cardiac function state with damped contraction amplitude.`;
      break;

    case 'NORMAL':
    default:
      beatMode = 'NORMAL';
      contractionStrength = 1.0;
      flowMode = 'NORMAL';
      highlightRegion = null;
      ecgMode = 'NORMAL';
      explanation = 'Simulated Digital Twin State: Normal physiological synchronization and baseline tissue perfusion.';
      patientExplanation = `The latest Risk Scan identified healthy cardiovascular parameters (${sourceFactors.slice(0, 2).join(', ')}). The Digital Twin is displaying a healthy baseline simulation.`;
      break;
  }

  return {
    condition,
    severity,
    confidence: prediction.confidenceScore || 0.95,
    beatMode,
    contractionStrength,
    flowMode,
    highlightRegion,
    ecgMode,
    sourceFactors,
    explanation,
    patientExplanation,
    isStrokeRiskElevated,
    strokeRiskNote,
    generatedAt: prediction.createdAt || new Date().toISOString(),
    isDemo: options?.isDemo || false,
    demoScenario: options?.demoScenario
  };
}

/**
 * Pre-configured Demo Scenarios for College Presentation & Demo Mode.
 * Ensures the 4 required test states can be demonstrated deterministically.
 */
export const DEMO_SCENARIOS: Record<DigitalTwinCondition, DigitalTwinSimulationState> = {
  NORMAL: {
    condition: 'NORMAL',
    severity: 'LOW',
    confidence: 0.96,
    beatMode: 'NORMAL',
    contractionStrength: 1.0,
    flowMode: 'NORMAL',
    highlightRegion: null,
    ecgMode: 'NORMAL',
    sourceFactors: [
      'Systolic Blood Pressure: 118 mmHg (Optimal)',
      'Total Cholesterol: 182 mg/dL (Healthy)',
      'Resting Heart Rate: 68 BPM (Sinus Rhythm)',
      'ECG: Normal sinus conduction'
    ],
    explanation: 'Simulated Digital Twin State: Normal synchronized rhythm and healthy hemodynamic perfusion.',
    patientExplanation: 'The latest simulated scan demonstrates optimal cardiovascular health. The Digital Twin is displaying a baseline synchronized physiological state.',
    isStrokeRiskElevated: false,
    generatedAt: new Date().toISOString(),
    isDemo: true,
    demoScenario: 'Demo Scenario 1: Normal'
  },

  CORONARY_FLOW_RISK: {
    condition: 'CORONARY_FLOW_RISK',
    severity: 'HIGH',
    confidence: 0.94,
    beatMode: 'NORMAL',
    contractionStrength: 1.0,
    flowMode: 'REDUCED',
    highlightRegion: 'CORONARY',
    ecgMode: 'NORMAL',
    sourceFactors: [
      'Elevated Coronary Atheroma Risk (+32% SHAP impact)',
      'Serum Cholesterol: 265 mg/dL (Hypercholesterolemia)',
      'Systolic Blood Pressure: 155 mmHg (Stage 2 Hypertension)',
      'Anginal Discomfort: Atypical chest tightness'
    ],
    explanation: 'Simulated Coronary Flow Risk: Localized coronary arterial highlight with restricted blood-flow particles and synchronized ventricular beat.',
    patientExplanation: 'The latest Risk Scan identified elevated coronary risk. The Digital Twin is displaying a simulated coronary-flow-risk state based on contributing factors.',
    isStrokeRiskElevated: false,
    generatedAt: new Date().toISOString(),
    isDemo: true,
    demoScenario: 'Demo Scenario 2: Coronary Flow Risk'
  },

  ARRHYTHMIA_RISK: {
    condition: 'ARRHYTHMIA_RISK',
    severity: 'MODERATE',
    confidence: 0.92,
    beatMode: 'IRREGULAR',
    contractionStrength: 0.95,
    flowMode: 'NORMAL',
    highlightRegion: null,
    ecgMode: 'IRREGULAR',
    sourceFactors: [
      'PhysioNet ECG Model: ST-T Wave Abnormality Detected',
      'Resting Heart Rate: 104 BPM (Elevated conduction rate)',
      'Sympathetic Stress Index: 8/10 (Adrenal surge)',
      'SHAP Factor: Heart Rate Variability attenuation (+28%)'
    ],
    explanation: 'Simulated Irregular Rhythm: Controlled variable beat cadence (beat → beat → pause → beat → beat → pause) with synchronized irregular ECG waveform.',
    patientExplanation: 'The latest Risk Scan identified elevated arrhythmia risk. The Digital Twin is displaying a simulated irregular rhythm state to illustrate conduction timing variability.',
    isStrokeRiskElevated: false,
    generatedAt: new Date().toISOString(),
    isDemo: true,
    demoScenario: 'Demo Scenario 3: Arrhythmia Risk'
  },

  REDUCED_CARDIAC_FUNCTION: {
    condition: 'REDUCED_CARDIAC_FUNCTION',
    severity: 'HIGH',
    confidence: 0.95,
    beatMode: 'WEAK',
    contractionStrength: 0.62,
    flowMode: 'REDUCED',
    highlightRegion: 'HEART',
    ecgMode: 'WEAK',
    sourceFactors: [
      'ECG Pattern: Left Ventricular Hypertrophy (LVH confirmed)',
      'Heart Failure Model: Elevated pumping afterload (EF ~42% est)',
      'Systolic Blood Pressure: 168/98 mmHg (Critical afterload)',
      'Sedentary Exercise Tolerance: < 1 day/wk'
    ],
    explanation: 'Simulated Reduced Cardiac Function: Damped systolic contraction amplitude (0.62x) and slower ejection kinetics with low-voltage ECG telemetry.',
    patientExplanation: 'The latest Risk Scan identified elevated heart failure / pumping compliance risk. The Digital Twin is displaying a simulated reduced cardiac function state with damped contraction amplitude.',
    isStrokeRiskElevated: true,
    strokeRiskNote: "Stroke Risk Elevated: Digital Twin is displaying cardiovascular risk context associated with the patient's stroke-risk prediction. (Neurological event - not represented as a physical blockage in the heart).",
    generatedAt: new Date().toISOString(),
    isDemo: true,
    demoScenario: 'Demo Scenario 4: Reduced Cardiac Function'
  }
};
