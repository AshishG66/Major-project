import React from 'react';
import { Loader2, Heart } from 'lucide-react';

interface TimelineCardProps {
  historyLoading: boolean;
  displayHistory: any[];
}

const TimelineCard = ({ historyLoading, displayHistory }: TimelineCardProps) => {
  return (
    <div className="lg:col-span-8 glass-panel p-6 rounded-2xl flex flex-col h-[280px] relative overflow-hidden">
      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-4">Patient Scan History Timeline</h3>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin flex flex-col">
        {historyLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-health-cyan animate-spin" />
          </div>
        ) : displayHistory.length === 0 ? (
          <p className="text-xxs text-health-textMuted py-8 text-center italic">No diagnostic events logged yet.</p>
        ) : (
          displayHistory.map((h: any, idx: number) => {
            const dateStr = new Date(h.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const isSimulation = h.id === 'simulated-active-check';

            return (
              <div 
                key={h.id || idx} 
                className={`flex space-x-3 text-xxs font-light ${
                  isSimulation ? 'bg-health-rose/5 p-2 rounded-xl border border-health-rose/25 animate-pulse' : ''
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center bg-black/40 ${
                    h.riskLevel === 'HIGH' ? 'border-health-rose text-health-rose' :
                    h.riskLevel === 'MODERATE' ? 'border-health-amber text-health-amber' :
                    'border-health-emerald text-health-emerald'
                  }`}>
                    <Heart className="h-2.5 w-2.5" />
                  </div>
                  {idx < displayHistory.length - 1 && <div className="w-0.5 bg-white/10 flex-1 my-1.5" />}
                </div>
                
                <div className="flex-1 p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span className={
                      h.riskLevel === 'HIGH' ? 'text-health-rose' :
                      h.riskLevel === 'MODERATE' ? 'text-health-amber' :
                      'text-health-emerald'
                    }>
                      {isSimulation ? '🏥 simulated scan check' : `${h.riskLevel} Risk`} ({h.healthScore}/100)
                    </span>
                    <span className="text-[7.5px] text-health-textMuted">{isSimulation ? 'Live' : dateStr}</span>
                  </div>
                  <p className="text-health-textMuted leading-relaxed text-[8.5px]">{h.plainExplanation}</p>
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
