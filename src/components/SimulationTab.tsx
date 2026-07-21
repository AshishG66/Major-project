import React from 'react';
import { Sparkles } from 'lucide-react';
import BodyStatus from './BodyStatus';
import AIExplainability from './AIExplainability';

interface SimulationTabProps {
  isSimActive: boolean;
  setIsSimActive: (val: boolean) => void;
  simBP: number;
  setSimBP: (val: number) => void;
  simBmi: number;
  setSimBmi: (val: number) => void;
  simStress: number;
  setSimStress: (val: number) => void;
  simExercise: number;
  setSimExercise: (val: number) => void;
  simSleep: number;
  setSimSleep: (val: number) => void;
  simulatedHR: number;
}

export default function SimulationTab({
  isSimActive,
  setIsSimActive,
  simBP,
  setSimBP,
  simBmi,
  setSimBmi,
  simStress,
  setSimStress,
  simExercise,
  setSimExercise,
  simSleep,
  setSimSleep,
  simulatedHR
}: SimulationTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* What-if Simulator Card */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border-white/5 flex flex-col justify-between h-[310px]">
          <div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4.5 w-4.5 text-health-rose animate-pulse" />
                <h4 className="font-display font-bold text-xs uppercase text-health-rose tracking-wider">What-If Vitals Simulator</h4>
              </div>
              <button 
                onClick={() => setIsSimActive(!isSimActive)}
                className={`text-[8px] px-2.5 py-1 rounded font-bold uppercase transition-all border ${
                  isSimActive ? 'bg-health-rose/20 border-health-rose text-health-rose shadow-glow-rose' : 'bg-white/5 border-white/10 hover:text-white'
                }`}
              >
                {isSimActive ? 'SIMULATOR ACTIVE' : 'ACTIVATE SIMULATOR'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-semibold">
                <span>Systolic BP</span>
                <span className="text-health-rose">{simBP} mmHg</span>
              </div>
              <input
                type="range" min="80" max="180" value={simBP}
                disabled={!isSimActive}
                onChange={(e) => setSimBP(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded accent-health-rose cursor-pointer disabled:opacity-30"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-semibold">
                <span>BMI Rating</span>
                <span className="text-health-blue">{simBmi}</span>
              </div>
              <input
                type="range" min="16" max="36" step="0.1" value={simBmi}
                disabled={!isSimActive}
                onChange={(e) => setSimBmi(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded accent-health-blue cursor-pointer disabled:opacity-30"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-semibold">
                <span>Stress Level</span>
                <span className="text-health-violet">{simStress}/10</span>
              </div>
              <input
                type="range" min="1" max="10" value={simStress}
                disabled={!isSimActive}
                onChange={(e) => setSimStress(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded accent-health-violet cursor-pointer disabled:opacity-30"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-semibold">
                <span>Exercise Freq</span>
                <span className="text-health-emerald">{simExercise} d/wk</span>
              </div>
              <input
                type="range" min="0" max="7" value={simExercise}
                disabled={!isSimActive}
                onChange={(e) => setSimExercise(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded accent-health-emerald cursor-pointer disabled:opacity-30"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex justify-between text-[10px] font-semibold">
                <span>Sleep duration</span>
                <span className="text-health-cyan">{simSleep} hrs</span>
              </div>
              <input
                type="range" min="4" max="10" step="0.5" value={simSleep}
                disabled={!isSimActive}
                onChange={(e) => setSimSleep(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded accent-health-cyan cursor-pointer disabled:opacity-30"
              />
            </div>
          </div>
        </div>

        {/* Body Status (Biometric Hotspot Map twin) */}
        <div className="lg:col-span-7 flex flex-col">
          <BodyStatus
            bp={simBP}
            exercise={simExercise}
            sleep={simSleep}
            stress={simStress}
            heartRate={simulatedHR}
          />
        </div>
      </div>

      {/* RAG Explainability diagram */}
      <div className="w-full">
        <AIExplainability />
      </div>
    </div>
  );
}
