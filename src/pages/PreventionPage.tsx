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
          <Loader2 className="h-10 w-10 text-health-cyan animate-spin" />
          <p className="text-sm text-health-textMuted">Compiling personalized prevention guidelines...</p>
        </div>
      </div>
    );
  }

  const hasPrediction = !!latest?.prediction;
  const dietData = latest?.dietPlan ? JSON.parse(JSON.stringify(latest.dietPlan.planData)) : [];
  const exerciseData = latest?.exercisePlan ? JSON.parse(JSON.stringify(latest.exercisePlan.planData)) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Banner */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <span className="text-xxs font-semibold uppercase tracking-wider text-health-textMuted">HridyaDarpan Preventive Care</span>
          <h2 className="text-xl font-display font-extrabold tracking-tight mt-0.5">Cardiovascular Prevention Coach</h2>
          <p className="text-xs text-health-textMuted mt-1 max-w-xl font-light">
            AI-generated preventive prescriptions covering clean nutrition, cardiorespiratory endurance workouts, and vascular lifestyle habits.
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-health-emerald/10 text-health-emerald flex items-center justify-center shrink-0">
          <Shield className="h-6 w-6" />
        </div>
      </div>

      {!hasPrediction ? (
        <div className="glass-panel p-8 rounded-2xl text-center border-health-rose/10 py-16">
          <Heart className="h-12 w-12 text-health-rose/40 mx-auto mb-4" />
          <h3 className="font-display font-bold text-base mb-2">No Preventive Coach Active</h3>
          <p className="text-xs text-health-textMuted max-w-sm mx-auto mb-6 leading-relaxed font-light">
            Before we can formulate diet targets and aerobic workout schedules, we need to assess your risk factors. Complete a predictive diagnostic scan first.
          </p>
          <Link to="/prediction" className="px-5 py-3 rounded-xl bg-gradient-to-r from-health-blue to-health-cyan text-xs font-semibold hover:shadow-glow transition-all">
            Start Diagnostic Scan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Diet Planner Cards */}
          <div className="lg:col-span-6 space-y-5">
            <div className="glass-panel p-6 rounded-2xl relative">
              <div className="flex items-center space-x-3 mb-6 pb-3 border-b border-white/5">
                <Apple className="h-5 w-5 text-health-rose" />
                <h3 className="font-display font-bold text-sm">Cardiac Nutrition Diet Plans</h3>
              </div>

              <div className="space-y-4">
                {Array.isArray(dietData) && dietData.map((item: string, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/30 border border-white/5 text-xs font-light leading-relaxed flex items-start space-x-2.5">
                    <span className="h-4.5 w-4.5 rounded bg-health-rose/15 text-health-rose flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                    <p className="text-white/90">{item}</p>
                  </div>
                ))}
              </div>

              {latest?.dietPlan && (
                <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[9px] text-health-textMuted uppercase font-semibold">Calories</span>
                    <p className="text-xs font-bold text-white/90 mt-0.5">{latest.dietPlan.calories} kcal</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[9px] text-health-textMuted uppercase font-semibold">Carbs</span>
                    <p className="text-xs font-bold text-white/90 mt-0.5">{latest.dietPlan.macroCarbs}g</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[9px] text-health-textMuted uppercase font-semibold">Protein</span>
                    <p className="text-xs font-bold text-white/90 mt-0.5">{latest.dietPlan.macroPro}g</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Exercise Plans & Lifestyle Goals */}
          <div className="lg:col-span-6 space-y-6">
            {/* Exercise Plan */}
            <div className="glass-panel p-6 rounded-2xl relative">
              <div className="flex items-center space-x-3 mb-6 pb-3 border-b border-white/5">
                <Dumbbell className="h-5 w-5 text-health-emerald" />
                <h3 className="font-display font-bold text-sm">Cardiac Endurance Workouts</h3>
              </div>

              <div className="space-y-4">
                {Array.isArray(exerciseData) && exerciseData.map((item: string, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/30 border border-white/5 text-xs font-light leading-relaxed flex items-start space-x-2.5">
                    <span className="h-4.5 w-4.5 rounded bg-health-emerald/15 text-health-emerald flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                    <p className="text-white/90">{item}</p>
                  </div>
                ))}
              </div>

              {latest?.exercisePlan && (
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-health-textMuted">Target Workout Time:</span>
                  <span className="font-semibold text-health-cyan text-sm">{latest.exercisePlan.targetMins} mins/week</span>
                </div>
              )}
            </div>

            {/* Quick coaching targets */}
            <div className="glass-panel p-6 rounded-2xl relative bg-gradient-to-r from-health-blue/10 to-transparent">
              <div className="flex items-center space-x-3 mb-4">
                <Calendar className="h-5 w-5 text-health-blue" />
                <h4 className="font-display font-bold text-sm">Prevention Milestones</h4>
              </div>
              <p className="text-xs text-health-textMuted font-light leading-relaxed mb-4">
                Maintaining a consistent routine lowers cardiovascular strain. Track water logging in your primary dashboard and log steps daily to hit weekly targets.
              </p>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-xxs">
                <span className="text-health-emerald">Active Focus:</span>
                <span className="font-semibold text-white/90">Daily Blood Pressure checks</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
