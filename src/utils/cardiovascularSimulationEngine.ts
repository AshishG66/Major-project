export type HeartRhythm =
  | 'SINUS'
  | 'BRADYCARDIA'
  | 'TACHYCARDIA'
  | 'ATRIAL_FIBRILLATION'
  | 'PVC'
  | 'VENTRICULAR_TACHYCARDIA'
  | 'VENTRICULAR_FIBRILLATION';

export type SimulationStatusLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface PhysiologicalParameters {
  // Cardiovascular
  heartRate: number; // 30 - 220 BPM
  systolicBP: number; // 60 - 220 mmHg
  diastolicBP: number; // 40 - 130 mmHg
  map: number; // Mean Arterial Pressure (computed or overridden)
  cardiacOutput: number; // L/min
  strokeVolume: number; // mL
  ejectionFraction: number; // % (20 - 75%)
  rhythm: HeartRhythm;
  hrv: number; // ms (5 - 100)
  contractility: number; // % relative (30 - 180%)
  preload: number; // mmHg (4 - 30)
  afterload: number; // mmHg (60 - 160)
  svr: number; // Systemic Vascular Resistance dyn·s/cm⁵ (600 - 2400)

  // Electrolytes & Chemistry
  potassium: number; // K⁺ mmol/L (2.0 - 8.0)
  sodium: number; // Na⁺ mmol/L (115 - 160)
  calcium: number; // Ca²⁺ mmol/L (1.0 - 3.5)
  magnesium: number; // Mg²⁺ mmol/L (0.5 - 3.0)
  chloride: number; // Cl⁻ mmol/L (85 - 120)
  bicarbonate: number; // HCO₃⁻ mmol/L (12 - 38)
  bloodGlucose: number; // mg/dL (50 - 450)
  bloodPh: number; // 6.9 - 7.7
  lactate: number; // mmol/L (0.5 - 12.0)

  // Respiratory
  spo2: number; // % (70 - 100)
  respiratoryRate: number; // breaths/min (6 - 40)
  pao2: number; // mmHg (40 - 120)
  paco2: number; // mmHg (20 - 70)
  tidalVolume: number; // mL (300 - 800)

  // Medication
  selectedMedicationId: string;
  medicationCategory: string;
  dosageMg: number;
  doseFrequency: 'ONCE' | 'Q12H' | 'Q8H' | 'INFUSION';
  adminRate: number; // mg/min or mL/h
  drugConcentration: number; // mg/mL
  effectIntensity: number; // 0 - 100%
  effectDurationMins: number; // 5 - 240 mins
}

export interface DerivedECGParams {
  prIntervalMs: number;
  qrsDurationMs: number;
  qtcIntervalMs: number;
  stElevationMv: number;
  tWaveHeightMv: number;
  uWavePresent: boolean;
  rrIntervalMs: number;
  rhythmTitle: string;
  description: string;
}

export interface PhysiologicalResponse {
  vitals: {
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    map: number;
    cardiacOutput: number;
    strokeVolume: number;
    ejectionFraction: number;
    spo2: number;
    respiratoryRate: number;
    contractility: number;
    svr: number;
    rhythm: HeartRhythm;
    hrv: number;
  };
  ecg: DerivedECGParams;
  status: SimulationStatusLevel;
  statusTitle: string;
  statusReason: string;
  warnings: string[];
  activeEffects: string[];
}

export interface SimulationLogEntry {
  id: string;
  timestamp: string; // e.g., "00:18"
  seconds: number;
  paramName: string;
  oldValue: string | number;
  newValue: string | number;
  unit?: string;
  physiologicalEffect: string;
  category: 'MEDICATION' | 'ELECTROLYTE' | 'CARDIOVASCULAR' | 'RESPIRATORY';
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

// Default baseline parameters
export const DEFAULT_PHYSIOLOGICAL_PARAMS: PhysiologicalParameters = {
  heartRate: 75,
  systolicBP: 120,
  diastolicBP: 80,
  map: 93,
  cardiacOutput: 5.2,
  strokeVolume: 70,
  ejectionFraction: 60,
  rhythm: 'SINUS',
  hrv: 35,
  contractility: 100,
  preload: 12,
  afterload: 90,
  svr: 1200,

  potassium: 4.2,
  sodium: 140,
  calcium: 2.3,
  magnesium: 0.9,
  chloride: 102,
  bicarbonate: 24,
  bloodGlucose: 95,
  bloodPh: 7.40,
  lactate: 1.1,

  spo2: 98,
  respiratoryRate: 14,
  pao2: 95,
  paco2: 40,
  tidalVolume: 500,

  selectedMedicationId: 'none',
  medicationCategory: 'NONE',
  dosageMg: 0,
  doseFrequency: 'ONCE',
  adminRate: 0,
  drugConcentration: 1,
  effectIntensity: 0,
  effectDurationMins: 60,
};

// Medication Preset Definition Catalog
export interface MedicationPreset {
  id: string;
  name: string;
  category: 'Beta Blockers' | 'Calcium-Channel Blockers' | 'Vasodilators' | 'Diuretics' | 'Antiarrhythmics' | 'Vasopressors' | 'Inotropes' | 'None';
  description: string;
  mechanism: string;
  defaultDoseMg: number;
  unit: string;
  hrDeltaMax: number; // Delta HR (bpm) at 100% effect
  sysBpDeltaMax: number; // Delta Systolic BP (mmHg)
  diaBpDeltaMax: number; // Delta Diastolic BP (mmHg)
  contractilityDeltaMax: number; // Delta Contractility (%)
  svrDeltaMax: number; // Delta SVR (dyn.s/cm5)
  prDeltaMs: number; // Delta PR Interval (ms)
  qtcDeltaMs: number; // Delta QTc Interval (ms)
  primaryEffectText: string;
}

export const MEDICATION_PRESETS: MedicationPreset[] = [
  {
    id: 'none',
    name: 'No Medication Active',
    category: 'None',
    description: 'Baseline state without pharmaceutical intervention.',
    mechanism: 'N/A',
    defaultDoseMg: 0,
    unit: 'mg',
    hrDeltaMax: 0,
    sysBpDeltaMax: 0,
    diaBpDeltaMax: 0,
    contractilityDeltaMax: 0,
    svrDeltaMax: 0,
    prDeltaMs: 0,
    qtcDeltaMs: 0,
    primaryEffectText: 'Baseline physiological equilibrium.'
  },
  {
    id: 'metoprolol',
    name: 'Metoprolol Succinate',
    category: 'Beta Blockers',
    description: 'Selective Beta-1 adrenergic blocker.',
    mechanism: 'Blocks cardiac beta-1 receptors, decreasing SA node firing and AV conduction speed.',
    defaultDoseMg: 50,
    unit: 'mg',
    hrDeltaMax: -22,
    sysBpDeltaMax: -18,
    diaBpDeltaMax: -10,
    contractilityDeltaMax: -15,
    svrDeltaMax: 50,
    prDeltaMs: 25,
    qtcDeltaMs: 0,
    primaryEffectText: 'Reduces heart rate, cardiac workload, and AV node conduction velocity.'
  },
  {
    id: 'diltiazem',
    name: 'Diltiazem (Cardizem)',
    category: 'Calcium-Channel Blockers',
    description: 'Non-dihydropyridine calcium channel blocker.',
    mechanism: 'Inhibits L-type calcium influx into cardiac myocytes and vascular smooth muscle.',
    defaultDoseMg: 30,
    unit: 'mg',
    hrDeltaMax: -18,
    sysBpDeltaMax: -16,
    diaBpDeltaMax: -12,
    contractilityDeltaMax: -18,
    svrDeltaMax: -180,
    prDeltaMs: 20,
    qtcDeltaMs: 5,
    primaryEffectText: 'Saves ventricular response rate and induces peripheral arterial vasodilation.'
  },
  {
    id: 'nitroglycerin',
    name: 'Nitroglycerin',
    category: 'Vasodilators',
    description: 'Potent organic venodilator and coronary vasodilator.',
    mechanism: 'Releases nitric oxide (NO), increasing intracellular cGMP in smooth muscle.',
    defaultDoseMg: 0.4,
    unit: 'mg',
    hrDeltaMax: 8, // Reflex tachycardia
    sysBpDeltaMax: -24,
    diaBpDeltaMax: -14,
    contractilityDeltaMax: 0,
    svrDeltaMax: -320,
    prDeltaMs: 0,
    qtcDeltaMs: 0,
    primaryEffectText: 'Significantly reduces venous preload, cardiac afterload, and myocardial O₂ demand.'
  },
  {
    id: 'furosemide',
    name: 'Furosemide (Lasix)',
    category: 'Diuretics',
    description: 'Loop diuretic targeting Na-K-2Cl symporter in loop of Henle.',
    mechanism: 'Promotes diuresis and natriuresis, lowering plasma volume.',
    defaultDoseMg: 40,
    unit: 'mg',
    hrDeltaMax: 2,
    sysBpDeltaMax: -14,
    diaBpDeltaMax: -8,
    contractilityDeltaMax: 0,
    svrDeltaMax: -80,
    prDeltaMs: 0,
    qtcDeltaMs: 0,
    primaryEffectText: 'Decreases intravascular volume, ventricular preload, and pulmonary congestion.'
  },
  {
    id: 'amiodarone',
    name: 'Amiodarone (Cordarone)',
    category: 'Antiarrhythmics',
    description: 'Class III antiarrhythmic with multi-channel blocking action.',
    mechanism: 'Prolongs cardiac action potential duration and refractory period via K+ channel block.',
    defaultDoseMg: 150,
    unit: 'mg',
    hrDeltaMax: -12,
    sysBpDeltaMax: -8,
    diaBpDeltaMax: -4,
    contractilityDeltaMax: -5,
    svrDeltaMax: -60,
    prDeltaMs: 18,
    qtcDeltaMs: 45,
    primaryEffectText: 'Suppresses atrial and ventricular ectopy, significantly lengthening QTc interval.'
  },
  {
    id: 'norepinephrine',
    name: 'Norepinephrine (Levophed)',
    category: 'Vasopressors',
    description: 'Potent Alpha-1 agonist with modest Beta-1 stimulation.',
    mechanism: 'Induces severe arterial and venous vasoconstriction while increasing cardiac contractility.',
    defaultDoseMg: 8,
    unit: 'mcg/min',
    hrDeltaMax: 5,
    sysBpDeltaMax: 35,
    diaBpDeltaMax: 22,
    contractilityDeltaMax: 20,
    svrDeltaMax: 550,
    prDeltaMs: -5,
    qtcDeltaMs: 0,
    primaryEffectText: 'Drastically elevates Mean Arterial Pressure (MAP) and systemic vascular resistance.'
  },
  {
    id: 'dobutamine',
    name: 'Dobutamine',
    category: 'Inotropes',
    description: 'Direct-acting Beta-1 adrenergic agonist.',
    mechanism: 'Enhances myocardial contractility and stroke volume with mild vasodilation.',
    defaultDoseMg: 5,
    unit: 'mcg/kg/min',
    hrDeltaMax: 18,
    sysBpDeltaMax: 12,
    diaBpDeltaMax: -4,
    contractilityDeltaMax: 45,
    svrDeltaMax: -150,
    prDeltaMs: -10,
    qtcDeltaMs: 0,
    primaryEffectText: 'Powers cardiac output, stroke volume, and ventricular ejection fraction.'
  }
];

/**
 * Calculates real-time physiological response, vitals, ECG metrics, and clinical warnings
 * based on input parameters.
 */
export function calculatePhysiologicalResponse(params: PhysiologicalParameters): PhysiologicalResponse {
  const warnings: string[] = [];
  const activeEffects: string[] = [];

  // 1. Calculate Medication Drug Effect Multiplier
  const activeMed = MEDICATION_PRESETS.find(m => m.id === params.selectedMedicationId) || MEDICATION_PRESETS[0];
  const medFraction = (params.effectIntensity / 100) * (params.dosageMg > 0 ? 1 : 0);

  const medHrDelta = activeMed.hrDeltaMax * medFraction;
  const medSysBpDelta = activeMed.sysBpDeltaMax * medFraction;
  const medDiaBpDelta = activeMed.diaBpDeltaMax * medFraction;
  const medContractilityDelta = activeMed.contractilityDeltaMax * medFraction;
  const medSvrDelta = activeMed.svrDeltaMax * medFraction;

  if (medFraction > 0.05) {
    activeEffects.push(`${activeMed.name}: ${activeMed.primaryEffectText}`);
  }

  // 2. Electrolyte Influences
  // Potassium K+
  let kHrDelta = 0;
  let kQrsDelta = 0;
  let kTwaveHeight = 0.3; // normal mV
  if (params.potassium > 5.5) {
    kTwaveHeight = 0.3 + (params.potassium - 5.5) * 0.35; // Peaked T waves
    kQrsDelta = (params.potassium - 5.5) * 18; // QRS widening
    if (params.potassium > 6.5) {
      kHrDelta = - (params.potassium - 6.5) * 12; // Bradycardia
      warnings.push(`Hyperkalemia (K⁺ ${params.potassium.toFixed(1)} mmol/L): Risk of severe conduction block & peaked T-waves.`);
      activeEffects.push('Hyperkalemia: Tall peaked T-waves & QRS complex widening.');
    } else {
      warnings.push(`Mild Hyperkalemia (K⁺ ${params.potassium.toFixed(1)} mmol/L): Peaked T-waves on ECG.`);
    }
  } else if (params.potassium < 3.5) {
    kTwaveHeight = Math.max(0.05, 0.3 - (3.5 - params.potassium) * 0.12);
    if (params.potassium < 3.0) {
      warnings.push(`Hypokalemia (K⁺ ${params.potassium.toFixed(1)} mmol/L): T-wave flattening & U-wave emergence.`);
      activeEffects.push('Hypokalemia: Flattened T-waves, ST depression, U-waves.');
    }
  }

  // Calcium Ca2+
  let qtcCalciumDelta = 0;
  if (params.calcium < 2.1) {
    qtcCalciumDelta = (2.1 - params.calcium) * 65; // Prolonged QTc
    warnings.push(`Hypocalcemia (Ca²⁺ ${params.calcium.toFixed(2)} mmol/L): Prolonged QTc interval.`);
    activeEffects.push('Hypocalcemia: Lengthens ST segment & QTc duration.');
  } else if (params.calcium > 2.6) {
    qtcCalciumDelta = - (params.calcium - 2.6) * 35; // Shortened QTc
    warnings.push(`Hypercalcemia (Ca²⁺ ${params.calcium.toFixed(2)} mmol/L): Shortened QTc interval.`);
  }

  // Acidosis pH
  let acidContractilityDelta = 0;
  if (params.bloodPh < 7.35) {
    acidContractilityDelta = - (7.35 - params.bloodPh) * 60;
    if (params.bloodPh < 7.25) {
      warnings.push(`Metabolic Acidosis (pH ${params.bloodPh.toFixed(2)}): Impaired myocardial contractility.`);
      activeEffects.push('Acidosis: Decreases myocardial responsiveness & systemic vascular tone.');
    }
  }

  // Hypoxia SpO2
  let hypoxiaHrDelta = 0;
  let hypoxiaStDelta = 0;
  if (params.spo2 < 90) {
    if (params.spo2 < 80) {
      hypoxiaHrDelta = -15; // Severe hypoxia bradycardia collapse
      hypoxiaStDelta = -0.3; // Myocardial ischemia
      warnings.push(`Severe Hypoxia (SpO₂ ${params.spo2}%): Myocardial ischemia & bradycardic collapse risk!`);
      activeEffects.push('Severe Hypoxia: ST segment depression & ischemic myocardial depression.');
    } else {
      hypoxiaHrDelta = (90 - params.spo2) * 1.5; // Reflex compensatory tachycardia
      warnings.push(`Hypoxemia (SpO₂ ${params.spo2}%): Sympathetic tachycardia compensatory drive.`);
    }
  }

  // 3. Compute Net Vitals
  let netHR = Math.round(params.heartRate + medHrDelta + kHrDelta + hypoxiaHrDelta);
  netHR = Math.max(30, Math.min(220, netHR));

  let netSysBP = Math.round(params.systolicBP + medSysBpDelta);
  netSysBP = Math.max(50, Math.min(240, netSysBP));

  let netDiaBP = Math.round(params.diastolicBP + medDiaBpDelta);
  netDiaBP = Math.max(30, Math.min(140, netDiaBP));

  const netMAP = Math.round((netSysBP + 2 * netDiaBP) / 3);

  let netContractility = Math.max(30, Math.min(180, Math.round(params.contractility + medContractilityDelta + acidContractilityDelta)));
  let netSVR = Math.max(500, Math.min(2600, Math.round(params.svr + medSvrDelta)));

  // Stroke Volume (mL) and Cardiac Output (L/min)
  const baseSV = (netContractility / 100) * (params.preload / 12) * 70;
  const netStrokeVolume = Math.round(Math.max(20, Math.min(140, baseSV)));
  const netCardiacOutput = Number(((netHR * netStrokeVolume) / 1000).toFixed(2));
  const netEjectionFraction = Math.max(20, Math.min(78, Math.round(55 * (netContractility / 100))));

  // 4. Rhythm Auto-Determination
  let netRhythm: HeartRhythm = params.rhythm;
  if (params.rhythm === 'SINUS') {
    if (netHR < 50) netRhythm = 'BRADYCARDIA';
    else if (netHR > 115) netRhythm = 'TACHYCARDIA';
  }
  if (params.potassium >= 7.6) {
    netRhythm = 'VENTRICULAR_FIBRILLATION';
  } else if (params.potassium >= 7.0 && netHR > 140) {
    netRhythm = 'VENTRICULAR_TACHYCARDIA';
  }

  // 5. ECG Morphology Computation
  const rrIntervalMs = Math.round(60000 / netHR);
  const basePR = 160 + activeMed.prDeltaMs;
  const prIntervalMs = Math.round(basePR * (80 / netHR));
  const qrsDurationMs = Math.round(85 + kQrsDelta);
  const baseQTc = 410 + activeMed.qtcDeltaMs + qtcCalciumDelta;
  const qtcIntervalMs = Math.round(baseQTc * Math.sqrt(60 / netHR));

  let stElevationMv = hypoxiaStDelta;
  if (params.potassium < 3.2) stElevationMv -= 0.15;
  if (params.heartRate > 150) stElevationMv -= 0.10;

  const tWaveHeightMv = Number(kTwaveHeight.toFixed(2));
  const uWavePresent = params.potassium < 3.2;

  // Rhythm Descriptions
  let rhythmTitle = 'Normal Sinus Rhythm';
  let rhythmDesc = 'Regular P waves followed by upright QRS complexes at normal rate.';

  switch (netRhythm) {
    case 'BRADYCARDIA':
      rhythmTitle = 'Sinus Bradycardia';
      rhythmDesc = 'Slower than normal pulse (< 50 BPM) with preserved P-QRS-T sequence.';
      break;
    case 'TACHYCARDIA':
      rhythmTitle = 'Sinus Tachycardia';
      rhythmDesc = 'Elevated pulse (> 115 BPM) driven by sympathetic tone or workload.';
      break;
    case 'ATRIAL_FIBRILLATION':
      rhythmTitle = 'Atrial Fibrillation (AFib)';
      rhythmDesc = 'Absent distinct P waves with irregular fibrillatory baselines and erratic RR intervals.';
      break;
    case 'PVC':
      rhythmTitle = 'Premature Ventricular Contractions (PVCs)';
      rhythmDesc = 'Occasional wide, premature, ectopic ventricular QRS complexes.';
      break;
    case 'VENTRICULAR_TACHYCARDIA':
      rhythmTitle = 'Ventricular Tachycardia (V-Tach)';
      rhythmDesc = 'Rapid consecutive wide monomorphic QRS waves without atrial P waves.';
      break;
    case 'VENTRICULAR_FIBRILLATION':
      rhythmTitle = 'Ventricular Fibrillation (V-Fib)';
      rhythmDesc = 'Chaotic ventricular quivering with zero functional cardiac output!';
      break;
  }

  // 6. Overall Status Evaluation
  let status: SimulationStatusLevel = 'NORMAL';
  let statusTitle = 'Normal Cardiovascular State';
  let statusReason = 'Hemodynamic and metabolic parameters within acceptable ranges.';

  if (
    netRhythm === 'VENTRICULAR_FIBRILLATION' ||
    netRhythm === 'VENTRICULAR_TACHYCARDIA' ||
    netHR < 40 ||
    netHR > 180 ||
    netSysBP < 70 ||
    netSysBP > 200 ||
    params.potassium > 6.8 ||
    params.potassium < 2.5 ||
    params.spo2 < 82 ||
    params.bloodPh < 7.15
  ) {
    status = 'CRITICAL';
    statusTitle = 'CRITICAL CARDIOVASCULAR EMERGENCY';
    if (netRhythm === 'VENTRICULAR_FIBRILLATION') statusReason = 'Ventricular Fibrillation - Zero effective cardiac output!';
    else if (netSysBP < 70) statusReason = 'Severe Cardiogenic/Hypotensive Shock (Systolic BP < 70 mmHg)';
    else if (params.potassium > 6.8) statusReason = 'Toxic Hyperkalemia with severe arrhythmia risk!';
    else if (params.spo2 < 82) statusReason = 'Critical Hypoxia (SpO₂ < 82%)';
    else statusReason = 'Extreme physiological deviation requiring immediate intervention.';
  } else if (
    netRhythm !== 'SINUS' ||
    netHR < 55 ||
    netHR > 115 ||
    netSysBP < 90 ||
    netSysBP > 150 ||
    params.potassium > 5.3 ||
    params.potassium < 3.5 ||
    params.calcium < 2.0 ||
    params.spo2 < 93 ||
    warnings.length > 0
  ) {
    status = 'WARNING';
    statusTitle = 'Physiological Stress / Warning';
    statusReason = warnings[0] || 'Cardiovascular parameters outside resting baseline limits.';
  }

  return {
    vitals: {
      heartRate: netHR,
      systolicBP: netSysBP,
      diastolicBP: netDiaBP,
      map: netMAP,
      cardiacOutput: netCardiacOutput,
      strokeVolume: netStrokeVolume,
      ejectionFraction: netEjectionFraction,
      spo2: params.spo2,
      respiratoryRate: params.respiratoryRate,
      contractility: netContractility,
      svr: netSVR,
      rhythm: netRhythm,
      hrv: params.hrv,
    },
    ecg: {
      prIntervalMs,
      qrsDurationMs,
      qtcIntervalMs,
      stElevationMv,
      tWaveHeightMv,
      uWavePresent,
      rrIntervalMs,
      rhythmTitle,
      description: rhythmDesc,
    },
    status,
    statusTitle,
    statusReason,
    warnings,
    activeEffects,
  };
}
