import React, { useState } from 'react';
import { ShieldCheck, X, Key, ExternalLink, AlertTriangle } from 'lucide-react';
import { isGoogleMapsKeyConfigured } from '../../services/googleMapsService';

export default function ApiKeyNotice() {
  const [dismissed, setDismissed] = useState(false);
  const isKeyActive = isGoogleMapsKeyConfigured();

  if (dismissed) return null;

  return (
    <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
      isKeyActive
        ? 'bg-health-emerald/10 border-health-emerald/30 text-health-emerald'
        : 'bg-health-amber/10 border-health-amber/30 text-health-amber'
    }`}>
      <div className="flex items-start sm:items-center space-x-3">
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
          isKeyActive ? 'bg-health-emerald/20 text-health-emerald' : 'bg-health-amber/20 text-health-amber'
        }`}>
          {isKeyActive ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              {isKeyActive ? 'Google Maps Platform Active' : 'Google Maps API Key Not Configured'}
            </h4>
            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
              isKeyActive ? 'bg-health-emerald/20 text-health-emerald' : 'bg-health-amber/20 text-health-amber'
            }`}>
              {isKeyActive ? 'Live Google Places API' : 'Real Data Mode'}
            </span>
          </div>

          <p className="text-[10px] text-health-textMuted mt-0.5 leading-relaxed max-w-2xl">
            {isKeyActive
              ? 'Real-time Google Places API & Maps JS engine enabled. Provider details, ratings, and navigation are live.'
              : 'Add VITE_GOOGLE_MAPS_API_KEY to your .env file to activate live client-side Places API queries. Healthcare providers are strictly loaded from real APIs.'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
        {!isKeyActive && (
          <a
            href="https://developers.google.com/maps/documentation/javascript/get-api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[9px] font-bold text-white uppercase flex items-center space-x-1 transition-colors"
          >
            <span>Get API Key</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-white/50 hover:text-white transition-colors"
          title="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
