import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, QrCode, Loader2, Info, Scan, Navigation, Search, Heart } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Suspense, lazy } from "react";
const AdminTrackingMap = lazy(() => import("@/components/AdminTrackingMap"));
import BottomNav from "@/components/ui/bottom-nav";
import iconLogo from '/icon-192.png';

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
  const [affiliatedAdminId, setAffiliatedAdminId] = useState<string | null>(null);
  const [hasActiveWalk, setHasActiveWalk] = useState(false);
  const [hasAdminLocation, setHasAdminLocation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/");
        return;
      }
      
      setUser(session.user);
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
        
      if (roleData?.role === 'admin') {
        navigate("/walker-dashboard");
        return;
      }
      
      loadWalks(session.user.id);
      checkAffiliation(session.user.id);
    };

    checkAuthAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!affiliatedAdminId) return;

    const channel = supabase
      .channel('walks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'walks',
          filter: `walker_id=eq.${affiliatedAdminId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const walk = payload.new as WalkData;
            setHasActiveWalk(walk.status === 'active');
          } else if (payload.eventType === 'DELETE') {
            checkAdminActiveWalk(affiliatedAdminId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [affiliatedAdminId]);

  const checkAffiliation = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('affiliations')
        .select('admin_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setIsAffiliated(true);
        setAffiliatedAdminId(data.admin_id);
        checkAdminActiveWalk(data.admin_id);
      }
    } catch (error) {
      console.error('Error checking affiliation:', error);
    }
  };

  const checkAdminActiveWalk = async (adminId: string) => {
    try {
      const { data, error } = await supabase
        .from('walks')
        .select('id, status')
        .eq('walker_id', adminId)
        .eq('status', 'active')
        .maybeSingle();

      setHasActiveWalk(!!data && !error);
    } catch (error) {
      console.error('Error checking active walk:', error);
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

      const activeWalk = data?.find(walk => walk.status === 'active');
      setHasActiveWalk(!!activeWalk);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error al cargar paseos");
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-background pb-20">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={iconLogo} alt="Doggy-Walking" className="h-6 w-6 rounded-sm" />
            <span className="text-xl font-bold">Doggy-Walking</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="mb-6 animate-slide-up">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            ¡Hola buen día!
          </h1>
          <p className="text-muted-foreground">
            Bienvenido a tu panel de control
          </p>
        </div>

        {/* No Walker Affiliated Message */}
        {!isAffiliated && (
          <Card className="mb-6 animate-fade-in border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Aún no tienes un paseador</CardTitle>
              <CardDescription>
                Conecta con un paseador escaneando su QR o busca uno disponible
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate("/scan-qr")} className="flex-1">
                <QrCode className="h-4 w-4 mr-2" />
                Escanear QR
              </Button>
              <Button variant="outline" onClick={() => navigate("/discover")} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Buscar Paseadores
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Only if affiliated */}
        {isAffiliated && (
          <Card
            className="cursor-pointer hover:shadow-lg transition-all animate-scale-in border-border/50 mb-6"
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
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></div>
                Conectado con tu paseador
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Real-time Tracking Map - Always show if affiliated */}
        {isAffiliated && (
          <Card className="animate-fade-in border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Ubicación en Tiempo Real
              </CardTitle>
              <CardDescription>
                Seguimiento de la ubicación del paseador
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Suspense fallback={<div className="h-[400px] w-full rounded-lg bg-muted animate-pulse" />}>
                <AdminTrackingMap
                  adminId={affiliatedAdminId}
                  onLocationUpdate={setHasAdminLocation}
                />
              </Suspense>
              {!hasActiveWalk && !hasAdminLocation && (
                <div className="absolute inset-0 backdrop-blur-sm bg-background/60 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium text-foreground">
                      No hay paseo activo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      El mapa se activará cuando comience un paseo
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* How It Works Card */}
        <Dialog>
          <DialogTrigger asChild>
            <Card className="mb-6 animate-fade-in border-border/50 bg-gradient-to-br from-primary/5 to-primary-glow/5 cursor-pointer hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-primary" />
                  ¿Cómo funciona Doggy-walking?
                </CardTitle>
                <CardDescription>
                  Toca aquí para conocer cómo usar el sistema
                </CardDescription>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Info className="h-6 w-6 text-primary" />
                ¿Cómo funciona Doggy-walking?
              </DialogTitle>
              <DialogDescription>
                Todo lo que necesitas saber para usar el sistema
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Scan className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">1. Afíliate con tu paseador</h4>
                    <p className="text-sm text-muted-foreground">
                      Tu paseador te proporcionará un código QR único. Escanéalo desde "Escanear QR" para conectarte con él y comenzar a recibir actualizaciones de los paseos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Navigation className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">2. Seguimiento en tiempo real</h4>
                    <p className="text-sm text-muted-foreground">
                      Cuando tu paseador inicie un nuevo paseo, podrás ver su ubicación en tiempo real en el mapa de arriba. Las coordenadas se actualizan automáticamente cada 10 minutos para que siempre sepas dónde está tu mascota.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">3. Ubicación precisa</h4>
                    <p className="text-sm text-muted-foreground">
                      El sistema utiliza GPS de alta precisión para mostrarte la ubicación exacta del paseo. El marcador en el mapa indica la posición más reciente de tu paseador.
                    </p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                  <p className="text-sm text-foreground">
                    <strong className="text-primary">Nota:</strong> El mapa se mantiene borroso hasta que tu paseador inicie un paseo activo. Una vez iniciado, verás toda la información en tiempo real.
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <a href='https://www.avskallet.com/' className='mt-4 text-center text-sm text-blue-500 flex justify-center items-center cursor-pointer'>Hecho con <Heart className="inline-block w-4 h-4 mx-1" /> por av-skallet solutions</a>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;