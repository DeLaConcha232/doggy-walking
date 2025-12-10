import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, MapPin, Phone, Mail, Loader2, Navigation } from 'lucide-react';
import BottomNav from '@/components/ui/bottom-nav';
import iconLogo from '/icon-192.png';

const AdminTrackingMap = lazy(() => import('@/components/AdminTrackingMap'));

interface Walker {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  affiliatedAt: string;
  isActive: boolean;
  hasActiveLocation: boolean;
}

const MyWalkers = () => {
  const navigate = useNavigate();
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWalker, setSelectedWalker] = useState<string | null>(null);

  const loadWalkers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Get all affiliations for this user
      const { data: affiliations, error: affError } = await supabase
        .from('affiliations')
        .select('admin_id, affiliated_at, is_active')
        .eq('user_id', user.id);

      if (affError) throw affError;

      if (!affiliations || affiliations.length === 0) {
        setWalkers([]);
        setLoading(false);
        return;
      }

      // Get profiles for all affiliated walkers
      const walkerIds = affiliations.map(a => a.admin_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .in('id', walkerIds);

      if (profilesError) throw profilesError;

      // Check active locations for each walker
      const walkersWithStatus = await Promise.all(
        (profiles || []).map(async (profile) => {
          const affiliation = affiliations.find(a => a.admin_id === profile.id);
          
          const { data: location } = await supabase
            .from('admin_locations')
            .select('is_active')
            .eq('admin_id', profile.id)
            .eq('is_active', true)
            .maybeSingle();

          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            affiliatedAt: affiliation?.affiliated_at || '',
            isActive: affiliation?.is_active || false,
            hasActiveLocation: !!location
          };
        })
      );

      // Sort: active walkers first
      walkersWithStatus.sort((a, b) => {
        if (a.hasActiveLocation && !b.hasActiveLocation) return -1;
        if (!a.hasActiveLocation && b.hasActiveLocation) return 1;
        return 0;
      });

      setWalkers(walkersWithStatus);
      
      // Auto-select first walker with active location
      const activeWalker = walkersWithStatus.find(w => w.hasActiveLocation);
      if (activeWalker) {
        setSelectedWalker(activeWalker.id);
      } else if (walkersWithStatus.length > 0) {
        setSelectedWalker(walkersWithStatus[0].id);
      }
    } catch (err) {
      console.error('Error loading walkers:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadWalkers();
  }, [loadWalkers]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-2">
            <img src={iconLogo} alt="Doggy-Walking" className="h-6 w-6 rounded-sm" />
            <span className="text-lg font-bold">Mis Paseadores</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        {walkers.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Sin paseadores</h3>
              <p className="text-muted-foreground mb-4">
                Aún no estás conectado con ningún paseador
              </p>
              <Button onClick={() => navigate('/discover')}>
                Buscar Paseadores
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Walkers List */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {walkers.map(walker => (
                <Card
                  key={walker.id}
                  className={`cursor-pointer transition-all border-border/50 ${
                    selectedWalker === walker.id
                      ? 'ring-2 ring-primary shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedWalker(walker.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{walker.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{walker.email}</p>
                      </div>
                      {walker.hasActiveLocation ? (
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
                          <Navigation className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          Inactivo
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      {walker.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{walker.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{walker.email}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3">
                      Afiliado desde {formatDate(walker.affiliatedAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Map for Selected Walker */}
            {selectedWalker && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Ubicación en Tiempo Real
                  </CardTitle>
                  <CardDescription>
                    {walkers.find(w => w.id === selectedWalker)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <Suspense fallback={<div className="h-[400px] w-full rounded-lg bg-muted animate-pulse" />}>
                    <AdminTrackingMap
                      adminId={selectedWalker}
                      onLocationUpdate={() => {}}
                    />
                  </Suspense>
                  {!walkers.find(w => w.id === selectedWalker)?.hasActiveLocation && (
                    <div className="absolute inset-0 backdrop-blur-sm bg-background/60 rounded-lg flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="text-lg font-medium">No hay paseo activo</p>
                        <p className="text-sm text-muted-foreground">
                          Este paseador no tiene un paseo en curso
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MyWalkers;
