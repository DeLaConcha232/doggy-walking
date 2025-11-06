import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Walk {
  id: string;
  dog_name: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
}

const MyWalks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [walks, setWalks] = useState<Walk[]>([]);

  const loadWalks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('walks')
        .select('*')
        .or(`client_id.eq.${user.id},walker_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWalks(data || []);
    } catch (error) {
      console.error('Error loading walks:', error);
      toast.error('Error al cargar los paseos');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadWalks();
  }, [loadWalks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'active': return 'En curso';
      case 'completed': return 'Completado';
      default: return status;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando paseos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <nav className="bg-card border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Mis Paseos
          </h1>
          <div className="w-20"></div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {walks.length === 0 ? (
          <Card className="p-8 text-center bg-card/50 backdrop-blur-sm border-border/40">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No hay paseos registrados</h2>
            <p className="text-muted-foreground">Tus paseos aparecerán aquí</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {walks.map((walk) => (
              <Card
                key={walk.id}
                className="p-6 bg-card/50 backdrop-blur-sm border-border/40 hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => walk.status === 'active' && navigate(`/walk/${walk.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{walk.dog_name}</h3>
                    <Badge className={getStatusColor(walk.status)}>
                      {getStatusText(walk.status)}
                    </Badge>
                  </div>
                  {walk.status === 'active' && (
                    <Button size="sm" variant="outline">
                      Ver en vivo
                    </Button>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(walk.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatTime(walk.start_time)} 
                      {walk.end_time && ` - ${formatTime(walk.end_time)}`}
                    </span>
                  </div>
                  {walk.notes && (
                    <p className="text-muted-foreground mt-2 pt-2 border-t border-border/40">
                      {walk.notes}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyWalks;
