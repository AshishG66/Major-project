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
      className="p-5 rounded-2xl bg-gradient-to-r from-health-rose/25 via-health-rose/15 to-red-950/40 border-2 border-health-rose/60 shadow-glow-rose space-y-4 relative overflow-hidden"
    >
      {/* Background Pulse Effect */}
      <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-health-rose/10 rounded-full blur-2xl animate-pulse pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        
        {/* Left: Emergency Status Info */}
        <div className="flex items-start space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-health-rose/30 border border-health-rose/50 flex items-center justify-center text-health-rose shrink-0 animate-bounce">
            <Siren className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-health-rose text-white animate-pulse">
                <HeartPulse className="h-3 w-3" />
                <span>CRITICAL CARDIAC SOS</span>
              </span>
              <span className="text-[10px] text-health-rose/80 font-bold uppercase tracking-wider">
                Nearest 24/7 Emergency Center Located
              </span>
            </div>

            <h3 className="font-display font-extrabold text-base text-white">{nearestEmergency.name}</h3>
            
            <p className="text-xs text-white/80 font-light flex items-center space-x-2">
              <span>📍 {nearestEmergency.address}</span>
              <span className="text-white/40">•</span>
              <span className="text-health-amber font-semibold">★ {nearestEmergency.rating} ({nearestEmergency.userRatingsTotal} reviews)</span>
            </p>
          </div>
        </div>

        {/* Right: Metrics & Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          
          <div className="bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-center">
            <p className="text-[9px] uppercase font-bold text-health-textMuted">Proximity</p>
            <p className="text-xs font-extrabold text-health-cyan">{nearestEmergency.distance}</p>
          </div>

          <div className="bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-center">
            <p className="text-[9px] uppercase font-bold text-health-textMuted">Est Transit</p>
            <p className="text-xs font-extrabold text-health-emerald flex items-center justify-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>~{estDriveMins} mins</span>
            </p>
          </div>

          <div className="flex space-x-2 text-xs font-bold uppercase">
            {nearestEmergency.phone && (
              <a
                href={`tel:${nearestEmergency.phone}`}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white flex items-center space-x-1.5 transition-all shadow-md"
              >
                <Phone className="h-4 w-4 text-health-rose" />
                <span>Call ER Desk</span>
              </a>
            )}

            <a
              href={destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-gradient-to-r from-health-rose to-red-600 hover:from-red-600 hover:to-health-rose text-white rounded-xl flex items-center space-x-1.5 transition-all shadow-glow-rose"
            >
              <Navigation className="h-4 w-4" />
              <span>Start Navigation</span>
            </a>

            <button
              onClick={() => onSelectEmergencyOnMap(nearestEmergency.id)}
              className="px-3 py-2.5 border border-white/10 bg-black/30 hover:bg-black/50 rounded-xl text-white/80 text-[10px]"
            >
              Focus Map
            </button>

            <button
              onClick={onExitEmergency}
              className="p-2.5 border border-white/10 bg-black/20 hover:bg-black/40 rounded-xl text-white/60 hover:text-white"
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
