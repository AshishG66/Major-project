import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Cpu, RefreshCw, Play, Square, ChevronDown,
  Zap, Clock, Shield, TrendingUp, Layers
} from 'lucide-react';
import { useDigitalTwinStore } from '../store/digitalTwinStore';
import StateVectorGrid from '../components/StateVectorGrid';
import MACEGauge from '../components/MACEGauge';
import TemporalTrendChart from '../components/TemporalTrendChart';
import ModelAttribution from '../components/ModelAttribution';

const PROFILES = [
  { key: 'healthy', label: 'Healthy', desc: 'Low-risk baseline' },
  { key: 'moderate_risk', label: 'Moderate Risk', desc: 'Hypertensive, elevated lipids' },
  { key: 'high_risk', label: 'High Risk', desc: 'Multiple comorbidities' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } },
};

export default function DigitalTwinPage() {
  const {
    initialized, profile, currentValues, deviations,
    history, macePrediction, simulationRunning, tick, lastUpdateTime,
    initialize, runSimulationTick, startSimulation, stopSimulation, setProfile,
  } = useDigitalTwinStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      initialize('moderate_risk');
    }
  }, [initialized, initialize]);

  // Auto-simulation: every 3 seconds = simulated 5-minute interval
  useEffect(() => {
    if (simulationRunning) {
      intervalRef.current = setInterval(() => {
        runSimulationTick();
      }, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [simulationRunning, runSimulationTick]);

  const handleProfileChange = useCallback((p: string) => {
    stopSimulation();
    setProfile(p);
  }, [stopSimulation, setProfile]);

  const handleManualUpdate = useCallback(() => {
    runSimulationTick();
  }, [runSimulationTick]);

  const lastUpdateStr = lastUpdateTime
    ? new Date(lastUpdateTime).toLocaleTimeString()
    : '—';

  if (!initialized || !macePrediction) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Cpu className="w-8 h-8 text-blue-500 animate-pulse" />
          <p className="text-sm text-slate-500">Initializing Digital Twin Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-8"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            Digital Twin Monitor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            24-dim state vector · EKF fusion · 5-min update cycle · Hybrid XGBoost–LSTM MACE predictor
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Profile selector */}
          <div className="relative">
            <select
              value={profile}
              onChange={e => handleProfileChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            >
              {PROFILES.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Manual update */}
          <button
            onClick={handleManualUpdate}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Update
          </button>

          {/* Start/Stop simulation */}
          <button
            onClick={simulationRunning ? stopSimulation : startSimulation}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              simulationRunning
                ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            {simulationRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {simulationRunning ? 'Stop' : 'Start'} Stream
          </button>
        </div>
      </motion.div>

      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          Last update: <span className="font-semibold text-slate-700">{lastUpdateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Layers className="w-3.5 h-3.5" />
          History: <span className="font-semibold text-slate-700">{history.length} / 288</span> snapshots
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Activity className="w-3.5 h-3.5" />
          Tick: <span className="font-mono font-semibold text-slate-700">#{tick}</span>
        </div>
        {simulationRunning && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-600 font-medium">Live Streaming</span>
          </div>
        )}
      </motion.div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left Column: MACE Gauge + Model Attribution */}
        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-5">
          {/* MACE Gauge Card */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">30-Day MACE Prediction</h3>
            </div>
            <MACEGauge prediction={macePrediction} />
          </div>

          {/* Model Attribution Card */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">Hybrid Model Attribution</h3>
            </div>
            <ModelAttribution prediction={macePrediction} />
          </div>
        </motion.div>

        {/* Right Column: State Vector + Temporal Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
          {/* State Vector Grid Card */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">State Vector</h3>
              <span className="text-[10px] text-slate-400 font-mono ml-auto">24 dimensions · EKF-fused</span>
            </div>
            <StateVectorGrid values={currentValues} deviations={deviations} />
          </div>

          {/* Temporal Trend Card */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">Temporal Trends</h3>
              <span className="text-[10px] text-slate-400 ml-auto">
                {history.length > 0
                  ? `${Math.round(history.length * 5 / 60)}h window · ${history.length} samples`
                  : 'No data yet'
                }
              </span>
            </div>
            <TemporalTrendChart history={history} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
