import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw, Navigation, MapPin } from 'lucide-react';
import { Facility, loadGoogleMapsScript } from '../../services/googleMapsService';

interface NearbyMapProps {
  center: [number, number];
  doctors: Facility[];
  selectedDoctorId: string | null;
  onSelectDoctor: (id: string) => void;
  userCoords: [number, number] | null;
}

export default function NearbyMap({
  center,
  doctors,
  selectedDoctorId,
  onSelectDoctor,
  userCoords,
}: NearbyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activeInfoWindowRef = useRef<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  // Initialize Google Map canvas
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      setMapLoading(true);
      setMapError(false);

      const scriptOk = await loadGoogleMapsScript();
      if (!isMounted) return;

      if (!scriptOk || typeof (window as any).google === 'undefined' || !(window as any).google.maps) {
        console.warn('Google Maps JS API unavailable. Canvas will render in interactive fallback mode.');
        setMapLoading(false);
        setMapError(true);
        return;
      }

      if (!mapRef.current) return;

      try {
        const google = (window as any).google;
        const mapOptions = {
          center: { lat: center[0], lng: center[1] },
          zoom: 13,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
            { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#1e293b' }] },
            { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#2563eb' }] },
            { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
            { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bfdbfe' }] },
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true,
          gestureHandling: 'cooperative',
        };

        const map = new google.maps.Map(mapRef.current, mapOptions);
        googleMapInstanceRef.current = map;
        setMapLoading(false);
      } catch (err) {
        console.error('Error mounting Google Map canvas:', err);
        setMapLoading(false);
        setMapError(true);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [center]);

  // Synchronize Markers & InfoWindows when doctors or selected state changes
  useEffect(() => {
    const map = googleMapInstanceRef.current;
    if (!map || typeof (window as any).google === 'undefined') return;

    const google = (window as any).google;

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Close any open InfoWindow
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
    }

    // 1. Render User Location Radar Marker
    const userLat = userCoords ? userCoords[0] : center[0];
    const userLng = userCoords ? userCoords[1] : center[1];

    const userSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="18" fill="#0EA5E9" fill-opacity="0.2" stroke="#0EA5E9" stroke-width="2"/>
        <circle cx="20" cy="20" r="10" fill="#0EA5E9"/>
        <circle cx="20" cy="20" r="4" fill="#FFFFFF"/>
      </svg>
    `;

    const userMarker = new google.maps.Marker({
      position: { lat: userLat, lng: userLng },
      map: map,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(userSvg),
        size: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20),
      },
      zIndex: 999,
    });

    const userInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="color: #0f172a; font-weight: bold; font-size: 11px; padding: 4px; font-family: sans-serif;">
          📍 Your Current Location
        </div>
      `,
    });

    userMarker.addListener('click', () => {
      userInfoWindow.open(map, userMarker);
    });

    markersRef.current.push(userMarker);

    // 2. Helper to get category color & SVG icon
    const getCategoryMarkerSvg = (categoryKey: string, isSelected: boolean) => {
      let fillColor = '#06B6D4'; // cyan default
      let innerPath = 'M12 6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm0 8.5c-2.67 0-8 1.34-8 4v1.5h16V19c0-2.66-5.33-4-8-4z'; // doctor

      if (categoryKey === 'emergency') {
        fillColor = '#F43F5E'; // rose
        innerPath = 'M16 11.5h-3v-3h-2v3H8v2h3v3h2v-3h3v-2z';
      } else if (categoryKey === 'hospital') {
        fillColor = '#3B82F6'; // blue
        innerPath = 'M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z';
      } else if (categoryKey === 'clinic') {
        fillColor = '#8B5CF6'; // violet
        innerPath = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
      } else if (categoryKey === 'diagnostic') {
        fillColor = '#0284C7'; // sky blue
        innerPath = 'M3 13h2l2-5 3 10 3-7 2 4h4';
      } else if (categoryKey === 'pharmacy') {
        fillColor = '#F59E0B'; // amber
        innerPath = 'M6 3h12v2H6zm0 16h12v2H6zm3-13h6v10H9z';
      }

      const borderStroke = isSelected ? '#FFFFFF' : '#0F172A';
      const size = isSelected ? 42 : 34;

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
          <circle cx="16" cy="16" r="14" fill="${fillColor}" stroke="${borderStroke}" stroke-width="${isSelected ? '3' : '1.5'}"/>
          <path d="${innerPath}" fill="#FFFFFF"/>
        </svg>
      `;
    };

    // 3. Render Markers for Facilities
    doctors.forEach((doc) => {
      const isSelected = doc.id === selectedDoctorId;
      const svgIcon = getCategoryMarkerSvg(doc.categoryKey, isSelected);

      const marker = new google.maps.Marker({
        position: { lat: doc.lat, lng: doc.lng },
        map: map,
        title: doc.name,
        icon: {
          url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(svgIcon),
          size: new google.maps.Size(isSelected ? 42 : 34, isSelected ? 42 : 34),
          anchor: new google.maps.Point(isSelected ? 21 : 17, isSelected ? 21 : 17),
        },
        zIndex: isSelected ? 900 : 100,
      });

      const destUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${doc.lat},${doc.lng}&travelmode=driving`;

      const infoWindowContent = `
        <div style="color: #0f172a; padding: 6px; font-family: system-ui, sans-serif; max-width: 200px;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="font-size: 8px; font-weight: bold; text-transform: uppercase; background: #e2e8f0; padding: 2px 4px; border-radius: 4px;">${doc.type}</span>
            <span style="font-size: 9px; color: #16a34a; font-weight: bold;">${doc.openNow ? 'Open Now' : 'Closed'}</span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.2;">${doc.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 10px; color: #64748b;">📍 ${doc.address}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: bold; border-top: 1px solid #e2e8f0; pt-4; margin-top: 4px;">
            <span style="color: #0284c7;">📏 ${doc.distance}</span>
            <span style="color: #d97706;">★ ${doc.rating} (${doc.userRatingsTotal})</span>
          </div>
          <a href="${destUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; margin-top: 6px; background: #0284c7; color: white; text-decoration: none; font-size: 9px; font-weight: bold; padding: 4px 8px; border-radius: 6px; text-transform: uppercase;">
            Get Navigation
          </a>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent,
      });

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }
        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;
        onSelectDoctor(doc.id);
      });

      (marker as any).facilityId = doc.id;
      (marker as any).infoWindow = infoWindow;
      markersRef.current.push(marker);

      // If this item was selected via list card click, open its info window
      if (isSelected) {
        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;
      }
    });
  }, [doctors, center, selectedDoctorId, onSelectDoctor, userCoords]);

  // Center camera and zoom on card clicks
  useEffect(() => {
    const map = googleMapInstanceRef.current;
    if (!map || !selectedDoctorId) return;

    const selectedDoc = doctors.find((d) => d.id === selectedDoctorId);
    if (selectedDoc) {
      map.panTo({ lat: selectedDoc.lat, lng: selectedDoc.lng });
      map.setZoom(15);
    }
  }, [selectedDoctorId, doctors]);

  // Retry Connection callback
  const handleRetry = () => {
    setMapLoading(true);
    setMapError(false);
    window.location.reload();
  };

  return (
    <div className="w-full h-full relative min-h-[400px] bg-slate-100 flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs">
      {/* Loading Spinner overlay */}
      {mapLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 space-y-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
            Initializing Google Maps Canvas...
          </p>
        </div>
      )}

      {/* Error / Fallback Panel */}
      {mapError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-white/95 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Maps Canvas Connection Notice</h4>
            <p className="text-[10px] text-slate-600 font-light leading-relaxed">
              Google Maps JS API did not initialize directly. You can inspect facility details, navigate via Google Maps directions links, and use all filters.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="px-3.5 py-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[10px] uppercase font-bold rounded-xl text-blue-700 flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload Map Canvas</span>
          </button>
        </div>
      )}

      {/* Google Map DOM Element */}
      <div ref={mapRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
