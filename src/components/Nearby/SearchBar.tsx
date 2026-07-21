import React, { useState } from 'react';
import { Search, MapPin, Navigation, Crosshair } from 'lucide-react';

interface SearchBarProps {
  onSearch: (city: string, pincode: string) => void;
  onRequestGeolocation: () => void;
  isLoading: boolean;
}

const CITY_PRESETS = [
  { name: 'New Delhi', code: '110001' },
  { name: 'Mumbai', code: '400001' },
  { name: 'Bengaluru', code: '560001' },
  { name: 'Chennai', code: '600001' },
  { name: 'Hyderabad', code: '500001' },
  { name: 'Kolkata', code: '700001' },
];

export default function SearchBar({ onSearch, onRequestGeolocation, isLoading }: SearchBarProps) {
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim() || pincode.trim()) {
      onSearch(city.trim(), pincode.trim());
    }
  };

  const handlePresetClick = (presetCity: string, presetPincode: string) => {
    setCity(presetCity);
    setPincode(presetPincode);
    onSearch(presetCity, presetPincode);
  };

  return (
    <div className="space-y-2.5 w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/40 pointer-events-none">
            <MapPin className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search City, Suburb, or Hospital Area (e.g. New Delhi, Sector 18)..."
            className="w-full pl-10 pr-4 py-2.5 text-xs glass-input placeholder-white/25 focus:border-health-cyan transition-all"
          />
        </div>
        
        <div className="relative w-full sm:w-36">
          <input
            type="text"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="Pincode..."
            className="w-full px-4 py-2.5 text-xs glass-input placeholder-white/25 focus:border-health-cyan transition-all"
          />
        </div>

        <div className="flex space-x-2 shrink-0">
          <button
            type="submit"
            disabled={isLoading || (!city && !pincode)}
            className="px-4 py-2.5 bg-gradient-to-r from-health-blue to-health-cyan text-xs font-semibold rounded-xl text-white hover:shadow-glow flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={onRequestGeolocation}
            disabled={isLoading}
            className="px-3.5 py-2.5 border border-health-emerald/30 bg-health-emerald/15 hover:bg-health-emerald/25 text-health-emerald text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
            title="Detect My Location"
          >
            <Crosshair className="h-4 w-4 animate-spin-slow" />
            <span className="hidden md:inline">Locate Me</span>
          </button>
        </div>
      </form>

      {/* Quick City Presets */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-[9.5px]">
        <span className="text-health-textMuted uppercase font-bold shrink-0 text-[8.5px]">Quick Zones:</span>
        {CITY_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handlePresetClick(preset.name, preset.code)}
            className="px-2.5 py-1 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all shrink-0 font-medium"
          >
            📍 {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
