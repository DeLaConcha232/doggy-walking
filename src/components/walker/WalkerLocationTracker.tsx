import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square, MapPin, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WalkerLocationTrackerProps {
  userId: string;
  isActive: boolean;
  onStatusChange: (active: boolean) => void;
}

const TRACKING_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

const WalkerLocationTracker = ({ userId, isActive, onStatusChange }: WalkerLocationTrackerProps) => {
  const [tracking, setTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check if tracking is already active on mount
  useEffect(() => {
    const checkActiveTracking = async () => {
      if (!userId) return;

      const { data } = await supabase
        .from('admin_locations')
        .select('is_active, timestamp, latitude, longitude')
        .eq('admin_id', userId)
        .eq('is_active', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setTracking(true);
        setLastUpdate(new Date(data.timestamp));
        setCurrentPosition({ lat: Number(data.latitude), lng: Number(data.longitude) });
        onStatusChange(true);
      }
    };

    checkActiveTracking();
  }, [userId, onStatusChange]);

  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    if (!userId) return;

    const { latitude, longitude } = position.coords;
    setCurrentPosition({ lat: latitude, lng: longitude });

    try {
      // First, deactivate any previous active locations
      await supabase
        .from('admin_locations')
        .update({ is_active: false })
        .eq('admin_id', userId)
        .eq('is_active', true);

      // Insert new location
      const { error } = await supabase
        .from('admin_locations')
        .insert({
          admin_id: userId,
          latitude: latitude,
          longitude: longitude,
          is_active: true,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error updating location:', err);
    }
  }, [userId]);

  const startTracking = async () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no está soportada en este dispositivo');
      return;
    }

    setStarting(true);

    try {
      // Request permission and get initial position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      // Update initial location
      await updateLocation(position);

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error('Geolocation error:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );

      // Set up interval to update location every 10 minutes
      intervalRef.current = setInterval(async () => {
        navigator.geolocation.getCurrentPosition(
          updateLocation,
          (err) => console.error('Error getting position:', err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }, TRACKING_INTERVAL);

      setTracking(true);
      onStatusChange(true);
      toast.success('Seguimiento de ubicación iniciado');
    } catch (err: unknown) {
      const error = err as GeolocationPositionError;
      if (error.code === 1) {
        toast.error('Permiso de ubicación denegado. Por favor, habilita el acceso a la ubicación.');
      } else if (error.code === 2) {
        toast.error('No se pudo obtener la ubicación. Verifica que el GPS esté activado.');
      } else {
        toast.error('Error al iniciar el seguimiento de ubicación');
      }
    } finally {
      setStarting(false);
    }
  };

  const stopTracking = async () => {
    setStopping(true);

    try {
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Stop watching position
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Deactivate all active locations in database
      await supabase
        .from('admin_locations')
        .update({ is_active: false })
        .eq('admin_id', userId)
        .eq('is_active', true);

      setTracking(false);
      setCurrentPosition(null);
      setLastUpdate(null);
      onStatusChange(false);
      toast.success('Seguimiento de ubicación detenido');
    } catch (err) {
      console.error('Error stopping tracking:', err);
      toast.error('Error al detener el seguimiento');
    } finally {
      setStopping(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className={`h-5 w-5 ${tracking ? 'text-green-500' : 'text-primary'}`} />
          Seguimiento de Ubicación
        </CardTitle>
        <CardDescription>
          {tracking 
            ? 'Tu ubicación se actualiza cada 10 minutos'
            : 'Inicia el paseo para compartir tu ubicación'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tracking ? (
          <>
            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Paseo en curso</span>
            </div>

            {currentPosition && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Última posición:</p>
                <p className="text-sm font-mono">
                  {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                </p>
              </div>
            )}

            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Última actualización: {formatTime(lastUpdate)}
              </div>
            )}

            <Button
              onClick={stopTracking}
              variant="destructive"
              className="w-full"
              disabled={stopping}
            >
              {stopping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              {stopping ? 'Deteniendo...' : 'Finalizar Paseo'}
            </Button>
          </>
        ) : (
          <>
            <div className="text-center py-4">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                Al iniciar, tus clientes podrán ver tu ubicación en tiempo real
              </p>
            </div>

            <Button
              onClick={startTracking}
              className="w-full"
              size="lg"
              disabled={starting}
            >
              {starting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {starting ? 'Iniciando...' : 'Iniciar Paseo'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WalkerLocationTracker;
