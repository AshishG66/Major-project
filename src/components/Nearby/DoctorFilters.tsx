import React from 'react';
import { Filter, Star, Clock, Siren, Search, HeartPulse, Building2, Stethoscope, Activity, Pill, Flame } from 'lucide-react';

interface DoctorFiltersProps {
  radius: number;
  setRadius: (val: number) => void;
  filterSpec: string;
  setFilterSpec: (val: string) => void;
  filterRating: number;
  setFilterRating: (val: number) => void;
  filterOpenNow: boolean;
  setFilterOpenNow: (val: boolean) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  emergencyMode: boolean;
  onToggleEmergency: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Facilities', icon: Filter },
  { id: 'cardiologist', label: 'Cardiologists', icon: Stethoscope },
  { id: 'hospital', label: 'Heart Hospitals', icon: Building2 },
  { id: 'clinic', label: 'Cardiac Clinics', icon: HeartPulse },
  { id: 'emergency', label: 'Emergency (24/7)', icon: Siren },
  { id: 'diagnostic', label: 'Diagnostics', icon: Activity },
  { id: 'pharmacy', label: 'Pharmacies', icon: Pill },
];

const RADII = [5, 10, 20, 50];
const RATINGS = [0, 3.5, 4.0, 4.5];

export default function DoctorFilters({
  radius,
  setRadius,
  filterSpec,
  setFilterSpec,
  filterRating,
  setFilterRating,
  filterOpenNow,
  setFilterOpenNow,
  searchTerm,
  setSearchTerm,
  emergencyMode,
  onToggleEmergency,
}: DoctorFiltersProps) {
  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4 shrink-0 bg-white/80 border border-slate-200/80 shadow-sm">
      
      {/* Top Header Row with Title, Radius, and Emergency SOS Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-display font-bold flex items-center space-x-2 text-slate-900">
            <Filter className="h-4.5 w-4.5 text-blue-600" />
            <span>Nearby Cardiac Care Locator</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-light">
            Filter certified cardiologists, cardiac ICUs, emergency resuscitation centers, diagnostic labs & chemists.
          </p>
        </div>

        {/* Action Controls: Radius & Emergency SOS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Emergency Mode Button */}
          <button
            type="button"
            onClick={onToggleEmergency}
            className={`px-3.5 py-2 text-xs font-extrabold uppercase rounded-xl flex items-center space-x-1.5 transition-all shadow-xs ${
              emergencyMode
                ? 'bg-red-600 text-white animate-pulse border-2 border-red-400'
                : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
            }`}
          >
            <Siren className="h-4 w-4" />
            <span>🚨 Emergency SOS</span>
          </button>

          {/* Radius selector */}
          <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[9.5px] text-slate-500 uppercase font-bold px-2">Radius:</span>
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  radius === r
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none pt-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = filterSpec === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterSpec(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shrink-0 transition-all border ${
                isActive
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                  : 'bg-white border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input, Rating Filter, Open Now Switch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
        
        {/* Keyword Search */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by Name, Doctor, or Hospital..."
            className="w-full pl-9 pr-4 py-2 text-xs glass-input placeholder-slate-400 text-slate-900 focus:border-blue-500"
          />
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
        </div>

        {/* Category Dropdown */}
        <div>
          <select
            value={filterSpec}
            onChange={(e) => setFilterSpec(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none text-slate-800"
          >
            <option value="all">All Category Types</option>
            <option value="cardiologist">Cardiologists</option>
            <option value="hospital">Heart Hospitals</option>
            <option value="clinic">Cardiac Clinics</option>
            <option value="emergency">Emergency Hospitals (24/7)</option>
            <option value="diagnostic">Diagnostic Centers</option>
            <option value="pharmacy">Pharmacies</option>
          </select>
        </div>

        {/* Rating Filter Pills */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5">
          <span className="text-[11px] text-slate-500 font-medium flex items-center space-x-1 shrink-0">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
            <span>Rating:</span>
          </span>
          <div className="flex space-x-1">
            {RATINGS.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setFilterRating(rate)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                  filterRating === rate
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {rate === 0 ? 'Any' : `${rate}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Open Now Toggle */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-1.5">
          <span className="text-xs text-slate-500 font-medium flex items-center space-x-1.5">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Open Now Only</span>
          </span>
          <input
            type="checkbox"
            checked={filterOpenNow}
            onChange={(e) => setFilterOpenNow(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

      </div>

    </div>
  );
}
