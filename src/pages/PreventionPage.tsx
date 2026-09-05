import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Loader2, Apple, Dumbbell, Compass, Award, Calendar, Heart } from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export default function PreventionPage() {
  const { data: latest, isLoading, error } = useQuery({
    queryKey: ['latestPrediction'],
    queryFn: () => api.get('/prediction/latest'),
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500">Compiling personalized prevention guidelines...</p>
        </div>
      </div>
    );
  }

  const hasPrediction = !!latest?.prediction;
  const dietData = latest?.dietPlan ? JSON.parse(JSON.stringify(latest.dietPlan.planData)) : [];
  const exerciseData = latest?.exercisePlan ? JSON.parse(JSON.stringify(latest.exercisePlan.planData)) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 border border-[#c3c5d9] shadow-stitch">
        <div>
          <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider text-[#0052ff]">HridayaDarpana Preventive Care</span>
          <h2 className="text-xl font-geist font-bold tracking-tight mt-0.5 text-[#0b1c30]">Cardiovascular Prevention Coach</h2>
          <p className="text-xs font-inter text-[#434656] mt-1 max-w-xl">
            AI-generated preventive prescriptions covering clean nutrition, cardiorespiratory endurance workouts, and vascular lifestyle habits.
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-[#eff4ff] text-[#005a3c] border border-[#005a3c]/30 flex items-center justify-center shrink-0 shadow-sm">
          <Shield className="h-6 w-6" />
        </div>
      </div>

      {!hasPrediction ? (
        <div className="bg-white p-8 rounded-2xl text-center border border-[#c3c5d9] shadow-stitch py-16">
          <Heart className="h-12 w-12 text-[#ba1a1a] mx-auto mb-4 animate-pulse" />
          <h3 className="font-geist font-bold text-base mb-2 text-[#0b1c30]">No Preventive Coach Active</h3>
          <p className="text-xs font-inter text-[#737688] max-w-sm mx-auto mb-6 leading-relaxed">
            Before we can formulate diet targets and aerobic workout schedules, we need to assess your risk factors. Complete a predictive diagnostic scan first.
          </p>
          <Link to="/prediction" className="px-6 py-3 rounded-xl bg-[#0052ff] hover:bg-[#003ec7] text-xs font-geist font-bold text-white shadow-md transition-all inline-block">
            Start Diagnostic Scan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Diet Planner Cards */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white p-6 rounded-2xl relative border border-[#c3c5d9] shadow-stitch">
              <div className="flex items-center space-x-3 mb-6 pb-3 border-b border-[#e5eeff]">
                <div className="p-2 rounded-xl bg-[#ffdad6] text-[#ba1a1a]">
                  <Apple className="h-5 w-5" />
                </div>
                <h3 className="font-geist font-bold text-sm text-[#0b1c30]">Cardiac Nutrition Diet Plans</h3>
              </div>

              <div className="space-y-4">
                {Array.isArray(dietData) && dietData.map((item: string, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] text-xs font-inter text-[#0b1c30] leading-relaxed flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-[#ffdad6] text-[#93000a] flex items-center justify-center text-[10px] font-mono-data font-bold shrink-0 mt-0.5">{idx + 1}</span>
                    <p className="text-[#0b1c30]">{item}</p>
                  </div>
                ))}
              </div>

              {latest?.dietPlan && (
                <div className="mt-6 pt-4 border-t border-[#e5eeff] grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff]">
                    <span className="text-[9px] font-mono-data text-[#737688] uppercase font-bold">Calories</span>
                    <p className="text-xs font-mono-data font-bold text-[#0052ff] mt-0.5">{latest.dietPlan.calories} kcal</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff]">
                    <span className="text-[9px] font-mono-data text-[#737688] uppercase font-bold">Carbs</span>
                    <p className="text-xs font-mono-data font-bold text-[#0052ff] mt-0.5">{latest.dietPlan.macroCarbs}g</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff]">
                    <span className="text-[9px] font-mono-data text-[#737688] uppercase font-bold">Protein</span>
                    <p className="text-xs font-mono-data font-bold text-[#0052ff] mt-0.5">{latest.dietPlan.macroPro}g</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Exercise Plans & Lifestyle Goals */}
          <div className="lg:col-span-6 space-y-6">
            {/* Exercise Plan */}
            <div className="bg-white p-6 rounded-2xl relative border border-[#c3c5d9] shadow-stitch">
              <div className="flex items-center space-x-3 mb-6 pb-3 border-b border-[#e5eeff]">
                <div className="p-2 rounded-xl bg-[#eff4ff] text-[#005a3c]">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <h3 className="font-geist font-bold text-sm text-[#0b1c30]">Cardiac Endurance Workouts</h3>
              </div>

              <div className="space-y-4">
                {Array.isArray(exerciseData) && exerciseData.map((item: string, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] text-xs font-inter text-[#0b1c30] leading-relaxed flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-[#e5eeff] text-[#0052ff] flex items-center justify-center text-[10px] font-mono-data font-bold shrink-0 mt-0.5">{idx + 1}</span>
                    <p className="text-[#0b1c30]">{item}</p>
                  </div>
                ))}
              </div>

              {latest?.exercisePlan && (
                <div className="mt-6 pt-4 border-t border-[#e5eeff] flex items-center justify-between text-xs font-inter">
                  <span className="text-[#737688]">Target Workout Time:</span>
                  <span className="font-mono-data font-bold text-[#0052ff] text-sm">{latest.exercisePlan.targetMins} mins/week</span>
                </div>
              )}
            </div>

            {/* Quick coaching targets */}
            <div className="glass-panel p-6 rounded-2xl relative bg-gradient-to-r from-blue-50/60 to-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h4 className="font-display font-bold text-sm text-slate-900">Prevention Milestones</h4>
              </div>
              <p className="text-xs text-slate-600 font-light leading-relaxed mb-4">
                Maintaining a consistent routine lowers cardiovascular strain. Track water logging in your primary dashboard and log steps daily to hit weekly targets.
              </p>
              <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xxs shadow-xs">
                <span className="text-emerald-600 font-bold">Active Focus:</span>
                <span className="font-semibold text-slate-800">Daily Blood Pressure checks</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
