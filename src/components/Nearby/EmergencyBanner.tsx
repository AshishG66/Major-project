import React from 'react';
import { motion } from 'framer-motion';
import { Siren, Phone, Navigation, Clock, ShieldAlert, HeartPulse, X } from 'lucide-react';
import { Facility } from '../../services/googleMapsService';

interface EmergencyBannerProps {
  nearestEmergency: Facility | null;
  userCoords: [number, number] | null;
  onExitEmergency: () => void;
  onSelectEmergencyOnMap: (facilityId: string) => void;
}

export default function EmergencyBanner({
  nearestEmergency,
  userCoords,
  onExitEmergency,
  onSelectEmergencyOnMap,
}: EmergencyBannerProps) {
  if (!nearestEmergency) return null;

  const destinationUrl = userCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${nearestEmergency.lat},${nearestEmergency.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${nearestEmergency.lat},${nearestEmergency.lng}`;

  // Estimate drive time (~2.5 mins per km in city emergency transit)
  const estDriveMins = Math.max(2, Math.round(nearestEmergency.distanceKm * 2.5));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-5 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50 to-red-100 border-2 border-red-300 shadow-sm space-y-4 relative overflow-hidden text-slate-900"
    >
      {/* Background Pulse Effect */}
      <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-red-400/10 rounded-full blur-2xl animate-pulse pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        
        {/* Left: Emergency Status Info */}
        <div className="flex items-start space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 shrink-0 animate-bounce">
            <Siren className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-red-600 text-white animate-pulse">
                <HeartPulse className="h-3 w-3" />
                <span>CRITICAL CARDIAC SOS</span>
              </span>
              <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">
                Nearest 24/7 Emergency Center Located
              </span>
            </div>

            <h3 className="font-display font-extrabold text-base text-slate-900">{nearestEmergency.name}</h3>
            
            <p className="text-xs text-slate-700 font-medium flex items-center space-x-2">
              <span>📍 {nearestEmergency.address}</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-600 font-semibold">★ {nearestEmergency.rating} ({nearestEmergency.userRatingsTotal} reviews)</span>
            </p>
          </div>
        </div>

        {/* Right: Metrics & Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          
          <div className="bg-white border border-red-200 px-3.5 py-2 rounded-xl text-center shadow-xs">
            <p className="text-[9px] uppercase font-bold text-slate-500">Proximity</p>
            <p className="text-xs font-extrabold text-blue-700">{nearestEmergency.distance}</p>
          </div>

          <div className="bg-white border border-red-200 px-3.5 py-2 rounded-xl text-center shadow-xs">
            <p className="text-[9px] uppercase font-bold text-slate-500">Est Transit</p>
            <p className="text-xs font-extrabold text-emerald-700 flex items-center justify-center space-x-1">
              <Clock className="h-3 w-3 text-emerald-600" />
              <span>~{estDriveMins} mins</span>
            </p>
          </div>

          <div className="flex space-x-2 text-xs font-bold uppercase">
            {nearestEmergency.phone && (
              <a
                href={`tel:${nearestEmergency.phone}`}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-red-200 rounded-xl text-red-700 flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <Phone className="h-4 w-4 text-red-600" />
                <span>Call ER Desk</span>
              </a>
            )}

            <a
              href={destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Navigation className="h-4 w-4" />
              <span>Start Navigation</span>
            </a>

            <button
              onClick={() => onSelectEmergencyOnMap(nearestEmergency.id)}
              className="px-3 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-slate-700 text-[10px] shadow-xs"
            >
              Focus Map
            </button>

            <button
              onClick={onExitEmergency}
              className="p-2.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 shadow-xs"
              title="Exit Emergency Mode"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
