import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Clipboard, Award, ShieldAlert, CheckSquare, ArrowRight } from 'lucide-react';

interface ExplStep {
  name: string;
  sub: string;
  details: string;
  color: string;
  icon: React.ComponentType<any>;
}

export default function AIExplainability() {
  const steps: ExplStep[] = [
    { name: 'AI Brain', sub: 'Neural Engine', details: 'Deep MLP Classifier evaluates multi-organ parameters.', color: 'text-health-blue border-health-blue/20 bg-health-blue/5', icon: Brain },
    { name: 'Reasoning', sub: 'Clinical Logic', details: 'Traces factor correlations against cardiovascular datasets.', color: 'text-health-cyan border-health-cyan/20 bg-health-cyan/5', icon: Clipboard },
    { name: 'Confidence', sub: 'AUC Scoring', details: 'Probability metric checks classifier score boundaries.', color: 'text-health-violet border-health-violet/20 bg-health-violet/5', icon: Award },
    { name: 'Feature Contribution', sub: 'SHAP Valuation', details: 'Quantifies impact weights for BP, exercise, sleep, and stress.', color: 'text-health-rose border-health-rose/20 bg-health-rose/5', icon: ShieldAlert },
    { name: 'Recommendation', sub: 'Action Plan', details: 'Generates DASH recipes and custom exercise zones.', color: 'text-health-emerald border-health-emerald/20 bg-health-emerald/5', icon: CheckSquare }
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden flex flex-col justify-between h-[360px] flex-1">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:100%_12px] pointer-events-none" />

      <div>
        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-1">
          HridyaAI Self-Explainability Pipeline
        </h4>
        <p className="text-[9px] text-health-textMuted leading-relaxed font-light">
          Real-time visual map tracing local model inference and diagnostic transparency.
        </p>
      </div>

      {/* Main Connected Graph */}
      <div className="flex flex-col lg:flex-row items-center justify-between relative py-6 gap-4 lg:gap-2 z-10 flex-1 my-2">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          
          return (
            <React.Fragment key={idx}>
              {/* Explainability Node */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.03 }}
                className={`p-3.5 rounded-xl border flex flex-col items-center text-center w-full lg:w-36 ${step.color} relative group cursor-pointer hover:border-current transition-all`}
              >
                <div className="h-8 w-8 rounded-lg bg-black/40 flex items-center justify-center mb-2.5">
                  <step.icon className="h-4.5 w-4.5" />
                </div>
                
                <h5 className="font-bold text-[10px] text-white/95">{step.name}</h5>
                <span className="text-[7.5px] uppercase font-bold tracking-wider opacity-75 mt-0.5">{step.sub}</span>
                
                <p className="text-[7px] text-health-textMuted font-light leading-snug mt-2 opacity-0 group-hover:opacity-100 h-0 group-hover:h-auto transition-all duration-300 overflow-hidden">
                  {step.details}
                </p>
              </motion.div>

              {/* Connecting glowing Arrow with moving pulse dot */}
              {!isLast && (
                <div className="hidden lg:flex items-center justify-center relative w-8 h-4">
                  <ArrowRight className="h-3.5 w-3.5 text-white/10" />
                  
                  {/* Moving pulse dot along the arrow path */}
                  <motion.div
                    animate={{ x: [-15, 15] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.8,
                      ease: 'linear',
                      delay: idx * 0.3
                    }}
                    className="absolute h-1.5 w-1.5 rounded-full bg-health-cyan shadow-glow-cyan"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="border-t border-white/5 pt-2.5 flex justify-between items-center text-[8px] text-health-textMuted">
        <span>Attribution model: Shapley Kernel Values (SHAP)</span>
        <span className="text-health-cyan font-bold">100% Explainable</span>
      </div>
    </div>
  );
}
