import React from 'react';
import { motion } from 'framer-motion';
import type { MACEPrediction } from '../store/digitalTwinStore';
import { DIM_LABELS } from '../store/digitalTwinStore';

interface ModelAttributionProps {
  prediction: MACEPrediction;
}

function formatFeatureName(name: string): string {
  return DIM_LABELS[name] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ModelAttribution({ prediction }: ModelAttributionProps) {
  const { top_features, xgb_contribution, lstm_contribution, static_baseline_score, fp_reduction_pct } = prediction;

  return (
    <div className="space-y-5">
      {/* Architecture Diagram */}
      <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Model Architecture</h4>
        <div className="flex items-center justify-between gap-2">
          {/* XGBoost branch */}
          <div className="flex-1 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div className="text-[10px] font-bold text-blue-700">XGBoost</div>
              <div className="text-[9px] text-blue-500 mt-0.5">32 Static Features</div>
            </div>
            <div className="w-px h-4 bg-blue-200 mx-auto" />
            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
              <div className="text-[9px] font-bold text-blue-600">{(xgb_contribution * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Fusion arrow */}
          <div className="flex flex-col items-center gap-1 px-2">
            <div className="w-8 h-px bg-slate-300" />
            <div className="bg-slate-800 text-white rounded-md px-2 py-1.5">
              <div className="text-[9px] font-bold">Meta</div>
              <div className="text-[8px] opacity-70">Learner</div>
            </div>
            <div className="w-8 h-px bg-slate-300" />
          </div>

          {/* LSTM branch */}
          <div className="flex-1 text-center">
            <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
              <div className="text-[10px] font-bold text-violet-700">LSTM</div>
              <div className="text-[9px] text-violet-500 mt-0.5">Temporal Sequence</div>
            </div>
            <div className="w-px h-4 bg-violet-200 mx-auto" />
            <div className="bg-violet-50 border border-violet-200 rounded px-2 py-1">
              <div className="text-[9px] font-bold text-violet-600">{(lstm_contribution * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Feature Importances */}
      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Top Risk Drivers</h4>
        <div className="space-y-2">
          {top_features.map((feat, idx) => {
            const maxContrib = Math.max(...top_features.map(f => Math.abs(f.contribution)), 0.01);
            const barWidth = (Math.abs(feat.contribution) / maxContrib) * 100;
            const isProtective = feat.direction === 'protective';

            return (
              <motion.div
                key={feat.feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <div className="w-28 text-right">
                  <span className="text-[11px] font-medium text-slate-600">{formatFeatureName(feat.feature)}</span>
                </div>
                <div className="flex-1 h-5 bg-slate-50 rounded-full overflow-hidden relative">
                  <motion.div
                    className={`h-full rounded-full ${isProtective ? 'bg-emerald-400' : 'bg-red-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className={`text-[10px] font-bold ${isProtective ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isProtective ? '↓' : '↑'} {feat.value}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Baseline Comparison */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">vs. Static Calculator</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 mb-1">Static Baseline (Framingham)</div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full"
                style={{ width: `${Math.min(static_baseline_score * 100, 100)}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-400 mt-0.5">{(static_baseline_score * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold text-emerald-600">−{fp_reduction_pct.toFixed(0)}%</div>
            <div className="text-[9px] text-emerald-500 font-medium">False Positives</div>
          </div>
        </div>
      </div>
    </div>
  );
}
