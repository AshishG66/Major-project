import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MACEPrediction } from '../store/digitalTwinStore';

interface MACEGaugeProps {
  prediction: MACEPrediction;
}

function tierColor(tier: string): { stroke: string; bg: string; text: string; badge: string } {
  switch (tier) {
    case 'LOW':
      return { stroke: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'MODERATE':
      return { stroke: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'HIGH':
      return { stroke: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-200' };
    case 'CRITICAL':
      return { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-200' };
    default:
      return { stroke: '#64748b', bg: 'bg-slate-50', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export default function MACEGauge({ prediction }: MACEGaugeProps) {
  const { mace_percentage, risk_tier, confidence, fp_reduction_pct, xgb_contribution, lstm_contribution } = prediction;
  const colors = tierColor(risk_tier);

  // SVG arc gauge
  const radius = 80;
  const strokeWidth = 10;
  const cx = 100, cy = 100;
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle; // 270°
  const progressAngle = startAngle + (totalAngle * Math.min(mace_percentage, 100)) / 100;

  const polarToCartesian = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });

  const describeArc = (start: number, end: number, r: number) => {
    const startPt = polarToCartesian(start, r);
    const endPt = polarToCartesian(end, r);
    const largeArc = Math.abs(end - start) > 180 ? 1 : 0;
    return `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;
  };

  const bgArc = describeArc(startAngle, endAngle, radius);
  const fillArc = describeArc(startAngle, progressAngle, radius);

  // Needle position
  const needleAngle = progressAngle;
  const needleTip = polarToCartesian(needleAngle, radius - strokeWidth / 2 - 4);

  const totalContrib = xgb_contribution + lstm_contribution;
  const xgbPct = totalContrib > 0 ? Math.round((xgb_contribution / totalContrib) * 100) : 65;
  const lstmPct = 100 - xgbPct;

  return (
    <div className="flex flex-col items-center">
      {/* Gauge */}
      <div className="relative">
        <svg width="200" height="160" viewBox="0 0 200 160">
          {/* Background arc */}
          <path d={bgArc} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} strokeLinecap="round" />
          {/* Progress arc */}
          <motion.path
            d={fillArc}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          {/* Needle dot */}
          <motion.circle
            cx={needleTip.x}
            cy={needleTip.y}
            r="5"
            fill={colors.stroke}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
          />
          {/* Center text */}
          <text x={cx} y={cy - 8} textAnchor="middle" className="text-3xl font-bold" fill="#0f172a" fontSize="32" fontWeight="700">
            {mace_percentage.toFixed(1)}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">
            % MACE Risk
          </text>
        </svg>
      </div>

      {/* Risk tier badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`px-4 py-1.5 rounded-full border text-xs font-bold tracking-wide ${colors.badge} mt-1`}
      >
        {risk_tier} RISK
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 w-full mt-5">
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-medium uppercase">Confidence</div>
          <div className="text-sm font-bold text-slate-700">{(confidence * 100).toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-medium uppercase">FP Reduction</div>
          <div className="text-sm font-bold text-emerald-600">−{fp_reduction_pct.toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-medium uppercase">Threshold</div>
          <div className="text-sm font-bold text-slate-700">{(prediction.threshold * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Model contribution bar */}
      <div className="w-full mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-blue-600">XGBoost {xgbPct}%</span>
          <span className="text-[10px] font-medium text-violet-600">LSTM {lstmPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
          <motion.div
            className="h-full bg-blue-500 rounded-l-full"
            initial={{ width: 0 }}
            animate={{ width: `${xgbPct}%` }}
            transition={{ duration: 1, delay: 0.5 }}
          />
          <motion.div
            className="h-full bg-violet-500 rounded-r-full"
            initial={{ width: 0 }}
            animate={{ width: `${lstmPct}%` }}
            transition={{ duration: 1, delay: 0.7 }}
          />
        </div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[9px] text-slate-500">Static Features</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-[9px] text-slate-500">Temporal Patterns</span>
          </div>
        </div>
      </div>
    </div>
  );
}
