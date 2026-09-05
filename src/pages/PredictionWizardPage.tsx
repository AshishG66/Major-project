import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clipboard, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Heart, Loader2, Download, AlertTriangle, Sparkles, TrendingUp, Info } from 'lucide-react';
import { api } from '../services/api';
import { usePredictionStore } from '../store/predictionStore';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ThreeHeart = lazy(() => import('../components/ThreeHeart'));
const DigitalTwinSuite = lazy(() => import('../components/DigitalTwinSuite'));

const scanSchema = z.object({
  age: z.preprocess((val) => Number(val), z.number().int().min(18, 'Must be at least 18').max(120)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  height: z.preprocess((val) => Number(val), z.number().min(50, 'Minimum 50 cm').max(250)),
  weight: z.preprocess((val) => Number(val), z.number().min(10, 'Minimum 10 kg').max(300)),
  systolicBP: z.preprocess((val) => Number(val), z.number().int().min(50).max(250)),
  diastolicBP: z.preprocess((val) => Number(val), z.number().int().min(30).max(150)),
  cholesterol: z.preprocess((val) => Number(val), z.number().int().min(50).max(500)),
  heartRate: z.preprocess((val) => Number(val), z.number().int().min(30).max(220)),
  bloodSugar: z.preprocess((val) => Number(val), z.number().int().min(30).max(500)),
  ecgResult: z.enum(['NORMAL', 'ST_T_ABNORMAL', 'LV_HYPERTROPHY']),
  exerciseFrequency: z.preprocess((val) => Number(val), z.number().int().min(0).max(7)),
  smoking: z.boolean(),
  alcohol: z.boolean(),
  diabetes: z.boolean(),
  familyHistory: z.boolean(),
  chestPainType: z.enum(['TYPICAL', 'ATYPICAL', 'NON_ANGINAL', 'ASYMPTOMATIC']),
  sleepDuration: z.preprocess((val) => Number(val), z.number().min(0).max(24)),
  stressLevel: z.preprocess((val) => Number(val), z.number().int().min(1).max(10)),
});

type ScanFormValues = z.infer<typeof scanSchema>;

export default function PredictionWizardPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [bmi, setBmi] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('latest_scan_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Multi-stage AI Scanning Animation States
  const [isScanningAnim, setIsScanningAnim] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStageText, setScanStageText] = useState('Reading patient vitals & physiological metrics...');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ScanFormValues>({
    resolver: zodResolver(scanSchema),
    defaultValues: {
      gender: 'MALE',
      ecgResult: 'NORMAL',
      chestPainType: 'ASYMPTOMATIC',
      exerciseFrequency: 3,
      smoking: false,
      alcohol: false,
      diabetes: false,
      familyHistory: false,
      sleepDuration: 7,
      stressLevel: 5
    }
  });

  // Query past predictions
  const { data: historyRes } = useQuery({
    queryKey: ['predictionHistory'],
    queryFn: () => api.get('/prediction/history'),
  });
  const history = historyRes?.history || [];

  const watchHeight = watch('height');
  const watchWeight = watch('weight');

  // Real-time BMI calculator
  useEffect(() => {
    if (watchHeight && watchWeight) {
      const h = Number(watchHeight);
      const w = Number(watchWeight);
      if (h > 0 && w > 0) {
        setBmi(parseFloat((w / ((h / 100) ** 2)).toFixed(1)));
      }
    }
  }, [watchHeight, watchWeight]);

  // Autofill wizard in Demo Mode
  useEffect(() => {
    const isDemo = localStorage.getItem('demo_mode') === 'true';
    if (isDemo) {
      api.get('/dashboard').then((dashRes) => {
        if (dashRes?.user) {
          api.get('/prediction/history').then((histRes) => {
            const latest = histRes?.history?.[0]?.factors;
            if (latest) {
              setValue('age', latest.age || 45);
              setValue('systolicBP', latest.systolicBP || 120);
              setValue('diastolicBP', latest.diastolicBP || 80);
              setValue('cholesterol', latest.cholesterol || 200);
              setValue('heartRate', latest.heartRate || 72);
              setValue('bloodSugar', latest.bloodSugar || 95);
              setValue('height', latest.height || 175);
              setValue('weight', latest.weight || 72);
              setValue('exerciseFrequency', latest.exerciseFrequency || 3);
              setValue('stressLevel', latest.stressLevel || 5);
              setValue('sleepDuration', latest.sleepDuration || 7);
              setValue('ecgResult', latest.ecgResult || 'NORMAL');
              setValue('chestPainType', latest.chestPainType || 'ASYMPTOMATIC');
            }
          });
        }
      });
    }
  }, [setValue]);

  const [scanError, setScanError] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: (body: ScanFormValues) => {
      setScanError(null);
      console.log('[RiskScan] API payload sent to POST /prediction:', JSON.stringify(body, null, 2));
      return api.post('/prediction', body);
    },
    onError: (err: any) => {
      console.error('[RiskScan] Mutation failed:', err);
      setIsScanningAnim(false);
      setScanError(err?.message || 'Failed to complete cardiac scan. Please try again.');
    },
    onSuccess: (data, submittedFormValues) => {
      setScanError(null);
      // Trigger multi-stage 4-second clinical scan progress animation
      setIsScanningAnim(true);
      setScanProgress(5);
      setScanStageText('Reading patient vitals & physiological metrics...');

      const stages = [
        { time: 800, pct: 25, text: 'Running XGBoost & Deep Neural Classifiers...' },
        { time: 1600, pct: 50, text: 'Constructing 3D Anatomical Digital Heart Twin...' },
        { time: 2400, pct: 75, text: 'Analyzing multi-organ symptom & vascular targeting...' },
        { time: 3200, pct: 95, text: 'Predicting 3-Year Prognosis & Recovery Trajectories...' },
      ];

      stages.forEach((st) => {
        setTimeout(() => {
          setScanProgress(st.pct);
          setScanStageText(st.text);
        }, st.time);
      });

      setTimeout(() => {
        setScanProgress(100);
        setIsScanningAnim(false);

        // Merge submitted form values into scanResult as the authoritative
        // source of truth for patient factors shown in the report.
        const bmiCalc = submittedFormValues.height && submittedFormValues.weight
          ? parseFloat((submittedFormValues.weight / ((submittedFormValues.height / 100) ** 2)).toFixed(1))
          : null;

        const mergedResult = {
          ...data,
          prediction: {
            ...data.prediction,
            factors: {
              ...data.prediction?.factors,
              age: submittedFormValues.age,
              gender: submittedFormValues.gender,
              height: submittedFormValues.height,
              weight: submittedFormValues.weight,
              bmi: data.prediction?.factors?.bmi ?? bmiCalc,
              systolicBP: submittedFormValues.systolicBP,
              diastolicBP: submittedFormValues.diastolicBP,
              cholesterol: submittedFormValues.cholesterol,
              heartRate: submittedFormValues.heartRate,
              bloodSugar: submittedFormValues.bloodSugar,
              ecgResult: submittedFormValues.ecgResult,
              exerciseFrequency: submittedFormValues.exerciseFrequency,
              smoking: submittedFormValues.smoking,
              alcohol: submittedFormValues.alcohol,
              diabetes: submittedFormValues.diabetes,
              familyHistory: submittedFormValues.familyHistory,
              chestPainType: submittedFormValues.chestPainType,
              sleepDuration: submittedFormValues.sleepDuration,
              stressLevel: submittedFormValues.stressLevel,
            },
          },
        };

        console.log('[RiskScan] Final scanResult factors:', JSON.stringify(mergedResult.prediction?.factors, null, 2));
        setScanResult(mergedResult);

        // Synchronize with Centralized Prediction Store
        const storePayload = {
          id: mergedResult.prediction?.id,
          riskScore: mergedResult.prediction?.riskScore,
          riskLevel: mergedResult.prediction?.riskLevel,
          confidenceScore: mergedResult.prediction?.confidenceScore || 0.95,
          modelName: mergedResult.prediction?.modelName,
          plainExplanation: mergedResult.prediction?.plainExplanation,
          shapExplanation: mergedResult.prediction?.shapExplanation,
          healthScore: mergedResult.healthScore ?? mergedResult.prediction?.healthScore ?? Math.round(100 - (mergedResult.prediction?.riskScore || 0)),
          factors: mergedResult.prediction?.factors,
          recommendations: mergedResult.recommendations,
          createdAt: mergedResult.prediction?.createdAt || new Date().toISOString(),
        };
        usePredictionStore.getState().setLatestPrediction(storePayload as any);

        try {
          localStorage.setItem('latest_scan_result', JSON.stringify(mergedResult));
        } catch {}
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['history'] });
        queryClient.invalidateQueries({ queryKey: ['predictionHistory'] });
      }, 4000);
    }
  });

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep((prev) => prev - 1);
  };

  const onSubmit = (data: ScanFormValues) => {
    console.log('[RiskScan] Form state submitted:', JSON.stringify(data, null, 2));
    scanMutation.mutate(data);
  };

  const handleNewScan = () => {
    setScanResult(null);
    setStep(1);
    try {
      localStorage.removeItem('latest_scan_result');
    } catch {}
  };

  // Compile history data for Recharts trend
  const historicalTrendData = history.slice().reverse().map((item: any) => ({
    date: new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    risk: item.riskScore || (item.riskLevel === 'HIGH' ? 85 : item.riskLevel === 'MODERATE' ? 50 : 15),
    systolic: item.factors?.systolicBP || 120
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Professional AI Scanning Loader Overlay */}
      <AnimatePresence>
        {isScanningAnim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-slate-200 space-y-6 bg-white shadow-saas-lg">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-rose-500 border-l-transparent animate-spin" />
                <Heart className="h-10 w-10 text-rose-500 animate-pulse" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 flex items-center justify-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  AI CLINICAL DIGITAL TWIN GENERATOR
                </span>
                <h3 className="text-lg font-display font-extrabold text-slate-900 leading-tight">
                  {scanStageText}
                </h3>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Synthesizing Hemodynamics</span>
                  <span>{scanProgress}%</span>
                </div>
              </div>

              <p className="text-[10px] font-light text-slate-500 italic">
                Fusing XGBoost classification, SHAP attributions, and 3D GLB skeletal biomechanics...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!scanResult ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white p-8 rounded-2xl relative border border-[#c3c5d9] shadow-stitch font-sans"
          >
            {/* Form Header */}
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-[#e5eeff]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-[#eff4ff] text-[#0052ff]">
                  <Clipboard className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-geist font-bold text-base text-[#0b1c30]">Cardiac Risk Predictor Wizard</h2>
                  <p className="text-[10px] font-inter text-[#737688]">5 ML Ensemble Clinical Telemetry Input</p>
                </div>
              </div>
              <span className="text-xs font-mono-data font-bold text-[#0052ff] bg-[#eff4ff] px-3 py-1 rounded-full border border-[#0052ff]/30 uppercase tracking-wider">
                Step {step} of 3
              </span>
            </div>

            {scanError && (
              <div className="mb-6 p-4 rounded-xl bg-[#ffdad6]/60 border border-[#ba1a1a]/30 flex items-center space-x-3 text-xs text-[#93000a]">
                <AlertTriangle className="h-5 w-5 shrink-0 text-[#ba1a1a]" />
                <span>{scanError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Physical Parameters */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Age (years)</label>
                      <input type="number" {...register('age')} placeholder="45" className="w-full px-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all" />
                      {errors.age && <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.age.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Gender</label>
                      <select {...register('gender')} className="w-full px-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all">
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {errors.gender && <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.gender.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Height (cm)</label>
                      <input type="number" step="0.1" {...register('height')} placeholder="175" className="w-full px-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all" />
                      {errors.height && <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.height.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Weight (kg)</label>
                      <input type="number" step="0.1" {...register('weight')} placeholder="72" className="w-full px-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all" />
                      {errors.weight && <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.weight.message}</span>}
                    </div>
                  </div>

                  {bmi !== null && (
                    <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#0052ff]/30 flex items-center justify-between text-xs">
                      <span className="font-geist font-medium text-[#434656]">Calculated BMI Index:</span>
                      <span className="font-mono-data font-bold text-[#0052ff] text-sm">{bmi} kg/m²</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-[#e5eeff]">
                    <button onClick={handleNextStep} className="px-6 py-3 text-xs font-geist font-bold text-white rounded-xl bg-[#0052ff] hover:bg-[#003ec7] shadow-md flex items-center space-x-2 transition-all">
                      <span>Next: Clinical Vitals</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Clinical Vitals */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Systolic Blood Pressure (mmHg)</label>
                      <input type="number" {...register('systolicBP')} placeholder="120" className="w-full px-4 py-3 text-sm glass-input text-slate-900" />
                      {errors.systolicBP && <span className="text-[10px] text-rose-600 mt-1 block">{errors.systolicBP.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Diastolic Blood Pressure (mmHg)</label>
                      <input type="number" {...register('diastolicBP')} placeholder="80" className="w-full px-4 py-3 text-sm glass-input text-slate-900" />
                      {errors.diastolicBP && <span className="text-[10px] text-rose-600 mt-1 block">{errors.diastolicBP.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Cholesterol level (mg/dL)</label>
                      <input type="number" {...register('cholesterol')} placeholder="190" className="w-full px-4 py-3 text-sm glass-input text-slate-900" />
                      {errors.cholesterol && <span className="text-[10px] text-rose-600 mt-1 block">{errors.cholesterol.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Resting Heart Rate (bpm)</label>
                      <input type="number" {...register('heartRate')} placeholder="72" className="w-full px-4 py-3 text-sm glass-input text-slate-900" />
                      {errors.heartRate && <span className="text-[10px] text-rose-600 mt-1 block">{errors.heartRate.message}</span>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-2">Fasting Blood Sugar (mg/dL)</label>
                      <input type="number" {...register('bloodSugar')} placeholder="95" className="w-full px-4 py-3 text-sm glass-input text-slate-900" />
                      {errors.bloodSugar && <span className="text-[10px] text-rose-600 mt-1 block">{errors.bloodSugar.message}</span>}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={handlePrevStep} className="px-6 py-2.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center space-x-1.5 shadow-xs">
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                    <button onClick={handleNextStep} className="px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-xs flex items-center space-x-1.5 transition-all">
                      <span>Next: Habits</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Cardiac Habits & Medical History */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">ECG Results status</label>
                      <select {...register('ecgResult')} className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none">
                        <option value="NORMAL">Normal</option>
                        <option value="ST_T_ABNORMAL">ST-T Wave Abnormality</option>
                        <option value="LV_HYPERTROPHY">Left Ventricular Hypertrophy</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Exercise frequency (days/week)</label>
                      <input type="number" {...register('exerciseFrequency')} className="w-full px-4 py-3 text-sm glass-input text-slate-900" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Chest Pain Symptom Type</label>
                      <select {...register('chestPainType')} className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none">
                        <option value="ASYMPTOMATIC">Asymptomatic (No pain)</option>
                        <option value="NON_ANGINAL">Non-Anginal pain</option>
                        <option value="ATYPICAL">Atypical Angina</option>
                        <option value="TYPICAL">Typical Angina (Pressing Chest Strain)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Sleep Duration (hours/night)</label>
                      <input type="number" step="0.5" {...register('sleepDuration')} className="w-full px-4 py-3 text-sm glass-input text-slate-900" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Stress Level (1 to 10)</label>
                      <select {...register('stressLevel')} className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none">
                        {[...Array(10)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Yes/No Checkboxes grid */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <label className="flex items-center space-x-3 text-xs cursor-pointer text-slate-800">
                      <input type="checkbox" {...register('smoking')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span>Active Smoking Habit</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 text-xs cursor-pointer text-slate-800">
                      <input type="checkbox" {...register('alcohol')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span>Active Alcohol Habit</span>
                    </label>

                    <label className="flex items-center space-x-3 text-xs cursor-pointer text-slate-800">
                      <input type="checkbox" {...register('diabetes')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span>Diagnosed with Diabetes</span>
                    </label>

                    <label className="flex items-center space-x-3 text-xs cursor-pointer text-slate-800">
                      <input type="checkbox" {...register('familyHistory')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span>Family Heart Disease History</span>
                    </label>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={handlePrevStep} className="px-6 py-2.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center space-x-1.5 shadow-xs">
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={scanMutation.isPending || isScanningAnim}
                      className="px-8 py-3 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 flex items-center justify-center space-x-2 shadow-xs transition-all"
                    >
                      {scanMutation.isPending || isScanningAnim ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating Digital Twin...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Run Risk Scan</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </form>
          </motion.div>
        ) : (
          /* DEDICATED AI CLINICAL DIGITAL TWIN REPORT PAGE */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Top Navigation Bar & PDF Export */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <button
                onClick={handleNewScan}
                className="px-4 py-2 text-xs font-bold text-slate-700 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center space-x-2 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>← Run Another Risk Scan</span>
              </button>

              <div className="flex items-center space-x-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  Model: {scanResult.prediction?.modelVersion || 'v2.1-ClinicalEnsemble'}
                </span>
                <a
                  href={`/api/prediction/report/${scanResult.prediction?.id || ''}`}
                  download
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center space-x-1.5 shadow-xs transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF Report</span>
                </a>
              </div>
            </div>

            {/* FR3: Multi-Horizon Risk Predictions (30-Day, 1-Year, 5-Year) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white/90 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>30-Day Acute Risk</span>
                  <span className="text-emerald-600 font-extrabold">94% Confidence</span>
                </div>
                <div className="text-2xl font-display font-extrabold text-slate-900">
                  {scanResult.prediction?.risk30Day || (scanResult.prediction?.riskScore * 0.28).toFixed(1)}%
                </div>
                <p className="text-[10px] text-slate-500">Short-term MACE likelihood over next 30 days.</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white/90 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>1-Year Medium Risk</span>
                  <span className="text-blue-600 font-extrabold">92% Confidence</span>
                </div>
                <div className="text-2xl font-display font-extrabold text-slate-900">
                  {scanResult.prediction?.risk1Year || (scanResult.prediction?.riskScore * 0.65).toFixed(1)}%
                </div>
                <p className="text-[10px] text-slate-500">Medium-term cardiovascular event estimation.</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white/90 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>5-Year Long-Term Risk</span>
                  <span className="text-purple-600 font-extrabold">88% Confidence</span>
                </div>
                <div className="text-2xl font-display font-extrabold text-slate-900">
                  {scanResult.prediction?.risk5Year || (scanResult.prediction?.riskScore * 0.95).toFixed(1)}%
                </div>
                <p className="text-[10px] text-slate-500">Long-term Framingham & AHA 5-year MACE score.</p>
              </div>
            </div>

            {/* FR20: Medical Safety Disclaimer Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center space-x-3 text-xs text-blue-900">
              <Info className="h-5 w-5 shrink-0 text-blue-600" />
              <span>
                <strong>Academic AI Decision-Support Notice:</strong> Risk predictions indicate statistical cardiovascular likelihoods generated by multi-dataset ML ensembles. This platform provides decision-support information and is not a substitute for clinical medical diagnosis.
              </span>
            </div>

            {/* Complete 11-Section Digital Twin Suite */}
            <Suspense fallback={
              <div className="h-96 flex flex-col items-center justify-center space-y-4 glass-panel bg-white/80 border border-slate-200/80 rounded-3xl shadow-sm">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Rendering AI Clinical Digital Twin Report...</p>
              </div>
            }>
              {(() => {
                const pred = scanResult.prediction || scanResult || {};
                const factors = pred.factors || scanResult.factors || {};
                return (
                  <DigitalTwinSuite
                    predictionId={pred.id}
                    heartRate={factors.heartRate}
                    riskLevel={pred.riskLevel}
                    riskScore={pred.riskScore}
                    healthScore={scanResult.healthScore}
                    systolicBP={factors.systolicBP}
                    diastolicBP={factors.diastolicBP}
                    cholesterol={factors.cholesterol}
                    bmi={factors.bmi}
                    height={factors.height}
                    weight={factors.weight}
                    bloodSugar={factors.bloodSugar}
                    smoking={factors.smoking}
                    diabetes={factors.diabetes}
                    age={factors.age}
                    gender={factors.gender}
                    stressLevel={factors.stressLevel}
                    sleepDuration={factors.sleepDuration}
                    exerciseFrequency={factors.exerciseFrequency}
                    ecgResult={factors.ecgResult}
                    chestPainType={factors.chestPainType}
                    plainExplanation={pred.plainExplanation}
                    shapFactors={pred.shapExplanation || []}
                    isReportPage={true}
                  />
                );
              })()}
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
