import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface AISummaryCardProps {
  dashLoading: boolean;
  weeklyAISummary: string;
}

const AISummaryCard = ({ dashLoading, weeklyAISummary }: AISummaryCardProps) => {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm flex flex-col justify-between h-[320px]">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3.5">
          <span className="text-[9px] uppercase font-bold text-blue-600 tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
            <span>HridyaAI Synthesis</span>
          </span>
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
        </div>
        {dashLoading ? (
          <div className="flex flex-col space-y-2.5 py-4 animate-pulse">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-[90%]" />
            <div className="h-3 bg-slate-100 rounded w-[95%]" />
            <div className="h-3 bg-slate-100 rounded w-[80%]" />
          </div>
        ) : (
          <p className="text-xs font-light text-slate-800 leading-relaxed overflow-y-auto max-h-[190px] scrollbar-thin pr-1">
            {weeklyAISummary}
          </p>
        )}
      </div>
      <div className="border-t border-slate-100 pt-2 text-[8px] text-slate-500">
        Realtime XGBoost inference parameters locked.
      </div>
    </div>
  );
};

export default React.memo(AISummaryCard, (prev, next) => {
  return (
    prev.dashLoading === next.dashLoading &&
    prev.weeklyAISummary === next.weeklyAISummary
  );
});
