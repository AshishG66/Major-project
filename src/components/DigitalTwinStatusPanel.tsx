import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Heart,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sliders,
  ShieldAlert,
  Zap,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Clock,
  FlaskConical,
} from 'lucide-react';
import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { usePredictionStore } from '../store/predictionStore';
import { DigitalTwinCondition } from '../types/digitalTwin';

export default function DigitalTwinStatusPanel() {
  const simulationState = useDigitalTwinStore((state) => state.simulationState);
  const activeDemoScenario = useDigitalTwinStore((state) => state.activeDemoScenario);
  const isDemoMode = useDigitalTwinStore((state) => state.isDemoMode);
  const setDemoScenario = useDigitalTwinStore((state) => state.setDemoScenario);

  const latestPrediction = usePredictionStore((state) => state.latestPrediction);
  const predictionHistory = usePredictionStore((state) => state.predictionHistory);

  if (!simulationState) {
    return null;
  }

  const {
    condition,
    severity,
    confidence,
    sourceFactors,
    explanation,
    patientExplanation,
    isStrokeRiskElevated,
    strokeRiskNote,
    isDemo,
  } = simulationState;

  // Extract longitudinal visits for comparison
  const curF = latestPrediction?.factors;
  const prevPrediction = predictionHistory && predictionHistory.length >= 2 ? predictionHistory[1] : null;
  const prevF = prevPrediction?.factors;

  const comparisons = [
    { name: 'Systolic Blood Pressure', cur: curF?.systolicBP, prev: prevF?.systolicBP, unit: 'mmHg', lowerIsBetter: true },
    { name: 'Diastolic Blood Pressure', cur: curF?.diastolicBP, prev: prevF?.diastolicBP, unit: 'mmHg', lowerIsBetter: true },
    { name: 'Total Cholesterol', cur: curF?.cholesterol, prev: prevF?.cholesterol, unit: 'mg/dL', lowerIsBetter: true },
    { name: 'Blood Glucose', cur: curF?.bloodSugar, prev: prevF?.bloodSugar, unit: 'mg/dL', lowerIsBetter: true },
    { name: 'Resting Heart Rate', cur: curF?.heartRate, prev: prevF?.heartRate, unit: 'bpm', lowerIsBetter: true },
    { name: 'Body Mass Index (BMI)', cur: curF?.bmi, prev: prevF?.bmi, unit: 'kg/m²', lowerIsBetter: true },
    { name: 'Cardio Risk Score', cur: latestPrediction?.riskScore, prev: prevPrediction?.riskScore, unit: '%', lowerIsBetter: true },
  ].filter(item => item.cur != null);

  // Hybrid model telemetry
  const hybridModel = latestPrediction?.hybridModel || (latestPrediction?.horizonConfidence as any)?.hybridModel;
  const hybridStatus = latestPrediction?.hybridStatus || (latestPrediction?.horizonConfidence as any)?.hybridStatus || hybridModel?.hybridStatus || 'FALLBACK_STATIC_XGBOOST';
  const isHybridActive = hybridStatus === 'HYBRID_FUSION_ACTIVE';
  const ci95 = latestPrediction?.mcConfidenceInterval95 || (latestPrediction?.horizonConfidence as any)?.mcConfidenceInterval95 || hybridModel?.uncertainty?.confidenceInterval95;
  const attentionSteps = hybridModel?.lstmBranch?.details?.temporalStepAttribution || [];

  const getConditionColor = (cond: DigitalTwinCondition) => {
    switch (cond) {
      case 'CORONARY_FLOW_RISK':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          badge: 'bg-amber-500 text-white',
          dot: 'bg-amber-500',
          highlight: 'border-amber-300',
        };
      case 'ARRHYTHMIA_RISK':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-800',
          badge: 'bg-rose-600 text-white',
          dot: 'bg-rose-500',
          highlight: 'border-rose-300',
        };
      case 'REDUCED_CARDIAC_FUNCTION':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-800',
          badge: 'bg-purple-600 text-white',
          dot: 'bg-purple-500',
          highlight: 'border-purple-300',
        };
      case 'NORMAL':
      default:
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          badge: 'bg-emerald-600 text-white',
          dot: 'bg-emerald-500',
          highlight: 'border-emerald-300',
        };
    }
  };

  const colors = getConditionColor(condition);

  const formatConditionName = (cond: DigitalTwinCondition) => {
    switch (cond) {
      case 'CORONARY_FLOW_RISK':
        return 'Coronary Flow Risk';
      case 'ARRHYTHMIA_RISK':
        return 'Arrhythmia Risk';
      case 'REDUCED_CARDIAC_FUNCTION':
        return 'Reduced Cardiac Function';
      case 'NORMAL':
      default:
        return 'Synchronized Baseline (Normal)';
    }
  };

  return (
    <div className="w-full space-y-3 text-left">
      {/* Stroke Risk Advisory Banner (Neurological - explicitly not in cardiac mesh) */}
      {isStrokeRiskElevated && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-start space-x-2.5 text-xs text-sky-900 shadow-xs"
        >
          <Info className="h-4 w-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-sky-700 block">
              Stroke Risk Elevated • Cardiovascular Context
            </span>
            <p className="text-[11px] leading-relaxed text-sky-800 font-sans">
              {strokeRiskNote ||
                "Digital Twin is displaying cardiovascular risk context associated with the patient's stroke-risk prediction. Stroke is a neurological vascular event and is not represented as an anatomical heart blockage."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Main Digital Twin Simulation Status Card */}
      <div className={`p-4 rounded-2xl border ${colors.border} ${colors.bg} shadow-stitch transition-all duration-300 relative overflow-hidden`}>
        {/* Subtle accent pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono-data uppercase tracking-widest font-extrabold text-slate-500 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Digital Twin Simulation State</span>
            </span>
            {isDemo && (
              <span className="text-[8.5px] font-mono-data font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                Demo Simulation
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-[9px] font-bold font-mono-data px-2.5 py-0.5 rounded-full uppercase tracking-wider ${colors.badge} shadow-xs flex items-center gap-1`}>
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span>Severity: {severity}</span>
            </span>
            <span className="text-[9px] font-bold font-mono-data px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/80 text-slate-700 border border-slate-200">
              {Math.round(confidence * 100)}% Confidence
            </span>
          </div>
        </div>

        {/* State Title & Simulation Mode */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[9px] font-mono-data font-bold uppercase tracking-wider text-slate-500 block">
              Active Hemodynamic State
            </span>
            <h4 className="text-base font-extrabold tracking-tight text-slate-900 mt-0.5 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${colors.dot} animate-ping`} />
              <span>{formatConditionName(condition)}</span>
            </h4>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-[9px] font-mono-data font-bold uppercase tracking-wider text-slate-500 block">
              3D Twin Hemodynamics
            </span>
            <span className="text-xs font-mono-data font-bold text-slate-800">
              Active Dynamic Cadence
            </span>
          </div>
        </div>

        {/* Primary Factors Breakdown */}
        {sourceFactors && sourceFactors.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-black/5">
            <span className="text-[9px] font-mono-data font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Primary Risk Scan Contributing Factors:
            </span>
            <ul className="space-y-1">
              {sourceFactors.slice(0, 4).map((factor, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start space-x-1.5">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Visual Simulation Mechanism */}
        <div className="mt-3 pt-2.5 border-t border-black/5">
          <span className="text-[9px] font-mono-data font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
            Simulation Visualization:
          </span>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            {explanation}
          </p>
        </div>

        {/* Patient Explanation Box */}
        <div className="mt-3 p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-blue-700 font-semibold text-[10px] uppercase font-mono-data">
            <Info className="h-3.5 w-3.5 text-blue-600" />
            <span>Why is the Digital Twin showing this state?</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans font-normal">
            {patientExplanation}
          </p>
          <span className="text-[8px] text-slate-600 block mt-1 italic">
            Visual decision-support simulation • Does not constitute an in-person medical diagnosis.
          </span>
        </div>

        {/* Demo Mode Scenario Switcher */}
        {isDemoMode && (
          <div className="mt-3 pt-3 border-t border-black/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono-data font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sliders className="h-3 w-3 text-slate-500" />
                <span>Demo State Switcher (Simulation Only)</span>
              </span>
              {activeDemoScenario && (
                <button
                  type="button"
                  onClick={() => setDemoScenario(null)}
                  className="text-[9px] font-mono-data font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 underline cursor-pointer"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Revert to Patient Scan</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'NORMAL', label: '1. Normal' },
                  { id: 'CORONARY_FLOW_RISK', label: '2. Coronary Risk' },
                  { id: 'ARRHYTHMIA_RISK', label: '3. Arrhythmia' },
                  { id: 'REDUCED_CARDIAC_FUNCTION', label: '4. Reduced Function' },
                ] as const
              ).map((sc) => {
                const isSelected = (activeDemoScenario || condition) === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setDemoScenario(sc.id)}
                    className={`px-2 py-1.5 rounded-lg text-[9.5px] font-mono-data font-bold transition-all text-center border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Longitudinal Health Trajectory & Visit-Over-Visit Changes (Objective 1) */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-stitch space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono-data">
              Longitudinal Health Trajectory & Trend Monitoring
            </span>
          </div>
          <span className="text-[10px] font-mono-data font-semibold text-slate-500">
            {prevPrediction ? '2 Historical Visits' : 'Baseline Initial Visit'}
          </span>
        </div>

        {prevPrediction ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-mono-data text-slate-500 uppercase">
                  <th className="pb-1.5 font-bold">Biomarker / Metric</th>
                  <th className="pb-1.5 font-bold">Current Visit</th>
                  <th className="pb-1.5 font-bold">Prior Visit</th>
                  <th className="pb-1.5 font-bold">Delta</th>
                  <th className="pb-1.5 font-bold text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {comparisons.map((c, i) => {
                  const delta = (c.cur != null && c.prev != null) ? Math.round((c.cur - c.prev) * 10) / 10 : null;
                  const isImproved = delta != null && (c.lowerIsBetter ? delta < 0 : delta > 0);
                  const isWorsened = delta != null && (c.lowerIsBetter ? delta > 0 : delta < 0);
                  const isStable = delta != null && Math.abs(delta) < 0.1;

                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-1.5 font-medium text-slate-800">{c.name}</td>
                      <td className="py-1.5 font-bold text-slate-900">{c.cur} {c.unit}</td>
                      <td className="py-1.5 text-slate-500">{c.prev != null ? `${c.prev} ${c.unit}` : '--'}</td>
                      <td className="py-1.5 font-mono-data text-[11px]">
                        {delta != null ? (
                          <span className={isImproved ? 'text-emerald-600 font-bold' : isWorsened ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                            {delta > 0 ? `+${delta}` : delta} {c.unit}
                          </span>
                        ) : '--'}
                      </td>
                      <td className="py-1.5 text-right font-mono-data">
                        {isImproved && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <TrendingDown className="h-3 w-3" /> Favorable
                          </span>
                        )}
                        {isWorsened && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <TrendingUp className="h-3 w-3" /> Elevated
                          </span>
                        )}
                        {isStable && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <Minus className="h-3 w-3" /> Stable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">Initial Clinical Baseline Established</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current demographic and laboratory measurements are safely stored with timestamps. Visit-over-visit delta comparisons, rate-of-change indicators, and LSTM sequential temporal attention will activate automatically upon subsequent clinic visits.
              </p>
            </div>
          </div>
        )}

        {/* Laboratory Parameters Ingestion Transparency */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-purple-600" />
            <span>Uncollected labs (HDL, LDL, Triglycerides, HbA1c, EF) tracked as <strong>Pending Diagnostic</strong> (never assumed zero).</span>
          </div>
          <span className="font-mono-data text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
            Zero Input Fabrication
          </span>
        </div>
      </div>

      {/* Hybrid XGBoost–LSTM Machine Learning Architecture Telemetry (Objective 2) */}
      <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/30 shadow-stitch space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/60 pb-2">
          <div className="flex items-center space-x-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider font-mono-data">
              Hybrid XGBoost–LSTM AI Architecture
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-mono-data font-bold px-2 py-0.5 rounded-full uppercase ${
              isHybridActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
            }`}>
              {isHybridActive ? 'Dual-Branch Fusion Active' : 'Static XGBoost Branch'}
            </span>
            {ci95 && (
              <span className="text-[9px] font-mono-data font-bold bg-white text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                MC 95% CI: [{(ci95[0] * 100).toFixed(1)}% - {(ci95[1] * 100).toFixed(1)}%]
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Branch 1: XGBoost Tabular */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] font-mono-data">Branch 1: Static XGBoost</span>
              <span className="text-[9px] font-mono-data bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                TreeSHAP Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              Models static non-linear interactions across demographic and laboratory measurements (Age, Sex, Lipids, BP, Glycemia).
            </p>
          </div>

          {/* Branch 2: LSTM Longitudinal */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] font-mono-data">Branch 2: Longitudinal LSTM</span>
              <span className={`text-[9px] font-mono-data px-1.5 py-0.5 rounded border font-bold ${
                isHybridActive ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isHybridActive ? 'Additive Attention Active' : 'Deferred (Requires >=2 visits)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              Captures sequential temporal biomarker trajectories. Test-time Monte Carlo Dropout computes genuine 95% predictive uncertainty.
            </p>
          </div>
        </div>

        {/* Temporal Attention Weight Distribution if active */}
        {attentionSteps && attentionSteps.length > 0 && (
          <div className="p-2.5 rounded-xl bg-white border border-indigo-100 space-y-1.5">
            <span className="text-[10px] font-mono-data font-bold uppercase text-indigo-900 block">
              LSTM Additive Attention Weight Allocation Across Sequential Visits:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {attentionSteps.map((step: any, idx: number) => (
                <div key={idx} className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 text-center">
                  <span className="text-[9px] font-mono-data font-bold text-indigo-600 block">
                    {step.visitTimestamp || `Visit ${step.stepIndex}`}
                  </span>
                  <span className="text-sm font-extrabold text-indigo-950 font-mono-data">
                    {step.relativeSignificance}
                  </span>
                  <span className="text-[8.5px] text-slate-500 block">Attention Weight</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Synthetic Demo Provenance Label */}
        <div className="pt-1.5 border-t border-indigo-100/60 flex items-center justify-between text-[9px] text-slate-500 font-mono-data">
          <span>Trained on parametric synthetic clinical benchmarks.</span>
          <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-bold">
            SYNTHETIC_DEMO PROVENANCE
          </span>
        </div>
      </div>
    </div>
  );
}
