import React from 'react';
import { Loader2 } from 'lucide-react';
import SpringCounter from './SpringCounter';
import { usePredictionStore } from '../store/predictionStore';

interface HealthScoreCardProps {
  dashLoading?: boolean;
  simulatedScore?: number;
  displayScore?: number;
}

const HealthScoreCard = ({ dashLoading = false, simulatedScore, displayScore }: HealthScoreCardProps) => {
  const storePrediction = usePredictionStore((state) => state.latestPrediction);
  
  const targetHealthScore = simulatedScore !== undefined 
    ? simulatedScore 
    : (storePrediction?.healthScore ?? Math.round(100 - (storePrediction?.riskScore || 0)));

  const currentDisplayScore = displayScore !== undefined ? displayScore : targetHealthScore;
  const strokeColor = targetHealthScore >= 75 ? '#10B981' : targetHealthScore >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden bg-white/80 border border-slate-200/80 shadow-sm h-[320px]">
      <span className="absolute top-3 left-3 text-[9px] uppercase font-bold text-slate-500 tracking-wider">Stability Index</span>
      
      <div className="relative h-36 w-36 flex items-center justify-center my-3">
        <svg className="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
          <circle
            cx="50" cy="50" r="44"
            stroke={strokeColor}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray="276"
            strokeDashoffset={276 - (276 * Math.max(0, Math.min(100, currentDisplayScore))) / 100}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        
        <div className="absolute flex flex-col items-center">
          {dashLoading ? (
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          ) : (
            <>
              <span className="text-3xl font-display font-extrabold tracking-tight text-slate-900">
                <SpringCounter value={currentDisplayScore} />
              </span>
              <span className="text-[7.5px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">HEALTH SCORE</span>
            </>
          )}
        </div>
      </div>
      
      <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-800 mt-1">
        {dashLoading ? 'Loading Vitals...' : targetHealthScore >= 75 ? 'Excellent Health' : targetHealthScore >= 50 ? 'Moderate Alert' : 'Critical / Review Vitals'}
      </h4>
      <span className="text-[9px] text-slate-500 mt-1">Synchronized Clinical AI Output</span>
    </div>
  );
};

export default React.memo(HealthScoreCard);
