import React from 'react';
import { MapPin, Navigation, ShieldAlert, Search } from 'lucide-react';

interface LocationPermissionCardProps {
  requestLocation: () => void;
  geoLoading: boolean;
  permissionDenied: boolean;
  onUseManualSearch?: () => void;
}

export default function LocationPermissionCard({
  requestLocation,
  geoLoading,
  permissionDenied,
  onUseManualSearch,
}: LocationPermissionCardProps) {
  return (
    <div className="glass-panel p-8 rounded-2xl text-center max-w-md mx-auto space-y-6 bg-white/80 border border-slate-200/80 shadow-sm">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-pulse">
        <MapPin className="h-8 w-8 text-blue-600" />
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-extrabold text-lg text-slate-900">Enable Device Location</h3>
        <p className="text-xs text-slate-600 leading-relaxed font-light">
          HridayaDarpana requires access to your coordinates to pinpoint nearby cardiac surgeons, specialty hospitals, emergency 24/7 ICUs, and pharmacies.
        </p>
      </div>

      {permissionDenied && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-[11px] text-rose-700 text-left">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="space-y-1">
            <p className="font-bold text-rose-700">Location Permission Denied</p>
            <p className="text-[10px] text-slate-600 leading-normal">
              Please click the lock icon in your browser address bar to allow location access, or type your city/pincode in the top search bar.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-2.5">
        <button
          onClick={requestLocation}
          disabled={geoLoading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-xs font-bold rounded-xl text-white hover:from-blue-700 hover:to-blue-600 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 shadow-xs"
        >
          {geoLoading ? (
            <span className="animate-pulse">Detecting coordinates...</span>
          ) : (
            <>
              <Navigation className="h-4 w-4" />
              <span>Retry Location Detection</span>
            </>
          )}
        </button>

        {onUseManualSearch && (
          <button
            onClick={onUseManualSearch}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 hover:text-slate-900 flex items-center justify-center space-x-2 transition-all shadow-xs"
          >
            <Search className="h-3.5 w-3.5 text-blue-600" />
            <span>Search Manually by City / Pincode</span>
          </button>
        )}
      </div>
    </div>
  );
}
