import React from 'react';
import { Loader2, Heart } from 'lucide-react';

interface TimelineCardProps {
  historyLoading: boolean;
  displayHistory: any[];
}

const TimelineCard = ({ historyLoading, displayHistory }: TimelineCardProps) => {
  return (
    <div className="lg:col-span-8 glass-panel p-6 rounded-2xl flex flex-col h-[280px] relative overflow-hidden bg-white/80 border border-slate-200/80 shadow-sm">
      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 mb-4">Patient Scan History Timeline</h3>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin flex flex-col">
        {historyLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
        ) : displayHistory.length === 0 ? (
          <p className="text-xxs text-slate-500 py-8 text-center italic">No diagnostic events logged yet.</p>
        ) : (
          displayHistory.map((h: any, idx: number) => {
            const dateStr = new Date(h.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const isSimulation = h.id === 'simulated-active-check';

            return (
              <div 
                key={h.id || idx} 
                className={`flex space-x-3 text-xxs font-light ${
                  isSimulation ? 'bg-rose-50 p-2 rounded-xl border border-rose-200 animate-pulse' : ''
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center bg-white ${
                    h.riskLevel === 'HIGH' ? 'border-rose-500 text-rose-600' :
                    h.riskLevel === 'MODERATE' ? 'border-amber-500 text-amber-600' :
                    'border-emerald-500 text-emerald-600'
                  }`}>
                    <Heart className="h-2.5 w-2.5" />
                  </div>
                  {idx < displayHistory.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 my-1.5" />}
                </div>
                
                <div className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span className={
                      h.riskLevel === 'HIGH' ? 'text-rose-600' :
                      h.riskLevel === 'MODERATE' ? 'text-amber-600' :
                      'text-emerald-600'
                    }>
                      {isSimulation ? '🏥 simulated scan check' : `${h.riskLevel} Risk`} ({h.healthScore}/100)
                    </span>
                    <span className="text-[7.5px] text-slate-400">{isSimulation ? 'Live' : dateStr}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[8.5px]">{h.plainExplanation}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default React.memo(TimelineCard, (prev, next) => {
  return (
    prev.historyLoading === next.historyLoading &&
    prev.displayHistory.length === next.displayHistory.length &&
    prev.displayHistory[0]?.id === next.displayHistory[0]?.id &&
    prev.displayHistory[0]?.healthScore === next.displayHistory[0]?.healthScore
  );
});
