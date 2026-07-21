import React from 'react';
import { Loader2 } from 'lucide-react';

interface RiskGaugeCardProps {
  dashLoading: boolean;
  simulatedScore: number;
  simulatedRisk: string;
  needleAngle: number;
}

const RiskGaugeCard = ({ dashLoading, simulatedScore, simulatedRisk, needleAngle }: RiskGaugeCardProps) => {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden h-[320px]">
      <span className="text-[9px] text-health-textMuted uppercase font-bold tracking-wider">Risk Classification Gauge</span>
      
      <div className="relative h-40 w-full flex items-center justify-center overflow-hidden my-auto">
        {dashLoading ? (
          <Loader2 className="h-6 w-6 text-health-cyan animate-spin" />
        ) : (
          <>
            <svg className="w-56 h-full" viewBox="0 0 100 50">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
              <path d="M 10 50 A 40 40 0 0 1 36.6 20" fill="none" stroke="#10B981" strokeWidth="6" opacity="0.6" />
              <path d="M 36.6 20 A 40 40 0 0 1 63.3 20" fill="none" stroke="#F59E0B" strokeWidth="6" opacity="0.6" />
              <path d="M 63.3 20 A 40 40 0 0 1 90 50" fill="none" stroke="#F43F5E" strokeWidth="6" opacity="0.6" />

              <line
                x1="50" y1="50" x2="50" y2="15"
                stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"
                style={{
                  transformOrigin: '50% 50%',
                  transform: `rotate(${needleAngle}deg)`,
                  transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
              <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
            </svg>

            <div className="absolute bottom-4 text-center">
              <span className="text-lg font-bold font-display block leading-none">
                {Math.round(simulatedScore)}%
              </span>
              <span className="text-[7px] text-health-textMuted uppercase font-bold">PROBABILITY</span>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between items-center text-[9px] text-health-textMuted uppercase border-t border-white/5 pt-2">
        <span>Risk Status:</span>
        <span className={`font-bold ${
          dashLoading ? 'text-health-textMuted animate-pulse' :
          simulatedRisk === 'HIGH' ? 'text-health-rose' :
          simulatedRisk === 'MODERATE' ? 'text-health-amber' :
          'text-health-emerald'
        }`}>{dashLoading ? 'Checking...' : simulatedRisk}</span>
      </div>
    </div>
  );
};

export default React.memo(RiskGaugeCard, (prev, next) => {
  return (
    prev.dashLoading === next.dashLoading &&
    prev.simulatedScore === next.simulatedScore &&
    prev.simulatedRisk === next.simulatedRisk &&
    prev.needleAngle === next.needleAngle
  );
});
