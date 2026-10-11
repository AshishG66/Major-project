import React from 'react';
import { Search, MapPin, Crosshair, Loader2, AlertCircle } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (location: string) => void;
  onRequestGeolocation: () => void;
  isLoading: boolean;
  errorMessage?: string;
  onClearError?: () => void;
}

const QUICK_ZONES = [
  { name: 'New Delhi' },
  { name: 'Mumbai' },
  { name: 'Bengaluru' },
];

export default function SearchBar({
  value,
  onChange,
  onSearch,
  onRequestGeolocation,
  isLoading,
  errorMessage,
  onClearError,
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  const handleQuickZoneClick = (zoneName: string) => {
    if (onClearError) onClearError();
    onChange(zoneName);
    onSearch(zoneName);
  };

  return (
    <div className="w-full space-y-2">
      {/* Search Input Row */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
        <div className="relative flex-1 min-w-0">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <MapPin className="h-4 w-4 text-[#0052ff]" />
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (errorMessage && onClearError) onClearError();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearch(value);
              }
            }}
            placeholder="Enter city, area or address"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052ff]/20 focus:border-[#0052ff] transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#0052ff] hover:bg-[#0045d8] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (errorMessage && onClearError) onClearError();
              onRequestGeolocation();
            }}
            disabled={isLoading}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
            title="Locate Me (Device Geolocation)"
          >
            <Crosshair className="h-4 w-4 text-emerald-600" />
            <span>Locate Me</span>
          </button>
        </div>
      </form>

      {/* Validation / Error Feedback */}
      {errorMessage && (
        <div className="flex items-center space-x-1.5 text-xs text-rose-600 font-medium pt-0.5 animate-fadeIn">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick City Presets */}
      <div className="flex items-center space-x-2 pt-0.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider shrink-0">
          Quick Zones:
        </span>
        {QUICK_ZONES.map((zone) => (
          <button
            key={zone.name}
            type="button"
            onClick={() => handleQuickZoneClick(zone.name)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs transition-all shrink-0 font-medium shadow-2xs active:scale-95 cursor-pointer"
          >
            📍 {zone.name}
          </button>
        ))}
      </div>
    </div>
  );
}
