import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import SearchBar from '../components/Nearby/SearchBar';
import LocationPermissionCard from '../components/Nearby/LocationPermissionCard';
import DoctorFilters from '../components/Nearby/DoctorFilters';
import DoctorCard from '../components/Nearby/DoctorCard';
import DoctorModal from '../components/Nearby/DoctorModal';
import LoadingSkeleton from '../components/Nearby/LoadingSkeleton';
import NearbyMap from '../components/Nearby/NearbyMap';
import ApiKeyNotice from '../components/Nearby/ApiKeyNotice';
import EmergencyBanner from '../components/Nearby/EmergencyBanner';
import AiRecommendationCard from '../components/Nearby/AiRecommendationCard';
import { Facility, fetchNearbyFacilities, geocodeLocation, GoogleApiErrorType } from '../services/googleMapsService';

export default function NearbyPage() {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLocationDetected, setIsLocationDetected] = useState(false);

  // Filter States
  const [radius, setRadius] = useState<number>(10); // Default 10km
  const [filterSpec, setFilterSpec] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterOpenNow, setFilterOpenNow] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Emergency Mode & Data States
  const [emergencyMode, setEmergencyMode] = useState<boolean>(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState<boolean>(false);
  const [apiErrorState, setApiErrorState] = useState<GoogleApiErrorType>('NONE');
  const [apiErrorMessage, setApiErrorMessage] = useState<string>('');

  // Selection & Modal States
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // List scroll container ref
  const listRef = useRef<HTMLDivElement>(null);

  // 1. Browser Geolocation Request
  const requestLocation = () => {
    if (navigator.geolocation) {
      setGeoLoading(true);
      setPermissionDenied(false);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords([pos.coords.latitude, pos.coords.longitude]);
          setGeoLoading(false);
          setIsLocationDetected(true);
        },
        (err) => {
          console.warn('Browser Geolocation rejected or timed out:', err);
          setGeoLoading(false);
          setPermissionDenied(true);
          setCoords([28.6139, 77.2090]); // New Delhi default coordinates
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setPermissionDenied(true);
      setCoords([28.6139, 77.2090]);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // 2. Manual Location Search Handler with Real Geocoding
  const handleManualSearch = async (city: string, pincode: string) => {
    setGeoLoading(true);
    const searchStr = `${city} ${pincode}`.trim();
    
    const geocoded = await geocodeLocation(searchStr);
    if (geocoded) {
      setCoords(geocoded);
      setIsLocationDetected(false);
    } else {
      // Fallback coordinate if query cannot be resolved
      setCoords([28.6139, 77.2090]);
      setIsLocationDetected(false);
    }
    setGeoLoading(false);
  };

  // 3. Fetch Nearby Facilities via Real Google Places API (Debounced)
  useEffect(() => {
    if (!coords) return;

    let isSubscribed = true;
    setIsLoadingFacilities(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const result = await fetchNearbyFacilities(
          coords[0],
          coords[1],
          radius,
          filterSpec,
          searchTerm
        );
        if (isSubscribed) {
          setFacilities(result.facilities);
          setApiErrorState(result.errorType);
          setApiErrorMessage(result.errorMessage || '');
          setIsLoadingFacilities(false);
        }
      } catch (err) {
        console.error('Error fetching nearby cardiac facilities:', err);
        if (isSubscribed) {
          setApiErrorState('QUOTA_EXCEEDED');
          setApiErrorMessage('Unable to fetch nearby healthcare providers. Please try again later.');
          setIsLoadingFacilities(false);
        }
      }
    }, 300);

    return () => {
      isSubscribed = false;
      clearTimeout(debounceTimer);
    };
  }, [coords, radius, filterSpec, searchTerm]);

  // 4. Apply Ratings and OpenNow Filters
  const filteredFacilities = useMemo(() => {
    return facilities.filter((fac) => {
      if (filterRating > 0 && fac.rating < filterRating) return false;
      if (filterOpenNow && !fac.openNow) return false;
      return true;
    });
  }, [facilities, filterRating, filterOpenNow]);

  // 5. Emergency Mode SOS Nearest Facility Computations
  const nearestEmergencyHospital = useMemo(() => {
    const emergencyFacilities = facilities.filter(
      (f) => f.categoryKey === 'emergency' || f.emergencyAvailable || f.type === 'Heart Hospital'
    );
    if (emergencyFacilities.length === 0) return facilities[0] || null;
    return emergencyFacilities.reduce((prev, curr) => (prev.distanceKm < curr.distanceKm ? prev : curr));
  }, [facilities]);

  const handleToggleEmergency = () => {
    const nextState = !emergencyMode;
    setEmergencyMode(nextState);
    if (nextState && nearestEmergencyHospital) {
      setSelectedDoctorId(nearestEmergencyHospital.id);
    }
  };

  const handleViewDetails = (docId: string) => {
    setSelectedDoctorId(docId);
    setDetailModalOpen(true);
  };

  const handleSelectDoctorFromMap = (docId: string) => {
    setSelectedDoctorId(docId);
    const cardEl = document.getElementById(`doc-card-${docId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const selectedDoctorObj = useMemo(() => {
    return filteredFacilities.find((d) => d.id === selectedDoctorId) || null;
  }, [selectedDoctorId, filteredFacilities]);

  return (
    <div className="space-y-5 relative">
      
      {/* Top Bar Notice & Manual Search */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {isLocationDetected ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase bg-health-emerald/15 text-health-emerald border border-health-emerald/30 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-health-emerald animate-ping" />
              <span>📍 Live Position Detected</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase bg-health-amber/15 text-health-amber border border-health-amber/30">
              <span>🔍 Custom Search Zone</span>
            </span>
          )}

          <span className="text-xxs text-health-textMuted font-medium">
            {coords ? `[${coords[0].toFixed(3)}, ${coords[1].toFixed(3)}]` : ''}
          </span>
        </div>

        <SearchBar
          onSearch={handleManualSearch}
          onRequestGeolocation={requestLocation}
          isLoading={geoLoading}
        />
      </div>

      {/* Google API Notice Banner */}
      <ApiKeyNotice />

      {/* ⭐ HridyaAI Recommendation Card (When Real Facilities Exist) */}
      {!isLoadingFacilities && filteredFacilities.length > 0 && (
        <AiRecommendationCard
          facilities={filteredFacilities}
          userCoords={coords}
          onSelectFacility={(id) => handleSelectDoctorFromMap(id)}
          onViewDetails={(id) => handleViewDetails(id)}
        />
      )}

      {/* Emergency SOS Banner (If Active) */}
      {emergencyMode && (
        <EmergencyBanner
          nearestEmergency={nearestEmergencyHospital}
          userCoords={coords}
          onExitEmergency={() => setEmergencyMode(false)}
          onSelectEmergencyOnMap={(id) => handleSelectDoctorFromMap(id)}
        />
      )}

      {/* Doctor & Facility Filter Controls */}
      <DoctorFilters
        radius={radius}
        setRadius={setRadius}
        filterSpec={filterSpec}
        setFilterSpec={setFilterSpec}
        filterRating={filterRating}
        setFilterRating={setFilterRating}
        filterOpenNow={filterOpenNow}
        setFilterOpenNow={setFilterOpenNow}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        emergencyMode={emergencyMode}
        onToggleEmergency={handleToggleEmergency}
      />

      {/* Error Banners if API Key Missing or Quota Exceeded */}
      {apiErrorState === 'MISSING_KEY' && (
        <div className="p-6 rounded-2xl bg-health-amber/10 border-2 border-health-amber/40 text-center space-y-3 max-w-2xl mx-auto shadow-glow">
          <div className="h-12 w-12 rounded-2xl bg-health-amber/20 flex items-center justify-center text-health-amber mx-auto">
            <Key className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-extrabold text-base text-white uppercase tracking-wider">
              Google Maps API is not configured
            </h3>
            <p className="text-xs text-white/80 font-light leading-relaxed">
              Please configure <code className="bg-black/40 px-2 py-0.5 rounded text-health-cyan font-mono">VITE_GOOGLE_MAPS_API_KEY</code> in your environment file to load live Google Places cardiac care providers.
            </p>
            <p className="text-[10px] text-health-textMuted italic pt-1">
              Zero fake or fabricated medical providers are displayed.
            </p>
          </div>
        </div>
      )}

      {apiErrorState === 'QUOTA_EXCEEDED' && (
        <div className="p-6 rounded-2xl bg-health-rose/10 border-2 border-health-rose/40 text-center space-y-3 max-w-2xl mx-auto shadow-glow-rose">
          <div className="h-12 w-12 rounded-2xl bg-health-rose/20 flex items-center justify-center text-health-rose mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-extrabold text-base text-white uppercase tracking-wider">
              Unable to fetch nearby healthcare providers
            </h3>
            <p className="text-xs text-white/80 font-light leading-relaxed">
              Google Places API limit was reached or network request failed. Please try again later.
            </p>
          </div>
        </div>
      )}

      {/* Main Split-Pane Canvas */}
      {!coords ? (
        <div className="flex items-center justify-center min-h-[400px]">
          {permissionDenied ? (
            <LocationPermissionCard
              requestLocation={requestLocation}
              geoLoading={geoLoading}
              permissionDenied={permissionDenied}
              onUseManualSearch={() => handleManualSearch('New Delhi', '110001')}
            />
          ) : (
            <div className="flex flex-col items-center space-y-4 p-8 glass-panel rounded-2xl max-w-sm">
              <Loader2 className="h-10 w-10 text-health-cyan animate-spin" />
              <p className="text-xs text-health-textMuted uppercase font-bold tracking-widest text-center">
                Acquiring GPS Satellite Coordinates...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-270px)] min-h-[520px] overflow-hidden items-stretch">
          
          {/* LEFT PANEL: Interactive Google Map Canvas */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-2xl overflow-hidden h-full z-10 border border-white/5 relative shadow-glow">
            <NearbyMap
              center={coords}
              doctors={filteredFacilities}
              selectedDoctorId={selectedDoctorId}
              onSelectDoctor={handleSelectDoctorFromMap}
              userCoords={coords}
            />
          </div>

          {/* RIGHT PANEL: Scrollable Facility Cards List */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-[#0f172a]/60 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
            
            {/* List Header */}
            <div className="px-5 py-3.5 border-b border-white/5 bg-black/30 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-white">
                  Real Facilities ({filteredFacilities.length})
                </h3>
                {isLoadingFacilities && <Loader2 className="h-3 w-3 text-health-cyan animate-spin" />}
              </div>

              <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/70 font-bold uppercase">
                {radius} km zone
              </span>
            </div>

            {/* List Scrollable Body */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {isLoadingFacilities && facilities.length === 0 ? (
                <LoadingSkeleton />
              ) : filteredFacilities.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
                  <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-health-textMuted">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-xs font-bold text-white uppercase">No Healthcare Providers Found</h4>
                    <p className="text-xxs text-health-textMuted italic leading-relaxed">
                      {apiErrorState === 'MISSING_KEY'
                        ? 'Google Maps API is not configured. Configure VITE_GOOGLE_MAPS_API_KEY to view real cardiac providers.'
                        : `No providers matched your filter criteria within ${radius} km.`}
                    </p>
                  </div>
                  
                  {apiErrorState === 'NONE' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setRadius(50)}
                        className="px-3.5 py-2 border border-health-cyan/30 bg-health-cyan/15 hover:bg-health-cyan/25 text-[9.5px] uppercase font-bold rounded-xl text-health-cyan transition-all"
                      >
                        Expand Radius to 50 km
                      </button>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterSpec('all');
                          setFilterRating(0);
                          setFilterOpenNow(false);
                        }}
                        className="px-3 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-[9.5px] uppercase font-bold rounded-xl text-white transition-all"
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredFacilities.map((doc) => (
                  <div id={`doc-card-${doc.id}`} key={doc.id}>
                    <DoctorCard
                      doctor={doc}
                      isSelected={selectedDoctorId === doc.id}
                      patientCoords={coords}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      onViewDetails={() => handleViewDetails(doc.id)}
                    />
                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      )}

      {/* Dynamic Detail Modal */}
      <DoctorModal
        doctor={selectedDoctorObj}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        patientCoords={coords}
      />

    </div>
  );
}
