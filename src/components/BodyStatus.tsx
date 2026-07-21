import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Activity, Brain, Shield, Info } from 'lucide-react';

interface BodyStatusProps {
  bp: number;
  exercise: number;
  sleep: number;
  stress: number;
  heartRate: number;
}

export default function BodyStatus({ bp, exercise, sleep, stress, heartRate }: BodyStatusProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  // Dynamic glow evaluations
  const heartState = heartRate >= 90 ? 'rose' : heartRate <= 55 ? 'cyan' : 'emerald';
  const exerciseState = exercise >= 4 ? 'emerald' : exercise >= 2 ? 'amber' : 'rose';
  const stressState = stress >= 7 ? 'rose' : stress >= 4 ? 'amber' : 'emerald';
  const bloodState = bp >= 140 ? 'rose' : bp >= 125 ? 'amber' : 'emerald';

  const getColorClass = (state: 'rose' | 'amber' | 'emerald' | 'cyan') => {
    switch (state) {
      case 'rose': return 'fill-health-rose filter drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]';
      case 'amber': return 'fill-health-amber filter drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]';
      case 'cyan': return 'fill-health-cyan filter drop-shadow-[0_0_8px_rgba(6,182,212,0.7)]';
      case 'emerald': return 'fill-health-emerald filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]';
    }
  };

  const getBorderColorClass = (state: 'rose' | 'amber' | 'emerald' | 'cyan') => {
    switch (state) {
      case 'rose': return 'text-health-rose border-health-rose/30 bg-health-rose/5';
      case 'amber': return 'text-health-amber border-health-amber/30 bg-health-amber/5';
      case 'cyan': return 'text-health-cyan border-health-cyan/30 bg-health-cyan/5';
      case 'emerald': return 'text-health-emerald border-health-emerald/30 bg-health-emerald/5';
    }
  };

  interface Organ {
    id: string;
    name: string;
    cx: number;
    cy: number;
    r: number;
    state: 'rose' | 'amber' | 'emerald' | 'cyan';
    details: string;
    icon: React.ComponentType<any>;
  }

  const organs: Organ[] = [
    {
      id: 'brain',
      name: '🧠 Stress & Cortisol',
      cx: 100, cy: 30, r: 8,
      state: stressState,
      details: `Stress rating is logged at ${stress}/10. Cortisol triggers heart vasoconstriction.`,
      icon: Brain
    },
    {
      id: 'lungs',
      name: '🫁 Respiration (Lungs)',
      cx: 100, cy: 75, r: 10,
      state: sleep >= 7 ? 'emerald' : 'amber',
      details: `Sleep duration averages ${sleep}h. Steady nocturnal oxygenation values.`,
      icon: Shield
    },
    {
      id: 'heart',
      name: '❤️ Cardiovascular (Heart)',
      cx: 94, cy: 82, r: 7,
      state: heartState,
      details: `Resting heart rate registers at ${heartRate} bpm. Cardiac double-pulse active.`,
      icon: Heart
    },
    {
      id: 'blood',
      name: '🩸 Vascular Pressure',
      cx: 100, cy: 110, r: 6,
      state: bloodState,
      details: `Systolic BP evaluated at ${bp} mmHg. Capillary resistance is ${bp >= 140 ? 'elevated' : 'stable'}.`,
      icon: Activity
    },
    {
      id: 'muscles',
      name: '💪 Physical Activity',
      cx: 75, cy: 115, r: 8,
      state: exerciseState,
      details: `Cardio workouts logged at ${exercise} days/week. Ventricular stroke volume optimal.`,
      icon: Activity
    }
  ];


  const activeOrgan = organs.find(o => o.id === hoveredPart);

  return (
    <div className="glass-panel p-6 rounded-2xl border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden flex-1">
      {/* Absolute badge */}
      <span className="absolute top-3 left-3 text-[9px] uppercase font-bold text-health-textMuted tracking-wider">
        Biometric Twin Status Map
      </span>

      {/* Hologram Body Drawing */}
      <div className="relative w-44 h-72 flex items-center justify-center shrink-0">
        <svg className="w-full h-full" viewBox="0 0 200 300">
          <defs>
            <linearGradient id="bodyGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.08)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.01)" />
            </linearGradient>
          </defs>

          {/* Torso & Limbs Silhouette */}
          <path
            d="M100 15 C108 15, 116 22, 116 35 C116 48, 108 55, 100 55 C92 55, 84 48, 84 35 C84 22, 92 15, 100 15 Z
               M100 56 L100 62
               M75 75 C85 62, 115 62, 125 75 C132 85, 142 120, 142 160 C142 165, 137 170, 133 165 C129 160, 126 128, 124 115 C124 125, 126 160, 126 210 C126 215, 121 215, 118 210 L104 150 L100 150 L96 150 L82 210 C79 215, 74 215, 74 210 C74 160, 76 125, 76 115 C74 128, 71 160, 67 165 C63 170, 58 165, 58 160 C58 120, 68 85, 75 75 Z"
            fill="url(#bodyGlow)"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.5"
          />

          {/* Glowing vascular blood pathways */}
          <path
            d="M100 60 L100 120 M100 90 L68 125 M100 90 L132 125 M100 120 L86 180 M100 120 L114 180"
            fill="none"
            stroke={bp >= 140 ? 'rgba(244,63,94,0.18)' : 'rgba(16,185,129,0.18)'}
            strokeWidth="2.5"
            className={hoveredPart === 'blood' ? 'animate-pulse' : ''}
          />

          {/* Organs / Nodes */}
          {organs.map((organ) => {
            const isHovered = hoveredPart === organ.id;
            return (
              <g 
                key={organ.id}
                onMouseEnter={() => setHoveredPart(organ.id)}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer group"
              >
                {/* Outer pulsation ring */}
                <circle
                  cx={organ.cx}
                  cy={organ.cy}
                  r={organ.r + 5}
                  className={`fill-none stroke-current opacity-20 transition-all duration-300 ${
                    isHovered 
                      ? (organ.state === 'rose' ? 'text-health-rose animate-ping' :
                         organ.state === 'amber' ? 'text-health-amber animate-pulse' :
                         'text-health-emerald animate-pulse')
                      : (organ.state === 'rose' ? 'text-health-rose' :
                         organ.state === 'amber' ? 'text-health-amber' :
                         'text-health-emerald')
                  }`}
                  strokeWidth="1"
                />
                {/* Core hotspot */}
                <circle
                  cx={organ.cx}
                  cy={organ.cy}
                  r={organ.r}
                  className={`transition-all duration-300 group-hover:scale-[1.35] ${getColorClass(organ.state)}`}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Details Box */}
      <div className="flex-1 flex flex-col justify-between self-stretch py-2 min-w-0">
        <div>
          <h4 className="text-xs font-semibold text-white/90 mb-2 border-b border-white/5 pb-1">
            Dynamic System Biometrics
          </h4>

          <div className="space-y-2">
            {organs.map((organ) => {
              const isSelected = hoveredPart === organ.id;
              return (
                <div
                  key={organ.id}
                  onMouseEnter={() => setHoveredPart(organ.id)}
                  onMouseLeave={() => setHoveredPart(null)}
                  className={`p-2.5 rounded-xl border text-[10px] transition-all cursor-pointer ${
                    isSelected 
                      ? getBorderColorClass(organ.state) + ' border-current scale-[1.02]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center font-bold">
                    <span>{organ.name}</span>
                    <span className="text-[8px] uppercase px-1.5 py-0.5 rounded bg-black/30">
                      {organ.state === 'rose' ? 'Strain Alert' : organ.state === 'amber' ? 'Borderline' : 'Ideal'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Telemetry Box */}
        <div className="h-16 mt-4 p-2 rounded-xl bg-black/40 border border-white/5 text-[9px] font-light flex items-start space-x-2">
          <Info className="h-4.5 w-4.5 text-health-blue shrink-0 mt-0.5" />
          <AnimatePresence mode="wait">
            {activeOrgan ? (
              <motion.div
                key={activeOrgan.id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="space-y-0.5"
              >
                <span className="font-bold text-white uppercase block">{activeOrgan.name} telemetry</span>
                <p className="text-health-textMuted leading-relaxed">{activeOrgan.details}</p>
              </motion.div>
            ) : (
              <motion.div
                key="default-telemetry"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-health-textMuted flex items-center h-full italic"
              >
                Hover over specific hotspot nodes on the biometric model twin to verify diagnostic telemetry reviews.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
