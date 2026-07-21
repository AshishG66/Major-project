import React from 'react';
import { Plus, Loader2, CheckSquare, Clock, Trash2 } from 'lucide-react';

interface RemindersCardProps {
  remindersLoading: boolean;
  reminders: any[];
  onAddClick: () => void;
  onDeleteClick: (id: string) => void;
}

const RemindersCard = ({ remindersLoading, reminders, onAddClick, onDeleteClick }: RemindersCardProps) => {
  return (
    <div className="lg:col-span-4 glass-panel p-6 rounded-2xl flex flex-col relative h-[280px]">
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted">Smart Cardiac Reminders</h4>
        <button onClick={onAddClick} className="text-xxs font-semibold text-health-cyan hover:underline flex items-center space-x-1 focus:outline-none">
          <Plus className="h-3.5 w-3.5" />
          <span>Add Alarm</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin flex flex-col">
        {remindersLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-health-cyan animate-spin" />
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-xxs text-health-textMuted font-light italic text-center py-8">Schedule medicine alerts or exercise timers.</p>
        ) : (
          reminders.map((rem: any) => (
            <div key={rem.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs hover:bg-white/10 transition-all">
              <div className="flex items-center space-x-3">
                <CheckSquare className="h-4.5 w-4.5 text-health-cyan mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-white/95">{rem.title}</p>
                  <p className="text-[10px] text-health-textMuted flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-health-textMuted" />
                    <span>{rem.time} • {rem.type}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => onDeleteClick(rem.id)} className="text-health-rose/85 hover:text-health-rose focus:outline-none shrink-0 transition-colors">
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(RemindersCard, (prev, next) => {
  return (
    prev.remindersLoading === next.remindersLoading &&
    prev.reminders.length === next.reminders.length &&
    prev.reminders[0]?.id === next.reminders[0]?.id
  );
});
