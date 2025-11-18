import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import PWAInstallInstructions from "@/components/PWAInstallInstructions";

const authSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
  name: z.string().min(2, "Mínimo 2 caracteres").max(100).optional(),
  phone: z.string().max(20).optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        // Password reset
        const resetData = authSchema.pick({ email: true }).parse({
          email: formData.email,
        });

        const { error } = await supabase.auth.resetPasswordForEmail(
          resetData.email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

        if (error) throw error;
        toast.success("¡Revisa tu email para restablecer tu contraseña!");
        setIsForgotPassword(false);
      } else if (isLogin) {
        // Login validation
        const loginData = authSchema.pick({ email: true, password: true }).parse({
          email: formData.email,
          password: formData.password,
        });

        const { error } = await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        });
        
        if (error) throw error;
        toast.success("¡Bienvenido de vuelta!");
      } else {
        // Signup validation
        const signupData = authSchema.parse(formData);

        const { error } = await supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              name: signupData.name,
              phone: signupData.phone,
            },
          },
        });

        if (error) throw error;
        toast.success("¡Cuenta creada! Revisa tu email para confirmar.");
      }
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else if (typeof (err as Error).message === 'string' && (err as Error).message.includes("already registered")) {
        toast.error("Este email ya está registrado. Intenta iniciar sesión.");
      } else {
        toast.error((err as Error).message || "Error en la autenticación");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <Card className="w-full max-w-md shadow-2xl border-border/50 animate-scale-in">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-2">
            <img 
              src="/icon-192.png" 
              alt="Doggy-walking" 
              className="w-12 h-12 rounded-2xl"
            />
          </div>
          <CardTitle className="text-2xl">
            {isForgotPassword 
              ? "Recuperar contraseña" 
              : isLogin 
              ? "Bienvenido a Doggy-walking" 
              : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            {isForgotPassword
              ? "Ingresa tu email para recibir instrucciones"
              : isLogin
              ? "Ingresa tus credenciales para continuar"
              : "Comienza a monitorear los paseos de tu mascota"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Juan Pérez"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={!isLogin}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+52 123 456 7890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    maxLength={20}
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                maxLength={255}
              />
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                maxLength={100}
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
              )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isForgotPassword 
                ? "Enviar instrucciones" 
                : isLogin 
                ? "Iniciar Sesión" 
                : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {!isForgotPassword && isLogin && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setIsLogin(!isLogin);
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
            >
              {isForgotPassword
                ? "Volver al inicio de sesión"
                : isLogin
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
            
            <div className="pt-2 border-t border-border/30">
              <PWAInstallInstructions />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;