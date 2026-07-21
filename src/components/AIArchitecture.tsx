import React from 'react';
import { User, Activity, Database, Cpu, MessageSquare, Clipboard, Layout, Plus } from 'lucide-react';

interface ArchStep {
  name: string;
  source: string;
  desc: string;
  color: string;
  icon: React.ComponentType<any>;
}

export default function AIArchitecture() {
  const pipeline: ArchStep[] = [
    { name: 'User Logs', source: 'Telemetry', desc: 'Vitals, steps, sleep, and water metrics.', color: 'text-health-blue border-health-blue/20 bg-health-blue/5', icon: User },
    { name: 'Prediction', source: 'XGBoost', desc: 'Runs classifier to check probability curves.', color: 'text-health-cyan border-health-cyan/20 bg-health-cyan/5', icon: Activity },
    { name: 'SHAP weights', source: 'SHAP Core', desc: 'Computes feature attributions and impact margins.', color: 'text-health-violet border-health-violet/20 bg-health-violet/5', icon: Cpu },
    { name: 'RAG Context', source: 'ChromaDB', desc: 'Pins symptoms against medical publications.', color: 'text-health-rose border-health-rose/20 bg-health-rose/5', icon: Database },
    { name: 'Gemini LLM', source: 'Google AI', desc: 'Synthesizes clinical advice context.', color: 'text-health-amber border-health-amber/20 bg-health-amber/5', icon: MessageSquare },
    { name: 'Recommendation', source: 'Orchestrator', desc: 'Compiles medical checklist recipes.', color: 'text-health-emerald border-health-emerald/20 bg-health-emerald/5', icon: Clipboard },
    { name: 'Dashboard', source: 'Digital Twin', desc: 'Syncs dynamic dials, 3D heart, and timeline.', color: 'text-white border-white/10 bg-white/5', icon: Layout }
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between h-[360px] flex-1">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px)] bg-[size:4.5rem] pointer-events-none" />

      <div>
        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-1">
          HridyaAI Orchestrator Architecture
        </h4>
        <p className="text-[9px] text-health-textMuted leading-relaxed font-light">
          Active data processing pipeline from patient telemetry input to digital twin sync.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between relative py-6 gap-3 lg:gap-1.5 z-10 flex-1 my-2">
        {pipeline.map((step, idx) => {
          const isLast = idx === pipeline.length - 1;
          
          return (
            <React.Fragment key={idx}>
              {/* Pipe step card */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center w-full lg:w-[100px] ${step.color} relative group cursor-pointer hover:border-current hover:scale-[1.03] transition-all`}
              >
                <div className="h-7 w-7 rounded bg-black/40 flex items-center justify-center mb-1.5">
                  <step.icon className="h-4 w-4" />
                </div>
                
                <h5 className="font-bold text-[8.5px] text-white/95 truncate w-full">{step.name}</h5>
                <span className="text-[6.5px] uppercase font-bold tracking-wider opacity-75 mt-0.5">{step.source}</span>
                
                {/* Description on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg bg-black border border-white/10 text-[7px] text-health-textMuted font-light leading-relaxed hidden group-hover:block z-20 pointer-events-none">
                  {step.desc}
                </div>
              </div>

              {/* Glowing connector segment */}
              {!isLast && (
                <div className="hidden lg:block relative w-5 h-0.5 bg-white/5 flex-1 mx-0.5">
                  <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-health-cyan/50 shadow-glow-cyan" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="border-t border-white/5 pt-2.5 flex justify-between items-center text-[8px] text-health-textMuted">
        <span>RAG Knowledge Store: 85,000+ medical journals mapped</span>
        <span className="text-health-cyan font-bold">Pipeline Active</span>
      </div>
    </div>
  );
}
