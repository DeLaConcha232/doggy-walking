import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface WalkerProfileSetupProps {
  userId: string;
}

interface WalkerProfile {
  id?: string;
  is_available: boolean;
  service_radius: number;
  hourly_rate: number | null;
  specialties: string[];
  bio: string;
  city: string;
  state: string;
}

const WalkerProfileSetup = ({ userId }: WalkerProfileSetupProps) => {
  const [profile, setProfile] = useState<WalkerProfile>({
    is_available: true,
    service_radius: 10,
    hourly_rate: null,
    specialties: [],
    bio: "",
    city: "",
    state: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("walker_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          id: data.id,
          is_available: data.is_available,
          service_radius: data.service_radius,
          hourly_rate: data.hourly_rate,
          specialties: data.specialties || [],
          bio: data.bio || "",
          city: data.city || "",
          state: data.state || "",
        });
      }
    } catch (err) {
      console.error("Error loading walker profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const profileData = {
        user_id: userId,
        is_available: profile.is_available,
        service_radius: profile.service_radius,
        hourly_rate: profile.hourly_rate,
        specialties: profile.specialties,
        bio: profile.bio,
        city: profile.city,
        state: profile.state,
      };

      if (profile.id) {
        const { error } = await supabase
          .from("walker_profiles")
          .update(profileData)
          .eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("walker_profiles")
          .insert(profileData);
        if (error) throw error;
      }

      toast.success("Perfil guardado");
      loadProfile();
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !profile.specialties.includes(newSpecialty.trim())) {
      setProfile({
        ...profile,
        specialties: [...profile.specialties, newSpecialty.trim()],
      });
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setProfile({
      ...profile,
      specialties: profile.specialties.filter((s) => s !== specialty),
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Configuración de Servicio
        </CardTitle>
        <CardDescription>
          Configura tu perfil público para que los clientes te encuentren
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Availability Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Disponible para nuevos clientes</Label>
            <p className="text-sm text-muted-foreground">
              Aparecerás en la búsqueda de paseadores
            </p>
          </div>
          <Switch
            checked={profile.is_available}
            onCheckedChange={(checked) =>
              setProfile({ ...profile, is_available: checked })
            }
          />
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              placeholder="Tu ciudad"
              value={profile.city}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              placeholder="Tu estado"
              value={profile.state}
              onChange={(e) => setProfile({ ...profile, state: e.target.value })}
            />
          </div>
        </div>

        {/* Rate and Radius */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate">Tarifa por hora ($)</Label>
            <Input
              id="rate"
              type="number"
              min="0"
              placeholder="150"
              value={profile.hourly_rate || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  hourly_rate: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="radius">Radio de servicio (km)</Label>
            <Input
              id="radius"
              type="number"
              min="1"
              max="50"
              value={profile.service_radius}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  service_radius: parseInt(e.target.value) || 10,
                })
              }
            />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Descripción</Label>
          <Textarea
            id="bio"
            placeholder="Cuéntales a los clientes sobre ti y tu experiencia..."
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            maxLength={500}
          />
        </div>

        {/* Specialties */}
        <div className="space-y-2">
          <Label>Especialidades</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Ej: Perros grandes"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addSpecialty()}
            />
            <Button type="button" variant="outline" onClick={addSpecialty}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {profile.specialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary" className="gap-1">
                  {specialty}
                  <button
                    type="button"
                    onClick={() => removeSpecialty(specialty)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Guardar Configuración
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalkerProfileSetup;
