import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, CheckCircle2, ChevronRight, Cpu, ShieldCheck, Database, Zap } from 'lucide-react';

interface DashboardLoaderProps {
  onComplete: () => void;
}

const MODULE_STEPS = [
  { label: 'Initializing AI Engine', sub: 'Neural weights loaded', icon: Cpu },
  { label: 'Loading Clinical Models', sub: 'Framingham & ASCVD ensembles active', icon: ShieldCheck },
  { label: 'Connecting Gemini', sub: 'Multi-Agent Gateway authenticated', icon: Zap },
  { label: 'Loading Patient Data', sub: 'EHR metrics & telemetry synced', icon: Database },
  { label: 'Launching Dashboard', sub: 'Digital Twin canvas ready', icon: Sparkles }
];

export default function DashboardLoader({ onComplete }: DashboardLoaderProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < MODULE_STEPS.length - 1) {
          setCompletedSteps((done) => [...done, prev]);
          return prev + 1;
        } else {
          setCompletedSteps((done) => [...done, prev]);
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 450);
          return prev;
        }
      });
    }, 500);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 select-none overflow-hidden"
    >
      {/* Aurora Ambient Particles Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[160px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/12 rounded-full blur-[140px] pointer-events-none" />

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute top-8 right-8 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center space-x-1.5 backdrop-blur-md z-20 group"
      >
        <span>Skip Intro</span>
        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Center Cinematic Container */}
      <div className="relative flex flex-col items-center justify-center max-w-md w-full z-10">
        
        {/* Beating 3D Heart Icon synchronized with ECG */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [1, 1.18, 1, 1.12, 1], opacity: 1 }}
          transition={{
            scale: { repeat: Infinity, duration: 1.25, ease: 'easeInOut' },
            opacity: { duration: 0.6 }
          }}
          className="relative z-10 p-6 rounded-full bg-gradient-to-br from-blue-600/20 via-cyan-500/20 to-emerald-500/10 border border-blue-500/35 backdrop-blur-2xl shadow-[0_0_50px_rgba(59,130,246,0.3)] mb-4"
        >
          <Heart className="h-14 w-14 text-rose-500 fill-rose-500/20 drop-shadow-[0_0_20px_rgba(244,63,94,0.7)]" />
        </motion.div>

        {/* Dynamic ECG Line Animation */}
        <div className="w-full h-14 my-2 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 320 60">
            <path
              d="M 0 30 L 80 30 L 90 8 L 102 52 L 112 18 L 122 40 L 132 30 L 320 30"
              fill="none"
              stroke="#1e293b"
              strokeWidth="2.5"
            />
            <motion.path
              d="M 0 30 L 80 30 L 90 8 L 102 52 L 112 18 L 122 40 L 132 30 L 320 30"
              fill="none"
              stroke="url(#cinematicEcgGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ strokeDasharray: 340, strokeDashoffset: 340 }}
              animate={{ strokeDashoffset: [340, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
            />
            <defs>
              <linearGradient id="cinematicEcgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight text-white mb-2">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]">
              HridayaDarpana
            </span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            AI-Powered Cardiovascular Intelligence Platform
          </p>
        </motion.div>

        {/* Clinical AI Modules Stepped Checklist */}
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl space-y-2.5 shadow-2xl">
          {MODULE_STEPS.map((step, idx) => {
            const isDone = completedSteps.includes(idx);
            const isActive = activeStep === idx;
            const IconComponent = step.icon;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-500/10 border border-blue-500/30 text-white'
                    : isDone
                    ? 'text-slate-400'
                    : 'opacity-40 text-slate-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className={`font-semibold ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {step.label}
                    </p>
                    <p className="text-[10px] text-slate-500">{step.sub}</p>
                  </div>
                </div>

                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isActive ? (
                  <Sparkles className="h-4 w-4 text-cyan-400 animate-spin" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-slate-700" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
