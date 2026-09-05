import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MapPin, Phone, Navigation, Heart, Award, GraduationCap, Globe, Clock } from 'lucide-react';

interface DoctorModalProps {
  doctor: any;
  isOpen: boolean;
  onClose: () => void;
  patientCoords: [number, number] | null;
}

export default function DoctorModal({
  doctor,
  isOpen,
  onClose,
  patientCoords,
}: DoctorModalProps) {
  if (!doctor || !isOpen) return null;

  const destinationUrl = patientCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${patientCoords[0]},${patientCoords[1]}&destination=${doctor.lat},${doctor.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${doctor.lat},${doctor.lng}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black backdrop-blur-sm"
        />

        {/* Modal content glass box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="w-full max-w-lg p-6 rounded-2xl border border-slate-200/80 relative z-10 bg-white shadow-saas-lg text-slate-900 space-y-5"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Profile Header */}
          <div className="flex space-x-4 items-start border-b border-slate-100 pb-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Heart className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>

            <div className="overflow-hidden space-y-1">
              <span className="text-[8px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase tracking-wider">
                {doctor.type}
              </span>
              <h3 className="font-display font-extrabold text-base leading-tight text-slate-900 mt-1">{doctor.name}</h3>
              <p className="text-xxs text-slate-500 font-semibold uppercase tracking-widest">
                {doctor.specialization || 'Cardiovascular Medicine'}
              </p>
            </div>
          </div>

          {/* Details sections */}
          <div className="space-y-4 text-xxs leading-relaxed font-light text-slate-800 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {/* Bio */}
            <div className="space-y-1">
              <h4 className="font-bold text-slate-500 uppercase tracking-wider">Clinical Biography</h4>
              <p className="text-slate-600">
                {doctor.bio || `Dr. ${doctor.name.split(' ').pop()} is a highly respected expert specializing in cardiovascular procedures, critical coronary interventions, and myocardial care pathways at ${doctor.hospitalName || 'Hridya Cardio Center'}.`}
              </p>
            </div>

            {/* Row specs */}
            <div className="grid grid-cols-2 gap-3 border-t border-b border-slate-100 py-3">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-[8px] text-slate-500 font-semibold uppercase">Qualification</p>
                  <p className="font-bold text-slate-900">{doctor.qualification || 'MD, FACC, FSCAI'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Award className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[8px] text-slate-500 font-semibold uppercase">Experience</p>
                  <p className="font-bold text-slate-900">{doctor.experience || '12+ Years Practice'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Globe className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-[8px] text-slate-500 font-semibold uppercase">Languages</p>
                  <p className="font-bold text-slate-900">{doctor.languages || 'English, Hindi'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                <div>
                  <p className="text-[8px] text-slate-500 font-semibold uppercase">Timings</p>
                  <p className="font-bold text-slate-900">{doctor.openingHours || '9:00 AM - 5:00 PM'}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <h4 className="font-bold text-slate-500 uppercase tracking-wider">Facility Address</h4>
              <p className="flex items-start space-x-1.5 text-slate-700">
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-rose-500 shrink-0" />
                <span>{doctor.address}</span>
              </p>
            </div>

            {/* Contact rating */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="space-y-0.5">
                <span className="text-[8px] text-slate-500 font-semibold uppercase">Google Places Rank</span>
                <div className="flex items-center space-x-1 text-amber-500 font-bold text-xs">
                  <Star className="h-4.5 w-4.5 fill-amber-400 text-amber-500" />
                  <span className="text-slate-900 font-extrabold">{doctor.rating}</span>
                  <span className="text-xxs text-slate-500 font-light">({doctor.userRatingsTotal || 45} reviews)</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[8px] text-slate-500 font-semibold uppercase block">Telephone</span>
                <span className="font-bold text-slate-900 text-xs">{doctor.phone || 'Unavailable'}</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex space-x-3 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xxs font-bold border border-slate-200 bg-slate-50 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-xs"
            >
              Close Info
            </button>

            {doctor.phone && (
              <a
                href={`tel:${doctor.phone}`}
                className="py-2 px-4 border border-slate-200 bg-white rounded-xl text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center space-x-1 text-xxs font-bold shadow-xs"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>Call Clinic</span>
              </a>
            )}

            <a
              href={destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xxs font-bold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all flex items-center justify-center space-x-1 shadow-xs"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Get Directions</span>
            </a>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
