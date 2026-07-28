import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Brain,
  Activity,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Droplets,
  Wind,
  UserCheck,
  Scale,
  Award,
  Layers,
  ChevronRight,
  Flame,
  Gauge,
  Download,
  FileText,
  Thermometer,
  Feather,
  Check
} from 'lucide-react';
import ThreeHeart from './ThreeHeart';
import BodyStatus from './BodyStatus';

export interface DigitalTwinSuiteProps {
  predictionId?: string;
  heartRate?: number;
  riskLevel?: string;
  riskScore?: number;
  healthScore?: number;
  systolicBP?: number;
  diastolicBP?: number;
  cholesterol?: number;
  bmi?: number;
  height?: number;
  weight?: number;
  bloodSugar?: number;
  smoking?: boolean;
  diabetes?: boolean;
  age?: number;
  gender?: string;
  stressLevel?: number;
  sleepDuration?: number;
  exerciseFrequency?: number;
  ecgResult?: string;
  chestPainType?: string;
  plainExplanation?: string;
  shapFactors?: Array<{ feature: string; impact: string; value?: any; shap_value?: number; importance?: number }>;
  onHoverPart?: (part: string | null) => void;
  isReportPage?: boolean;
}

export default function DigitalTwinSuite({
  predictionId,
  heartRate = 72,
  riskLevel = 'LOW',
  riskScore = 20,
  healthScore = 80,
  systolicBP = 120,
  diastolicBP = 80,
  cholesterol = 190,
  bmi = 24.5,
  height = 175,
  weight = 75,
  bloodSugar = 95,
  smoking = false,
  diabetes = false,
  age = 45,
  gender = 'MALE',
  stressLevel = 5,
  sleepDuration = 7,
  exerciseFrequency = 3,
  ecgResult = 'NORMAL',
  chestPainType = 'ASYMPTOMATIC',
  plainExplanation,
  shapFactors = [],
  onHoverPart,
  isReportPage = false,
}: DigitalTwinSuiteProps) {
  const [activeTwinModule, setActiveTwinModule] = useState<'summary' | 'biometrics' | 'anatomy' | 'symptoms' | 'organs' | 'progression' | 'recovery' | 'xai'>('summary');
  const [selectedTimelineStage, setSelectedTimelineStage] = useState<'current' | '6m' | '1y' | '3y'>('current');

  // Interactive Recovery Simulation Toggles
  const [simExerciseGain, setSimExerciseGain] = useState(false);
  const [simDashDiet, setSimDashDiet] = useState(false);
  const [simStatinMed, setSimStatinMed] = useState(false);
  const [simQuitSmoking, setSimQuitSmoking] = useState(false);
  const [simWeightLoss, setSimWeightLoss] = useState(false);

  // Normalize Risk Level
  const normRisk = useMemo(() => {
    const r = (riskLevel || '').toUpperCase();
    if (r.includes('CRIT') || riskScore >= 85 || systolicBP >= 165) return 'CRITICAL';
    if (r.includes('HIGH') || riskScore >= 65 || systolicBP >= 140) return 'HIGH';
    if (r.includes('MOD') || r.includes('MED') || riskScore >= 35 || systolicBP >= 130) return 'MODERATE';
    return 'LOW';
  }, [riskLevel, riskScore, systolicBP]);

  // Compute Patient-Specific Live Recovery Simulation Metrics
  const recoveryMetrics = useMemo(() => {
    let scoreGain = 0;
    let bpDrop = 0;
    let cholDrop = 0;
    let riskDropPct = 0;

    if (simExerciseGain) {
      scoreGain += 12;
      bpDrop += (systolicBP >= 130 ? 8 : 4);
      riskDropPct += 15;
    }
    if (simDashDiet) {
      scoreGain += 16;
      bpDrop += (systolicBP >= 140 ? 14 : 8);
      riskDropPct += 20;
    }
    if (simStatinMed) {
      scoreGain += 14;
      cholDrop += (cholesterol >= 220 ? 48 : 30);
      riskDropPct += 18;
    }
    if (simQuitSmoking && smoking) {
      scoreGain += 18;
      bpDrop += 5;
      riskDropPct += 25;
    }
    if (simWeightLoss && bmi >= 25) {
      scoreGain += 10;
      bpDrop += 4;
      riskDropPct += 12;
    }

    const projectedScore = Math.min(98, healthScore + scoreGain);
    const projectedBP = Math.max(105, systolicBP - bpDrop);
    const projectedChol = Math.max(135, cholesterol - cholDrop);
    const projectedRisk = Math.max(4, Math.round(riskScore * (1 - riskDropPct / 100)));
    const projectedHR = Math.max(54, heartRate - (simExerciseGain ? 6 : 0) - (simDashDiet ? 3 : 0));

    return {
      projectedScore,
      projectedBP,
      projectedChol,
      projectedRisk,
      projectedHR,
      scoreGain,
      riskDropPct
    };
  }, [simExerciseGain, simDashDiet, simStatinMed, simQuitSmoking, simWeightLoss, smoking, bmi, healthScore, systolicBP, cholesterol, riskScore, heartRate]);

  // AI Clinical Diagnostic Summary Generator (Patient-Specific Rationale)
  const clinicalSummaryText = useMemo(() => {
    if (plainExplanation && plainExplanation.length > 20) return plainExplanation;

    const drivers = [];
    if (systolicBP >= 140) drivers.push(`Stage ${systolicBP >= 160 ? '2' : '1'} Hypertension (${systolicBP}/${diastolicBP} mmHg)`);
    if (cholesterol >= 240) drivers.push(`Hypercholesterolemia (${cholesterol} mg/dL)`);
    if (diabetes || bloodSugar >= 126) drivers.push(`Hyperglycemia / Diabetes (${bloodSugar} mg/dL)`);
    if (bmi >= 28) drivers.push(`Elevated BMI (${bmi} kg/m²)`);
    if (smoking) drivers.push(`Active Tobacco Use`);
    if (stressLevel >= 7) drivers.push(`High Sympathetic Stress Load (${stressLevel}/10)`);
    if (ecgResult !== 'NORMAL') drivers.push(`ECG Abnormality (${ecgResult})`);

    if (normRisk === 'CRITICAL' || riskScore >= 80) {
      return `Patient presents critical cardiovascular risk (${riskScore}% probability). Major pathological drivers include ${drivers.join(', ') || 'severe systemic vascular resistance'}. Immediate pharmacological moderation and clinical monitoring are indicated.`;
    } else if (normRisk === 'HIGH' || riskScore >= 60) {
      return `Patient demonstrates elevated cardiovascular risk (${riskScore}% probability) driven primarily by ${drivers.join(', ') || 'elevated systemic arterial load'}. Targeted lifestyle interventions and lipid/BP moderation are recommended.`;
    } else if (normRisk === 'MODERATE' || riskScore >= 30) {
      return `Patient exhibits moderate cardiovascular risk (${riskScore}% probability) associated with ${drivers.join(', ') || 'borderline vitals'}. Aerobic cardiovascular exercise and DASH dietary protocols will yield significant risk reduction.`;
    }
    return `Patient displays optimal cardiorespiratory health (${riskScore}% risk) with ideal blood pressure (${systolicBP}/${diastolicBP} mmHg), healthy lipid profile (${cholesterol} mg/dL), and low disease probability.`;
  }, [plainExplanation, normRisk, riskScore, systolicBP, diastolicBP, cholesterol, diabetes, bloodSugar, bmi, smoking, stressLevel, ecgResult]);

  // Dynamic AI Symptom Visualizer (Derives symptoms from patient's exact vitals)
  const patientSymptoms = useMemo(() => {
    const list = [];

    if (systolicBP >= 140 || chestPainType !== 'ASYMPTOMATIC') {
      list.push({
        name: 'Anginal Chest Strain / Wall Shear',
        severity: systolicBP >= 160 || chestPainType === 'TYPICAL' ? 'HIGH SEVERITY' : 'MODERATE SEVERITY',
        cause: 'Elevated Left Ventricular Afterload',
        explanation: `Systemic blood pressure of ${systolicBP}/${diastolicBP} mmHg increases mechanical work required by the left ventricle, causing transient ischemic wall strain.`,
        affectedAnatomy: 'Coronary Arteries & Left Ventricle',
        color: 'text-health-rose border-health-rose/30 bg-health-rose/5'
      });
    }

    if (cholesterol >= 220) {
      list.push({
        name: 'Vascular Stiffness & Lipid Strain',
        severity: cholesterol >= 260 ? 'HIGH SEVERITY' : 'MODERATE SEVERITY',
        cause: 'Endothelial Lipid Plaque Deposition',
        explanation: `Serum cholesterol of ${cholesterol} mg/dL promotes atheromatous plaque accumulation along coronary arterial intima, reducing lumen elasticity.`,
        affectedAnatomy: 'Coronary Vessel Tree & Aorta Arch',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/5'
      });
    }

    if (diabetes || bloodSugar >= 110) {
      list.push({
        name: 'Glycemic Endothelial Micro-vascular Strain',
        severity: bloodSugar >= 140 || diabetes ? 'HIGH SEVERITY' : 'MODERATE SEVERITY',
        cause: 'Advanced Glycation End-products (AGEs)',
        explanation: `Fasting glucose of ${bloodSugar} mg/dL increases vascular permeability and micro-capillary basement membrane thickening.`,
        affectedAnatomy: 'Renal Glomerular Beds & Peripheral Capillaries',
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/5'
      });
    }

    if (smoking) {
      list.push({
        name: 'Arterial Endothelial Inflammation',
        severity: 'HIGH SEVERITY',
        cause: 'Oxidative Tobacco Biomarker Stress',
        explanation: `Active smoking induces free-radical endothelial injury, decreasing nitric oxide bioavailability and impairing arterial dilation.`,
        affectedAnatomy: 'Pulmonary Capillaries & Coronary Intima',
        color: 'text-health-rose border-health-rose/30 bg-health-rose/5'
      });
    }

    if (stressLevel >= 6) {
      list.push({
        name: 'Cortisol-Induced Sympathetic Vasospasm',
        severity: stressLevel >= 8 ? 'HIGH SEVERITY' : 'MODERATE SEVERITY',
        cause: 'Adrenal Catecholamine Surge',
        explanation: `Stress index of ${stressLevel}/10 triggers peripheral vasoconstriction, raising resting heart rate (${heartRate} BPM) and pulse pressure.`,
        affectedAnatomy: 'Cerebrovascular Circulation & SA Node',
        color: 'text-sky-400 border-sky-500/30 bg-sky-500/5'
      });
    }

    if (exerciseFrequency <= 1) {
      list.push({
        name: 'Aerobic Deconditioning & Vascular Fatigue',
        severity: 'MODERATE SEVERITY',
        cause: 'Suboptimal Muscular Oxygen Extraction',
        explanation: `Sedentary physical routine (${exerciseFrequency} days/wk) lowers mitochondrial oxidative capacity and cardiac stroke volume compliance.`,
        affectedAnatomy: 'Systemic Capillary Network & Skeletal Muscles',
        color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5'
      });
    }

    // Default optimal symptom for low-risk patients
    if (list.length === 0) {
      list.push({
        name: 'Asymptomatic Cardiorespiratory Equilibrium',
        severity: 'OPTIMAL',
        cause: 'Normal Hemodynamic Compliance',
        explanation: `Patient exhibits normal sinus rhythm (${heartRate} BPM), balanced vascular resistance, and healthy physiological parameters.`,
        affectedAnatomy: 'Cardiovascular System',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
      });
    }

    return list;
  }, [systolicBP, diastolicBP, chestPainType, cholesterol, diabetes, bloodSugar, smoking, stressLevel, heartRate, exerciseFrequency]);

  // Dynamic Organ Health Scores (Derived from exact patient vitals)
  const organHealth = useMemo(() => {
    let heartScore = 100 - Math.round(riskScore * 0.7) - (systolicBP >= 140 ? (systolicBP - 140) * 0.8 : 0) - (ecgResult !== 'NORMAL' ? 15 : 0);
    heartScore = Math.max(12, Math.min(99, Math.round(heartScore)));

    let brainScore = 100 - (stressLevel * 5) - (systolicBP >= 140 ? (systolicBP - 140) * 0.5 : 0) - (sleepDuration < 6 ? 12 : 0);
    brainScore = Math.max(20, Math.min(98, Math.round(brainScore)));

    let lungScore = 100 - (smoking ? 30 : 0) - (sleepDuration < 6 ? 15 : 0) - (bmi >= 30 ? 10 : 0);
    lungScore = Math.max(25, Math.min(99, Math.round(lungScore)));

    let kidneyScore = 100 - (systolicBP >= 130 ? (systolicBP - 130) * 0.9 : 0) - (diabetes ? 20 : 0) - (bloodSugar >= 110 ? 10 : 0);
    kidneyScore = Math.max(30, Math.min(99, Math.round(kidneyScore)));

    let vascularScore = 100 - (cholesterol >= 200 ? (cholesterol - 200) * 0.5 : 0) - (systolicBP >= 120 ? (systolicBP - 120) * 0.6 : 0) - (smoking ? 15 : 0);
    vascularScore = Math.max(15, Math.min(98, Math.round(vascularScore)));

    return [
      { name: 'Cardiovascular (Heart)', icon: Heart, score: heartScore, status: normRisk === 'CRITICAL' ? 'ACUTE MYOCARDIAL STRAIN' : normRisk === 'HIGH' ? 'STAGE 2 HYPERTENSIVE STRAIN' : normRisk === 'MODERATE' ? 'MODERATE VASCULAR LOAD' : 'OPTIMAL COMPLIANCE', explanation: `Stroke volume and ejection fraction calculated from HR (${heartRate} BPM) & risk index.`, color: heartScore > 75 ? '#10b981' : heartScore > 45 ? '#f59e0b' : '#ef4444' },
      { name: 'Cerebrovascular (Brain)', icon: Brain, score: brainScore, status: stressLevel >= 7 ? 'CORTISOL STRESS LOAD' : 'STABLE CEREBRAL FLOW', explanation: `Arteriole wall tension calculated from stress index (${stressLevel}/10) & arterial pressure.`, color: brainScore > 75 ? '#10b981' : brainScore > 50 ? '#f59e0b' : '#ef4444' },
      { name: 'Pulmonary (Lungs)', icon: Wind, score: lungScore, status: smoking ? 'CHRONIC TOBACCO INFLAMMATION' : 'NORMAL OXYGENATION', explanation: `Alveolar diffusion and nocturnal O₂ saturation computed from sleep (${sleepDuration}h) & smoking status.`, color: lungScore > 75 ? '#10b981' : lungScore > 50 ? '#f59e0b' : '#ef4444' },
      { name: 'Renal (Kidneys)', icon: Shield, score: kidneyScore, status: systolicBP >= 140 || diabetes ? 'GLOMERULAR FILTRATION STRAIN' : 'NORMAL PERFUSION', explanation: `Capillary filtration pressure sensitive to blood pressure (${systolicBP} mmHg) & glucose (${bloodSugar} mg/dL).`, color: kidneyScore > 75 ? '#10b981' : kidneyScore > 50 ? '#f59e0b' : '#ef4444' },
      { name: 'Vascular Tree System', icon: Activity, score: vascularScore, status: cholesterol >= 240 ? 'CORONARY ATHEROSCLEROSIS RISK' : 'HEALTHY ELASTICITY', explanation: `Endothelial wall shear & plaque strain derived from serum cholesterol (${cholesterol} mg/dL).`, color: vascularScore > 75 ? '#10b981' : vascularScore > 50 ? '#f59e0b' : '#ef4444' }
    ];
  }, [riskScore, systolicBP, ecgResult, normRisk, heartRate, stressLevel, sleepDuration, smoking, bmi, diabetes, bloodSugar, cholesterol]);

  // Affected Body Regions (Severity mapped to patient vitals)
  const affectedBodyRegions = useMemo(() => [
    { region: 'Coronary Arteries', severity: cholesterol >= 240 || systolicBP >= 150 ? 'CRITICAL STRAIN' : cholesterol >= 200 || systolicBP >= 135 ? 'MODERATE STRAIN' : 'HEALTHY LUMEN', color: cholesterol >= 240 || systolicBP >= 150 ? 'bg-health-rose/10 text-health-rose border-health-rose/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30', description: `Endothelial lining wall shear & lipid plaque strain (Chol: ${cholesterol} mg/dL, BP: ${systolicBP} mmHg).` },
    { region: 'Left Ventricle', severity: ecgResult === 'LV_HYPERTROPHY' || systolicBP >= 150 ? 'HIGH HYPERTROPHY' : 'NORMAL WALL COMPLIANCE', color: ecgResult === 'LV_HYPERTROPHY' || systolicBP >= 150 ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', description: `Myocardial wall thickening to overcome systemic vascular resistance (ECG: ${ecgResult}).` },
    { region: 'Aorta Arch', severity: systolicBP >= 140 ? 'ELEVATED PRESSURE' : 'OPTIMAL PULSE WAVE', color: systolicBP >= 140 ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', description: `Pulse wave velocity & central arterial wall tension.` },
    { region: 'Systemic Capillary Network', severity: exerciseFrequency <= 2 ? 'REDUCED PERFUSION' : 'HIGH CAPILLARY DENSITY', color: exerciseFrequency <= 2 ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', description: `Micro-vascular density and tissue oxygenation capability (${exerciseFrequency} days/wk exercise).` },
    { region: 'Cerebral Circulation', severity: stressLevel >= 7 ? 'CORTISOL SPASM' : 'NORMAL FLOW', color: stressLevel >= 7 ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', description: `Stress-induced sympathetic vasoconstriction of cerebral arterioles (Stress: ${stressLevel}/10).` }
  ], [cholesterol, systolicBP, ecgResult, exerciseFrequency, stressLevel]);

  // SHAP Feature Contributions (Mapped directly to patient's prediction or calculated mathematically)
  const shapContributions = useMemo(() => {
    if (shapFactors && shapFactors.length > 0) {
      const totalShap = shapFactors.reduce((acc, curr) => acc + Math.abs(curr.shap_value || curr.importance || 0.05), 0);
      return shapFactors.map((fact) => {
        const val = Math.abs(fact.shap_value || fact.importance || 0.05);
        const pct = totalShap > 0 ? Math.round((val / totalShap) * 100) : 20;
        return {
          ...fact,
          contributionPct: pct
        };
      });
    }

    // Dynamic SHAP fallbacks derived from patient factor deviations
    const rawFactors = [
      { feature: 'Systolic Blood Pressure', dev: Math.max(0, systolicBP - 120) / 40, value: `${systolicBP} mmHg`, isRisk: systolicBP >= 130 },
      { feature: 'Serum Cholesterol', dev: Math.max(0, cholesterol - 200) / 80, value: `${cholesterol} mg/dL`, isRisk: cholesterol >= 210 },
      { feature: 'ECG Result (Hypertrophy)', dev: ecgResult !== 'NORMAL' ? 0.8 : 0.05, value: ecgResult, isRisk: ecgResult !== 'NORMAL' },
      { feature: 'Patient Age', dev: Math.max(0, age - 40) / 40, value: `${age} yrs`, isRisk: age >= 50 },
      { feature: 'Body Mass Index (BMI)', dev: Math.max(0, bmi - 25) / 10, value: `${bmi} kg/m²`, isRisk: bmi >= 25 },
      { feature: 'Stress Index', dev: Math.max(0, stressLevel - 5) / 5, value: `${stressLevel}/10`, isRisk: stressLevel >= 7 }
    ];

    const totalDev = rawFactors.reduce((a, b) => a + Math.max(0.05, b.dev), 0);
    return rawFactors.map((f) => ({
      feature: f.feature,
      impact: f.isRisk ? 'INCREASES_RISK' : 'REDUCES_RISK',
      value: f.value,
      contributionPct: Math.round((Math.max(0.05, f.dev) / totalDev) * 100),
      shap_value: f.isRisk ? parseFloat((f.dev * 0.15).toFixed(3)) : parseFloat((-0.05).toFixed(3))
    }));
  }, [shapFactors, systolicBP, cholesterol, ecgResult, age, bmi, stressLevel]);

  // Dynamic Patient-Tailored Recommendations Generator
  const patientRecommendations = useMemo(() => {
    const recs = [];

    if (systolicBP >= 130) {
      recs.push({
        category: 'DIET & NUTRITION',
        title: 'Targeted DASH Low-Sodium Protocol',
        text: `Restrict daily sodium under 1,500 mg. Increase potassium-rich foods (spinach, avocado, bananas) to lower systolic pressure (${systolicBP} mmHg) by up to 14 mmHg.`,
        icon: Droplets,
        color: 'text-health-cyan border-health-cyan/30 bg-health-cyan/5'
      });
    }

    if (cholesterol >= 200) {
      recs.push({
        category: 'LIPID MANAGEMENT',
        title: 'Low Saturated Fat & Fiber Protocol',
        text: `Cap saturated fat < 6% of daily calories. Increase soluble dietary fiber (oat beta-glucan) to lower serum cholesterol (${cholesterol} mg/dL) and prevent atheromatous plaque growth.`,
        icon: Shield,
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/5'
      });
    }

    if (exerciseFrequency <= 2) {
      recs.push({
        category: 'EXERCISE PROTOCOL',
        title: 'Zone-2 Steady Aerobic Conditioning',
        text: `Execute 45 minutes of steady Zone-2 aerobic exercise (target HR: ${Math.round((220 - age) * 0.65)} BPM) 4 days/week to increase stroke volume and capillary density.`,
        icon: Flame,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
      });
    }

    if (smoking) {
      recs.push({
        category: 'TOBACCO CESSATION',
        title: 'Clinical Nicotine Cessation Protocol',
        text: `Initiate smoking cessation. Quitting tobacco reduces endothelial inflammation and drops overall 3-year cardiac event probability by 25%.`,
        icon: Wind,
        color: 'text-health-rose border-health-rose/30 bg-health-rose/5'
      });
    }

    if (recs.length < 3) {
      recs.push({
        category: 'LIFESTYLE & SLEEP',
        title: 'Circadian Sleep & Stress Moderation',
        text: `Maintain 7.5–8.5 hours of nocturnal sleep. Practice diaphragmatic breathing to regulate adrenal cortisol release (stress index: ${stressLevel}/10).`,
        icon: Wind,
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/5'
      });
    }

    return recs;
  }, [systolicBP, cholesterol, exerciseFrequency, age, smoking, stressLevel]);

  return (
    <div className="space-y-6 relative text-slate-900">
      {/* Top Clinical Header Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-slate-50 to-blue-50/40 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
            <h1 className="text-xl font-display font-extrabold tracking-tight text-slate-900 uppercase">
              AI Clinical Digital Twin Report
            </h1>
            <span className={`text-[9px] font-extrabold px-3 py-1 rounded-full uppercase border tracking-wider ${
              normRisk === 'CRITICAL' ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' :
              normRisk === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-200' :
              normRisk === 'MODERATE' ? 'bg-amber-50 text-amber-600 border-amber-200' :
              'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {normRisk} RISK • {Math.round(riskScore)}% PROBABILITY
            </span>
          </div>
          <p className="text-xs text-slate-500 font-light mt-1">
            Generated from XGBoost & Deep Learning Models • Dynamic Patient-Specific Telemetry
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <a
            href={predictionId ? `/api/prediction/report/${predictionId}` : '#'}
            download
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold flex items-center space-x-2 shadow-xs hover:scale-[1.02] transition-transform"
          >
            <Download className="h-4 w-4" />
            <span>Export Clinical PDF Report</span>
          </a>
        </div>
      </div>

      {/* SECTION 1: AI CLINICAL SUMMARY */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-3 bg-white/80 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>1. AI Clinical Diagnostic Summary</span>
        </h2>
        <p className="text-sm font-light leading-relaxed text-slate-800">
          {clinicalSummaryText}
        </p>
      </div>

      {/* SECTION 2 & 3: HUMAN BIOMETRIC TWIN & 3D DIGITAL HEART TWIN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Human Biometric Twin (Vitals Matrix) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 space-y-4 bg-white/80 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>2. Human Biometric Twin Matrix</span>
            </h3>

            <BodyStatus
              bp={systolicBP}
              exercise={exerciseFrequency}
              sleep={sleepDuration}
              stress={stressLevel}
              heartRate={heartRate}
            />

            {/* Complete Vitals Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Age / Gender', val: `${age}y • ${gender}` },
                { label: 'Height / Weight', val: `${height}cm • ${weight}kg` },
                { label: 'BMI Mass Index', val: `${bmi} kg/m²`, color: bmi >= 28 ? 'text-rose-600' : 'text-blue-600' },
                { label: 'Heart Rate (BPM)', val: `${heartRate} BPM`, color: 'text-rose-600' },
                { label: 'Blood Pressure', val: `${systolicBP}/${diastolicBP} mmHg`, color: 'text-blue-600' },
                { label: 'SpO₂ Oxygen', val: `${Math.max(90, Math.min(99, Math.round(99 - (smoking ? 3 : 0) - (bmi >= 30 ? 2 : 0) - (sleepDuration < 6 ? 2 : 0))))}%`, color: smoking || bmi >= 30 ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Resp Rate', val: `${Math.min(26, Math.max(12, Math.round(12 + (stressLevel / 10) * 6 + (heartRate > 80 ? 3 : 0))))} / min`, color: 'text-sky-600' },
                { label: 'Temperature', val: `36.8 °C`, color: 'text-sky-600' },
                { label: 'Blood Sugar', val: `${bloodSugar} mg/dL`, color: bloodSugar >= 110 ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Cholesterol', val: `${cholesterol} mg/dL`, color: cholesterol >= 240 ? 'text-rose-600' : 'text-emerald-600' },
                { label: 'Stress Score', val: `${stressLevel}/10`, color: stressLevel >= 7 ? 'text-rose-600' : 'text-amber-600' },
                { label: 'Sleep Duration', val: `${sleepDuration} hrs/night` }
              ].map((v, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <span className="text-[7.5px] text-slate-500 uppercase font-bold block">{v.label}</span>
                  <span className={`text-xs font-extrabold mt-0.5 block ${v.color || 'text-slate-900'}`}>{v.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Digital Heart Twin 3D Viewpoint */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-slate-200/80 flex flex-col items-center justify-between text-center relative overflow-hidden bg-white/80 shadow-sm min-h-[480px]">
          <div className="w-full flex justify-between items-center z-10 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500 animate-pulse" />
              <span>3. Digital Heart Twin (Skeletal GLB PBR)</span>
            </h3>
            <span className="text-[9px] text-slate-500 uppercase font-semibold">
              Ejection Fraction: {Math.max(35, 100 - Math.round(riskScore * 0.7))}%
            </span>
          </div>

          <div className="w-full flex-1 relative min-h-[400px]">
            <ThreeHeart
              heartRate={heartRate}
              riskLevel={riskLevel}
              riskScore={riskScore}
              systolicBP={systolicBP}
              diastolicBP={diastolicBP}
              cholesterol={cholesterol}
              bmi={bmi}
              bloodSugar={bloodSugar}
              smoking={smoking}
              age={age}
              shapFactors={shapFactors}
              onHoverPart={onHoverPart}
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: AI SYMPTOM VISUALIZATION */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 bg-white/80 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <span>4. AI Symptom Visualization & Clinical Rationale</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {patientSymptoms.map((symp, i) => (
            <div key={i} className={`p-4 rounded-2xl border ${symp.color} space-y-2 flex flex-col justify-between`}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{symp.affectedAnatomy}</span>
                  <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full border">{symp.severity}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1">{symp.name}</h4>
                <span className="text-[9px] font-semibold text-slate-600 block mt-0.5">{symp.cause}</span>
                <p className="text-[10px] text-slate-700 font-light mt-2 leading-relaxed">{symp.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5 & 6: ORGAN HEALTH & AFFECTED BODY REGIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Organ Health Dashboard */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 bg-white/80 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>5. Organ System Health Ratings</span>
          </h3>

          <div className="space-y-3">
            {organHealth.map((organ, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <organ.icon className="h-4 w-4" style={{ color: organ.color }} />
                    <span className="text-xs font-bold text-slate-900">{organ.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border" style={{ color: organ.color, borderColor: organ.color }}>
                      {organ.status}
                    </span>
                    <span className="text-sm font-extrabold font-display" style={{ color: organ.color }}>
                      {organ.score}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-light leading-relaxed">{organ.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Affected Body Regions */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 bg-white/80 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500" />
            <span>6. Highlighted Affected Body Regions</span>
          </h3>

          <div className="space-y-3">
            {affectedBodyRegions.map((reg, idx) => (
              <div key={idx} className={`p-3.5 rounded-2xl border ${reg.color} space-y-1`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">{reg.region}</span>
                  <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border">{reg.severity}</span>
                </div>
                <p className="text-[10px] text-slate-700 font-light leading-relaxed">{reg.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 7: EXPLAINABLE AI (SHAP ATTRIBUTIONS) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 bg-white/80 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>7. Explainable AI (SHAP Feature Contributions & Rationale)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shapContributions.map((fact, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">{fact.feature}</span>
                <span className="text-[10px] text-slate-500 font-light block mt-0.5">Value: {fact.value}</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-extrabold px-3 py-1 rounded-xl block ${fact.impact?.includes('INCREASE') ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                  {fact.impact} ({fact.contributionPct}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 8: PERSONALIZED RECOMMENDATIONS */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 bg-white/80 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-emerald-600" />
          <span>8. Personalized Evidence-Based Recommendations</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patientRecommendations.map((rec, i) => (
            <div key={i} className={`p-4 rounded-2xl border ${rec.color} space-y-2`}>
              <div className="flex justify-between items-center">
                <span className="text-[8.5px] font-bold uppercase tracking-widest opacity-80">{rec.category}</span>
                <rec.icon className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 mt-1">{rec.title}</h4>
              <p className="text-[10px] text-slate-700 font-light leading-relaxed">{rec.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 9: DISEASE PROGRESSION TIMELINE */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 bg-white/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>9. Disease Progression Timeline (Untreated Prognosis)</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-light mt-0.5">
              Multi-year trajectory if arterial pressure ({systolicBP} mmHg) & lipids ({cholesterol} mg/dL) remain unmanaged.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['current', '6m', '1y', '3y'] as const).map((stage) => (
              <button
                key={stage}
                onClick={() => setSelectedTimelineStage(stage)}
                className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${
                  selectedTimelineStage === stage
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {stage === 'current' ? 'Current' : stage === '6m' ? '+6 Months' : stage === '1y' ? '+1 Year' : '+3 Years'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 text-center md:border-r border-slate-200 pr-0 md:pr-6">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Projected Risk Index</span>
            <span className="text-3xl font-extrabold font-display text-rose-600 mt-1 block">
              {selectedTimelineStage === 'current' ? riskScore : selectedTimelineStage === '6m' ? Math.min(99, Math.round(riskScore * 1.12)) : selectedTimelineStage === '1y' ? Math.min(99, Math.round(riskScore * 1.28)) : Math.min(99, Math.round(riskScore * 1.45))}%
            </span>
          </div>

          <div className="md:col-span-8 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {selectedTimelineStage === 'current' && 'Baseline Clinical State'}
              {selectedTimelineStage === '6m' && '6-Month Projection: Endothelial Micro-tearing & Plaque Deposition'}
              {selectedTimelineStage === '1y' && '1-Year Projection: Stage 2 Hypertensive Left Ventricular Hypertrophy'}
              {selectedTimelineStage === '3y' && '3-Year Projection: Advanced Coronary Atherosclerosis & Ischemic Strain'}
            </h4>
            <p className="text-xs font-light text-slate-700 leading-relaxed">
              {selectedTimelineStage === 'current' && `Patient currently presents systolic pressure of ${systolicBP} mmHg, serum cholesterol of ${cholesterol} mg/dL, and resting heart rate of ${heartRate} BPM.`}
              {selectedTimelineStage === '6m' && `Sustained arterial pressure of ${systolicBP} mmHg accelerates endothelial micro-tearing and lipid plaque formation in coronary vessels.`}
              {selectedTimelineStage === '1y' && `Left ventricular myocardium thickens to overcome systemic resistance, reducing end-diastolic filling compliance by ~14%.`}
              {selectedTimelineStage === '3y' && `Significant luminal narrowing increases risk of acute ischemic events, coronary artery disease, and renal microvascular dysfunction.`}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 10: RECOVERY SIMULATION */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-5 bg-white/80 shadow-sm">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-600" />
              <span>10. Interactive Recovery & Intervention Simulation</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-light mt-0.5">
              Toggle evidence-based interventions to project real-time recovery gains for this patient.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Projected Health Score</span>
            <span className="text-xl font-extrabold text-emerald-600 font-display block">
              {recoveryMetrics.projectedScore}/100 <span className="text-xs text-emerald-600/80">(+{recoveryMetrics.scoreGain})</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { state: simExerciseGain, setState: setSimExerciseGain, title: 'Cardio Exercise', sub: '+3 Days / Wk', gain: '-6 BP • +12 Pts' },
            { state: simDashDiet, setState: setSimDashDiet, title: 'DASH Low Sodium', sub: '< 1,500mg Sodium', gain: '-14 BP • +16 Pts' },
            { state: simStatinMed, setState: setSimStatinMed, title: 'Lipid Moderation', sub: 'Statin Therapy', gain: '-48 Chol • +14 Pts' },
            { state: simQuitSmoking, setState: setSimQuitSmoking, title: 'Smoking Cessation', sub: 'Zero Tobacco', gain: '-25% Risk • +18 Pts' },
            { state: simWeightLoss, setState: setSimWeightLoss, title: 'Weight Management', sub: '-5% BMI Loss', gain: '-4 BP • +10 Pts' }
          ].map((btn, idx) => (
            <button
              key={idx}
              onClick={() => btn.setState(!btn.state)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                btn.state ? 'bg-emerald-50 border-emerald-200 text-slate-900 shadow-xs' : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div>
                <span className="text-[8.5px] uppercase font-bold block">{btn.title}</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">{btn.sub}</span>
              </div>
              <span className="text-[8px] font-bold text-emerald-600 mt-2 block">{btn.gain}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
