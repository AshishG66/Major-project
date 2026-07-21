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
    <div className="glass-panel p-6 rounded-2xl border-white/5 flex flex-col justify-between h-[310px] relative overflow-hidden flex-1">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px)] bg-[size:3rem] pointer-events-none" />

      <div>
        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-1">
          Patient Cardiorespiratory Recovery Roadmap
        </h4>
        <p className="text-[9px] text-health-textMuted leading-relaxed font-light">
          Milestones achieved along your digital twin diagnostic timeline.
        </p>
      </div>

      {/* Horizontal Roadmap Connector Grid */}
      <div className="relative flex items-center justify-between py-12 px-2 z-10">
        
        {/* Animated Connecting Line behind nodes */}
        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-white/5 z-0">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '60%' }} // maps to completed/current stages
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-health-blue via-health-cyan to-health-emerald shadow-glow"
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
                  isCompleted ? 'bg-health-blue/15 border-health-blue text-health-blue shadow-glow' :
                  isCurrent ? 'bg-health-cyan/20 border-health-cyan text-health-cyan shadow-glow animate-pulse' :
                  'bg-health-card/80 border-white/5 text-health-textMuted'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                ) : (
                  <step.icon className="h-4.5 w-4.5" />
                )}

                {/* Pulsing halo around the current step */}
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full border border-health-cyan animate-ping opacity-60" />
                )}
              </motion.div>

              {/* Milestone texts */}
              <div className="mt-3.5 space-y-0.5">
                <span className={`text-[9px] font-extrabold uppercase block tracking-wider ${
                  isCompleted ? 'text-health-blue' :
                  isCurrent ? 'text-health-cyan animate-pulse' :
                  'text-health-textMuted'
                }`}>
                  {step.label}
                </span>
                <span className="text-[7.5px] text-health-textMuted block font-light leading-snug whitespace-nowrap truncate max-w-[70px]">
                  {step.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/5 pt-2.5 flex items-center justify-between text-[8px] text-health-textMuted">
        <span>Current phase: Milestone 4 (Improved BP stats)</span>
        <span className="text-health-cyan font-bold">60% completed</span>
      </div>
    </div>
  );
}
