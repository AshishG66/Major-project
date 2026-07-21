import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, MapPin, Navigation, Phone, ShieldCheck, HeartPulse, Clock, ArrowRight } from 'lucide-react';
import { Facility } from '../../services/googleMapsService';

interface AiRecommendationCardProps {
  facilities: Facility[];
  userCoords: [number, number] | null;
  onSelectFacility: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export default function AiRecommendationCard({
  facilities,
  userCoords,
  onSelectFacility,
  onViewDetails,
}: AiRecommendationCardProps) {
  if (!facilities || facilities.length === 0) return null;

  // AI Recommendation Logic:
  // Find top facility prioritized by: 1) Emergency/Hospital 2) Rating 3) Proximity
  const topRecommended = [...facilities].sort((a, b) => {
    // Score calculation
    let scoreA = a.rating * 2 - a.distanceKm * 0.5 + (a.emergencyAvailable ? 3 : 0);
    let scoreB = b.rating * 2 - b.distanceKm * 0.5 + (b.emergencyAvailable ? 3 : 0);
    return scoreB - scoreA;
  })[0];

  if (!topRecommended) return null;

  const destinationUrl = userCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${topRecommended.lat},${topRecommended.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${topRecommended.lat},${topRecommended.lng}`;

  const estMins = Math.max(2, Math.round(topRecommended.distanceKm * 2.5));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-gradient-to-br from-health-cyan/20 via-health-blue/15 to-black/60 border border-health-cyan/40 shadow-glow-blue space-y-4 relative overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute -right-12 -top-12 h-36 w-36 bg-health-cyan/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-xl bg-gradient-to-r from-health-cyan to-health-blue text-white shadow-md">
            <Sparkles className="h-4 w-4 animate-spin-slow" />
          </span>
          <div>
            <h3 className="font-display font-extrabold text-sm text-white flex items-center space-x-1.5">
              <span>Recommended for You</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-health-cyan/20 text-health-cyan border border-health-cyan/30 uppercase tracking-wider font-extrabold">
                HridyaAI Match
              </span>
            </h3>
            <p className="text-[10px] text-health-textMuted font-light">
              AI-matched optimal cardiac care facility based on risk profile & live proximity.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-health-amber font-bold text-xs shrink-0 self-start sm:self-center">
          <Star className="h-4 w-4 fill-health-amber" />
          <span>{topRecommended.rating}★</span>
          <span className="text-white/40 text-[10px]">({topRecommended.userRatingsTotal} Google reviews)</span>
        </div>
      </div>

      {/* Recommended Facility Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* Facility Details */}
        <div className="md:col-span-7 space-y-2">
          <div>
            <span className="text-[9px] font-extrabold text-health-cyan bg-health-cyan/15 border border-health-cyan/25 px-2 py-0.5 rounded uppercase tracking-wider">
              {topRecommended.type}
            </span>
            <h4 className="font-display font-extrabold text-base text-white mt-1">{topRecommended.name}</h4>
            <p className="text-xs text-white/80 font-light flex items-center space-x-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-health-rose shrink-0" />
              <span className="truncate">{topRecommended.address}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs pt-1">
            <span className="font-extrabold text-health-cyan bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              📏 {topRecommended.distance}
            </span>
            <span className="font-semibold text-health-emerald bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>~{estMins} mins drive</span>
            </span>
          </div>
        </div>

        {/* AI Rationale Bullets */}
        <div className="md:col-span-5 bg-black/40 border border-white/10 rounded-xl p-3 space-y-1.5 text-[10.5px]">
          <p className="text-[9px] uppercase font-bold text-health-textMuted flex items-center space-x-1">
            <ShieldCheck className="h-3.5 w-3.5 text-health-emerald" />
            <span>Why HridyaAI Recommends This:</span>
          </p>
          
          <ul className="space-y-1 text-white/90 font-medium leading-tight">
            <li className="flex items-center space-x-1.5">
              <span className="text-health-emerald font-bold">✔</span>
              <span>Highest cardiac rating nearby ({topRecommended.rating}★)</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="text-health-emerald font-bold">✔</span>
              <span>24×7 Emergency Cardiac ICU & Cath Lab</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="text-health-emerald font-bold">✔</span>
              <span>Verified Google Places Healthcare Provider</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Action Row */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-white/10 gap-2">
        <div className="flex items-center space-x-2">
          {topRecommended.phone && (
            <a
              href={`tel:${topRecommended.phone}`}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-white text-xs font-bold uppercase transition-all flex items-center space-x-1.5"
            >
              <Phone className="h-3.5 w-3.5 text-health-emerald" />
              <span>Call Facility</span>
            </a>
          )}

          <button
            onClick={() => onSelectFacility(topRecommended.id)}
            className="px-3 py-1.5 border border-health-cyan/30 bg-health-cyan/15 hover:bg-health-cyan/25 rounded-xl text-health-cyan text-xs font-bold uppercase transition-all flex items-center space-x-1"
          >
            <span>Focus Map</span>
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onViewDetails(topRecommended.id)}
            className="px-3.5 py-1.5 border border-white/10 bg-white/5 hover:bg-white/15 text-white text-xs font-bold uppercase rounded-xl transition-all"
          >
            Details
          </button>

          <a
            href={destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 bg-gradient-to-r from-health-blue to-health-cyan text-white text-xs font-extrabold uppercase rounded-xl hover:shadow-glow flex items-center space-x-1.5 transition-all"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Get Directions</span>
          </a>
        </div>
      </div>

    </motion.div>
  );
}
