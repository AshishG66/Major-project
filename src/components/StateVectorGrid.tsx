import React from 'react';
import { motion } from 'framer-motion';
import { DIM_LABELS, DIM_GROUPS, DIM_UNITS, NORMAL_RANGES, type StateValues } from '../store/digitalTwinStore';

interface StateVectorGridProps {
  values: StateValues;
  deviations: Record<string, string>;
}

function getDeviationColor(deviation: string): string {
  switch (deviation) {
    case 'above_normal': return 'bg-red-50 border-red-200 text-red-700';
    case 'below_normal': return 'bg-amber-50 border-amber-200 text-amber-700';
    default: return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  }
}

function getDeviationDot(deviation: string): string {
  switch (deviation) {
    case 'above_normal': return 'bg-red-400';
    case 'below_normal': return 'bg-amber-400';
    default: return 'bg-emerald-400';
  }
}

function getDeviationBadge(deviation: string): string {
  switch (deviation) {
    case 'above_normal': return '↑ HIGH';
    case 'below_normal': return '↓ LOW';
    default: return '● OK';
  }
}

function formatValue(key: string, val: number): string {
  if (key === 'troponin_i') return val.toFixed(3);
  if (key === 'hba1c' || key === 'creatinine') return val.toFixed(1);
  if (key === 'skin_temp') return val.toFixed(1);
  if (key === 'activity_level') return val.toFixed(1);
  if (key === 'sex') return val === 0 ? 'M' : 'F';
  if (key === 'smoking_status') return val === 1 ? 'Yes' : 'No';
  return Math.round(val).toString();
}

const groupIcons: Record<string, string> = {
  Wearable: '⌚',
  Laboratory: '🧪',
  Demographics: '👤',
};

export default function StateVectorGrid({ values, deviations }: StateVectorGridProps) {
  return (
    <div className="space-y-5">
      {Object.entries(DIM_GROUPS).map(([group, keys]) => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-base">{groupIcons[group]}</span>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group}</h4>
            <span className="text-[10px] text-slate-400 font-medium">{keys.length} dims</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {keys.map((key, idx) => {
              const val = values[key];
              if (val === undefined) return null;
              const dev = deviations[key] || 'normal';
              const unit = DIM_UNITS[key] || '';
              const label = DIM_LABELS[key] || key;
              const range = NORMAL_RANGES[key];

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.3 }}
                  className={`relative rounded-lg border px-3 py-2.5 ${getDeviationColor(dev)} transition-all duration-300 hover:shadow-md group`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-medium opacity-70 leading-tight">{label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${getDeviationDot(dev)} mt-0.5`} />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-bold leading-none">{formatValue(key, val)}</span>
                    {unit && <span className="text-[9px] opacity-50 font-medium">{unit}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] opacity-40 font-mono">
                      {range ? `${range[0]}–${range[1]}` : '—'}
                    </span>
                    <span className="text-[9px] font-semibold opacity-60">{getDeviationBadge(dev)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
