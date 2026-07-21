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
    <div className="glass-panel p-8 rounded-2xl text-center max-w-md mx-auto space-y-6 bg-gradient-to-br from-health-card via-black/20 to-black/40 border border-white/10 shadow-glow">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-health-blue/15 border border-health-blue/30 flex items-center justify-center text-health-blue animate-pulse">
        <MapPin className="h-8 w-8 text-health-cyan" />
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-extrabold text-lg text-white">Enable Device Location</h3>
        <p className="text-xs text-health-textMuted leading-relaxed font-light">
          HridyaDarpan requires access to your coordinates to pinpoint nearby cardiac surgeons, specialty hospitals, emergency 24/7 ICUs, and pharmacies.
        </p>
      </div>

      {permissionDenied && (
        <div className="p-3.5 bg-health-rose/10 border border-health-rose/30 rounded-xl flex items-start space-x-2.5 text-[11px] text-health-rose text-left">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Location Permission Denied</p>
            <p className="text-[10px] text-white/70 leading-normal">
              Please click the lock icon in your browser address bar to allow location access, or type your city/pincode in the top search bar.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-2.5">
        <button
          onClick={requestLocation}
          disabled={geoLoading}
          className="w-full py-3 bg-gradient-to-r from-health-blue to-health-cyan text-xs font-bold rounded-xl text-white hover:shadow-glow flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
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
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-xl text-white/80 hover:text-white flex items-center justify-center space-x-2 transition-all"
          >
            <Search className="h-3.5 w-3.5 text-health-cyan" />
            <span>Search Manually by City / Pincode</span>
          </button>
        )}
      </div>
    </div>
  );
}
