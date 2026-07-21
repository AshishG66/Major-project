import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="p-5 rounded-2xl border border-white/5 bg-white/5 h-[240px] flex flex-col justify-between animate-pulse"
        >
          <div className="space-y-3">
            <div className="flex space-x-3 items-center">
              <div className="h-10 w-10 bg-white/10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-white/10 rounded w-[60%]" />
                <div className="h-3 bg-white/10 rounded w-[40%]" />
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-white/10 rounded w-[85%]" />
              <div className="h-3 bg-white/10 rounded w-[50%]" />
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-3 border-t border-white/5">
            <div className="h-3 bg-white/10 rounded w-[20%]" />
            <div className="flex space-x-2">
              <div className="h-7 bg-white/10 rounded w-16" />
              <div className="h-7 bg-white/10 rounded w-16" />
              <div className="h-7 bg-white/10 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
