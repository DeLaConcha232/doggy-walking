import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Users, Loader2, Heart, Inbox, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import WalkerQRDisplay from "@/components/walker/WalkerQRDisplay";
import WalkerMetrics from "@/components/walker/WalkerMetrics";
import WalkerClients from "@/components/walker/WalkerClients";
import WalkerLocationTracker from "@/components/walker/WalkerLocationTracker";
import WalkerProfileSetup from "@/components/walker/WalkerProfileSetup";
import iconLogo from '/icon-192.png';

interface WalkMetrics {
  activeClients: number;
  activeWalks: number;
  walksToday: number;
  totalWalks: number;
  pendingRequests: number;
}

const WalkerDashboard = () => {
  const navigate = useNavigate();
  const { user, isWalker, loading: roleLoading } = useUserRole();
  const [metrics, setMetrics] = useState<WalkMetrics>({
    activeClients: 0,
    activeWalks: 0,
    walksToday: 0,
    totalWalks: 0,
    pendingRequests: 0
  });
  const [isWalkActive, setIsWalkActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    if (!user) return;

    try {
      const { data: affiliations, error: affError } = await supabase
        .from('affiliations')
        .select('id')
        .eq('admin_id', user.id)
        .eq('is_active', true);

      if (affError) throw affError;

      const { data: allWalks, error: walksError } = await supabase
        .from('walks')
        .select('id, status, created_at')
        .eq('walker_id', user.id);

      if (walksError) throw walksError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('completed_walks_count')
        .eq('id', user.id)
        .single();

      // Get pending requests count
      const { data: requests } = await supabase
        .from('walk_requests')
        .select('id')
        .eq('walker_id', user.id)
        .eq('status', 'pending');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeWalks = allWalks?.filter(w => w.status === 'active') || [];
      const walksToday = allWalks?.filter(w => {
        const walkDate = new Date(w.created_at);
        walkDate.setHours(0, 0, 0, 0);
        return walkDate.getTime() === today.getTime();
      }) || [];

      setMetrics({
        activeClients: affiliations?.length || 0,
        activeWalks: activeWalks.length,
        walksToday: walksToday.length,
        totalWalks: profile?.completed_walks_count || 0,
        pendingRequests: requests?.length || 0
      });

      setIsWalkActive(activeWalks.length > 0);

      const { data: activeLocation } = await supabase
        .from('admin_locations')
        .select('is_active')
        .eq('admin_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (activeLocation) {
        setIsWalkActive(true);
      }
    } catch (err) {
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!roleLoading && !isWalker) {
      navigate("/dashboard");
      return;
    }

    if (user) {
      loadMetrics();

      // Subscribe to new requests
      const channel = supabase
        .channel('walker-new-requests')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'walk_requests',
            filter: `walker_id=eq.${user.id}`
          },
          () => {
            toast.info("¡Nueva solicitud de servicio!");
            loadMetrics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isWalker, roleLoading, navigate, loadMetrics]);

  const handleLogout = async () => {
    try {
      if (isWalkActive && user) {
        await supabase
          .from('admin_locations')
          .update({ is_active: false })
          .eq('admin_id', user.id);
      }

      await supabase.auth.signOut();
      toast.success("Sesión cerrada");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Error al cerrar sesión");
    }
  };

  const handleWalkStatusChange = (active: boolean) => {
    setIsWalkActive(active);
    loadMetrics();
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={iconLogo} alt="Doggy-Walking" className="h-6 w-6 rounded-sm" />
            <span className="text-xl font-bold">Doggy-Walking</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Paseador</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="mb-6 animate-slide-up">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Panel de Paseador
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus paseos y clientes
          </p>
        </div>

        {/* Requests Card */}
        <Card 
          className="mb-6 cursor-pointer hover:shadow-lg transition-all animate-scale-in border-border/50"
          onClick={() => navigate("/walker-requests")}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center relative">
                <Inbox className="h-6 w-6 text-primary" />
                {metrics.pendingRequests > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {metrics.pendingRequests}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold">Solicitudes de Servicio</p>
                <p className="text-sm text-muted-foreground">
                  {metrics.pendingRequests > 0 
                    ? `${metrics.pendingRequests} pendiente${metrics.pendingRequests > 1 ? 's' : ''}`
                    : 'Sin solicitudes pendientes'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code and Start Walk Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <WalkerQRDisplay userId={user?.id || ''} />
          <WalkerLocationTracker 
            userId={user?.id || ''} 
            isActive={isWalkActive}
            onStatusChange={handleWalkStatusChange}
          />
        </div>

        {/* Metrics */}
        <WalkerMetrics metrics={metrics} />

        {/* Clients */}
        <WalkerClients userId={user?.id || ''} />

        {/* Walker Profile Setup */}
        <div className="mt-6">
          <WalkerProfileSetup userId={user?.id || ''} />
        </div>

        {/* Profile Link */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all animate-scale-in border-border/50 mt-6"
          onClick={() => navigate("/profile")}
        >
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Mi Perfil</CardTitle>
            <CardDescription>Configuración de cuenta</CardDescription>
          </CardHeader>
        </Card>

        <a 
          href='https://www.avskallet.com/' 
          className='mt-8 text-center text-sm text-blue-500 flex justify-center items-center cursor-pointer'
        >
          Hecho con <Heart className="inline-block w-4 h-4 mx-1" /> por av-skallet solutions
        </a>
      </div>
    </div>
  );
};

export default WalkerDashboard;
