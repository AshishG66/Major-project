import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { DIM_LABELS, DIM_UNITS, NORMAL_RANGES, DIM_GROUPS, type HistoryEntry } from '../store/digitalTwinStore';

interface TemporalTrendChartProps {
  history: HistoryEntry[];
}

const SELECTABLE_DIMS = [
  'heart_rate', 'spo2', 'hrv_sdnn', 'systolic_bp', 'diastolic_bp',
  'resp_rate', 'ejection_fraction', 'troponin_i', 'bnp',
  'total_chol', 'ldl', 'hdl', 'fasting_glucose', 'hba1c', 'creatinine',
];

const LINE_COLORS: Record<string, string> = {
  heart_rate: '#ef4444', spo2: '#3b82f6', hrv_sdnn: '#8b5cf6',
  systolic_bp: '#f97316', diastolic_bp: '#f59e0b', resp_rate: '#06b6d4',
  ejection_fraction: '#10b981', troponin_i: '#ec4899', bnp: '#6366f1',
  total_chol: '#84cc16', ldl: '#f43f5e', hdl: '#14b8a6',
  fasting_glucose: '#a855f7', hba1c: '#0ea5e9', creatinine: '#64748b',
};

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function TemporalTrendChart({ history }: TemporalTrendChartProps) {
  const [selectedDims, setSelectedDims] = useState<string[]>(['heart_rate', 'spo2']);

  const chartData = useMemo(() => {
    if (!history.length) return [];
    // Downsample to ~100 points for performance
    const step = Math.max(1, Math.floor(history.length / 100));
    return history
      .filter((_, i) => i % step === 0 || i === history.length - 1)
      .map(entry => ({
        time: formatTime(entry.timestamp),
        ts: entry.timestamp,
        ...Object.fromEntries(
          selectedDims.map(dim => [dim, Math.round((entry.values[dim] ?? 0) * 100) / 100])
        ),
      }));
  }, [history, selectedDims]);

  const toggleDim = (dim: string) => {
    setSelectedDims(prev => {
      if (prev.includes(dim)) {
        return prev.length > 1 ? prev.filter(d => d !== dim) : prev;
      }
      return prev.length < 3 ? [...prev, dim] : [prev[1], prev[2], dim];
    });
  };

  return (
    <div>
      {/* Dimension selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SELECTABLE_DIMS.map(dim => {
          const active = selectedDims.includes(dim);
          return (
            <button
              key={dim}
              onClick={() => toggleDim(dim)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all duration-200 ${
                active
                  ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {DIM_LABELS[dim] || dim}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval={Math.max(0, Math.floor(chartData.length / 8))}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '11px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              labelStyle={{ fontWeight: 600, color: '#0f172a' }}
              formatter={(value: number, name: string) => [
                `${value} ${DIM_UNITS[name] || ''}`,
                DIM_LABELS[name] || name,
              ]}
            />
            {selectedDims.map(dim => {
              const range = NORMAL_RANGES[dim];
              return (
                <React.Fragment key={dim}>
                  <Line
                    type="monotone"
                    dataKey={dim}
                    stroke={LINE_COLORS[dim] || '#64748b'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: LINE_COLORS[dim] }}
                  />
                  {range && (
                    <>
                      <ReferenceLine y={range[0]} stroke={LINE_COLORS[dim]} strokeDasharray="4 4" strokeOpacity={0.3} />
                      <ReferenceLine y={range[1]} stroke={LINE_COLORS[dim]} strokeDasharray="4 4" strokeOpacity={0.3} />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {selectedDims.map(dim => (
          <div key={dim} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: LINE_COLORS[dim] || '#64748b' }} />
            <span className="text-[10px] text-slate-500 font-medium">{DIM_LABELS[dim] || dim}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-3 h-0 border-t border-dashed border-slate-300" />
          <span className="text-[10px] text-slate-400">Normal Range</span>
        </div>
      </div>
    </div>
  );
}
