import React from 'react';
import { Loader2 } from 'lucide-react';
import SpringCounter from './SpringCounter';

interface HealthScoreCardProps {
  dashLoading: boolean;
  simulatedScore: number;
  displayScore: number;
}

const HealthScoreCard = ({ dashLoading, simulatedScore, displayScore }: HealthScoreCardProps) => {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-br from-health-card to-black/20 h-[320px]">
      <span className="absolute top-3 left-3 text-[9px] uppercase font-bold text-health-textMuted tracking-wider">Stability Index</span>
      
      <div className="relative h-36 w-36 flex items-center justify-center my-3">
        <svg className="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="transparent" />
          <circle
            cx="50" cy="50" r="44"
            stroke={simulatedScore < 50 ? '#F43F5E' : simulatedScore < 75 ? '#F59E0B' : '#10B981'}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray="276"
            strokeDashoffset={276 - (276 * displayScore) / 100}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${simulatedScore < 50 ? 'rgba(244,63,94,0.4)' : simulatedScore < 75 ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'})`
            }}
          />
        </svg>
        
        <div className="absolute flex flex-col items-center">
          {dashLoading ? (
            <Loader2 className="h-6 w-6 text-health-cyan animate-spin" />
          ) : (
            <>
              <span className="text-3xl font-display font-extrabold tracking-tight text-white">
                <SpringCounter value={displayScore} />
              </span>
              <span className="text-[7.5px] text-health-textMuted uppercase font-bold tracking-widest mt-0.5">HEALTH SCORE</span>
            </>
          )}
        </div>
      </div>
      
      <h4 className="font-display font-bold text-xs uppercase tracking-widest text-white/80 mt-1">
        {dashLoading ? 'Loading Vitals...' : simulatedScore >= 75 ? 'Excellent Health' : simulatedScore >= 50 ? 'Moderate Alert' : 'Review Vitals'}
      </h4>
      <span className="text-[9px] text-health-textMuted mt-1">Stochastic classification output</span>
    </div>
  );
};

export default React.memo(HealthScoreCard, (prev, next) => {
  return (
    prev.dashLoading === next.dashLoading &&
    prev.simulatedScore === next.simulatedScore &&
    prev.displayScore === next.displayScore
  );
});
