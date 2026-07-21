import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Navigation, Star, MapPin, Siren, Stethoscope, Building2, HeartPulse, Activity, Pill, Eye } from 'lucide-react';
import { Facility } from '../../services/googleMapsService';

interface DoctorCardProps {
  doctor: Facility;
  isSelected: boolean;
  patientCoords: [number, number] | null;
  onClick: () => void;
  onViewDetails: () => void;
}

export default function DoctorCard({
  doctor,
  isSelected,
  patientCoords,
  onClick,
  onViewDetails,
}: DoctorCardProps) {
  // Navigation coordinates URL
  const destinationUrl = patientCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${patientCoords[0]},${patientCoords[1]}&destination=${doctor.lat},${doctor.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${doctor.lat},${doctor.lng}`;

  const isEmergency = doctor.emergencyAvailable || doctor.categoryKey === 'emergency';

  // Category Icon & Styling Helper
  const getCategoryConfig = () => {
    switch (doctor.categoryKey) {
      case 'emergency':
        return { icon: Siren, bg: 'bg-health-rose/15', border: 'border-health-rose/30', text: 'text-health-rose', badge: 'bg-health-rose text-white' };
      case 'cardiologist':
        return { icon: Stethoscope, bg: 'bg-health-cyan/15', border: 'border-health-cyan/30', text: 'text-health-cyan', badge: 'bg-health-cyan/20 text-health-cyan' };
      case 'hospital':
        return { icon: Building2, bg: 'bg-health-blue/15', border: 'border-health-blue/30', text: 'text-health-blue', badge: 'bg-health-blue/20 text-health-blue' };
      case 'clinic':
        return { icon: HeartPulse, bg: 'bg-health-violet/15', border: 'border-health-violet/30', text: 'text-health-violet', badge: 'bg-health-violet/20 text-health-violet' };
      case 'diagnostic':
        return { icon: Activity, bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' };
      case 'pharmacy':
        return { icon: Pill, bg: 'bg-health-amber/15', border: 'border-health-amber/30', text: 'text-health-amber', badge: 'bg-health-amber/20 text-health-amber' };
      default:
        return { icon: HeartPulse, bg: 'bg-health-cyan/15', border: 'border-health-cyan/30', text: 'text-health-cyan', badge: 'bg-health-cyan/20 text-health-cyan' };
    }
  };

  const config = getCategoryConfig();
  const CategoryIcon = config.icon;

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
        isSelected
          ? 'bg-health-blue/15 border-health-blue shadow-glow-blue ring-1 ring-health-blue/50'
          : 'bg-white/5 border-white/5 hover:border-white/15 hover:bg-white/10'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex space-x-3 items-center overflow-hidden">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 ${config.bg} ${config.border} ${config.text}`}>
            <CategoryIcon className="h-5 w-5" />
          </div>

          <div className="overflow-hidden pr-2">
            <h4 className="font-display font-bold text-sm text-white truncate">{doctor.name}</h4>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded ${config.badge}`}>
                {doctor.type}
              </span>
              {isEmergency && (
                <span className="text-[8px] font-extrabold text-health-rose bg-health-rose/15 border border-health-rose/30 px-1.5 py-0.5 rounded flex items-center space-x-1 uppercase animate-pulse">
                  <span>24/7 ER</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Distance Badge */}
        <span className="text-xs font-extrabold text-health-cyan bg-health-cyan/10 border border-health-cyan/20 px-2.5 py-1 rounded-lg shrink-0">
          {doctor.distance}
        </span>
      </div>

      {/* Detail info rows */}
      <div className="space-y-1.5 text-[11px] text-health-textMuted font-light">
        <div className="flex items-start space-x-1.5">
          <MapPin className="h-3.5 w-3.5 text-health-rose shrink-0 mt-0.5" />
          <span className="truncate text-white/80">{doctor.address}</span>
        </div>

        <div className="flex justify-between items-center pt-0.5">
          <div className="flex items-center space-x-1.5">
            <span className={`h-2 w-2 rounded-full ${doctor.openNow ? 'bg-health-emerald animate-pulse' : 'bg-health-rose'}`} />
            <span className="font-semibold text-white/80 text-[10px]">
              {doctor.openNow ? 'Open Now' : 'Closed'}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xxs text-white/60">{doctor.openingHours}</span>
          </div>
          
          <div className="flex items-center space-x-1 text-health-amber text-[10px]">
            <Star className="h-3.5 w-3.5 fill-health-amber" />
            <span className="font-bold text-white">{doctor.rating}</span>
            <span className="text-white/40">({doctor.userRatingsTotal})</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex justify-between items-center pt-2.5 border-t border-white/5 gap-1.5 shrink-0">
        
        {/* Phone Call */}
        {doctor.phone ? (
          <a
            href={`tel:${doctor.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1.5 border border-white/10 bg-white/5 hover:bg-white/15 rounded-lg text-white text-[10px] font-bold uppercase transition-all flex items-center space-x-1"
          >
            <Phone className="h-3 w-3 text-health-emerald" />
            <span>Call</span>
          </a>
        ) : (
          <button
            disabled
            className="px-2.5 py-1.5 border border-white/5 bg-white/5 text-white/20 text-[10px] font-bold uppercase rounded-lg flex items-center space-x-1 cursor-not-allowed"
          >
            <Phone className="h-3 w-3" />
            <span>Call</span>
          </button>
        )}

        {/* View on Map Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="px-2.5 py-1.5 border border-health-cyan/30 bg-health-cyan/15 hover:bg-health-cyan/25 text-health-cyan text-[10px] font-bold uppercase rounded-lg transition-all flex items-center space-x-1"
        >
          <Eye className="h-3 w-3" />
          <span>View Map</span>
        </button>

        {/* Get Directions Link */}
        <a
          href={destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="px-2.5 py-1.5 bg-gradient-to-r from-health-blue to-health-cyan text-white text-[10px] font-bold uppercase rounded-lg hover:shadow-glow transition-all flex items-center space-x-1"
        >
          <Navigation className="h-3 w-3" />
          <span>Directions</span>
        </a>

        {/* View Full Info Modal */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="px-2 py-1.5 border border-white/10 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-[10px] font-bold uppercase rounded-lg transition-all"
        >
          Details
        </button>
      </div>
    </motion.div>
  );
}
