import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Phone, Calendar, Save, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Client {
  id: string;
  user_id: string;
  affiliated_at: string;
  profile: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
  notes?: string;
}

interface WalkerClientsProps {
  userId: string;
}

const WalkerClients = ({ userId }: WalkerClientsProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  const [savingNotes, setSavingNotes] = useState<{ [key: string]: boolean }>({});

  const loadClients = async () => {
    if (!userId) return;

    try {
      // Get affiliations with profile data
      const { data: affiliations, error } = await supabase
        .from('affiliations')
        .select(`
          id,
          user_id,
          affiliated_at
        `)
        .eq('admin_id', userId)
        .eq('is_active', true)
        .order('affiliated_at', { ascending: false });

      if (error) throw error;

      // Get profiles for each affiliated user
      const clientsWithProfiles: Client[] = [];
      
      for (const aff of affiliations || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', aff.user_id)
          .single();

        clientsWithProfiles.push({
          ...aff,
          profile: profile || null
        });
      }

      setClients(clientsWithProfiles);
    } catch (err) {
      console.error('Error loading clients:', err);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [userId]);

  const handleNotesChange = (clientId: string, notes: string) => {
    setEditingNotes(prev => ({ ...prev, [clientId]: notes }));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return 'Fecha no disponible';
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Mis Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Mis Clientes
        </CardTitle>
        <CardDescription>
          {clients.length} cliente{clients.length !== 1 ? 's' : ''} afiliado{clients.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">No tienes clientes afiliados</p>
            <p className="text-sm text-muted-foreground">
              Comparte tu código QR para que los clientes se afilien
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold truncate">
                        {client.profile?.name || 'Sin nombre'}
                      </h4>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {client.profile?.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <a 
                            href={`tel:${client.profile.phone}`}
                            className="hover:text-primary transition-colors"
                          >
                            {client.profile.phone}
                          </a>
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Afiliado: {formatDate(client.affiliated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalkerClients;
