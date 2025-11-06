import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
// Avoid using `any` to satisfy ESLint rule - cast via unknown
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface WalkMapProps {
  locations: Location[];
}

const WalkMap = ({ locations }: WalkMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      const center: [number, number] = locations.length > 0 
        ? [Number(locations[0].latitude), Number(locations[0].longitude)]
        : [40.4168, -3.7038]; // Madrid default

      mapRef.current = L.map(mapContainerRef.current).setView(center, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // Update markers and path
    if (markersLayerRef.current && locations.length > 0) {
      markersLayerRef.current.clearLayers();

      const latLngs: L.LatLngExpression[] = locations.map(loc => 
        [Number(loc.latitude), Number(loc.longitude)]
      );

      // Draw path
      L.polyline(latLngs, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.7
      }).addTo(markersLayerRef.current);

      // Add marker for last location
      const lastLocation = locations[locations.length - 1];
      L.marker([Number(lastLocation.latitude), Number(lastLocation.longitude)])
        .bindPopup(`Ubicación actual<br/>${new Date(lastLocation.timestamp).toLocaleTimeString('es-ES')}`)
        .addTo(markersLayerRef.current);

      // Fit bounds to show all locations
      if (locations.length > 1) {
        const bounds = L.latLngBounds(latLngs);
        mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
      } else {
        mapRef.current?.setView(latLngs[0] as [number, number], 15);
      }
    }

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-[400px] w-full rounded-lg"
      style={{ zIndex: 0 }}
    />
  );
};

export default WalkMap;
