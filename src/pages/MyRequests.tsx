import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Dog, Loader2, User, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface WalkRequest {
  id: string;
  walker_id: string;
  requested_date: string;
  requested_time: string;
  duration_minutes: number;
  number_of_dogs: number;
  special_notes: string | null;
  status: string;
  response_notes: string | null;
  created_at: string;
  walker_profile?: {
    name: string;
    avatar_url: string | null;
  };
}

const MyRequests = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [requests, setRequests] = useState<WalkRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
      loadRequests(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const loadRequests = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("walk_requests")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Get walker profiles
        const walkerIds = [...new Set(data.map(r => r.walker_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", walkerIds);

        const requestsWithProfiles = data.map(request => ({
          ...request,
          walker_profile: profiles?.find(p => p.id === request.walker_id),
        }));

        setRequests(requestsWithProfiles);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error("Error loading requests:", err);
      toast.error("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("walk_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Solicitud cancelada");
      if (user) loadRequests(user.id);
    } catch (err) {
      console.error("Error cancelling request:", err);
      toast.error("Error al cancelar");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "accepted":
        return <Badge className="bg-green-500">Aceptada</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rechazada</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelada</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const acceptedRequests = requests.filter(r => r.status === "accepted");
  const historyRequests = requests.filter(r => ["rejected", "cancelled", "completed"].includes(r.status));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const RequestCard = ({ request }: { request: WalkRequest }) => (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {request.walker_profile?.name || "Paseador"}
              </CardTitle>
              <CardDescription>
                Solicitud del {format(new Date(request.created_at), "d MMM", { locale: es })}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(new Date(request.requested_date), "d 'de' MMMM", { locale: es })}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {request.requested_time.slice(0, 5)} ({request.duration_minutes} min)
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Dog className="h-4 w-4" />
            {request.number_of_dogs} {request.number_of_dogs === 1 ? "perro" : "perros"}
          </div>
        </div>
        {request.special_notes && (
          <p className="text-sm text-muted-foreground">
            Notas: {request.special_notes}
          </p>
        )}
        {request.response_notes && (
          <p className="text-sm text-primary">
            Respuesta: {request.response_notes}
          </p>
        )}
        {request.status === "pending" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleCancelRequest(request.id)}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar Solicitud
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Mis Solicitudes</h1>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="pending">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pendientes ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="flex-1">
              Aceptadas ({acceptedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              Historial ({historyRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tienes solicitudes pendientes</p>
              </div>
            ) : (
              pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="accepted" className="mt-4 space-y-4">
            {acceptedRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tienes paseos programados</p>
              </div>
            ) : (
              acceptedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-4">
            {historyRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay historial de solicitudes</p>
              </div>
            ) : (
              historyRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyRequests;
