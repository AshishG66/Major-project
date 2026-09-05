import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, Clipboard, Award, ShieldCheck, HelpCircle, Check } from 'lucide-react';

interface JourneyStep {
  label: string;
  sub: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ComponentType<any>;
}

export default function HealthJourney() {
  const steps: JourneyStep[] = [
    { label: 'January', sub: 'Initial Baseline', status: 'completed', icon: Heart },
    { label: 'Prediction', sub: 'Cardio Risk Audit', status: 'completed', icon: Activity },
    { label: 'Lifestyle', sub: 'Log Habits Daily', status: 'completed', icon: Clipboard },
    { label: 'Improved', sub: '8% BP Reduction', status: 'current', icon: Award },
    { label: 'Doctor', sub: 'Clinical Review', status: 'upcoming', icon: Clipboard },
    { label: 'Healthy', sub: 'Digital Twin Safe', status: 'upcoming', icon: ShieldCheck }
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm flex flex-col justify-between h-[310px] relative overflow-hidden flex-1">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px)] bg-[size:3rem] pointer-events-none" />

      <div>
        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">
          Patient Cardiorespiratory Recovery Roadmap
        </h4>
        <p className="text-[9px] text-slate-500 leading-relaxed font-light">
          Milestones achieved along your digital twin diagnostic timeline.
        </p>
      </div>

      {/* Horizontal Roadmap Connector Grid */}
      <div className="relative flex items-center justify-between py-12 px-2 z-10">
        
        {/* Animated Connecting Line behind nodes */}
        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '60%' }} // maps to completed/current stages
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 shadow-xs"
          />
        </div>

        {/* Checkpoint Nodes */}
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          
          return (
            <div key={idx} className="flex flex-col items-center relative z-10 w-16 text-center">
              {/* Checkpoint Dot */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.12 }}
                className={`h-9 w-9 rounded-full border flex items-center justify-center relative cursor-pointer ${
                  isCompleted ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-xs' :
                  isCurrent ? 'bg-cyan-50 border-cyan-500 text-cyan-600 shadow-xs animate-pulse' :
                  'bg-white border-slate-200 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                ) : (
                  <step.icon className="h-4.5 w-4.5" />
                )}

                {/* Pulsing halo around the current step */}
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full border border-cyan-500 animate-ping opacity-60" />
                )}
              </motion.div>

              {/* Milestone texts */}
              <div className="mt-3.5 space-y-0.5">
                <span className={`text-[9px] font-extrabold uppercase block tracking-wider ${
                  isCompleted ? 'text-blue-600' :
                  isCurrent ? 'text-cyan-600 animate-pulse' :
                  'text-slate-400'
                }`}>
                  {step.label}
                </span>
                <span className="text-[7.5px] text-slate-500 block font-light leading-snug whitespace-nowrap truncate max-w-[70px]">
                  {step.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-[8px] text-slate-500">
        <span>Current phase: Milestone 4 (Improved BP stats)</span>
        <span className="text-blue-600 font-bold">60% completed</span>
      </div>
    </div>
  );
}
