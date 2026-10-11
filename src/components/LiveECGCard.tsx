import React from 'react';
import { Loader2, Activity, Radio } from 'lucide-react';
import { usePredictionStore } from '../store/predictionStore';
import { useDigitalTwinStore } from '../store/digitalTwinStore';

interface LiveECGCardProps {
  historyLoading?: boolean;
  simulatedHR?: number;
}

const LiveECGCard = ({ historyLoading = false, simulatedHR }: LiveECGCardProps) => {
  const storePrediction = usePredictionStore((state) => state.latestPrediction);
  const simulationState = useDigitalTwinStore((state) => state.simulationState);

  const activeHR = simulatedHR || storePrediction?.factors?.heartRate || 72;
  const condition = simulationState?.condition || 'NORMAL';
  const ecgResult = storePrediction?.factors?.ecgResult || 'NORMAL';

  // Waveform paths tailored to patient-specific Digital Twin state
  const getEcgPath = () => {
    if (condition === 'ARRHYTHMIA_RISK') {
      // Deterministic irregular waveform matching beat -> beat -> pause -> beat cadence:
      // Normal beat (0-80), premature coupled beat (80-140), long compensatory flat pause (140-230), post-pause beat (230-300)
      return "M0 30 L30 30 L36 24 L40 30 L43 30 L48 8 L54 52 L58 30 L66 33 L74 30 L95 30 L100 22 L104 30 L107 30 L112 12 L118 50 L122 30 L128 32 L134 30 L220 30 L226 24 L230 30 L234 30 L240 6 L248 54 L252 30 L260 34 L268 30 L300 30";
    }

    if (condition === 'REDUCED_CARDIAC_FUNCTION' || ecgResult === 'LV_HYPERTROPHY') {
      // Low-voltage QRS amplitude + broad ST-T strain depression
      return "M0 30 L40 30 L46 22 L50 30 L54 30 L59 18 L68 44 L72 30 L82 36 L94 36 L108 30 L150 30 L156 22 L160 30 L164 30 L169 18 L178 44 L182 30 L192 36 L204 36 L218 30 L300 30";
    }

    if (condition === 'CORONARY_FLOW_RISK' || ecgResult === 'ST_T_ABNORMAL') {
      // ST-segment depression / coronary ischemic strain pattern
      return "M0 30 L40 30 L46 20 L52 30 L56 30 L62 5 L70 55 L76 30 L86 38 L96 38 L105 40 L115 30 L150 30 L156 20 L162 30 L166 30 L172 5 L180 55 L186 30 L196 38 L206 38 L215 40 L225 30 L300 30";
    }

    // Normal Sinus Rhythm (Standard P-QRS-T)
    return "M0 30 L60 30 L68 25 L73 30 L78 30 L85 10 L92 50 L98 30 L108 30 L115 35 L120 30 L180 30 L188 25 L193 30 L198 30 L205 10 L212 50 L218 30 L228 30 L235 35 L240 30 L300 30";
  };

  const getRhythmLabel = () => {
    switch (condition) {
      case 'ARRHYTHMIA_RISK':
        return 'Simulated Irregular Rhythm';
      case 'REDUCED_CARDIAC_FUNCTION':
        return 'Simulated Reduced Function';
      case 'CORONARY_FLOW_RISK':
        return 'Simulated Coronary Flow Risk';
      case 'NORMAL':
      default:
        if (activeHR > 100) return 'Tachycardia / Elevated';
        if (activeHR < 60) return 'Bradycardia / Slow';
        return 'Normal Sinus Rhythm';
    }
  };

  const getBadgeStyle = () => {
    switch (condition) {
      case 'ARRHYTHMIA_RISK':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'REDUCED_CARDIAC_FUNCTION':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'CORONARY_FLOW_RISK':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'NORMAL':
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  const strokeColor =
    condition === 'ARRHYTHMIA_RISK'
      ? '#ef4444'
      : condition === 'REDUCED_CARDIAC_FUNCTION'
      ? '#a855f7'
      : condition === 'CORONARY_FLOW_RISK'
      ? '#f59e0b'
      : '#10b981';

  // Timing: In Arrhythmia mode, cycle spans 4-beat duration for the full beat-beat-pause-beat sequence
  const baseBeat = 60 / activeHR;
  const animDuration = condition === 'ARRHYTHMIA_RISK' ? Math.max(1.8, baseBeat * 3.5) : Math.max(0.45, baseBeat * 1.5);

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-auto min-h-0 space-y-3 bg-white/80 border border-slate-200/80 shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          <span>Synchronized ECG Waveform</span>
        </span>
        <span className={`text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getBadgeStyle()}`}>
          {getRhythmLabel()}
        </span>
      </div>
      
      <div className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative my-0 flex items-center justify-center">
        {historyLoading ? (
          <Loader2 className="h-6 w-6 text-rose-500 animate-spin" />
        ) : (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
            {/* Medical Grid Lines */}
            <path d="M0 10 H300 M0 20 H300 M0 30 H300 M0 40 H300 M0 50 H300" stroke="rgba(244, 63, 94, 0.12)" strokeWidth="0.5" />
            <path d="M50 0 V60 M100 0 V60 M150 0 V60 M200 0 V60 M250 0 V60" stroke="rgba(244, 63, 94, 0.08)" strokeWidth="0.5" />
            <path
              d={getEcgPath()}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeDasharray="250"
              style={{
                strokeDashoffset: 0,
                animation: `ecgScroll ${animDuration}s linear infinite`,
              }}
              className="drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] transition-colors duration-500"
            />
          </svg>
        )}
      </div>

      <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase font-mono-data">
        <span>Pulse: {historyLoading ? '...' : activeHR} BPM</span>
        <span className="flex items-center gap-1 text-blue-600">
          <Radio className="h-3 w-3 animate-pulse" />
          <span>Twin Timing Sync</span>
        </span>
      </div>
    </div>
  );
};

export default React.memo(LiveECGCard);
