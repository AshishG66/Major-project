export interface MinuteTelemetryPoint {
  minute: number; // 0 to 59
  timestamp: string; // e.g. "14:00"
  baselineHR: number; // bpm
  baselineSystolic: number; // mmHg
  baselineDiastolic: number; // mmHg
  baselineHRV: number; // ms
  baselineCardiacOutput: number; // L/min
  stSegment: number; // mV (-0.5 to +2.0)
  arrhythmiaRisk: number; // % (0-100)
}

export interface MedicatedPoint extends MinuteTelemetryPoint {
  drugConcentration: number; // ng/mL or mg/L
  simulatedHR: number;
  simulatedSystolic: number;
  simulatedDiastolic: number;
  simulatedHRV: number;
  simulatedCardiacOutput: number;
  deltaHR: number;
  deltaSystolic: number;
  therapeuticState: 'NONE' | 'SUB_THERAPEUTIC' | 'OPTIMAL' | 'HIGH' | 'TOXIC';
  warningMessage?: string;
}

export interface MedicationProfile {
  id: string;
  name: string;
  category: string;
  mechanism: string;
  defaultDoseMg: number;
  doses: {
    label: string;
    level: 'NONE' | 'LOW' | 'STANDARD' | 'HIGH' | 'TOXIC';
    doseMg: number;
    description: string;
  }[];
  halfLifeMins: number;
  peakTimeMins: number;
  ka: number; // absorption rate constant
  ke: number; // elimination rate constant
  maxHrEffect: number; // max delta HR at target dose (negative for reduction)
  maxBpEffect: number; // max delta Systolic BP at target dose
  maxHrvEffect: number; // delta HRV ms
  maxCoEffect: number; // delta Cardiac Output L/min
  therapeuticMinConc: number;
  therapeuticMaxConc: number;
  toxicConc: number;
}

export interface TelemetryDatasetProfile {
  id: string;
  title: string;
  description: string;
  patientProfile: string;
  initialCondition: string;
  data: MinuteTelemetryPoint[];
}

// Helper to format minute to clock time starting from 14:00
function formatClockTime(minuteOffset: number): string {
  const startHour = 14;
  const startMin = 0;
  const totalMins = startHour * 60 + startMin + minuteOffset;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Generate realistic pseudo-random noise around a trend
function pseudoNoise(seed: number, amplitude: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * amplitude;
}

// 1. Pre-loaded Dataset Profiles (60 Minutes continuous telemetry data)
export const PRESET_DATASETS: TelemetryDatasetProfile[] = [
  {
    id: 'HYPERTENSIVE_TACHYCARDIA',
    title: 'Hypertensive Tachycardia Episode',
    description: 'Patient experiencing acute adrenergic surge, high resting HR (105-120 bpm) and elevated blood pressure (162/102 mmHg).',
    patientProfile: '64yo Male (Amit Sharma) - Stage 2 Hypertension & Sinus Tachycardia',
    initialCondition: 'High Cardiac Workload, Risk of Myocardial Ischemia',
    data: Array.from({ length: 60 }, (_, i) => {
      const noiseHR = pseudoNoise(i, 2.5);
      const noiseBP = pseudoNoise(i + 100, 3.0);
      const trend = Math.sin((i / 60) * Math.PI * 2) * 4;
      const hr = Math.round(110 + trend + noiseHR);
      const sbp = Math.round(165 + trend * 0.8 + noiseBP);
      const dbp = Math.round(100 + trend * 0.5 + pseudoNoise(i + 200, 2.0));
      return {
        minute: i,
        timestamp: formatClockTime(i),
        baselineHR: hr,
        baselineSystolic: sbp,
        baselineDiastolic: dbp,
        baselineHRV: Math.max(12, Math.round(18 - trend * 0.5 + pseudoNoise(i + 300, 2))),
        baselineCardiacOutput: Number((6.8 + trend * 0.05 + pseudoNoise(i + 400, 0.2)).toFixed(2)),
        stSegment: Number((0.8 + (hr > 115 ? 0.4 : 0.0) + pseudoNoise(i, 0.1)).toFixed(2)),
        arrhythmiaRisk: Math.min(100, Math.max(10, Math.round(45 + trend * 2)))
      };
    })
  },
  {
    id: 'POST_MI_ANGINA',
    title: 'Post-MI Ischemic Telemetry',
    description: 'Post-Myocardial Infarction patient exhibiting angina symptoms, ST-segment fluctuations, and elevated baseline stress.',
    patientProfile: '58yo Female - Post-STEMI Recovery with Anginal Spikes',
    initialCondition: 'Coronary Vessel Vasospasm, Elevated Ventricular Strain',
    data: Array.from({ length: 60 }, (_, i) => {
      const isSpike = i >= 15 && i <= 35;
      const spikeFactor = isSpike ? Math.sin(((i - 15) / 20) * Math.PI) * 18 : 0;
      const hr = Math.round(88 + spikeFactor + pseudoNoise(i, 2.0));
      const sbp = Math.round(148 + spikeFactor * 0.9 + pseudoNoise(i + 100, 2.5));
      const dbp = Math.round(92 + spikeFactor * 0.5 + pseudoNoise(i + 200, 1.8));
      return {
        minute: i,
        timestamp: formatClockTime(i),
        baselineHR: hr,
        baselineSystolic: sbp,
        baselineDiastolic: dbp,
        baselineHRV: Math.max(10, Math.round(24 - spikeFactor * 0.4 + pseudoNoise(i + 300, 2))),
        baselineCardiacOutput: Number((5.2 - spikeFactor * 0.03 + pseudoNoise(i + 400, 0.15)).toFixed(2)),
        stSegment: Number((1.2 + spikeFactor * 0.06 + pseudoNoise(i, 0.15)).toFixed(2)),
        arrhythmiaRisk: Math.min(100, Math.max(15, Math.round(35 + spikeFactor * 2.5)))
      };
    })
  },
  {
    id: 'ACUTE_ARRHYTHMIA',
    title: 'Atrial Fibrillation / Paroxysmal Tachycardia',
    description: 'High variability telemetry with rapid ventricular response spikes and fluctuating stroke volumes.',
    patientProfile: '62yo Male - Paroxysmal Atrial Fibrillation & Palpitations',
    initialCondition: 'Erratic Atrial Conduction, Compromised Diastolic Filling',
    data: Array.from({ length: 60 }, (_, i) => {
      const wave = Math.sin(i / 3) * 12 + Math.cos(i / 7) * 8;
      const hr = Math.round(102 + wave + pseudoNoise(i, 4.0));
      const sbp = Math.round(138 + wave * 0.4 + pseudoNoise(i + 100, 3.5));
      const dbp = Math.round(86 + wave * 0.3 + pseudoNoise(i + 200, 2.5));
      return {
        minute: i,
        timestamp: formatClockTime(i),
        baselineHR: hr,
        baselineSystolic: sbp,
        baselineDiastolic: dbp,
        baselineHRV: Math.max(8, Math.round(14 + Math.abs(wave) + pseudoNoise(i + 300, 3))),
        baselineCardiacOutput: Number((4.6 + pseudoNoise(i + 400, 0.3)).toFixed(2)),
        stSegment: Number((0.4 + pseudoNoise(i, 0.2)).toFixed(2)),
        arrhythmiaRisk: Math.min(100, Math.max(30, Math.round(65 + wave * 1.5)))
      };
    })
  },
  {
    id: 'CONGESTIVE_LOAD',
    title: 'Decompensated Heart Failure Load',
    description: 'Reduced Ejection Fraction patient with elevated venous fill pressure and compensatory sinus tachycardia.',
    patientProfile: '71yo Male - Heart Failure (HFrEF, EF 32%) with Fluid Overload',
    initialCondition: 'Decreased Stroke Volume, Elevated Pulmonary Capillary Wedge Pressure',
    data: Array.from({ length: 60 }, (_, i) => {
      const hr = Math.round(96 + pseudoNoise(i, 2.0));
      const sbp = Math.round(152 + pseudoNoise(i + 100, 2.2));
      const dbp = Math.round(96 + pseudoNoise(i + 200, 1.8));
      return {
        minute: i,
        timestamp: formatClockTime(i),
        baselineHR: hr,
        baselineSystolic: sbp,
        baselineDiastolic: dbp,
        baselineHRV: Math.max(10, Math.round(16 + pseudoNoise(i + 300, 1.5))),
        baselineCardiacOutput: Number((3.8 + pseudoNoise(i + 400, 0.1)).toFixed(2)),
        stSegment: Number((0.5 + pseudoNoise(i, 0.1)).toFixed(2)),
        arrhythmiaRisk: Math.min(100, Math.max(20, Math.round(50 + pseudoNoise(i, 5))))
      };
    })
  },
  {
    id: 'NORMAL_RESTING',
    title: 'Normal Resting Baseline',
    description: 'Healthy adult resting telemetry curve for control comparison.',
    patientProfile: '35yo Healthy Subject - Resting Ergometer Baseline',
    initialCondition: 'Normal Sinus Rhythm, Balanced Autonomic Tone',
    data: Array.from({ length: 60 }, (_, i) => {
      const hr = Math.round(72 + pseudoNoise(i, 1.5));
      const sbp = Math.round(118 + pseudoNoise(i + 100, 2.0));
      const dbp = Math.round(76 + pseudoNoise(i + 200, 1.5));
      return {
        minute: i,
        timestamp: formatClockTime(i),
        baselineHR: hr,
        baselineSystolic: sbp,
        baselineDiastolic: dbp,
        baselineHRV: Math.max(25, Math.round(48 + pseudoNoise(i + 300, 4))),
        baselineCardiacOutput: Number((5.4 + pseudoNoise(i + 400, 0.15)).toFixed(2)),
        stSegment: Number((0.05 + pseudoNoise(i, 0.05)).toFixed(2)),
        arrhythmiaRisk: Math.max(2, Math.round(5 + pseudoNoise(i, 2)))
      };
    })
  }
];

// 2. Medication Profiles & PK/PD Dynamics
export const MEDICATIONS: MedicationProfile[] = [
  {
    id: 'metoprolol',
    name: 'Metoprolol Succinate (Beta-1 Blocker)',
    category: 'Beta-Adrenergic Antagonist',
    mechanism: 'Selectively blocks Beta-1 adrenergic receptors in cardiac tissue, decreasing SA node automaticity, AV node conduction, and myocardial oxygen demand.',
    defaultDoseMg: 50,
    doses: [
      { label: 'Placebo (0 mg)', level: 'NONE', doseMg: 0, description: 'No active drug administered' },
      { label: 'Low Dose (12.5 mg)', level: 'LOW', doseMg: 12.5, description: 'Mild rate control, suitable for mild hypertension' },
      { label: 'Standard Dose (50 mg)', level: 'STANDARD', doseMg: 50, description: 'Target therapeutic dose for tachycardia & hypertension' },
      { label: 'High Dose (100 mg)', level: 'HIGH', doseMg: 100, description: 'Maximum clinical therapeutic dose' },
      { label: 'Toxic / Overdose (200 mg)', level: 'TOXIC', doseMg: 200, description: 'Triggers profound bradycardia and severe hypotension' }
    ],
    halfLifeMins: 45,
    peakTimeMins: 25,
    ka: 0.12,
    ke: 0.025,
    maxHrEffect: -28,
    maxBpEffect: -18,
    maxHrvEffect: +16,
    maxCoEffect: -0.8,
    therapeuticMinConc: 15,
    therapeuticMaxConc: 65,
    toxicConc: 90
  },
  {
    id: 'nitroglycerin',
    name: 'Nitroglycerin (Sublingual Vasodilator)',
    category: 'Organic Nitrate / Vasodilator',
    mechanism: 'Releases nitric oxide (NO) causing venodilation, dramatic reduction in cardiac preload, coronary artery dilation, and myocardial workload relief.',
    defaultDoseMg: 0.4,
    doses: [
      { label: 'Placebo (0 mg)', level: 'NONE', doseMg: 0, description: 'No active drug administered' },
      { label: 'Low Dose (0.2 mg)', level: 'LOW', doseMg: 0.2, description: 'Mild venous dilation' },
      { label: 'Standard Dose (0.4 mg)', level: 'STANDARD', doseMg: 0.4, description: 'Sublingual dose for acute angina & hypertensive crisis' },
      { label: 'High Dose (0.8 mg)', level: 'HIGH', doseMg: 0.8, description: 'Potent arterial and venous dilation' },
      { label: 'Toxic / Overdose (1.6 mg)', level: 'TOXIC', doseMg: 1.6, description: 'Severe hypotension, reflex tachycardia, methemoglobinemia risk' }
    ],
    halfLifeMins: 15,
    peakTimeMins: 8,
    ka: 0.35,
    ke: 0.07,
    maxHrEffect: +6,
    maxBpEffect: -32,
    maxHrvEffect: +8,
    maxCoEffect: -0.4,
    therapeuticMinConc: 5,
    therapeuticMaxConc: 25,
    toxicConc: 40
  },
  {
    id: 'lisinopril',
    name: 'Lisinopril (ACE Inhibitor)',
    category: 'Angiotensin-Converting Enzyme Inhibitor',
    mechanism: 'Inhibits conversion of Angiotensin I to Angiotensin II, causing systemic arterial vasodilation, reduced aldosterone secretion, and decreased peripheral resistance.',
    defaultDoseMg: 10,
    doses: [
      { label: 'Placebo (0 mg)', level: 'NONE', doseMg: 0, description: 'No active drug administered' },
      { label: 'Low Dose (2.5 mg)', level: 'LOW', doseMg: 2.5, description: 'Initiation dose for renal/cardiac protection' },
      { label: 'Standard Dose (10 mg)', level: 'STANDARD', doseMg: 10, description: 'Target anti-hypertensive dose' },
      { label: 'High Dose (20 mg)', level: 'HIGH', doseMg: 20, description: 'High-potency blood pressure suppression' },
      { label: 'Toxic / Overdose (40 mg)', level: 'TOXIC', doseMg: 40, description: 'Exaggerated hypotension and hyperkalemic strain' }
    ],
    halfLifeMins: 55,
    peakTimeMins: 35,
    ka: 0.08,
    ke: 0.018,
    maxHrEffect: -4,
    maxBpEffect: -24,
    maxHrvEffect: +12,
    maxCoEffect: +0.2,
    therapeuticMinConc: 10,
    therapeuticMaxConc: 50,
    toxicConc: 75
  },
  {
    id: 'amiodarone',
    name: 'Amiodarone (Class III Antiarrhythmic)',
    category: 'Potassium Channel Blocker Antiarrhythmic',
    mechanism: 'Prolongs action potential duration and effective refractory period in cardiac myocytes; suppresses automaticity and suppresses re-entry circuits.',
    defaultDoseMg: 150,
    doses: [
      { label: 'Placebo (0 mg)', level: 'NONE', doseMg: 0, description: 'No active drug administered' },
      { label: 'Low Dose (75 mg)', level: 'LOW', doseMg: 75, description: 'Mild antiarrhythmic stabilization' },
      { label: 'Standard Dose (150 mg)', level: 'STANDARD', doseMg: 150, description: 'Standard IV loading dose for tachyarrhythmia' },
      { label: 'High Dose (300 mg)', level: 'HIGH', doseMg: 300, description: 'Rapid rhythm conversion dose' },
      { label: 'Toxic / Overdose (600 mg)', level: 'TOXIC', doseMg: 600, description: 'Severe AV block, QT prolongation, and hemodynamic collapse' }
    ],
    halfLifeMins: 60,
    peakTimeMins: 30,
    ka: 0.10,
    ke: 0.015,
    maxHrEffect: -22,
    maxBpEffect: -12,
    maxHrvEffect: +22,
    maxCoEffect: +0.3,
    therapeuticMinConc: 20,
    therapeuticMaxConc: 70,
    toxicConc: 95
  },
  {
    id: 'dobutamine',
    name: 'Dobutamine (Inotropic Agent)',
    category: 'Synthetic Sympathomimetic / Beta-1 Agonist',
    mechanism: 'Directly stimulates Beta-1 adrenergic receptors, significantly increasing myocardial contractility, stroke volume, and cardiac output.',
    defaultDoseMg: 5,
    doses: [
      { label: 'Placebo (0 mg)', level: 'NONE', doseMg: 0, description: 'No active drug administered' },
      { label: 'Low Dose (2.5 mcg/kg/min)', level: 'LOW', doseMg: 2.5, description: 'Mild inotropic support' },
      { label: 'Standard Dose (5 mcg/kg/min)', level: 'STANDARD', doseMg: 5, description: 'Optimal inotrope for decompensated heart failure' },
      { label: 'High Dose (10 mcg/kg/min)', level: 'HIGH', doseMg: 10, description: 'High-level hemodynamic boost' },
      { label: 'Toxic / Overdose (20 mcg/kg/min)', level: 'TOXIC', doseMg: 20, description: 'Dangerous tachyarrhythmias, extreme myocardial oxygen demand' }
    ],
    halfLifeMins: 20,
    peakTimeMins: 12,
    ka: 0.25,
    ke: 0.05,
    maxHrEffect: +32,
    maxBpEffect: +14,
    maxHrvEffect: -12,
    maxCoEffect: +2.4,
    therapeuticMinConc: 12,
    therapeuticMaxConc: 55,
    toxicConc: 80
  }
];

// 3. Mathematical PK/PD Simulation Function
export function simulateMedicationResponse(
  dataset: MinuteTelemetryPoint[],
  medication: MedicationProfile,
  doseLevel: 'NONE' | 'LOW' | 'STANDARD' | 'HIGH' | 'TOXIC',
  adminMinute: number // minute at which drug is given (e.g. 10)
): MedicatedPoint[] {
  const doseObj = medication.doses.find((d) => d.level === doseLevel) || medication.doses[2];
  const doseMg = doseObj.doseMg;

  let doseMultiplier = 0;
  if (doseLevel === 'LOW') doseMultiplier = 0.45;
  else if (doseLevel === 'STANDARD') doseMultiplier = 1.0;
  else if (doseLevel === 'HIGH') doseMultiplier = 1.45;
  else if (doseLevel === 'TOXIC') doseMultiplier = 2.1;

  const ka = medication.ka;
  const ke = medication.ke;

  return dataset.map((point) => {
    const t = point.minute;

    if (t < adminMinute || doseLevel === 'NONE' || doseMultiplier === 0) {
      return {
        ...point,
        drugConcentration: 0,
        simulatedHR: point.baselineHR,
        simulatedSystolic: point.baselineSystolic,
        simulatedDiastolic: point.baselineDiastolic,
        simulatedHRV: point.baselineHRV,
        simulatedCardiacOutput: point.baselineCardiacOutput,
        deltaHR: 0,
        deltaSystolic: 0,
        therapeuticState: 'NONE'
      };
    }

    const dt = t - adminMinute;

    let rawConc = 0;
    if (ka !== ke) {
      rawConc = (doseMultiplier * 80 * (ka / (ka - ke))) * (Math.exp(-ke * dt) - Math.exp(-ka * dt));
    } else {
      rawConc = doseMultiplier * 80 * ka * dt * Math.exp(-ka * dt);
    }

    const concentration = Math.max(0, Number(rawConc.toFixed(2)));

    const EC50 = 30;
    const pdFactor = concentration / (EC50 + concentration);

    const deltaHR = Math.round(medication.maxHrEffect * doseMultiplier * pdFactor);
    const deltaSys = Math.round(medication.maxBpEffect * doseMultiplier * pdFactor);
    const deltaDia = Math.round(medication.maxBpEffect * 0.6 * doseMultiplier * pdFactor);
    const deltaHRV = Math.round(medication.maxHrvEffect * doseMultiplier * pdFactor);
    const deltaCO = Number((medication.maxCoEffect * doseMultiplier * pdFactor).toFixed(2));

    const simHR = Math.max(35, Math.min(220, point.baselineHR + deltaHR));
    const simSys = Math.max(60, Math.min(230, point.baselineSystolic + deltaSys));
    const simDia = Math.max(40, Math.min(140, point.baselineDiastolic + deltaDia));
    const simHRV = Math.max(5, point.baselineHRV + deltaHRV);
    const simCO = Math.max(1.5, Number((point.baselineCardiacOutput + deltaCO).toFixed(2)));

    let therapeuticState: 'NONE' | 'SUB_THERAPEUTIC' | 'OPTIMAL' | 'HIGH' | 'TOXIC' = 'OPTIMAL';
    let warningMessage: string | undefined = undefined;

    if (concentration < medication.therapeuticMinConc) {
      therapeuticState = 'SUB_THERAPEUTIC';
    } else if (concentration >= medication.therapeuticMinConc && concentration <= medication.therapeuticMaxConc) {
      therapeuticState = 'OPTIMAL';
    } else if (concentration > medication.therapeuticMaxConc && concentration < medication.toxicConc) {
      therapeuticState = 'HIGH';
      warningMessage = 'Sub-toxic concentration: close monitoring advised.';
    } else if (concentration >= medication.toxicConc || simHR < 45 || simSys < 85 || simHR > 150) {
      therapeuticState = 'TOXIC';
      if (simHR < 45) {
        warningMessage = `CRITICAL WARNING: Severe Medication-Induced Bradycardia (${simHR} bpm)! Risk of AV block or syncope.`;
      } else if (simSys < 85) {
        warningMessage = `CRITICAL WARNING: Severe Hypotensive Shock (BP ${simSys}/${simDia} mmHg)! Risk of end-organ hypoperfusion.`;
      } else if (simHR > 150) {
        warningMessage = `CRITICAL WARNING: Tachyarrhythmia Surge (${simHR} bpm)! High myocardial infarction threat.`;
      } else {
        warningMessage = `CRITICAL WARNING: Drug Plasma Concentration (${concentration} ng/mL) exceeds toxic threshold!`;
      }
    }

    return {
      ...point,
      drugConcentration: concentration,
      simulatedHR: simHR,
      simulatedSystolic: simSys,
      simulatedDiastolic: simDia,
      simulatedHRV: simHRV,
      simulatedCardiacOutput: simCO,
      deltaHR,
      deltaSystolic: deltaSys,
      therapeuticState,
      warningMessage
    };
  });
}

// 4. Custom CSV Parser for Minute Telemetry Datasets
export function parseCustomTelemetryCSV(csvText: string): MinuteTelemetryPoint[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and 1 data row.');
  }

  const result: MinuteTelemetryPoint[] = [];
  for (let i = 1; i < lines.length && result.length < 120; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',').map((p) => p.trim());
    const minute = parseInt(parts[0], 10) || (i - 1);
    const timestamp = parts[1] || formatClockTime(minute);
    const hr = parseInt(parts[2], 10) || 75;
    const sbp = parseInt(parts[3], 10) || 120;
    const dbp = parseInt(parts[4], 10) || 80;
    const hrv = parseInt(parts[5], 10) || 35;
    const co = parseFloat(parts[6]) || 5.0;

    result.push({
      minute,
      timestamp,
      baselineHR: hr,
      baselineSystolic: sbp,
      baselineDiastolic: dbp,
      baselineHRV: hrv,
      baselineCardiacOutput: co,
      stSegment: 0.1,
      arrhythmiaRisk: 15
    });
  }

  return result;
}
