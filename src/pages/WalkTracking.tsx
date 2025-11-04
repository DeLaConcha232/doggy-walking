import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ArrowLeft, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import WalkMap from "@/components/WalkMap";
import "leaflet/dist/leaflet.css";

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface Walk {
  id: string;
  dog_name: string;
  start_time: string;
  status: string;
}

const WalkTracking = () => {
  const { walkId } = useParams();
  const navigate = useNavigate();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!walkId) {
      navigate("/dashboard");
      return;
    }

    loadWalkData();
    subscribeToLocationUpdates();
  }, [walkId, navigate]);

  const loadWalkData = async () => {
    try {
      // Load walk info
      const { data: walkData, error: walkError } = await supabase
        .from("walks")
        .select("*")
        .eq("id", walkId)
        .single();

      if (walkError) throw walkError;
      setWalk(walkData);

      // Load locations
      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .select("*")
        .eq("walk_id", walkId)
        .order("timestamp", { ascending: false });

      if (locationError) throw locationError;
      setLocations(locationData || []);
      
      if (locationData && locationData.length > 0) {
        setLastUpdate(new Date(locationData[0].timestamp));
      }
    } catch (error: any) {
      toast.error("Error al cargar datos del paseo");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLocationUpdates = () => {
    const channel = supabase
      .channel("location-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "locations",
          filter: `walk_id=eq.${walkId}`,
        },
        (payload) => {
          const newLocation = payload.new as Location;
          setLocations((prev) => [newLocation, ...prev]);
          setLastUpdate(new Date(newLocation.timestamp));
          toast.success("Nueva ubicación recibida");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!walk) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Paseo no encontrado</p>
          <Button onClick={() => navigate("/dashboard")}>
            Volver al panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-semibold">{walk.dog_name}</span>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Walk Status Card */}
        <Card className="mb-6 animate-slide-up border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Paseo en curso</span>
              <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                Activo
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Inicio</p>
                <p className="font-medium">
                  {formatTime(new Date(walk.start_time))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Última actualización</p>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  {lastUpdate ? formatTime(lastUpdate) : "Sin actualizaciones"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="mb-6 overflow-hidden animate-fade-in border-border/50 p-0">
          <CardContent className="p-0">
            {locations.length > 0 ? (
              <WalkMap locations={locations} />
            ) : (
              <div className="aspect-video bg-muted relative flex items-center justify-center">
                <div className="text-center p-6">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
                  <p className="text-muted-foreground mb-2">Esperando ubicación...</p>
                  <p className="text-sm text-muted-foreground">
                    El mapa se mostrará cuando haya datos de ubicación
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location History */}
        <Card className="animate-scale-in border-border/50">
          <CardHeader>
            <CardTitle>Historial de ubicaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Esperando primera actualización...</p>
                <p className="text-sm mt-2">Las ubicaciones se actualizan cada 10 minutos</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {locations.map((location, index) => (
                  <div
                    key={location.id}
                    className="flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">
                          Punto {locations.length - index}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(new Date(location.timestamp))}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalkTracking;