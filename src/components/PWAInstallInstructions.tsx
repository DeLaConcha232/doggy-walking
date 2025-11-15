import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, Chrome } from "lucide-react";

const PWAInstallInstructions = () => {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"ios" | "android" | null>(null);

  const resetAndClose = () => {
    setSelectedPlatform(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetAndClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          Instalar como app
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar Doggy-walking</DialogTitle>
          <DialogDescription>
            {!selectedPlatform 
              ? "Selecciona tu dispositivo para ver las instrucciones"
              : "Sigue estos pasos para instalar la aplicación"}
          </DialogDescription>
        </DialogHeader>

        {!selectedPlatform ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => setSelectedPlatform("ios")}
            >
              <Apple className="w-8 h-8" />
              <span>iPhone/iPad</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => setSelectedPlatform("android")}
            >
              <Chrome className="w-8 h-8" />
              <span>Android</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedPlatform === "ios" ? (
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>Abre esta página en Safari</li>
                <li>Toca el botón de <strong>Compartir</strong> (icono de cuadro con flecha hacia arriba)</li>
                <li>Desplázate hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong></li>
                <li>Toca <strong>"Añadir"</strong> en la esquina superior derecha</li>
                <li>¡Listo! La app aparecerá en tu pantalla de inicio</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>Abre esta página en Chrome</li>
                <li>Toca el menú <strong>(⋮)</strong> en la esquina superior derecha</li>
                <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong></li>
                <li>Confirma tocando <strong>"Instalar"</strong></li>
                <li>¡Listo! La app aparecerá en tu pantalla de inicio</li>
              </ol>
            )}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setSelectedPlatform(null)}
            >
              ← Volver
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PWAInstallInstructions;
