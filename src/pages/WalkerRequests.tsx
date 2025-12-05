import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Clock, Dog, Loader2, User, Check, X, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";

interface WalkRequest {
  id: string;
  client_id: string;
  requested_date: string;
  requested_time: string;
  duration_minutes: number;
  number_of_dogs: number;
  special_notes: string | null;
  status: string;
  response_notes: string | null;
  created_at: string;
  client_profile?: {
    name: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

const WalkerRequests = () => {
  const navigate = useNavigate();
  const { user, isWalker, loading: roleLoading } = useUserRole();
  const [requests, setRequests] = useState<WalkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<WalkRequest | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isWalker) {
      navigate("/dashboard");
      return;
    }

    if (user) {
      loadRequests(user.id);

      // Subscribe to real-time updates
      const channel = supabase
        .channel("walker-requests")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "walk_requests",
            filter: `walker_id=eq.${user.id}`,
          },
          () => {
            loadRequests(user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isWalker, roleLoading, navigate]);

  const loadRequests = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("walk_requests")
        .select("*")
        .eq("walker_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Get client profiles
        const clientIds = [...new Set(data.map(r => r.client_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, phone, avatar_url")
          .in("id", clientIds);

        const requestsWithProfiles = data.map(request => ({
          ...request,
          client_profile: profiles?.find(p => p.id === request.client_id),
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

  const handleResponse = async (accept: boolean) => {
    if (!respondingTo || !user) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("walk_requests")
        .update({
          status: accept ? "accepted" : "rejected",
          response_notes: responseNotes || null,
        })
        .eq("id", respondingTo.id);

      if (error) throw error;

      // If accepted, create affiliation if not exists
      if (accept) {
        const { data: existingAffiliation } = await supabase
          .from("affiliations")
          .select("id")
          .eq("user_id", respondingTo.client_id)
          .eq("admin_id", user.id)
          .maybeSingle();

        if (!existingAffiliation) {
          await supabase.from("affiliations").insert({
            user_id: respondingTo.client_id,
            admin_id: user.id,
            is_active: true,
          });
        }
      }

      toast.success(accept ? "Solicitud aceptada" : "Solicitud rechazada");
      setRespondingTo(null);
      setResponseNotes("");
      loadRequests(user.id);
    } catch (err) {
      console.error("Error responding to request:", err);
      toast.error("Error al responder");
    } finally {
      setSubmitting(false);
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

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const RequestCard = ({ request, showActions = false }: { request: WalkRequest; showActions?: boolean }) => (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {request.client_profile?.name || "Cliente"}
              </CardTitle>
              <CardDescription>
                {request.client_profile?.phone || "Sin teléfono"}
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
          <p className="text-sm bg-muted p-3 rounded-lg">
            {request.special_notes}
          </p>
        )}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={() => {
                setRespondingTo(request);
                setResponseNotes("");
              }}
            >
              <Check className="h-4 w-4 mr-2" />
              Aceptar
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setRespondingTo(request);
                setResponseNotes("");
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/walker-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Solicitudes</h1>
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
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tienes solicitudes pendientes</p>
              </div>
            ) : (
              pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} showActions />
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

      {/* Response Dialog */}
      <Dialog open={!!respondingTo} onOpenChange={(open) => !open && setRespondingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Solicitud</DialogTitle>
            <DialogDescription>
              Solicitud de {respondingTo?.client_profile?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm mb-2">Notas de respuesta (opcional)</p>
              <Textarea
                placeholder="Mensaje para el cliente..."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => handleResponse(true)}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Check className="h-4 w-4 mr-2" />
                Aceptar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleResponse(false)}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <X className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalkerRequests;
