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
        return { icon: Siren, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100 text-red-700 border border-red-200' };
      case 'cardiologist':
        return { icon: Stethoscope, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border border-blue-200' };
      case 'hospital':
        return { icon: Building2, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border border-blue-200' };
      case 'clinic':
        return { icon: HeartPulse, bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200' };
      case 'diagnostic':
        return { icon: Activity, bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', badge: 'bg-cyan-100 text-cyan-700 border border-cyan-200' };
      case 'pharmacy':
        return { icon: Pill, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 border border-amber-200' };
      default:
        return { icon: HeartPulse, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border border-blue-200' };
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
          ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex space-x-3 items-center overflow-hidden">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 ${config.bg} ${config.border} ${config.text}`}>
            <CategoryIcon className="h-5 w-5" />
          </div>

          <div className="overflow-hidden pr-2">
            <h4 className="font-display font-bold text-sm text-slate-900 truncate">{doctor.name}</h4>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded ${config.badge}`}>
                {doctor.type}
              </span>
              {isEmergency && (
                <span className="text-[8px] font-extrabold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded flex items-center space-x-1 uppercase animate-pulse">
                  <span>24/7 ER</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Distance Badge */}
        <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg shrink-0">
          {doctor.distance}
        </span>
      </div>

      {/* Detail info rows */}
      <div className="space-y-1.5 text-[11px] text-slate-600 font-light">
        <div className="flex items-start space-x-1.5">
          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
          <span className="truncate text-slate-700 font-medium">{doctor.address}</span>
        </div>

        <div className="flex justify-between items-center pt-0.5">
          <div className="flex items-center space-x-1.5">
            <span className={`h-2 w-2 rounded-full ${doctor.openNow ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className={`font-semibold text-[10px] ${doctor.openNow ? 'text-emerald-700' : 'text-rose-600'}`}>
              {doctor.openNow ? 'Open Now' : 'Closed'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xxs text-slate-500">{doctor.openingHours}</span>
          </div>
          
          <div className="flex items-center space-x-1 text-amber-500 text-[10px]">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span className="font-bold text-slate-900">{doctor.rating}</span>
            <span className="text-slate-400">({doctor.userRatingsTotal})</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 gap-1.5 shrink-0">
        
        {/* Phone Call */}
        {doctor.phone ? (
          <a
            href={`tel:${doctor.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 text-[10px] font-bold uppercase transition-all flex items-center space-x-1 shadow-xs"
          >
            <Phone className="h-3 w-3 text-emerald-600" />
            <span>Call</span>
          </a>
        ) : (
          <button
            disabled
            className="px-2.5 py-1.5 border border-slate-100 bg-slate-50 text-slate-300 text-[10px] font-bold uppercase rounded-lg flex items-center space-x-1 cursor-not-allowed"
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
          className="px-2.5 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center space-x-1 shadow-xs"
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
          className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[10px] font-bold uppercase rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all flex items-center space-x-1 shadow-xs"
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
          className="px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold uppercase rounded-lg transition-all shadow-xs"
        >
          Details
        </button>
      </div>
    </motion.div>
  );
}
