import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Pill,
  Clock,
  Zap,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Info,
  ShieldAlert,
  BarChart3,
  Heart,
  ChevronRight,
  Sparkles,
  Gauge,
  Plus,
  Minus,
  RefreshCw,
  Eye,
  Share2,
  Brain,
  Cpu,
  Target,
  SlidersHorizontal
} from 'lucide-react';

import ThreeHeart from '../ThreeHeart';
import LiveECGCanvas from './LiveECGCanvas';
import SimulationSummaryModal from './SimulationSummaryModal';

import {
  PhysiologicalParameters,
  PhysiologicalResponse,
  SimulationLogEntry,
  DEFAULT_PHYSIOLOGICAL_PARAMS,
  MEDICATION_PRESETS,
  HeartRhythm,
  calculatePhysiologicalResponse
} from '../../utils/cardiovascularSimulationEngine';

import { predictCardiovascularRiskML, MLPredictionResult } from '../../utils/mlCardiovascularPredictor';

export default function MedicationSimulatorView() {
  // Parameters State
  const [params, setParams] = useState<PhysiologicalParameters>(DEFAULT_PHYSIOLOGICAL_PARAMS);
  const [activeTab, setActiveTab] = useState<'medication' | 'electrolytes' | 'cardio' | 'respiratory'>('medication');

  // Playback & 1-Minute Timer State
  const [seconds, setSeconds] = useState<number>(0); // 0 to 60 seconds
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // Simulation Logs & Telemetry History
  const [logEntries, setLogEntries] = useState<SimulationLogEntry[]>([]);
  const [vitalsHistory, setVitalsHistory] = useState<
    Array<{
      second: number;
      hr: number;
      sysBP: number;
      diaBP: number;
      spo2: number;
      co: number;
    }>
  >([]);

  // Calculate current physiological response
  const physioResponse: PhysiologicalResponse = useMemo(() => {
    return calculatePhysiologicalResponse(params);
  }, [params]);

  // Real-Time ML Ensemble Inference Model & SHAP Analytics
  const mlPrediction: MLPredictionResult = useMemo(() => {
    return predictCardiovascularRiskML(params, physioResponse.ecg);
  }, [params, physioResponse.ecg]);

  // Handle 1-minute countdown timer & playback ticks
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setSeconds((prevSec) => {
          const nextSec = prevSec + 1;
          if (nextSec >= 60) {
            setIsPlaying(false);
            setShowSummaryModal(true);
            return 60;
          }
          return nextSec;
        });
      }, 1000 / speedMultiplier);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speedMultiplier]);

  // Record history snapshot every second
  useEffect(() => {
    setVitalsHistory((prev) => {
      const existing = prev.find((p) => p.second === seconds);
      if (existing) return prev;
      return [
        ...prev,
        {
          second: seconds,
          hr: physioResponse.vitals.heartRate,
          sysBP: physioResponse.vitals.systolicBP,
          diaBP: physioResponse.vitals.diastolicBP,
          spo2: physioResponse.vitals.spo2,
          co: physioResponse.vitals.cardiacOutput,
        },
      ];
    });
  }, [seconds, physioResponse.vitals]);

  // Helper to log parameter changes
  const updateParam = (
    key: keyof PhysiologicalParameters,
    value: any,
    paramName: string,
    unit: string = '',
    category: 'MEDICATION' | 'ELECTROLYTE' | 'CARDIOVASCULAR' | 'RESPIRATORY' = 'CARDIOVASCULAR'
  ) => {
    const oldValue = params[key];
    if (oldValue === value) return;

    setParams((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === 'systolicBP' || key === 'diastolicBP') {
        const sys = key === 'systolicBP' ? Number(value) : prev.systolicBP;
        const dia = key === 'diastolicBP' ? Number(value) : prev.diastolicBP;
        updated.map = Math.round((sys + 2 * dia) / 3);
      }
      return updated;
    });

    const minsStr = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secsStr = (seconds % 60).toString().padStart(2, '0');
    const timestampStr = `${minsStr}:${secsStr}`;

    const newPhysio = calculatePhysiologicalResponse({ ...params, [key]: value });
    let effectText = 'Parameter updated in physiological model.';
    if (newPhysio.activeEffects.length > 0) {
      effectText = newPhysio.activeEffects[0];
    } else if (newPhysio.warnings.length > 0) {
      effectText = newPhysio.warnings[0];
    }

    const newLog: SimulationLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: timestampStr,
      seconds,
      paramName,
      oldValue: typeof oldValue === 'number' ? oldValue : String(oldValue),
      newValue: typeof value === 'number' ? value : String(value),
      unit,
      physiologicalEffect: effectText,
      category,
      severity: newPhysio.status,
    };

    setLogEntries((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  const handleSelectMedicationPreset = (medId: string) => {
    const med = MEDICATION_PRESETS.find((m) => m.id === medId);
    if (!med) return;

    setParams((prev) => ({
      ...prev,
      selectedMedicationId: med.id,
      medicationCategory: med.category,
      dosageMg: med.defaultDoseMg,
      effectIntensity: med.id === 'none' ? 0 : 80,
    }));

    updateParam('selectedMedicationId', med.id, 'Medication Selection', med.unit, 'MEDICATION');
  };

  const handleReset = () => {
    setIsPlaying(false);
    setSeconds(0);
    setParams(DEFAULT_PHYSIOLOGICAL_PARAMS);
    setLogEntries([]);
    setVitalsHistory([]);
  };

  return (
    <div className="space-y-6 text-[#0b1c30] w-full min-w-0">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#003ec7] via-[#0052ff] to-[#3ee5fe] text-white p-5 lg:p-7 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/20 text-white font-mono-data text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-[#3ee5fe]" />
                ML-Powered Digital Twin Lab
              </span>
              <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono-data font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                XGBoost + Random Forest ML Ensemble
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-geist font-bold tracking-tight">
              Real-Time Heartbeat & Medication Laboratory
            </h1>
            <p className="text-xs text-blue-100 max-w-3xl font-inter leading-relaxed">
              Interactively adjust parameters while the heart is beating. ML models continuously predict arrhythmia risk, heart failure stress, and SHAP explainability factors in real time.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setShowSummaryModal(true)}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all backdrop-blur shadow-xs"
            >
              <BarChart3 className="h-4 w-4 text-[#3ee5fe]" />
              <span>Generate Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        {/* LEFT COLUMN: 3D Animated Heart & Status Card (Cols 3) */}
        <div className="lg:col-span-3 space-y-6 min-w-0">
          {/* Beating Heart Container */}
          <div className="bg-white border border-[#c3c5d9]/60 rounded-3xl p-5 shadow-stitch relative flex flex-col items-center justify-center min-h-[350px] overflow-hidden">
            <div className="absolute top-4 right-4 z-20">
              <span
                className={`font-mono-data text-[10px] font-bold uppercase px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-xs ${
                  physioResponse.status === 'CRITICAL'
                    ? 'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]/40 animate-pulse'
                    : physioResponse.status === 'WARNING'
                    ? 'bg-[#fffbeb] text-[#92400e] border-[#f59e0b]/40'
                    : 'bg-[#e6f4ea] text-[#005a3c] border-[#10b981]/40'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    physioResponse.status === 'CRITICAL'
                      ? 'bg-[#ba1a1a]'
                      : physioResponse.status === 'WARNING'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                {physioResponse.status}
              </span>
            </div>

            <div className="absolute top-4 left-4 z-20">
              <h3 className="text-xs font-geist font-bold text-[#0b1c30]">Simulated Heart</h3>
              <p className="text-[10px] text-[#737688] font-mono-data uppercase">
                {physioResponse.vitals.rhythm}
              </p>
            </div>

            <div className="w-full h-64 relative z-10 flex items-center justify-center">
              <ThreeHeart
                heartRate={physioResponse.vitals.heartRate}
                riskLevel={
                  physioResponse.status === 'CRITICAL'
                    ? 'CRITICAL'
                    : physioResponse.status === 'WARNING'
                    ? 'MODERATE'
                    : 'LOW'
                }
              />
            </div>

            <div className="mt-2 text-center relative z-20 space-y-1">
              <div className="inline-flex items-center space-x-2 bg-[#eff4ff] border border-[#0052ff]/20 px-4 py-1.5 rounded-full shadow-xs">
                <Heart
                  className="h-4 w-4 text-red-500 animate-bounce"
                  style={{ animationDuration: `${60 / physioResponse.vitals.heartRate}s` }}
                />
                <span className="font-geist font-bold text-lg text-[#003ec7]">
                  {physioResponse.vitals.heartRate}
                </span>
                <span className="font-mono-data text-xs text-slate-500 font-semibold">BPM</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[220px]">
                Contractility: {physioResponse.vitals.contractility}% | EF: {physioResponse.vitals.ejectionFraction}%
              </p>
            </div>
          </div>

          {/* Current Heart State Status Details */}
          <div className="bg-white border border-[#c3c5d9]/60 rounded-3xl p-5 shadow-stitch space-y-3">
            <h4 className="text-xs font-geist font-bold text-[#0b1c30] uppercase tracking-wider flex items-center justify-between">
              <span>Cardiovascular Status</span>
              <Gauge className="h-4 w-4 text-[#0052ff]" />
            </h4>

            <div
              className={`p-3.5 rounded-2xl border text-xs ${
                physioResponse.status === 'CRITICAL'
                  ? 'bg-[#ffdad6]/60 border-[#ba1a1a]/30 text-[#93000a]'
                  : physioResponse.status === 'WARNING'
                  ? 'bg-[#fffbeb] border-[#f59e0b]/30 text-[#92400e]'
                  : 'bg-[#f8f9ff] border-[#c3c5d9]/60 text-[#0b1c30]'
              }`}
            >
              <p className="font-bold text-xs">{physioResponse.statusTitle}</p>
              <p className="text-[11px] mt-1 leading-tight">{physioResponse.statusReason}</p>
            </div>

            {physioResponse.warnings.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono-data font-bold text-[#ba1a1a] uppercase tracking-wider block">
                  Active Clinical Warnings ({physioResponse.warnings.length})
                </span>
                {physioResponse.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#ffdad6]/40 border border-[#ba1a1a]/20 rounded-xl text-[11px] text-[#93000a] flex items-start space-x-2"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#ba1a1a]" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Live ECG & Real-Time ML Predictions (Cols 5) */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          {/* Live Continuous ECG Monitor */}
          <div className="bg-white border border-[#c3c5d9]/60 rounded-3xl p-5 shadow-stitch space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-[#0052ff]" />
                <h3 className="text-sm font-geist font-bold text-[#0b1c30]">
                  Live Continuous ECG Waveform
                </h3>
              </div>
              <span className="text-[10px] font-mono-data font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                REAL-TIME RHYTHM
              </span>
            </div>

            <LiveECGCanvas
              ecgParams={physioResponse.ecg}
              heartRate={physioResponse.vitals.heartRate}
              rhythm={physioResponse.vitals.rhythm}
              isBeating={true}
              height={200}
            />
          </div>

          {/* REAL-TIME MACHINE LEARNING RISK & SHAP ANALYTICS CARD */}
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#0052ff] flex items-center justify-center text-white shadow-xs">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-geist font-bold text-white uppercase tracking-wider">
                    ML Ensemble Prediction Model
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono-data">
                    {mlPrediction.modelName} • {mlPrediction.confidenceScore}% Confidence
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono-data font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                  mlPrediction.riskLevel === 'CRITICAL'
                    ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                    : mlPrediction.riskLevel === 'HIGH'
                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                }`}
              >
                ML Risk: {mlPrediction.overallRiskScore}% ({mlPrediction.riskLevel})
              </span>
            </div>

            {/* 3 Sub-Model ML Probabilities */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-mono-data block">Arrhythmia Prob</span>
                <p className="text-lg font-geist font-bold text-emerald-400 mt-0.5">
                  {mlPrediction.arrhythmiaProbability}%
                </p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: `${mlPrediction.arrhythmiaProbability}%` }} />
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-mono-data block">Heart Failure Risk</span>
                <p className="text-lg font-geist font-bold text-amber-400 mt-0.5">
                  {mlPrediction.heartFailureRisk}%
                </p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full transition-all duration-300" style={{ width: `${mlPrediction.heartFailureRisk}%` }} />
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-mono-data block">Ischemic Stress</span>
                <p className="text-lg font-geist font-bold text-cyan-400 mt-0.5">
                  {mlPrediction.ischemicStrainRisk}%
                </p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full transition-all duration-300" style={{ width: `${mlPrediction.ischemicStrainRisk}%` }} />
                </div>
              </div>
            </div>

            {/* Real-Time SHAP Feature Impact Drivers */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono-data font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Real-Time SHAP Feature Impact Weights</span>
                <span className="text-cyan-400 font-mono-data">Live Feature Importance</span>
              </span>

              {mlPrediction.shapFactors.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">No anomalous feature deviations currently pushing ML risk above baseline.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {mlPrediction.shapFactors.map((f, i) => (
                    <div key={i} className="p-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200">{f.feature}</span> ({f.value})
                        <p className="text-[10px] text-slate-400 mt-0.5">{f.explanation}</p>
                      </div>
                      <span className={`font-mono-data text-xs font-bold px-2 py-0.5 rounded ${
                        f.impact === 'PROTECTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                      }`}>
                        {f.shapValue > 0 ? `+${f.shapValue}` : f.shapValue}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ML AI Clinical Recommendation */}
            <div className="p-3 bg-[#0052ff]/20 border border-[#0052ff]/40 rounded-2xl text-xs text-blue-100 flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-[#3ee5fe] shrink-0 mt-0.5" />
              <span><strong>ML AI Guidance:</strong> {mlPrediction.mlRecommendation}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Parameter Controls (Cols 4) */}
        <div className="lg:col-span-4 bg-white border border-[#c3c5d9]/60 rounded-3xl p-5 shadow-stitch flex flex-col space-y-4 min-w-0">
          <div>
            <h3 className="text-sm font-geist font-bold text-[#0b1c30] flex items-center space-x-2 mb-3">
              <Sliders className="h-4 w-4 text-[#0052ff]" />
              <span>Live Parameter Controls</span>
            </h3>

            {/* 4 Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#f2f4f6] rounded-2xl border border-[#c3c5d9]/60 text-center">
              <button
                onClick={() => setActiveTab('medication')}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all ${
                  activeTab === 'medication'
                    ? 'bg-white text-[#0052ff] shadow-xs'
                    : 'text-[#737688] hover:text-[#0b1c30]'
                }`}
              >
                💊 Meds
              </button>
              <button
                onClick={() => setActiveTab('electrolytes')}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all ${
                  activeTab === 'electrolytes'
                    ? 'bg-white text-[#0052ff] shadow-xs'
                    : 'text-[#737688] hover:text-[#0b1c30]'
                }`}
              >
                🧪 Blood
              </button>
              <button
                onClick={() => setActiveTab('cardio')}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all ${
                  activeTab === 'cardio'
                    ? 'bg-white text-[#0052ff] shadow-xs'
                    : 'text-[#737688] hover:text-[#0b1c30]'
                }`}
              >
                ❤️ Cardio
              </button>
              <button
                onClick={() => setActiveTab('respiratory')}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all ${
                  activeTab === 'respiratory'
                    ? 'bg-white text-[#0052ff] shadow-xs'
                    : 'text-[#737688] hover:text-[#0b1c30]'
                }`}
              >
                🫁 Resp
              </button>
            </div>
          </div>

          {/* TAB 1: MEDICATION CONTROLS */}
          {activeTab === 'medication' && (
            <div className="space-y-4 overflow-y-auto max-h-[580px] xl:max-h-[620px] overscroll-contain pr-1.5 custom-scrollbar">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Cardiovascular Drug Preset
                </label>
                <select
                  value={params.selectedMedicationId}
                  onChange={(e) => handleSelectMedicationPreset(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c3c5d9] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30] focus:outline-none focus:border-[#0052ff]"
                >
                  {MEDICATION_PRESETS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dosage Slider + +/- buttons */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Medication Dosage</span>
                  <span className="text-[#0052ff] font-mono-data">{params.dosageMg} mg</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('dosageMg', Math.max(0, params.dosageMg - 5), 'Med Dosage', 'mg', 'MEDICATION')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="5"
                    value={params.dosageMg}
                    onChange={(e) => updateParam('dosageMg', Number(e.target.value), 'Med Dosage', 'mg', 'MEDICATION')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('dosageMg', Math.min(300, params.dosageMg + 5), 'Med Dosage', 'mg', 'MEDICATION')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Effect Intensity Slider + +/- buttons */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Effect Intensity</span>
                  <span className="text-[#0052ff] font-mono-data">{params.effectIntensity}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('effectIntensity', Math.max(0, params.effectIntensity - 5), 'Effect Intensity', '%', 'MEDICATION')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={params.effectIntensity}
                    onChange={(e) => updateParam('effectIntensity', Number(e.target.value), 'Effect Intensity', '%', 'MEDICATION')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('effectIntensity', Math.min(100, params.effectIntensity + 5), 'Effect Intensity', '%', 'MEDICATION')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Admin Mode & Frequency */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Frequency</label>
                  <select
                    value={params.doseFrequency}
                    onChange={(e) => updateParam('doseFrequency', e.target.value as any, 'Dose Frequency', '', 'MEDICATION')}
                    className="w-full bg-[#f8f9ff] border border-[#c3c5d9] rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="ONCE">Single Bolus</option>
                    <option value="Q12H">q12h (BID)</option>
                    <option value="Q8H">q8h (TID)</option>
                    <option value="INFUSION">Continuous IV</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Concentration</label>
                  <input
                    type="number"
                    value={params.drugConcentration}
                    onChange={(e) => updateParam('drugConcentration', Number(e.target.value), 'Concentration', 'mg/mL', 'MEDICATION')}
                    className="w-full bg-[#f8f9ff] border border-[#c3c5d9] rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Quick Drug Action Triggers */}
              <div className="space-y-2 pt-2 border-t border-[#e5eeff]">
                <span className="text-[10px] font-mono-data font-bold text-slate-500 uppercase block">Quick Medication Triggers</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSelectMedicationPreset('metoprolol')}
                    className="p-2.5 bg-[#eff4ff] hover:bg-[#e0ebff] border border-[#0052ff]/20 rounded-xl text-left text-[11px] font-bold text-[#003ec7] transition-colors"
                  >
                    + Metoprolol (Beta Block)
                  </button>
                  <button
                    onClick={() => handleSelectMedicationPreset('norepinephrine')}
                    className="p-2.5 bg-[#fffdad] hover:bg-[#fff99e] border border-amber-300 rounded-xl text-left text-[11px] font-bold text-amber-900 transition-colors"
                  >
                    + Norepinephrine (Vasopressor)
                  </button>
                  <button
                    onClick={() => handleSelectMedicationPreset('dobutamine')}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left text-[11px] font-bold text-emerald-800 transition-colors"
                  >
                    + Dobutamine (Inotrope)
                  </button>
                  <button
                    onClick={() => handleSelectMedicationPreset('nitroglycerin')}
                    className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left text-[11px] font-bold text-purple-900 transition-colors"
                  >
                    + Nitroglycerin (Vasodilator)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ELECTROLYTES & BLOOD CHEMISTRY CONTROLS */}
          {activeTab === 'electrolytes' && (
            <div className="space-y-4 overflow-y-auto max-h-[580px] xl:max-h-[620px] overscroll-contain pr-1.5 custom-scrollbar">
              {/* Potassium K+ */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Potassium (K⁺)</span>
                  <span className={`font-mono-data ${params.potassium > 5.5 || params.potassium < 3.5 ? 'text-red-600' : 'text-[#0052ff]'}`}>
                    {params.potassium.toFixed(1)} mmol/L
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('potassium', Math.max(2.0, Number((params.potassium - 0.1).toFixed(1))), 'Potassium K⁺', 'mmol/L', 'ELECTROLYTE')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="2.0"
                    max="8.0"
                    step="0.1"
                    value={params.potassium}
                    onChange={(e) => updateParam('potassium', Number(e.target.value), 'Potassium K⁺', 'mmol/L', 'ELECTROLYTE')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('potassium', Math.min(8.0, Number((params.potassium + 0.1).toFixed(1))), 'Potassium K⁺', 'mmol/L', 'ELECTROLYTE')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Calcium Ca2+ */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Calcium (Ca²⁺)</span>
                  <span className="text-[#0052ff] font-mono-data">{params.calcium.toFixed(2)} mmol/L</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('calcium', Math.max(1.0, Number((params.calcium - 0.05).toFixed(2))), 'Calcium Ca²⁺', 'mmol/L', 'ELECTROLYTE')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.05"
                    value={params.calcium}
                    onChange={(e) => updateParam('calcium', Number(e.target.value), 'Calcium Ca²⁺', 'mmol/L', 'ELECTROLYTE')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('calcium', Math.min(3.5, Number((params.calcium + 0.05).toFixed(2))), 'Calcium Ca²⁺', 'mmol/L', 'ELECTROLYTE')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Blood pH */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Blood pH</span>
                  <span className={`font-mono-data ${params.bloodPh < 7.35 ? 'text-red-600' : 'text-[#0052ff]'}`}>
                    {params.bloodPh.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('bloodPh', Math.max(6.90, Number((params.bloodPh - 0.02).toFixed(2))), 'Blood pH', '', 'ELECTROLYTE')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="6.90"
                    max="7.70"
                    step="0.02"
                    value={params.bloodPh}
                    onChange={(e) => updateParam('bloodPh', Number(e.target.value), 'Blood pH', '', 'ELECTROLYTE')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('bloodPh', Math.min(7.70, Number((params.bloodPh + 0.02).toFixed(2))), 'Blood pH', '', 'ELECTROLYTE')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Sodium & Magnesium */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Sodium (Na⁺)</label>
                  <input
                    type="number"
                    value={params.sodium}
                    onChange={(e) => updateParam('sodium', Number(e.target.value), 'Sodium Na⁺', 'mmol/L', 'ELECTROLYTE')}
                    className="w-full bg-[#f8f9ff] border border-[#c3c5d9] rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Magnesium (Mg²⁺)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={params.magnesium}
                    onChange={(e) => updateParam('magnesium', Number(e.target.value), 'Magnesium Mg²⁺', 'mmol/L', 'ELECTROLYTE')}
                    className="w-full bg-[#f8f9ff] border border-[#c3c5d9] rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Quick Electrolyte Presets */}
              <div className="space-y-2 pt-2 border-t border-[#e5eeff]">
                <span className="text-[10px] font-mono-data font-bold text-slate-500 uppercase block">Electrolyte Scenarios</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateParam('potassium', 6.2, 'Hyperkalemia Trigger', 'mmol/L', 'ELECTROLYTE')}
                    className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left text-[11px] font-bold text-purple-900 transition-colors"
                  >
                    ⚡ Hyperkalemia (6.2 K⁺)
                  </button>
                  <button
                    onClick={() => updateParam('bloodPh', 7.15, 'Acidosis Trigger', '', 'ELECTROLYTE')}
                    className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-left text-[11px] font-bold text-red-900 transition-colors"
                  >
                    ⚡ Acidosis (pH 7.15)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CARDIOVASCULAR & HEMODYNAMICS CONTROLS */}
          {activeTab === 'cardio' && (
            <div className="space-y-4 overflow-y-auto max-h-[580px] xl:max-h-[620px] overscroll-contain pr-1.5 custom-scrollbar">
              {/* Heart Rate Slider + +/- buttons */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Resting Heart Rate</span>
                  <span className="text-[#0052ff] font-mono-data">{params.heartRate} BPM</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('heartRate', Math.max(30, params.heartRate - 5), 'Heart Rate', 'BPM', 'CARDIOVASCULAR')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    step="1"
                    value={params.heartRate}
                    onChange={(e) => updateParam('heartRate', Number(e.target.value), 'Heart Rate', 'BPM', 'CARDIOVASCULAR')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('heartRate', Math.min(200, params.heartRate + 5), 'Heart Rate', 'BPM', 'CARDIOVASCULAR')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Systolic & Diastolic BP */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={params.systolicBP}
                    onChange={(e) => updateParam('systolicBP', Number(e.target.value), 'Systolic BP', 'mmHg', 'CARDIOVASCULAR')}
                    className="w-full bg-[#f8f9ff] border border-[#c3c5d9] rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={params.diastolicBP}
                    onChange={(e) => updateParam('diastolicBP', Number(e.target.value), 'Diastolic BP', 'mmHg', 'CARDIOVASCULAR')}
                    className="w-full bg-[#f8f9ff] border border-[#c3c5d9] rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Rhythm Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Heart Rhythm Pattern</label>
                <select
                  value={params.rhythm}
                  onChange={(e) => updateParam('rhythm', e.target.value as HeartRhythm, 'Heart Rhythm', '', 'CARDIOVASCULAR')}
                  className="w-full bg-[#f8f9ff] border border-[#c3c5d9] rounded-xl px-3 py-2 text-xs font-semibold text-[#0b1c30]"
                >
                  <option value="SINUS">Normal Sinus Rhythm</option>
                  <option value="BRADYCARDIA">Sinus Bradycardia</option>
                  <option value="TACHYCARDIA">Sinus Tachycardia</option>
                  <option value="ATRIAL_FIBRILLATION">Atrial Fibrillation (AFib)</option>
                  <option value="PVC">Premature Ventricular Contractions (PVCs)</option>
                  <option value="VENTRICULAR_TACHYCARDIA">Ventricular Tachycardia (V-Tach)</option>
                  <option value="VENTRICULAR_FIBRILLATION">Ventricular Fibrillation (V-Fib)</option>
                </select>
              </div>

              {/* Contractility */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Myocardial Contractility</span>
                  <span className="text-[#0052ff] font-mono-data">{params.contractility}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('contractility', Math.max(30, params.contractility - 5), 'Contractility', '%', 'CARDIOVASCULAR')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="5"
                    value={params.contractility}
                    onChange={(e) => updateParam('contractility', Number(e.target.value), 'Contractility', '%', 'CARDIOVASCULAR')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('contractility', Math.min(180, params.contractility + 5), 'Contractility', '%', 'CARDIOVASCULAR')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RESPIRATORY CONTROLS */}
          {activeTab === 'respiratory' && (
            <div className="space-y-4 overflow-y-auto max-h-[580px] xl:max-h-[620px] overscroll-contain pr-1.5 custom-scrollbar">
              {/* SpO2 */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Oxygen Saturation (SpO₂)</span>
                  <span className={`font-mono-data ${params.spo2 < 90 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {params.spo2}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('spo2', Math.max(70, params.spo2 - 1), 'SpO₂ Saturation', '%', 'RESPIRATORY')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="70"
                    max="100"
                    step="1"
                    value={params.spo2}
                    onChange={(e) => updateParam('spo2', Number(e.target.value), 'SpO₂ Saturation', '%', 'RESPIRATORY')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('spo2', Math.min(100, params.spo2 + 1), 'SpO₂ Saturation', '%', 'RESPIRATORY')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Respiratory Rate */}
              <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e5eeff]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Respiratory Rate</span>
                  <span className="text-[#0052ff] font-mono-data">{params.respiratoryRate} /min</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParam('respiratoryRate', Math.max(6, params.respiratoryRate - 1), 'Respiratory Rate', '/min', 'RESPIRATORY')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="6"
                    max="40"
                    step="1"
                    value={params.respiratoryRate}
                    onChange={(e) => updateParam('respiratoryRate', Number(e.target.value), 'Respiratory Rate', '/min', 'RESPIRATORY')}
                    className="flex-1 accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => updateParam('respiratoryRate', Math.min(40, params.respiratoryRate + 1), 'Respiratory Rate', '/min', 'RESPIRATORY')}
                    className="h-7 w-7 rounded-lg bg-white border border-[#c3c5d9] hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM PANEL: 1-Minute Timeline & Event Log Bar */}
      <div className="bg-white border border-[#c3c5d9]/60 rounded-3xl p-5 shadow-stitch space-y-4 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5eeff] pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#0052ff] font-mono-data font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-geist font-bold text-[#0b1c30] flex items-center space-x-2">
                <span>1-Minute Simulation Timeline</span>
                <span className="text-xs text-[#0052ff] font-mono-data bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')} / 01:00
                </span>
              </h4>
              <p className="text-xs text-[#737688]">
                Control simulation playback or drag the timeline scrubber to jump to any point in the 60-second window.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto flex-wrap gap-y-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-geist font-bold text-xs shadow-xs transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-[#0052ff] text-white hover:bg-[#003ec7]'
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Pause' : 'Start Simulation'}</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>

            <div className="flex items-center space-x-1 bg-[#f2f4f6] border border-[#c3c5d9]/60 rounded-xl px-2 py-1 text-xs">
              <span className="font-mono-data text-[10px] text-slate-500 font-bold uppercase mr-1">Speed:</span>
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMultiplier(spd)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono-data transition-all ${
                    speedMultiplier === spd
                      ? 'bg-[#0052ff] text-white shadow-xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="60"
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
            className="w-full accent-[#0052ff] h-2 bg-[#e5eeff] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono-data text-slate-400 font-semibold px-1">
            <span>00:00 (Start)</span>
            <span>00:15</span>
            <span>00:30 (Midpoint)</span>
            <span>00:45</span>
            <span>01:00 (End)</span>
          </div>
        </div>

        <div className="pt-2">
          <h5 className="text-xs font-geist font-bold text-[#0b1c30] uppercase tracking-wider mb-2 flex items-center space-x-2">
            <Info className="h-4 w-4 text-[#0052ff]" />
            <span>Real-Time Event & Physiological Effect Log</span>
          </h5>

          <div className="max-h-36 overflow-y-auto overscroll-contain space-y-1.5 bg-[#f8f9ff] border border-[#e5eeff] rounded-2xl p-3 custom-scrollbar">
            {logEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No parameter adjustments recorded yet. Modify sliders to trigger live events.</p>
            ) : (
              logEntries.map((log) => (
                <div key={log.id} className="text-xs flex items-center justify-between p-2.5 bg-white rounded-xl border border-[#e5eeff] shadow-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono-data text-[10px] font-bold text-[#0052ff]">[{log.timestamp}]</span>
                    <span className="font-bold text-[#0b1c30]">{log.paramName}:</span>
                    <span className="text-slate-600">{log.oldValue} → <strong className="text-[#0052ff]">{log.newValue} {log.unit}</strong></span>
                  </div>
                  <span className="text-[11px] text-slate-500 italic truncate max-w-sm ml-2">
                    ↓ {log.physiologicalEffect}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* End of 1-Minute Summary Modal */}
      <SimulationSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        initialParams={DEFAULT_PHYSIOLOGICAL_PARAMS}
        finalResponse={physioResponse}
        logEntries={logEntries}
        vitalsHistory={vitalsHistory}
      />
    </div>
  );
}
