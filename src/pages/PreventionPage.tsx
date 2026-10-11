import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Loader2,
  Apple,
  Dumbbell,
  Heart,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  BookOpen,
  Info,
  Calendar,
  Activity,
  Flame,
  UserCheck,
  Download,
  Droplets,
  Scale,
  Ban,
  Check,
  Utensils,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { usePredictionStore } from '../store/predictionStore';
import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { downloadReportPdf } from '../services/reportService';
import { Link } from 'react-router-dom';

interface PreventionRecommendation {
  id: string;
  title: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  action: string;
  patientFactor: string;
  evidenceSource: string;
  timeframe: string;
  isShapDriver?: boolean;
}

interface ContributingFactor {
  factor: string;
  value: string;
  impact: string;
  direction: 'negative' | 'positive' | 'neutral';
  isModifiable: boolean;
  importance?: number;
}

export default function PreventionPage() {
  const { user } = useAuthStore();
  const storePrediction = usePredictionStore((s) => s.latestPrediction);
  const digitalTwinState = useDigitalTwinStore((s) => s.simulationState);
  const [downloading, setDownloading] = React.useState(false);

  const { data: latest, isLoading, refetch } = useQuery({
    queryKey: ['latestPrediction', user?.id],
    queryFn: () => api.get('/prediction/latest'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      await downloadReportPdf();
    } catch (err: any) {
      console.error('Failed to download report:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-[#0052ff] animate-spin" />
          <p className="text-xs font-mono-data text-slate-500 uppercase tracking-wider">
            Compiling patient-specific prevention plan...
          </p>
        </div>
      </div>
    );
  }

  const hasPrediction = !!latest?.prediction || !!storePrediction;
  const plan = latest?.preventionPlan;
  const isPersonalized = plan?.isPersonalized ?? (hasPrediction && !!plan);

  const riskLevel = latest?.prediction?.riskLevel || storePrediction?.riskLevel || plan?.riskSummary?.riskLevel || 'LOW';
  const riskScore = typeof latest?.prediction?.riskScore === 'number'
    ? latest.prediction.riskScore
    : (typeof storePrediction?.riskScore === 'number' ? storePrediction.riskScore : (typeof plan?.riskSummary?.overallRisk === 'number' ? plan.riskSummary.overallRisk : 0));

  const topFactors: ContributingFactor[] = plan?.riskSummary?.topContributingFactors || [];
  const recommendations: PreventionRecommendation[] = plan?.recommendations || [];
  const priorityList = plan?.priorityList || [];
  const dietaryGuidance = plan?.dietaryGuidance;
  const quantifiedTargets = dietaryGuidance?.quantifiedTargets;
  const mealStructure = dietaryGuidance?.mealStructure;
  const exerciseGuidance = plan?.exerciseGuidance;
  const digitalTwinContext = plan?.digitalTwin || {
    condition: digitalTwinState?.condition || 'NORMAL',
    severity: digitalTwinState?.severity || 'LOW',
    simulatedCadence: 'Synchronized baseline sinus rhythm',
    explanation: digitalTwinState?.explanation || 'Simulated Digital Twin state synchronized with Risk Scan.',
    patientExplanation: digitalTwinState?.patientExplanation || 'Operating in baseline synchronized mode.',
  };

  const highRecs = recommendations.filter((r) => r.priority === 'HIGH');
  const mediumRecs = recommendations.filter((r) => r.priority === 'MEDIUM');
  const lowRecs = recommendations.filter((r) => r.priority === 'LOW');

  const scanDate = latest?.prediction?.createdAt || storePrediction?.createdAt
    ? new Date(latest?.prediction?.createdAt || storePrediction?.createdAt || '').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Latest Scan';

  // Badge styles by risk level
  const getRiskBadge = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'MODERATE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#c3c5d9] shadow-stitch">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider text-[#0052ff] bg-[#eff4ff] px-2.5 py-0.5 rounded-full border border-[#0052ff]/30">
              {isPersonalized ? 'Connected to Latest Risk Scan & Digital Twin' : 'General Prevention Guidance'}
            </span>
            {hasPrediction && (
              <span className={`text-[10px] font-mono-data font-bold px-2.5 py-0.5 rounded-full border ${getRiskBadge(riskLevel)}`}>
                ● {riskLevel} Risk ({riskScore}%)
              </span>
            )}
            <span className="text-[10px] font-mono-data font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Twin: {digitalTwinContext.condition}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-geist font-bold tracking-tight text-[#0b1c30]">
            {isPersonalized ? 'Your Personalized Prevention Coach' : 'Cardiovascular Prevention Coach'}
          </h2>
          <p className="text-xs font-inter text-[#434656] max-w-2xl leading-relaxed">
            {isPersonalized
              ? `Formulated strictly from your latest biometric Risk Scan on ${scanDate}. Guidance is customized with evidence-based targets, tailored meal structures, and progressive activity.`
              : 'Complete a clinical Risk Scan to generate an individualized prevention regimen calibrated to your biometric biomarkers.'}
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleDownloadReport}
            disabled={downloading || !hasPrediction}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-geist font-bold flex items-center space-x-1.5 transition-all shadow-2xs disabled:opacity-50"
            title="Download verified clinical report (matching this prevention plan)"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-blue-600" />}
            <span>PDF Report</span>
          </button>

          <Link
            to="/prediction"
            className="px-4 py-2.5 rounded-xl bg-[#0052ff] hover:bg-[#003ec7] text-white text-xs font-geist font-bold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{hasPrediction ? 'New Risk Scan' : 'Start Risk Scan'}</span>
          </Link>
        </div>
      </div>

      {!hasPrediction ? (
        /* Fallback State: No Scan Performed Yet */
        <div className="space-y-6">
          <div className="bg-white p-8 sm:p-12 rounded-2xl text-center border border-[#c3c5d9] shadow-stitch max-w-2xl mx-auto space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Heart className="h-7 w-7 text-rose-500 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-geist font-bold text-lg text-[#0b1c30]">
                No Risk Scan Performed Yet
              </h3>
              <p className="text-xs font-inter text-[#737688] leading-relaxed max-w-md mx-auto">
                Prevention Coach requires your physiological measurements (blood pressure, cholesterol, BMI, physical activity, etc.) to formulate an individualized plan.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/prediction"
                className="px-6 py-3 rounded-xl bg-[#0052ff] hover:bg-[#003ec7] text-xs font-geist font-bold text-white shadow-sm inline-flex items-center space-x-2 transition-all"
              >
                <span>Complete Your Risk Scan</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Full Personalized Prevention Coach View */
        <div className="space-y-8">
          {/* 1. Digital Twin Connection & Simulation Status */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#c3c5d9] shadow-stitch space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Cpu className="h-4 w-4 text-[#0052ff]" />
                </div>
                <div>
                  <h3 className="font-geist font-bold text-sm text-[#0b1c30]">
                    Digital Twin State: {digitalTwinContext.condition}
                  </h3>
                  <p className="text-[11px] font-inter text-slate-500">
                    Hemodynamic simulation derived directly from your latest Risk Scan
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-mono-data font-bold px-2.5 py-0.5 rounded-full border ${getRiskBadge(digitalTwinContext.severity)}`}>
                ● {digitalTwinContext.severity} Severity
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-inter">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                  Simulated Cardiac Cadence
                </span>
                <p className="font-mono-data text-slate-800 font-semibold">
                  {digitalTwinContext.simulatedCadence}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                  Clinical Simulation Context
                </span>
                <p className="text-slate-600 leading-snug">
                  {digitalTwinContext.patientExplanation}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Personalized Priority Order */}
          {priorityList.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-[#c3c5d9] shadow-stitch space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-geist font-bold text-sm text-[#0b1c30]">
                      Personalized Priority Order
                    </h3>
                    <p className="text-[11px] font-inter text-slate-500">
                      Ranked dynamically by your strongest modifiable risk factors
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono-data font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                  Patient-Specific Ranking
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {priorityList.map((item: any) => {
                  const isHigh = item.priority === 'HIGH';
                  const isMed = item.priority === 'MEDIUM';
                  return (
                    <div
                      key={item.rank}
                      className={`p-3.5 rounded-xl border flex items-start space-x-3 transition-all ${
                        isHigh
                          ? 'bg-rose-50/50 border-rose-200'
                          : isMed
                          ? 'bg-blue-50/40 border-blue-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div
                        className={`h-6 w-6 rounded-lg flex items-center justify-center font-mono-data font-bold text-xs shrink-0 mt-0.5 ${
                          isHigh
                            ? 'bg-rose-200 text-rose-800'
                            : isMed
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.rank}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-geist font-bold text-xs text-[#0b1c30]">
                            {item.title}
                          </p>
                          <span
                            className={`text-[9px] font-mono-data font-bold px-1.5 py-0.2 rounded uppercase ${
                              isHigh
                                ? 'bg-rose-100 text-rose-800'
                                : isMed
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-[11px] font-inter text-slate-600 leading-tight">
                          {item.why}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Why Am I Seeing These Recommendations? (SHAP Factors) */}
          {topFactors.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-[#c3c5d9] shadow-stitch space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Sparkles className="h-4 w-4 text-[#0052ff]" />
                  </div>
                  <div>
                    <h3 className="font-geist font-bold text-sm text-[#0b1c30]">
                      Why Am I Seeing These Recommendations?
                    </h3>
                    <p className="text-[11px] font-inter text-slate-500">
                      Direct mathematical connection to your Risk Scan biomarkers and SHAP contribution values
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block text-[10px] font-mono-data font-bold uppercase text-[#0052ff] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  SHAP Explainability Driven
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {topFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 flex items-start space-x-3 transition-all hover:bg-slate-50"
                  >
                    <div className="h-6 w-6 rounded-lg bg-blue-100/60 text-[#0052ff] flex items-center justify-center font-mono-data font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-geist font-bold text-xs text-[#0b1c30] truncate">
                          {factor.factor}
                        </p>
                        {factor.isModifiable && (
                          <span className="text-[9px] font-mono-data font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                            Modifiable
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono-data font-semibold text-[#0052ff]">
                        {factor.value}
                      </p>
                      <p className="text-[10px] font-inter text-slate-500 leading-tight">
                        {factor.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. QUANTIFIED NUTRITION TARGETS SECTION */}
          {quantifiedTargets && (
            <div className="bg-white p-6 rounded-2xl border border-[#c3c5d9] shadow-stitch space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Apple className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-geist font-bold text-sm text-[#0b1c30]">
                      {dietaryGuidance.title}
                    </h3>
                    <p className="text-[11px] font-inter text-slate-500">
                      {dietaryGuidance.summary}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono-data font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                  Quantified & Evidence-Based
                </span>
              </div>

              {/* 8-Card Quantitative Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Energy Target
                  </span>
                  <p className="text-xs font-mono-data font-bold text-[#0052ff]">
                    {quantifiedTargets.dailyCalorieTarget}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Daily Fibre
                  </span>
                  <p className="text-xs font-mono-data font-bold text-emerald-700">
                    {quantifiedTargets.fibreTarget}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Carbohydrates
                  </span>
                  <p className="text-xs font-mono-data font-bold text-slate-800">
                    {quantifiedTargets.carbohydrateTarget}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Dietary Sodium
                  </span>
                  <p className="text-xs font-mono-data font-bold text-rose-700">
                    {quantifiedTargets.sodiumLimit}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Saturated Fat
                  </span>
                  <p className="text-xs font-mono-data font-bold text-rose-700">
                    {quantifiedTargets.saturatedFatLimit}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Protein Target
                  </span>
                  <p className="text-xs font-mono-data font-bold text-slate-800">
                    {quantifiedTargets.proteinGuidance}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Added Sugars
                  </span>
                  <p className="text-xs font-mono-data font-bold text-amber-700">
                    {quantifiedTargets.addedSugarLimit}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Hydration
                  </span>
                  <p className="text-xs font-mono-data font-bold text-blue-700">
                    {quantifiedTargets.hydrationGuidance}
                  </p>
                </div>
              </div>

              {/* What to Eat More of & What to Limit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center space-x-2 text-emerald-800 font-geist font-bold text-xs">
                    <Check className="h-4 w-4" />
                    <span>WHAT TO EAT MORE OF (CARDIOPROTECTIVE)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {(dietaryGuidance.foodsToPrioritize || []).map((f: string, i: number) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2.5">
                  <div className="flex items-center space-x-2 text-rose-800 font-geist font-bold text-xs">
                    <Ban className="h-4 w-4" />
                    <span>WHAT TO STRICTLY LIMIT (ATHEROGENIC)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {(dietaryGuidance.foodsToLimit || []).map((f: string, i: number) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-rose-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggested Meal Structure */}
              {mealStructure && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2 text-xs font-geist font-bold text-slate-700 uppercase tracking-wider">
                    <Utensils className="h-4 w-4 text-[#0052ff]" />
                    <span>Suggested Daily Meal Structure</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Breakfast */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[10px] font-mono-data font-bold uppercase text-[#0052ff] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Breakfast
                      </span>
                      <p className="font-geist font-bold text-xs text-slate-800">
                        {mealStructure.breakfast.carbohydrateChoice}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {mealStructure.breakfast.recommendedFoods[1]}
                      </p>
                      <p className="text-[10px] font-mono-data text-slate-500 pt-1 border-t border-slate-200">
                        Portion: {mealStructure.breakfast.portionGuidance}
                      </p>
                    </div>

                    {/* Lunch */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[10px] font-mono-data font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Lunch
                      </span>
                      <p className="font-geist font-bold text-xs text-slate-800">
                        {mealStructure.lunch.proteinSource}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {mealStructure.lunch.vegetableBase}
                      </p>
                      <p className="text-[10px] font-mono-data text-slate-500 pt-1 border-t border-slate-200">
                        Carb: {mealStructure.lunch.carbSource}
                      </p>
                    </div>

                    {/* Mid-day Snack */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[10px] font-mono-data font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Mid-Day Snack
                      </span>
                      <p className="font-geist font-bold text-xs text-slate-800">
                        {mealStructure.snack.options[0]}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {mealStructure.snack.options[1]}
                      </p>
                      <p className="text-[10px] font-mono-data text-slate-500 pt-1 border-t border-slate-200">
                        Portion: {mealStructure.snack.portionGuidance}
                      </p>
                    </div>

                    {/* Dinner */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[10px] font-mono-data font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        Dinner
                      </span>
                      <p className="font-geist font-bold text-xs text-slate-800">
                        {mealStructure.dinner.proteinSource}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {mealStructure.dinner.vegetables}
                      </p>
                      <p className="text-[10px] font-mono-data text-slate-500 pt-1 border-t border-slate-200">
                        Carb: {mealStructure.dinner.carbPortion}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Progressive Physical Activity Plan */}
          {exerciseGuidance && (
            <div className="bg-white p-6 rounded-2xl border border-[#c3c5d9] shadow-stitch space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-geist font-bold text-sm text-[#0b1c30]">
                      {exerciseGuidance.title}
                    </h3>
                    <p className="text-[11px] font-inter text-slate-500">
                      Current Activity: <span className="font-semibold">{exerciseGuidance.currentActivityStatus}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono-data font-bold text-[#0052ff] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 self-start sm:self-auto">
                  {exerciseGuidance.weeklyTargetMins} mins/week ({exerciseGuidance.intensity})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-inter">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Initial Target
                  </span>
                  <p className="text-slate-800 font-medium">
                    {exerciseGuidance.initialTarget}
                  </p>
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500 pt-1 block">
                    Progression Plan
                  </span>
                  <p className="text-slate-600 leading-snug">
                    {exerciseGuidance.progressionPlan}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500">
                    Cardiovascular Safety Precaution
                  </span>
                  <p className="text-rose-700 font-medium leading-snug">
                    {exerciseGuidance.safetyPrecautions}
                  </p>
                  <span className="text-[9.5px] font-mono-data font-bold uppercase text-slate-500 pt-1 block">
                    Target Intensity Zone
                  </span>
                  <p className="text-slate-600 leading-snug">
                    Maintain aerobic exertion within 60-75% of maximum predicted heart rate.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 6. Smoking Cessation Protocol if Active Smoker */}
          {plan?.smokingCessation?.isPriority && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <h4 className="font-geist font-bold text-sm text-rose-900">
                    {plan.smokingCessation.urgency}
                  </h4>
                  <p className="text-[11px] font-inter text-rose-700">
                    Active smoking was detected as one of your highest modifiable cardiovascular risk drivers
                  </p>
                </div>
              </div>
              <ul className="space-y-1 text-xs text-rose-800">
                {plan.smokingCessation.guidance.map((g: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="font-bold">•</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 text-[10px] font-mono-data text-rose-700 border-t border-rose-200/80">
                Resources: {plan.smokingCessation.resources}
              </div>
            </div>
          )}

          {/* 7. Prioritized Prevention Protocol Cards (Detail View) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-geist font-bold text-base text-[#0b1c30]">
                  Detailed Prevention Recommendations
                </h3>
                <p className="text-xs font-inter text-slate-500">
                  Every recommendation explains WHY it was selected based on your actual Risk Scan
                </p>
              </div>
              <div className="flex items-center space-x-2 text-[10px] font-mono-data font-bold uppercase">
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  {highRecs.length} High
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {mediumRecs.length} Medium
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {lowRecs.length} Routine
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => {
                const isHigh = rec.priority === 'HIGH';
                const isMedium = rec.priority === 'MEDIUM';

                return (
                  <div
                    key={rec.id}
                    className={`p-5 rounded-2xl border transition-all shadow-2xs flex flex-col justify-between space-y-4 ${
                      isHigh
                        ? 'bg-white border-rose-200/90 hover:border-rose-300'
                        : isMedium
                        ? 'bg-white border-blue-200/90 hover:border-blue-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[9.5px] font-mono-data font-bold uppercase px-2 py-0.5 rounded-full border ${
                              isHigh
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isMedium
                                ? 'bg-blue-50 text-[#0052ff] border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            ● {rec.priority} Priority
                          </span>
                          <span className="text-[10px] font-inter font-medium text-slate-500">
                            {rec.category}
                          </span>
                        </div>
                        {rec.isShapDriver && (
                          <span className="text-[9px] font-mono-data text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-semibold border border-rose-200/60">
                            ★ Key Driver
                          </span>
                        )}
                      </div>

                      <h4 className="font-geist font-bold text-sm text-[#0b1c30]">
                        {rec.title}
                      </h4>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex items-center space-x-1.5 text-[10px] font-mono-data font-bold uppercase text-slate-500">
                          <Info className="h-3 w-3 text-slate-400" />
                          <span>Why this is recommended</span>
                        </div>
                        <p className="text-[11.5px] font-inter text-[#434656] leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono-data font-bold uppercase text-slate-500">
                          Recommended Action
                        </span>
                        <div className="text-xs font-inter text-[#0b1c30] leading-relaxed flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <p>{rec.action}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono-data text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{rec.timeframe}</span>
                      </div>
                      <div className="flex items-center space-x-1 truncate max-w-[50%]">
                        <BookOpen className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate" title={rec.evidenceSource}>
                          {rec.evidenceSource}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8. Clinical Consultation Timeline */}
          {plan?.clinicalFollowUp && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="h-9 w-9 rounded-xl bg-blue-100/70 text-[#0052ff] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-geist font-bold text-xs uppercase tracking-wider text-[#0052ff]">
                    Physician Consultation Timeline
                  </h4>
                  <p className="text-xs font-inter text-slate-700 leading-relaxed mt-0.5">
                    {plan.clinicalFollowUp}
                  </p>
                </div>
              </div>
              <Link
                to="/nearby"
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 text-xs font-geist font-bold flex items-center space-x-1.5 shrink-0 shadow-2xs transition-all"
              >
                <span>Find Nearby Cardiologist</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* 9. Registered Dietitian Disclaimer & Decision Support Notice */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-inter text-slate-500 leading-relaxed text-center space-y-1">
            <p className="font-bold text-slate-700">
              Clinical Decision-Support & Lifestyle Prevention Notice
            </p>
            <p>
              {plan?.dietitianDisclaimer || 'General prevention guidance — individualized nutritional and caloric targets should be confirmed with a qualified healthcare professional or registered dietitian.'}
            </p>
            <p className="text-[10px] text-slate-400">
              HridayaDarpana Prevention Coach does not prescribe medication, diagnose illnesses, or replace consultation with a licensed physician or cardiologist.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

