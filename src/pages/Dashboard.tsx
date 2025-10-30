import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, LogOut, QrCode, Clock, Loader2, UserIcon } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import AdminTrackingMap from "@/components/AdminTrackingMap";

interface WalkData {
  id: string;
  dog_name: string;
  status: string;
  start_time: string;
  end_time: string | null;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [walks, setWalks] = useState<WalkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAffiliated, setIsAffiliated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadWalks(session.user.id);
        checkAffiliation(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAffiliation = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('affiliations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setIsAffiliated(true);
      }
    } catch (error) {
      console.error('Error checking affiliation:', error);
    }
  };

  const loadWalks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("walks")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setWalks(data || []);
    } catch (error: any) {
      toast.error("Error al cargar paseos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sesión cerrada");
      navigate("/auth");
    } catch (error: any) {
      toast.error("Error al cerrar sesión");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "completed":
        return "text-blue-600 bg-blue-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "En curso";
      case "completed":
        return "Completado";
      case "pending":
        return "Pendiente";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BarkPath</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            ¡Hola! 👋
          </h1>
          <p className="text-muted-foreground">
            Bienvenido a tu panel de control
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all animate-scale-in border-border/50"
            onClick={() => navigate("/scan-qr")}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Escanear QR</CardTitle>
              <CardDescription>
                Iniciar un paseo
              </CardDescription>
            </CardHeader>
          </Card>


          <Card 
            className="cursor-pointer hover:shadow-lg transition-all animate-scale-in border-border/50" 
            style={{ animationDelay: "0.1s" }}
            onClick={() => navigate("/my-walks")}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-2">
                <MapPin className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle>Mis Paseos</CardTitle>
              <CardDescription>
                {walks.length} registrados
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all animate-scale-in border-border/50" 
            style={{ animationDelay: "0.15s" }}
            onClick={() => navigate("/profile")}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-2">
                <UserIcon className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Mi Perfil</CardTitle>
              <CardDescription>
                Configuración
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Real-time Tracking Map */}
        {isAffiliated && (
          <Card className="animate-fade-in border-border/50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ubicación en Tiempo Real
              </CardTitle>
              <CardDescription>
                Seguimiento de la ubicación del administrador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminTrackingMap />
            </CardContent>
          </Card>
        )}

        {/* Recent Walks */}
        <Card className="animate-fade-in border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Paseos Recientes
            </CardTitle>
            <CardDescription>
              Historial de los últimos paseos de tu mascota
            </CardDescription>
          </CardHeader>
          <CardContent>
            {walks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay paseos registrados aún</p>
                <p className="text-sm mt-2">Escanea un código QR para comenzar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {walks.map((walk) => (
                  <div
                    key={walk.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => walk.status === "active" && navigate(`/walk/${walk.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{walk.dog_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(walk.start_time).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        walk.status
                      )}`}
                    >
                      {getStatusText(walk.status)}
                    </span>
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

export default Dashboard;