import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, MapPin, Star, Clock, Dog, Loader2, User, Send } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/ui/bottom-nav";
import { z } from "zod";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface WalkerProfile {
  id: string;
  user_id: string;
  is_available: boolean;
  service_radius: number;
  hourly_rate: number | null;
  specialties: string[] | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  profile?: {
    name: string;
    avatar_url: string | null;
    completed_walks_count: number;
  };
}

const requestSchema = z.object({
  requested_date: z.string().min(1, "Fecha requerida"),
  requested_time: z.string().min(1, "Hora requerida"),
  duration_minutes: z.number().min(30).max(480),
  number_of_dogs: z.number().min(1).max(10),
  special_notes: z.string().max(500).optional(),
});

const Discover = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [walkers, setWalkers] = useState<WalkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWalker, setSelectedWalker] = useState<WalkerProfile | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    requested_date: "",
    requested_time: "",
    duration_minutes: 60,
    number_of_dogs: 1,
    special_notes: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
      loadWalkers();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadWalkers = async () => {
    try {
      // First get walker profiles
      const { data: walkerProfiles, error: walkersError } = await supabase
        .from("walker_profiles")
        .select("*")
        .eq("is_available", true);

      if (walkersError) throw walkersError;

      if (!walkerProfiles || walkerProfiles.length === 0) {
        setWalkers([]);
        setLoading(false);
        return;
      }

      // Get profiles for these walkers
      const userIds = walkerProfiles.map(w => w.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, completed_walks_count")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const combinedData = walkerProfiles.map(walker => ({
        ...walker,
        profile: profiles?.find(p => p.id === walker.user_id) || {
          name: "Paseador",
          avatar_url: null,
          completed_walks_count: 0,
        },
      }));

      setWalkers(combinedData);
    } catch (err) {
      console.error("Error loading walkers:", err);
      toast.error("Error al cargar paseadores");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user || !selectedWalker) return;

    try {
      const validatedData = requestSchema.parse(requestForm);
      setSubmitting(true);

      const { error } = await supabase.from("walk_requests").insert({
        client_id: user.id,
        walker_id: selectedWalker.user_id,
        requested_date: validatedData.requested_date,
        requested_time: validatedData.requested_time,
        duration_minutes: validatedData.duration_minutes,
        number_of_dogs: validatedData.number_of_dogs,
        special_notes: validatedData.special_notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("¡Solicitud enviada correctamente!");
      setRequestDialogOpen(false);
      setRequestForm({
        requested_date: "",
        requested_time: "",
        duration_minutes: 60,
        number_of_dogs: 1,
        special_notes: "",
      });
      setSelectedWalker(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        console.error("Error sending request:", err);
        toast.error("Error al enviar solicitud");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWalkers = walkers.filter((walker) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      walker.profile?.name.toLowerCase().includes(searchLower) ||
      walker.city?.toLowerCase().includes(searchLower) ||
      walker.state?.toLowerCase().includes(searchLower) ||
      walker.specialties?.some((s) => s.toLowerCase().includes(searchLower))
    );
  });

  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Descubrir Paseadores</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, ciudad o especialidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {filteredWalkers.length === 0 ? (
          <div className="text-center py-12">
            <Dog className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay paseadores disponibles</h3>
            <p className="text-muted-foreground">
              Intenta con otros criterios de búsqueda
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredWalkers.map((walker) => (
              <Card key={walker.id} className="animate-fade-in">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {walker.profile?.avatar_url ? (
                        <img
                          src={walker.profile.avatar_url}
                          alt={walker.profile.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{walker.profile?.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {walker.city || "Sin ubicación"}{walker.state && `, ${walker.state}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span>{walker.profile?.completed_walks_count || 0} paseos</span>
                        </div>
                        {walker.hourly_rate && (
                          <div className="text-sm font-medium text-primary">
                            ${walker.hourly_rate}/hr
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {walker.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {walker.bio}
                    </p>
                  )}
                  {walker.specialties && walker.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {walker.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}
                  <Dialog open={requestDialogOpen && selectedWalker?.id === walker.id} onOpenChange={(open) => {
                    setRequestDialogOpen(open);
                    if (!open) setSelectedWalker(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full"
                        onClick={() => setSelectedWalker(walker)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Solicitar Servicio
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Solicitar Paseo</DialogTitle>
                        <DialogDescription>
                          Envía una solicitud a {walker.profile?.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="date">Fecha</Label>
                            <Input
                              id="date"
                              type="date"
                              min={minDate}
                              value={requestForm.requested_date}
                              onChange={(e) =>
                                setRequestForm({ ...requestForm, requested_date: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="time">Hora</Label>
                            <Input
                              id="time"
                              type="time"
                              value={requestForm.requested_time}
                              onChange={(e) =>
                                setRequestForm({ ...requestForm, requested_time: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="duration">Duración (min)</Label>
                            <Input
                              id="duration"
                              type="number"
                              min={30}
                              max={480}
                              step={30}
                              value={requestForm.duration_minutes}
                              onChange={(e) =>
                                setRequestForm({ ...requestForm, duration_minutes: parseInt(e.target.value) || 60 })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dogs">Número de perros</Label>
                            <Input
                              id="dogs"
                              type="number"
                              min={1}
                              max={10}
                              value={requestForm.number_of_dogs}
                              onChange={(e) =>
                                setRequestForm({ ...requestForm, number_of_dogs: parseInt(e.target.value) || 1 })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notas especiales (opcional)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Información adicional sobre tu mascota..."
                            value={requestForm.special_notes}
                            onChange={(e) =>
                              setRequestForm({ ...requestForm, special_notes: e.target.value })
                            }
                            maxLength={500}
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleSendRequest}
                          disabled={submitting}
                        >
                          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Enviar Solicitud
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Discover;
