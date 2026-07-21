import React from 'react';
import { Loader2 } from 'lucide-react';

interface LiveECGCardProps {
  historyLoading: boolean;
  simulatedHR: number;
}

const LiveECGCard = ({ historyLoading, simulatedHR }: LiveECGCardProps) => {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[320px]">
      <span className="text-[9px] text-health-textMuted uppercase font-bold tracking-wider">Live ECG Waveform Monitor</span>
      
      <div className="w-full h-32 bg-[#030712]/95 border border-white/5 rounded-xl overflow-hidden relative my-auto flex items-center justify-center">
        {historyLoading ? (
          <Loader2 className="h-6 w-6 text-health-rose animate-spin" />
        ) : (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
            <path d="M0 10 H300 M0 20 H300 M0 30 H300 M0 40 H300 M0 50 H300" stroke="rgba(244, 63, 94, 0.04)" strokeWidth="0.5" />
            <path
              d="M0 30 L60 30 L68 25 L73 30 L78 30 L85 10 L92 50 L98 30 L108 30 L115 35 L120 30 L180 30 L188 25 L193 30 L198 30 L205 10 L212 50 L218 30 L228 30 L235 35 L240 30 L300 30"
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2"
              strokeDasharray="200"
              style={{
                strokeDashoffset: 0,
                animation: `ecgScroll ${Math.max(0.35, 60 / simulatedHR) * 1.5}s linear infinite`
              }}
              className="drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]"
            />
          </svg>
        )}
      </div>

      <div className="flex justify-between text-[9px] text-health-textMuted font-bold uppercase">
        <span>Pulse: {historyLoading ? '...' : simulatedHR} bpm</span>
        <span className="text-health-rose animate-pulse">Telemetry active</span>
      </div>
    </div>
  );
};

export default React.memo(LiveECGCard, (prev, next) => {
  return (
    prev.historyLoading === next.historyLoading &&
    prev.simulatedHR === next.simulatedHR
  );
});
