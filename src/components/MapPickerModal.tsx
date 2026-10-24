import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X, Check, Loader2 } from 'lucide-react';
import L from 'leaflet';
import type { LocationCoords } from '../types/index.ts';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (coords: LocationCoords) => void;
  initialCoords?: LocationCoords;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialCoords?.lat || 41.311081,
    lng: initialCoords?.lng || 69.240562,
  });

  const [resolvedAddress, setResolvedAddress] = useState<string>(
    initialCoords?.address || 'Toshkent shahri'
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // Reverse geocode
  const fetchAddress = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'uz, ru, en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const display = data.display_name
          ? data.display_name.split(',').slice(0, 3).join(', ')
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setResolvedAddress(display);
      }
    } catch {
      setResolvedAddress(`Koordinata: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure container is mounted & sized
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 15);

        // Dark-styled OpenStreetMap / CartoDB tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);

        // Custom Gold Crown Marker Icon
        const goldIcon = L.divIcon({
          className: 'custom-gold-marker',
          html: `
            <div style="
              width: 38px;
              height: 38px;
              background: linear-gradient(135deg, #d4af37, #aa820a);
              border: 3px solid #ffffff;
              box-shadow: 0 4px 14px rgba(0,0,0,0.5);
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                transform: rotate(45deg);
                width: 14px;
                height: 14px;
                background: #0b0f17;
                border-radius: 50%;
              "></div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
        });

        const marker = L.marker([coords.lat, coords.lng], {
          icon: goldIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setCoords({ lat: pos.lat, lng: pos.lng });
          fetchAddress(pos.lat, pos.lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          fetchAddress(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([coords.lat, coords.lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([coords.lat, coords.lng]);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Brauzeringizda GPS lokatsiya qo‘llab-quvvatlanmaydi');
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingGPS(false);
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        fetchAddress(latitude, longitude);
      },
      (error) => {
        setIsLocatingGPS(false);
        console.warn('GPS error:', error);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    onSelectLocation({
      lat: coords.lat,
      lng: coords.lng,
      address: resolvedAddress,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#131b2a] border border-slate-700/80 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1522]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#d4af37]/15 text-[#d4af37]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Xaritadan lokatsiyani tanlang</h3>
              <p className="text-xs text-slate-400">Yetkazib berish nuqtasini belgilang yoki xaritani bosing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[340px] sm:min-h-[400px] w-full bg-slate-950">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* GPS Quick Button */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={isLocatingGPS}
            className="absolute top-4 right-4 z-[500] px-3.5 py-2 rounded-xl bg-[#0b0f17]/90 hover:bg-[#131b2a] text-white border border-[#d4af37]/50 shadow-lg flex items-center gap-2 text-xs font-semibold backdrop-blur transition active:scale-95 cursor-pointer"
          >
            {isLocatingGPS ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
            ) : (
              <Navigation className="w-4 h-4 text-[#d4af37]" />
            )}
            <span>Joriy joylashuv (GPS)</span>
          </button>
        </div>

        {/* Selected Coordinates & Address Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0e1522] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs text-[#d4af37] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>Tanlangan manzil:</span>
              {isGeocoding && <Loader2 className="w-3 h-3 animate-spin" />}
            </div>
            <div className="text-sm font-medium text-white line-clamp-1">{resolvedAddress}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-bold text-sm shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Lokatsiyani tasdiqlash</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
