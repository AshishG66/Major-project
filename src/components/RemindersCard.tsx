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
    <div className="lg:col-span-4 glass-panel p-6 rounded-2xl flex flex-col relative h-[280px] bg-white/80 border border-slate-200/80 shadow-sm">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500">Smart Cardiac Reminders</h4>
        <button onClick={onAddClick} className="text-xxs font-semibold text-blue-600 hover:underline flex items-center space-x-1 focus:outline-none">
          <Plus className="h-3.5 w-3.5" />
          <span>Add Alarm</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin flex flex-col">
        {remindersLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-xxs text-slate-500 font-light italic text-center py-8">Schedule medicine alerts or exercise timers.</p>
        ) : (
          reminders.map((rem: any) => (
            <div key={rem.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100 transition-all">
              <div className="flex items-center space-x-3">
                <CheckSquare className="h-4.5 w-4.5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">{rem.title}</p>
                  <p className="text-[10px] text-slate-500 flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>{rem.time} • {rem.type}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => onDeleteClick(rem.id)} className="text-rose-600 hover:text-rose-700 focus:outline-none shrink-0 transition-colors">
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
