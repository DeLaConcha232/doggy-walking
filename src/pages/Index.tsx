import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, Clock, Smartphone } from "lucide-react";
import heroImage from "@/assets/hero-dogs.jpg";
import appPreview from "@/assets/app-preview.jpg";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BarkPath</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="hidden md:inline-flex">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/auth">
              <Button>Comenzar</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <h1 className="mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Paseos seguros con seguimiento en tiempo real
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Monitorea cada paso del paseo de tu perro. Recibe actualizaciones cada 10 minutos con ubicación precisa y tranquilidad total.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all">
                    Crear cuenta gratis
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver demo
                </Button>
              </div>
            </div>
            <div className="relative animate-fade-in">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-3xl blur-2xl" />
              <img
                src={heroImage}
                alt="Perros felices en el parque"
                className="relative rounded-2xl shadow-2xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-muted/30 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="mb-4">¿Por qué BarkPath?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tecnología premium para el cuidado de tu mejor amigo
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: MapPin,
                title: "Seguimiento GPS",
                description: "Ubicación precisa actualizada cada 10 minutos durante todo el paseo"
              },
              {
                icon: Shield,
                title: "100% Seguro",
                description: "Tus datos protegidos con encriptación de nivel bancario"
              },
              {
                icon: Clock,
                title: "Historial completo",
                description: "Accede a todos los paseos anteriores cuando quieras"
              },
              {
                icon: Smartphone,
                title: "Acceso QR",
                description: "Escanea y comienza a seguir el paseo al instante"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-card p-6 rounded-2xl shadow-card hover:shadow-lg transition-all animate-scale-in border border-border/50"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative animate-fade-in order-2 lg:order-1">
              <div className="absolute -inset-4 bg-gradient-to-l from-primary/20 to-primary-glow/20 rounded-3xl blur-2xl" />
              <img
                src={appPreview}
                alt="Vista de la aplicación"
                className="relative rounded-2xl shadow-2xl w-full h-auto object-cover"
              />
            </div>
            <div className="animate-slide-up order-1 lg:order-2">
              <h2 className="mb-6">Simple, elegante y efectivo</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Diseñado con atención al detalle para ofrecerte la mejor experiencia. 
                Interfaz intuitiva que funciona perfectamente en cualquier dispositivo.
              </p>
              <ul className="space-y-4">
                {[
                  "Mapa interactivo en tiempo real",
                  "Notificaciones instantáneas",
                  "Perfil personalizado de tu mascota",
                  "Responsive y rápido"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-r from-primary to-primary-glow text-white">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-white">Comienza hoy mismo</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Únete a cientos de dueños que confían en BarkPath para el cuidado de sus mascotas
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="shadow-xl hover:shadow-2xl">
              Crear cuenta gratuita
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 BarkPath. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;