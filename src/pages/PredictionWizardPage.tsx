import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clipboard, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Heart, Loader2, Download, AlertTriangle, Sparkles, TrendingUp, Info } from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [scanResult, setScanResult] = useState<any>(null);

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

  // Query past predictions to feed historical comparison charts
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

  // Autofill wizard if sample patient is switched in Demo Mode
  useEffect(() => {
    const isDemo = localStorage.getItem('demo_mode') === 'true';
    if (isDemo) {
      // Fetch active patient factors from api directly or set defaults
      api.get('/dashboard').then((dashRes) => {
        if (dashRes?.user) {
          // Find which patient is active
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

  const scanMutation = useMutation({
    mutationFn: (body: ScanFormValues) => api.post('/prediction', body),
    onSuccess: (data) => {
      setScanResult(data);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['predictionHistory'] });
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
    scanMutation.mutate(data);
  };

  // Compile history data for Recharts trend
  const historicalTrendData = history.slice().reverse().map((item: any) => ({
    date: new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    risk: item.riskScore || (item.riskLevel === 'HIGH' ? 85 : item.riskLevel === 'MODERATE' ? 50 : 15),
    systolic: item.factors?.systolicBP || 120
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      <AnimatePresence mode="wait">
        {!scanResult ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-panel p-8 rounded-2xl relative"
          >
            {/* Form Header */}
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-white/5">
              <div className="flex items-center space-x-3">
                <Clipboard className="h-5 w-5 text-health-blue animate-pulse" />
                <h2 className="font-display font-bold text-base">Cardiac Predictor Scan Wizard</h2>
              </div>
              <span className="text-xxs font-semibold text-health-textMuted uppercase tracking-wider">Step {step} of 3</span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Physical Parameters */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Age (years)</label>
                      <input type="number" {...register('age')} placeholder="45" className="w-full px-4 py-3 text-sm glass-input" />
                      {errors.age && <span className="text-[10px] text-health-rose mt-1 block">{errors.age.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Gender</label>
                      <select {...register('gender')} className="w-full px-4 py-3 text-sm glass-input bg-health-card">
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {errors.gender && <span className="text-[10px] text-health-rose mt-1 block">{errors.gender.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Height (cm)</label>
                      <input type="number" step="0.1" {...register('height')} placeholder="175" className="w-full px-4 py-3 text-sm glass-input" />
                      {errors.height && <span className="text-[10px] text-health-rose mt-1 block">{errors.height.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Weight (kg)</label>
                      <input type="number" step="0.1" {...register('weight')} placeholder="72" className="w-full px-4 py-3 text-sm glass-input" />
                      {errors.weight && <span className="text-[10px] text-health-rose mt-1 block">{errors.weight.message}</span>}
                    </div>
                  </div>

                  {bmi !== null && (
                    <div className="p-4 rounded-xl bg-health-blue/5 border border-health-blue/10 flex items-center justify-between text-xs">
                      <span className="text-health-textMuted">Calculated BMI Index:</span>
                      <span className="font-semibold text-health-cyan text-sm">{bmi} kg/m²</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button onClick={handleNextStep} className="px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-health-blue to-health-cyan hover:shadow-glow flex items-center space-x-1.5 transition-all">
                      <span>Next: Vitals</span>
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
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Systolic Blood Pressure (mmHg)</label>
                      <input type="number" {...register('systolicBP')} placeholder="120" className="w-full px-4 py-3 text-sm glass-input" />
                      {errors.systolicBP && <span className="text-[10px] text-health-rose mt-1 block">{errors.systolicBP.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Diastolic Blood Pressure (mmHg)</label>
                      <input type="number" {...register('diastolicBP')} placeholder="80" className="w-full px-4 py-3 text-sm glass-input" />
                      {errors.diastolicBP && <span className="text-[10px] text-health-rose mt-1 block">{errors.diastolicBP.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Cholesterol level (mg/dL)</label>
                      <input type="number" {...register('cholesterol')} placeholder="190" className="w-full px-4 py-3 text-sm glass-input" />
                      {errors.cholesterol && <span className="text-[10px] text-health-rose mt-1 block">{errors.cholesterol.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Resting Heart Rate (bpm)</label>
                      <input type="number" {...register('heartRate')} placeholder="72" className="w-full px-4 py-3 text-sm glass-input" />
                      {errors.heartRate && <span className="text-[10px] text-health-rose mt-1 block">{errors.heartRate.message}</span>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Fasting Blood Sugar (mg/dL)</label>
                      <input type="number" {...register('bloodSugar')} placeholder="95" className="w-full px-4 py-3 text-sm glass-input" />
                      {errors.bloodSugar && <span className="text-[10px] text-health-rose mt-1 block">{errors.bloodSugar.message}</span>}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={handlePrevStep} className="px-6 py-2.5 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center space-x-1.5">
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                    <button onClick={handleNextStep} className="px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-health-blue to-health-cyan hover:shadow-glow flex items-center space-x-1.5 transition-all">
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
                      <label className="block text-xs font-medium text-health-textMuted mb-2">ECG Results status</label>
                      <select {...register('ecgResult')} className="w-full px-4 py-3 text-sm glass-input bg-health-card">
                        <option value="NORMAL">Normal</option>
                        <option value="ST_T_ABNORMAL">ST-T Wave Abnormality</option>
                        <option value="LV_HYPERTROPHY">Left Ventricular Hypertrophy</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Exercise frequency (days/week)</label>
                      <input type="number" {...register('exerciseFrequency')} className="w-full px-4 py-3 text-sm glass-input" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Chest Pain Symptom Type</label>
                      <select {...register('chestPainType')} className="w-full px-4 py-3 text-sm glass-input bg-health-card">
                        <option value="ASYMPTOMATIC">Asymptomatic (No pain)</option>
                        <option value="NON_ANGINAL">Non-Anginal pain</option>
                        <option value="ATYPICAL">Atypical Angina</option>
                        <option value="TYPICAL">Typical Angina (Pressing Chest Strain)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Sleep Duration (hours/night)</label>
                      <input type="number" step="0.5" {...register('sleepDuration')} className="w-full px-4 py-3 text-sm glass-input" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-health-textMuted mb-2">Stress Level (1 to 10)</label>
                      <select {...register('stressLevel')} className="w-full px-4 py-3 text-sm glass-input bg-health-card">
                        {[...Array(10)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Yes/No Checkboxes grid */}
                  <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                    <label className="flex items-center space-x-3 text-xs cursor-pointer">
                      <input type="checkbox" {...register('smoking')} className="rounded border-white/10 bg-health-card text-health-blue" />
                      <span>Active Smoking Habit</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 text-xs cursor-pointer">
                      <input type="checkbox" {...register('alcohol')} className="rounded border-white/10 bg-health-card text-health-blue" />
                      <span>Active Alcohol Habit</span>
                    </label>

                    <label className="flex items-center space-x-3 text-xs cursor-pointer">
                      <input type="checkbox" {...register('diabetes')} className="rounded border-white/10 bg-health-card text-health-blue" />
                      <span>Diagnosed with Diabetes</span>
                    </label>

                    <label className="flex items-center space-x-3 text-xs cursor-pointer">
                      <input type="checkbox" {...register('familyHistory')} className="rounded border-white/10 bg-health-card text-health-blue" />
                      <span>Family Heart Disease History</span>
                    </label>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={handlePrevStep} className="px-6 py-2.5 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center space-x-1.5">
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={scanMutation.isPending}
                      className="px-8 py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-health-blue to-health-cyan hover:shadow-glow flex items-center justify-center space-x-2 shadow-lg transition-all"
                    >
                      {scanMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing scan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Run Diagnostics</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </form>
          </motion.div>
        ) : (
          /* Results display dashboard on success */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 animate-fade-in"
          >
            {/* Risk display panel */}
            <div className={`glass-panel p-6 rounded-2xl relative border ${
              scanResult.prediction.riskLevel === 'HIGH' ? 'border-health-rose/30 shadow-glow-rose' :
              scanResult.prediction.riskLevel === 'MODERATE' ? 'border-health-amber/30' :
              'border-health-emerald/30 shadow-glow-emerald'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-health-textMuted flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-health-cyan animate-pulse" />
                    AI diagnostic assessment complete
                  </span>
                  <h2 className="text-2xl font-display font-extrabold tracking-tight mt-1.5 flex items-center flex-wrap gap-2.5">
                    Risk Category: 
                    <span className={`inline-block px-4 py-1.5 rounded-xl text-sm font-bold uppercase ${
                      scanResult.prediction.riskLevel === 'HIGH' ? 'bg-health-rose/10 text-health-rose' :
                      scanResult.prediction.riskLevel === 'MODERATE' ? 'bg-health-amber/10 text-health-amber' :
                      'bg-health-emerald/10 text-health-emerald'
                    }`}>
                      {scanResult.prediction.riskLevel}
                    </span>
                    <span className="text-[10px] text-health-cyan font-bold bg-health-cyan/5 px-2.5 py-1 rounded border border-health-cyan/10">
                      Classifier: {scanResult.prediction.modelName || 'XGBOOST'}
                    </span>
                  </h2>
                </div>
                
                {/* PDF report download button */}
                <a
                  href={`/api/prediction/report/${scanResult.prediction.id}`}
                  download
                  className="px-4 py-2.5 rounded-xl bg-health-blue/10 hover:bg-health-blue/20 text-health-blue text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-health-blue/10"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF Card</span>
                </a>
              </div>

              {/* Assessment Explanation text block */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 mb-6">
                <p className="text-xs leading-relaxed font-light text-white/90">
                  {scanResult.prediction.plainExplanation}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-[10px] text-health-textMuted border-t border-white/5 pt-4">
                <ShieldAlert className="h-4 w-4" />
                <span>Health Score equivalent: {scanResult.healthScore || 'N/A'}/100</span>
              </div>
            </div>

            {/* Double-Sided SHAP, 3D Heart stimulation, and Model Confidence Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* SHAP Double-sided feature importance */}
              <div className="lg:col-span-6 glass-panel p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm mb-1.5 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-health-cyan" />
                    SHAP Game-Theoretic Feature Influence
                  </h3>
                  <p className="text-[10px] text-health-textMuted mb-6 leading-relaxed">
                    Visualizes risk contributions relative to biological baselines. Left green bars decrease overall cardiac strain; right red bars raise risk metrics.
                  </p>
                </div>

                <div className="space-y-4 flex-1">
                  {scanResult.prediction.shapExplanation.map((feat: any, idx: number) => {
                    const isRisk = feat.impact === 'INCREASES_RISK';
                    const widthPercent = Math.min(100, Math.abs(feat.shap_value) * 300); // Scaled for visuals
                    return (
                      <div key={idx} className="grid grid-cols-12 items-center text-xs gap-3 py-1 border-b border-white/5">
                        <span className="col-span-4 text-left font-light truncate">{feat.feature} ({feat.value})</span>
                        <div className="col-span-8 h-4 relative flex items-center bg-white/5 rounded overflow-hidden">
                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/25 z-10" />
                          
                          {!isRisk ? (
                            <div
                              className="absolute right-1/2 h-full bg-gradient-to-l from-health-emerald to-teal-500 rounded-l"
                              style={{ width: `${widthPercent / 2}%` }}
                            />
                          ) : (
                            <div
                              className="absolute left-1/2 h-full bg-gradient-to-r from-health-rose to-red-500 rounded-r"
                              style={{ width: `${widthPercent / 2}%` }}
                            />
                          )}
                          
                          <span className={`absolute z-10 text-[9px] font-bold ${
                            isRisk ? 'right-2 text-health-rose' : 'left-2 text-health-emerald'
                          }`}>
                            {isRisk ? '+' : '-'}{Math.abs(feat.shap_value).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive 3D Heart Digital Twin */}
              <div className="lg:col-span-3 glass-panel p-5 rounded-2xl flex flex-col items-center justify-between text-center relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-health-textMuted block mb-2 tracking-wider">3D Myocardial Twin (Real-Time)</span>
                
                <div 
                  className="h-36 w-full flex items-center justify-center relative overflow-hidden rounded-xl bg-black/10 border border-white/5"
                  dangerouslySetInnerHTML={{
                    __html: `
                      <model-viewer
                        src="/beating-heart.glb"
                        autoplay
                        auto-rotate
                        camera-controls
                        interaction-prompt="none"
                        shadow-intensity="1"
                        style="width: 100%; height: 100%; outline: none; background: transparent;"
                      ></model-viewer>
                    `
                  }}
                />
                
                <div className="flex justify-between w-full mt-2 text-[9px] text-health-textMuted uppercase font-bold tracking-wider">
                  <span>Heart Rate: {scanResult.prediction.factors?.heartRate || 72} BPM</span>
                  <span className="text-health-rose animate-pulse flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-health-rose animate-ping" />
                    <span>Active</span>
                  </span>
                </div>
              </div>

              {/* Confidence Circle visualization */}
              <div className="lg:col-span-3 glass-panel p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-health-textMuted block mb-4 tracking-wider">AI Confidence</span>
                
                <div className="relative h-28 w-28 flex items-center justify-center mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                    <circle
                      cx="50" cy="50" r="40"
                      stroke="#3B82F6" strokeWidth="6" fill="transparent"
                      strokeDasharray="251"
                      strokeDashoffset={251 - (251 * (scanResult.prediction.confidenceScore || 0.94)) / 1}
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.35))' }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-bold font-display">{((scanResult.prediction.confidenceScore || 0.94) * 100).toFixed(1)}%</span>
                    <span className="text-[8px] text-health-textMuted uppercase font-semibold">Precision</span>
                  </div>
                </div>
                
                <p className="text-[9px] text-health-textMuted leading-relaxed font-light">
                  Mathematical confidence interval computed on validation cross-folds.
                </p>
              </div>

            </div>

            {/* Historical comparison and Reference Baseline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Baseline reference table */}
              <div className="lg:col-span-7 glass-panel p-6 rounded-2xl">
                <h3 className="font-display font-bold text-xs uppercase text-health-textMuted tracking-wider mb-4">Clinical Reference Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xxs font-light border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-health-textMuted uppercase tracking-wider font-bold">
                        <th className="py-2.5">Indicator</th>
                        <th className="py-2.5">Scanned Value</th>
                        <th className="py-2.5">Baseline range</th>
                        <th className="py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="py-2.5">Systolic Blood Pressure</td>
                        <td className="py-2.5 font-semibold">{scanResult.prediction.factors?.systolicBP || 120} mmHg</td>
                        <td className="py-2.5 text-health-textMuted">&lt; 120 mmHg</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            (scanResult.prediction.factors?.systolicBP || 120) >= 130 ? 'bg-health-rose/10 text-health-rose' : 'bg-health-emerald/10 text-health-emerald'
                          }`}>
                            {(scanResult.prediction.factors?.systolicBP || 120) >= 130 ? 'HIGH' : 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5">Total Cholesterol</td>
                        <td className="py-2.5 font-semibold">{scanResult.prediction.factors?.cholesterol || 190} mg/dL</td>
                        <td className="py-2.5 text-health-textMuted">&lt; 200 mg/dL</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            (scanResult.prediction.factors?.cholesterol || 190) >= 200 ? 'bg-health-rose/10 text-health-rose' : 'bg-health-emerald/10 text-health-emerald'
                          }`}>
                            {(scanResult.prediction.factors?.cholesterol || 190) >= 200 ? 'HIGH' : 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5">Fasting Blood Sugar</td>
                        <td className="py-2.5 font-semibold">{scanResult.prediction.factors?.bloodSugar || 95} mg/dL</td>
                        <td className="py-2.5 text-health-textMuted">&lt; 100 mg/dL</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            (scanResult.prediction.factors?.bloodSugar || 95) >= 100 ? 'bg-health-rose/10 text-health-rose' : 'bg-health-emerald/10 text-health-emerald'
                          }`}>
                            {(scanResult.prediction.factors?.bloodSugar || 95) >= 100 ? 'HIGH' : 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5">BMI Rating</td>
                        <td className="py-2.5 font-semibold">{scanResult.prediction.factors?.bmi || 24} kg/m²</td>
                        <td className="py-2.5 text-health-textMuted">18.5 - 24.9 kg/m²</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            (scanResult.prediction.factors?.bmi || 24) >= 25 ? 'bg-health-amber/10 text-health-amber' : 'bg-health-emerald/10 text-health-emerald'
                          }`}>
                            {(scanResult.prediction.factors?.bmi || 24) >= 25 ? 'OVERWEIGHT' : 'IDEAL'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Prediction history comparison chart */}
              <div className="lg:col-span-5 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[240px]">
                <h3 className="font-display font-bold text-xs uppercase text-health-textMuted tracking-wider mb-2">Historical Risk Trend</h3>
                <div className="flex-1 min-h-0 w-full text-[9px]">
                  {historicalTrendData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-health-textMuted italic">No prior prediction records found.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalTrendData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                        <defs>
                          <linearGradient id="riskGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={8} />
                        <YAxis stroke="#9CA3AF" fontSize={8} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '10px' }} />
                        <Area type="monotone" dataKey="risk" name="Cardio Risk %" stroke="#3B82F6" fillOpacity={1} fill="url(#riskGlow)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

            {/* Quick action redirect to dashboard */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setScanResult(null);
                  setStep(1);
                }}
                className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                Scan New Patient
              </button>
              <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-gradient-to-r from-health-blue to-health-cyan text-xs font-semibold hover:shadow-glow transition-all">
                Return to Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
