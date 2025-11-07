import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';

// Fix for default marker icons
// Avoid using `any` to satisfy ESLint rule - cast via unknown
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AdminLocation {
  id: string;
  admin_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

const AdminTrackingMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [lastLocation, setLastLocation] = useState<AdminLocation | null>(null);

  const updateMarker = useCallback((location: AdminLocation) => {
    if (!mapRef.current) return;

    const latLng: [number, number] = [Number(location.latitude), Number(location.longitude)];

    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
      markerRef.current.setPopupContent(`Última actualización:<br/>${new Date(location.timestamp).toLocaleString('es-ES')}`);
    } else {
      markerRef.current = L.marker(latLng)
        .bindPopup(`Última actualización:<br/>${new Date(location.timestamp).toLocaleString('es-ES')}`)
        .addTo(mapRef.current);
    }

    mapRef.current.setView(latLng, 15);
  }, []);

  const loadLatestLocation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_locations')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setLastLocation(data);
        updateMarker(data);
      }
    } catch (error) {
      // Silently fail if no locations yet
    }
  }, [updateMarker]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const defaultCenter: [number, number] = [40.4168, -3.7038]; // Madrid default
    mapRef.current = L.map(mapContainerRef.current).setView(defaultCenter, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    // Load initial location
    loadLatestLocation();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-location-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_locations'
        },
        (payload) => {
          const newLocation = payload.new as AdminLocation;
          setLastLocation(newLocation);
          updateMarker(newLocation);
        }
      )
      .subscribe();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [loadLatestLocation, updateMarker]);

  return (
    <div className="space-y-2">
      <div 
        ref={mapContainerRef} 
        className="h-[400px] w-full rounded-lg border border-border"
        style={{ zIndex: 0 }}
      />
      {lastLocation && (
        <p className="text-sm text-muted-foreground text-center">
          Última actualización: {new Date(lastLocation.timestamp).toLocaleString('es-ES')}
        </p>
      )}
    </div>
  );
};

export default AdminTrackingMap;
