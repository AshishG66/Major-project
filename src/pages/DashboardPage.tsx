import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Loader2 } from 'lucide-react';
import { api } from '../services/api';

// Memoized Grid Cards
import HealthScoreCard from '../components/HealthScoreCard';
import LiveECGCard from '../components/LiveECGCard';
import RiskGaugeCard from '../components/RiskGaugeCard';
import AISummaryCard from '../components/AISummaryCard';
import TimelineCard from '../components/TimelineCard';
import RemindersCard from '../components/RemindersCard';

// Error Boundary wrapper
import ErrorBoundary from '../components/ErrorBoundary';

// Lazy-load heavier widgets to speed up initial paint & code-splitting
const ThreeHeart = lazy(() => import('../components/ThreeHeart'));
const AnalyticsTab = lazy(() => import('../components/AnalyticsTab'));
const SimulationTab = lazy(() => import('../components/SimulationTab'));
const DoctorTab = lazy(() => import('../components/DoctorTab'));

// Standard sub-components
import ThreeBackground from '../components/ThreeBackground';
import AIHealthAssistant from '../components/AIHealthAssistant';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'simulation' | 'doctor'>('analytics');

  // Selected heart part details
  const [hoveredHeartPart, setHoveredHeartPart] = useState<string | null>(null);

  // Inputs
  const [formData, setFormData] = useState({
    waterIntake: '',
    sleepHours: '',
    stepsCount: '',
    activeMins: '',
    stressLevel: '5'
  });

  const [reminderForm, setReminderForm] = useState({
    title: '',
    time: '',
    type: 'WATER',
  });

  // Queries with fine-tuned caching settings to eliminate unnecessary network traffic
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
    gcTime: 30 * 60 * 1000,
  });

  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['predictionHistory'],
    queryFn: () => api.get('/prediction/history'),
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // Cache for 2 mins
    gcTime: 10 * 60 * 1000,
  });

  const { data: remindersRes, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api.get('/reminders'),
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // Reminders are relatively static, 10 min cache
    gcTime: 30 * 60 * 1000,
  });

  // What-if Simulator state
  const [isSimActive, setIsSimActive] = useState(false);
  const [simBP, setSimBP] = useState(120);
  const [simBmi, setSimBmi] = useState(24.5);
  const [simStress, setSimStress] = useState(5);
  const [simExercise, setSimExercise] = useState(3);
  const [simSleep, setSimSleep] = useState(7.0);

  // Sync simulator values when dashboard data loads
  useEffect(() => {
    if (dash?.user) {
      const pHistory = historyRes?.history || [];
      const latestScan = pHistory[0]?.factors || {};
      setSimBP(latestScan.systolicBP || 120);
      setSimBmi(latestScan.bmi || 24.5);
      setSimStress(latestScan.stressLevel || 5);
      setSimExercise(latestScan.exerciseFrequency || 3);
      setSimSleep(latestScan.sleepDuration || 7.0);
    }
  }, [dash, historyRes]);

  // Mutations
  const logMutation = useMutation({
    mutationFn: (body: typeof formData) => api.post('/lifestyle', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['lifestyleLogs'] });
      setLogModalOpen(false);
      setFormData({ waterIntake: '', sleepHours: '', stepsCount: '', activeMins: '', stressLevel: '5' });
    }
  });

  const reminderMutation = useMutation({
    mutationFn: (body: typeof reminderForm) => api.post('/reminders', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setReminderModalOpen(false);
      setReminderForm({ title: '', time: '', type: 'WATER' });
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const risk = dash?.cardioRisk;
  const originalScore = dash?.healthScore || 0;
  const summary = dash?.lifestyleSummary;
  const history = historyRes?.history || [];
  const reminders = remindersRes?.reminders || [];

  // Compute what-if simulation results
  let simulatedScore = originalScore;
  let simulatedRisk = risk?.riskLevel || 'UNSCANNED';

  if (isSimActive) {
    let scoreVal = 100;
    if (simBP > 120) scoreVal -= (simBP - 120) * 0.75;
    if (simBP < 90) scoreVal -= (90 - simBP) * 0.3;
    if (simBmi > 25) scoreVal -= (simBmi - 25) * 2.2;
    scoreVal -= (simStress - 1) * 3.2;
    if (simExercise < 3) scoreVal -= (3 - simExercise) * 5;
    else scoreVal += (simExercise - 3) * 1.5;
    if (simSleep < 7) scoreVal -= (7 - simSleep) * 4;

    simulatedScore = Math.max(10, Math.min(100, Math.round(scoreVal)));

    if (simBP >= 155 || simBmi >= 30 || simStress >= 8) {
      simulatedRisk = 'HIGH';
    } else if (simBP >= 130 || simBmi >= 26 || simStress >= 6 || simSleep < 6) {
      simulatedRisk = 'MODERATE';
    } else {
      simulatedRisk = 'LOW';
    }
  }

  // Calculate dynamic Heart Rate and Glow Intensity for R3F Heart component
  const simulatedHR = Math.max(50, Math.min(140, Math.round(
    (dash?.predictions?.[0]?.factors?.heartRate || 72) + (simStress - 5) * 5 - (simExercise - 3) * 3
  )));
  const glowIntensity = simStress >= 8 ? 2.2 : simStress >= 6 ? 1.5 : 0.8;

  // Compute dynamic SHAP contributions for waterfall visualization
  const shapBP = simBP > 120 ? (simBP - 120) * 0.45 : (simBP - 120) * 0.2;
  const shapStress = (simStress - 5) * 1.4;
  const shapExercise = (3 - simExercise) * 1.8;
  const shapSleep = (7 - simSleep) * 1.6;
  const shapBmi = simBmi > 25 ? (simBmi - 25) * 1.25 : 0;

  const shapWaterfall = useMemo(() => [
    { name: 'Systolic BP Impact', value: Number(shapBP.toFixed(1)), color: shapBP > 0 ? 'bg-health-rose' : 'bg-health-emerald' },
    { name: 'Stress Load Weight', value: Number(shapStress.toFixed(1)), color: shapStress > 0 ? 'bg-health-rose' : 'bg-health-emerald' },
    { name: 'Exercise Target Deficiency', value: Number(shapExercise.toFixed(1)), color: shapExercise > 0 ? 'bg-health-rose' : 'bg-health-emerald' },
    { name: 'Sleep Deficiency Index', value: Number(shapSleep.toFixed(1)), color: shapSleep > 0 ? 'bg-health-rose' : 'bg-health-emerald' },
    { name: 'BMI Mass Factor', value: Number(shapBmi.toFixed(1)), color: shapBmi > 0 ? 'bg-health-rose' : 'bg-health-emerald' }
  ], [shapBP, shapStress, shapExercise, shapSleep, shapBmi]);

  // Prepend simulated check event to timeline in real-time
  const simulatedEvent = isSimActive ? {
    id: 'simulated-active-check',
    createdAt: new Date().toISOString(),
    riskLevel: simulatedRisk,
    healthScore: simulatedScore,
    plainExplanation: `Active What-If simulation scan check in progress. Telemetry inputs: Systolic pressure ${simBP} mmHg, exercise logged at ${simExercise} days/week, stress load rated at ${simStress}/10, and sleep duration averages ${simSleep} hours. SHAP attribution weights updated dynamically.`
  } : null;

  const displayHistory = useMemo(() => simulatedEvent ? [simulatedEvent, ...history] : history, [simulatedEvent, history]);

  const getHeartPartExplanation = (part: string) => {
    switch (part) {
      case 'Ventricles':
        return 'Left & Right Ventricles: Propels blood to lungs and body. Stroke volume is affected by physical exercise.';
      case 'Aorta':
        return 'Aorta: Main artery distributing oxygen-rich blood. High pressure leads to vascular wall strain (hypertension).';
      case 'Pulmonary Artery':
        return 'Pulmonary Artery: Carries oxygen-poor blood to the lungs for gas exchange. Influenced by sleep duration.';
      case 'Vena Cava':
        return 'Vena Cava: Returns deoxygenated blood to the heart. Rate scales with rest states.';
      default:
        return '';
    }
  };

  // Animated Countup State
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = simulatedScore;
    if (start === end) {
      setDisplayScore(end);
      return;
    }
    const duration = 800;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const timer = setInterval(() => {
      current += increment;
      setDisplayScore(current);
      if (current === end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 8));
    return () => clearInterval(timer);
  }, [simulatedScore]);

  const weeklyAISummary = useMemo(() => {
    const actRisk = isSimActive ? simulatedRisk : (risk?.riskLevel || 'UNSCANNED');
    if (actRisk === 'HIGH') {
      return "🚨 HridyaAI WARNING: Stage 2 Hypertension indicators active. Vascular strain is evaluated as critical. DASH diet constraints (sodium < 1,500mg) must be maintained daily. Avoid isometric heavy weights; transition to mild walking logs.";
    } else if (actRisk === 'MODERATE') {
      return "⚠️ HridyaAI AUDIT: Moderate strain logged, primarily driven by high cortisol metrics (stress 8/10) and low sleep averages (5.8h). Target mindfulness breathing cycles and log 30-min steady aerobic walks 3 times weekly.";
    } else if (actRisk === 'LOW') {
      return "✅ HridyaAI STATUS: Healthy cardiorespiratory indices maintained. Ideal blood pressure (118 mmHg) and regular exercise logs (5 days/wk) keep cardiac compliance high. Keep up the high physical standards.";
    }
    return "Scan vitals in the prediction wizard to generate an automated cardiac AI diagnostic review.";
  }, [isSimActive, simulatedRisk, risk]);

  // Recharts Trends Mappings
  const bpChartData = useMemo(() => history.slice().reverse().map((item: any) => ({
    date: new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    systolic: item.factors?.systolicBP || 120,
    diastolic: item.factors?.diastolicBP || 80,
  })), [history]);

  const bmiChartData = useMemo(() => history.slice().reverse().map((item: any) => ({
    date: new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.factors?.bmi || 24,
  })), [history]);

  const cholChartData = useMemo(() => history.slice().reverse().map((item: any) => ({
    date: new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.factors?.cholesterol || 190,
  })), [history]);

  // Radar Chart Data
  const radarData = useMemo(() => [
    { subject: 'BP Stability', value: Math.max(10, 100 - Math.abs(simBP - 120) * 1.5) },
    { subject: 'Sleep Hygiene', value: Math.min(100, (simSleep / 8) * 100) },
    { subject: 'Exercise Freq', value: Math.min(100, (simExercise / 5) * 100) },
    { subject: 'Cholesterol', value: Math.max(10, 100 - Math.abs(simBP > 120 ? simBP - 120 : 0)) },
    { subject: 'BMI Rating', value: Math.max(10, 100 - Math.abs(simBmi - 22) * 5) },
    { subject: 'Stress Control', value: (11 - simStress) * 10 }
  ], [simBP, simSleep, simExercise, simBmi, simStress]);

  // Speedometer angle
  const needleAngle = (simulatedScore / 100) * 180 - 90;

  // Concentric rings progress values
  const pctWater = Math.min(100, ((summary?.water || 0) / 3.0) * 100);
  const pctSteps = Math.min(100, ((summary?.steps || 0) / 10000) * 100);
  const pctActive = Math.min(100, ((summary?.activeMins || 0) / 30) * 100);
  const pctSleep = Math.min(100, ((summary?.sleep || 7) / 8.0) * 100);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    logMutation.mutate(formData);
  }

  function handleReminderSubmit(e: React.FormEvent) {
    e.preventDefault();
    reminderMutation.mutate(reminderForm);
  }

  // Memoize callback hooks to prevent child card component re-renders
  const onAddReminderClick = useCallback(() => {
    setReminderModalOpen(true);
  }, []);

  const onDeleteReminderClick = useCallback((id: string) => {
    deleteReminderMutation.mutate(id);
  }, [deleteReminderMutation]);

  return (
    <div className="space-y-6 relative">
      <Suspense fallback={<div className="absolute inset-0 bg-transparent" />}>
        <ThreeBackground />
      </Suspense>

      {/* Global Floating AI Health Assistant Panel */}
      <AIHealthAssistant />

      {/* ROW 1 & 2: Health Score, 3D Heart centerpiece, Risk Gauge, ECG, AI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Column: Health Score & ECG */}
        <div className="flex flex-col gap-6">
          <HealthScoreCard
            dashLoading={dashLoading}
            simulatedScore={simulatedScore}
            displayScore={displayScore}
          />

          <LiveECGCard
            historyLoading={historyLoading}
            simulatedHR={simulatedHR}
          />
        </div>

        {/* Center Column: 3D Heart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-between text-center relative overflow-hidden bg-gradient-to-br from-health-card via-black/10 to-black/30 h-[664px] border-health-blue/20">
          <span className="absolute top-3 left-3 text-[9px] uppercase font-bold text-health-blue tracking-wider flex items-center gap-1 z-10">
            <Heart className="h-3 w-3 text-health-rose animate-pulse" />
            <span>Interactive Digital Twin Centerpiece</span>
          </span>
          
          <div className="w-full max-w-[600px] max-h-[600px] aspect-square relative z-0 flex items-center justify-center mx-auto my-auto">
            <Suspense fallback={
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 text-health-cyan animate-spin" />
                <p className="text-[10px] text-health-textMuted uppercase font-bold tracking-widest">Loading 3D Anatomy Model...</p>
              </div>
            }>
              <ThreeHeart heartRate={simulatedHR} glowIntensity={glowIntensity} onHoverPart={setHoveredHeartPart} />
            </Suspense>
          </div>

          <div className="w-full relative z-10 px-2 min-h-[50px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {hoveredHeartPart ? (
                <motion.div
                  key={hoveredHeartPart}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-2 rounded bg-black/60 border border-white/10 text-[9px] text-health-cyan flex items-start space-x-1.5 justify-center leading-relaxed"
                >
                  <span>{getHeartPartExplanation(hoveredHeartPart)}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="default-rhythm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-0.5 text-center"
                >
                  <span className="text-[14px] font-bold text-white tracking-wide block">
                    {simulatedHR} BPM
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-health-textMuted font-bold block">
                    {simulatedHR >= 100 ? 'Tachycardia / Elevated Rhythm' : simulatedHR <= 55 ? 'Bradycardia / Slow Rhythm' : 'Normal Sinus Rhythm'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span className="text-[7.5px] text-health-textMuted uppercase font-semibold pointer-events-none z-10">
            Hover components to isolate chambers & vessels
          </span>
        </div>

        {/* Right Column: Risk Gauge & AI Summary */}
        <div className="flex flex-col gap-6">
          <RiskGaugeCard
            dashLoading={dashLoading}
            simulatedScore={simulatedScore}
            simulatedRisk={simulatedRisk}
            needleAngle={needleAngle}
          />

          <AISummaryCard
            dashLoading={dashLoading}
            weeklyAISummary={weeklyAISummary}
          />
        </div>

      </div>

      {/* ROW 3: Timeline & Reminders (Split 2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <TimelineCard
          historyLoading={historyLoading}
          displayHistory={displayHistory}
        />

        <RemindersCard
          remindersLoading={remindersLoading}
          reminders={reminders}
          onAddClick={onAddReminderClick}
          onDeleteClick={onDeleteReminderClick}
        />
      </div>

      {/* ROW 4: TAB BAR AND DYNAMIC CLINICAL VIEWS */}
      <div className="border-t border-white/5 pt-8 mt-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Deep Clinical Diagnostics & Portal Tabs</h3>
            <p className="text-xxs text-health-textMuted leading-relaxed font-light">Interactive model validation parameters, predictive What-If analytics, care notes, and family records.</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start md:self-auto">
            {(['analytics', 'simulation', 'doctor'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === tab 
                    ? 'bg-gradient-to-r from-health-blue to-health-cyan text-white shadow-glow' 
                    : 'text-health-textMuted hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENTS (LAZY-LOADED PROGRESSIVELY WITH ISOLATED ERROR BOUNDARIES) */}
        <Suspense fallback={
          <div className="h-48 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 text-health-cyan animate-spin" />
            <p className="text-[10px] text-health-textMuted uppercase font-bold tracking-widest">Loading Tab Components...</p>
          </div>
        }>
          <AnimatePresence mode="wait">
            {activeTab === 'analytics' && (
              <ErrorBoundary>
                <AnalyticsTab
                  bpChartData={bpChartData}
                  bmiChartData={bmiChartData}
                  cholChartData={cholChartData}
                  radarData={radarData}
                  shapWaterfall={shapWaterfall}
                  pctSteps={pctSteps}
                  pctActive={pctActive}
                  pctWater={pctWater}
                  pctSleep={pctSleep}
                  simBmi={simBmi}
                  dash={dash}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'simulation' && (
              <ErrorBoundary>
                <SimulationTab
                  isSimActive={isSimActive}
                  setIsSimActive={setIsSimActive}
                  simBP={simBP}
                  setSimBP={setSimBP}
                  simBmi={simBmi}
                  setSimBmi={setSimBmi}
                  simStress={simStress}
                  setSimStress={setSimStress}
                  simExercise={simExercise}
                  setSimExercise={setSimExercise}
                  simSleep={simSleep}
                  setSimSleep={setSimSleep}
                  simulatedHR={simulatedHR}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'doctor' && (
              <ErrorBoundary>
                <DoctorTab dash={dash} />
              </ErrorBoundary>
            )}
          </AnimatePresence>
        </Suspense>
      </div>

      {/* Logging habits Modal */}
      <AnimatePresence>
        {logModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div onClick={() => setLogModalOpen(false)} className="absolute inset-0 bg-black opacity-50" />
            <div className="w-full max-w-md glass-panel-glow p-6 rounded-2xl border-white/10 relative z-10">
              <h3 className="font-display font-bold text-base mb-4 border-b border-white/5 pb-3">Log Daily Habits</h3>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Water Intake (Liters)</label>
                  <input type="number" step="0.1" name="waterIntake" value={formData.waterIntake} onChange={handleInputChange} placeholder="e.g. 1.0" className="w-full px-3 py-2 text-xs glass-input" required />
                </div>
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Steps Count</label>
                  <input type="number" name="stepsCount" value={formData.stepsCount} onChange={handleInputChange} placeholder="e.g. 5000" className="w-full px-3 py-2 text-xs glass-input" required />
                </div>
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Active Exercise (Minutes)</label>
                  <input type="number" name="activeMins" value={formData.activeMins} onChange={handleInputChange} placeholder="e.g. 30" className="w-full px-3 py-2 text-xs glass-input" required />
                </div>
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Sleep Duration (Hours)</label>
                  <input type="number" step="0.5" name="sleepHours" value={formData.sleepHours} onChange={handleInputChange} placeholder="e.g. 8" className="w-full px-3 py-2 text-xs glass-input" required />
                </div>
                <div className="flex space-x-3 pt-3">
                  <button type="button" onClick={() => setLogModalOpen(false)} className="flex-1 py-2 text-xs border border-white/5 bg-white/5 rounded-xl">Cancel</button>
                  <button type="submit" disabled={logMutation.isPending} className="flex-1 py-2 text-xs font-semibold bg-gradient-to-r from-health-blue to-health-cyan rounded-xl hover:shadow-glow flex items-center justify-center">
                    {logMutation.isPending ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Save Logs</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Smart Cardiac Reminders Modal */}
      <AnimatePresence>
        {reminderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div onClick={() => setReminderModalOpen(false)} className="absolute inset-0 bg-black opacity-50" />
            <div className="w-full max-w-md glass-panel-glow p-6 rounded-2xl border-white/10 relative z-10">
              <h3 className="font-display font-bold text-base mb-4 border-b border-white/5 pb-3">Add Smart Alarm Reminder</h3>
              <form onSubmit={handleReminderSubmit} className="space-y-4">
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Reminder Title</label>
                  <input type="text" name="title" value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} placeholder="e.g. Consume Atorvastatin Pill" className="w-full px-3 py-2 text-xs glass-input" required />
                </div>
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Alert Time</label>
                  <input type="time" name="time" value={reminderForm.time} onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })} className="w-full px-3 py-2 text-xs glass-input" required />
                </div>
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Reminder Category</label>
                  <select name="type" value={reminderForm.type} onChange={(e) => setReminderForm({ ...reminderForm, type: e.target.value })} className="w-full px-3 py-2 text-xs bg-health-dark border border-white/10 rounded-xl focus:outline-none" required>
                    <option value="WATER">Water / Hydration Goal</option>
                    <option value="MEDICINE">Medicine / Pharmacological Pill</option>
                    <option value="EXERCISE">Exercise / Cardio Routine</option>
                  </select>
                </div>
                <div className="flex space-x-3 pt-3">
                  <button type="button" onClick={() => setReminderModalOpen(false)} className="flex-1 py-2 text-xs border border-white/5 bg-white/5 rounded-xl">Cancel</button>
                  <button type="submit" disabled={reminderMutation.isPending} className="flex-1 py-2 text-xs font-semibold bg-gradient-to-r from-health-blue to-health-cyan rounded-xl hover:shadow-glow flex items-center justify-center">
                    {reminderMutation.isPending ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Schedule Alert</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
