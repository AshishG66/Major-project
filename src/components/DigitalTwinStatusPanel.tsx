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
} from 'lucide-react';
import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { DigitalTwinCondition } from '../types/digitalTwin';

export default function DigitalTwinStatusPanel() {
  const simulationState = useDigitalTwinStore((state) => state.simulationState);
  const activeDemoScenario = useDigitalTwinStore((state) => state.activeDemoScenario);
  const isDemoMode = useDigitalTwinStore((state) => state.isDemoMode);
  const setDemoScenario = useDigitalTwinStore((state) => state.setDemoScenario);

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
    </div>
  );
}
