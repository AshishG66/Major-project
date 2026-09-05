import React from 'react';
import { Loader2, Activity } from 'lucide-react';
import { usePredictionStore } from '../store/predictionStore';

interface LiveECGCardProps {
  historyLoading?: boolean;
  simulatedHR?: number;
}

const LiveECGCard = ({ historyLoading = false, simulatedHR }: LiveECGCardProps) => {
  const storePrediction = usePredictionStore((state) => state.latestPrediction);
  const activeHR = simulatedHR || storePrediction?.factors?.heartRate || 72;
  const ecgResult = storePrediction?.factors?.ecgResult || 'NORMAL';

  // Choose waveform pattern based on patient's ECG condition
  const getEcgPath = () => {
    if (ecgResult === 'ST_T_ABNORMAL') {
      return "M0 30 L40 30 L46 20 L52 30 L56 30 L62 5 L70 55 L76 30 L86 35 L96 35 L105 40 L115 30 L150 30 L156 20 L162 30 L166 30 L172 5 L180 55 L186 30 L196 35 L206 35 L215 40 L225 30 L300 30";
    }
    if (ecgResult === 'LV_HYPERTROPHY') {
      return "M0 30 L40 30 L46 15 L50 30 L54 30 L60 -5 L72 65 L78 30 L90 20 L102 30 L115 30 L150 30 L156 15 L160 30 L164 30 L170 -5 L182 65 L188 30 L200 20 L212 30 L225 30 L300 30";
    }
    return "M0 30 L60 30 L68 25 L73 30 L78 30 L85 10 L92 50 L98 30 L108 30 L115 35 L120 30 L180 30 L188 25 L193 30 L198 30 L205 10 L212 50 L218 30 L228 30 L235 35 L240 30 L300 30";
  };

  const getRhythmLabel = () => {
    if (activeHR > 100) return 'Tachycardia / Elevated';
    if (activeHR < 60) return 'Bradycardia / Slow';
    if (ecgResult === 'ST_T_ABNORMAL') return 'ST-T Wave Abnormality';
    if (ecgResult === 'LV_HYPERTROPHY') return 'LV Hypertrophy Pattern';
    return 'Normal Sinus Rhythm';
  };

  const strokeColor = ecgResult !== 'NORMAL' || activeHR > 100 ? '#EF4444' : activeHR < 60 ? '#3B82F6' : '#10B981';
  const animDuration = Math.max(0.35, (60 / activeHR) * 1.5);

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[320px] bg-white/80 border border-slate-200/80 shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          <span>Live ECG Waveform Monitor</span>
        </span>
        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
          {getRhythmLabel()}
        </span>
      </div>
      
      <div className="w-full h-32 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative my-auto flex items-center justify-center">
        {historyLoading ? (
          <Loader2 className="h-6 w-6 text-rose-500 animate-spin" />
        ) : (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
            <path d="M0 10 H300 M0 20 H300 M0 30 H300 M0 40 H300 M0 50 H300" stroke="rgba(244, 63, 94, 0.12)" strokeWidth="0.5" />
            <path
              d={getEcgPath()}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeDasharray="200"
              style={{
                strokeDashoffset: 0,
                animation: `ecgScroll ${animDuration}s linear infinite`
              }}
              className="drop-shadow-[0_0_6px_rgba(239,68,68,0.8)] transition-colors duration-500"
            />
          </svg>
        )}
      </div>

      <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
        <span>Pulse: {historyLoading ? '...' : activeHR} bpm</span>
        <span className="text-rose-600 animate-pulse">Telemetry active</span>
      </div>
    </div>
  );
};

export default React.memo(LiveECGCard);
