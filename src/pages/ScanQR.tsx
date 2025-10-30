import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

const ScanQR = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleAffiliation = async (code: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Verify QR code
      const { data: qrData, error: qrError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .eq('code_type', 'affiliation')
        .single();

      if (qrError || !qrData) {
        toast.error('Código QR inválido o expirado');
        return;
      }

      // Check if already affiliated
      const { data: existingAffiliation } = await supabase
        .from('affiliations')
        .select('*')
        .eq('user_id', user.id)
        .eq('admin_id', qrData.admin_id)
        .single();

      if (existingAffiliation) {
        toast.info('Ya estás afiliado a este administrador');
        navigate('/dashboard');
        return;
      }

      // Create affiliation
      const { error: affiliationError } = await supabase
        .from('affiliations')
        .insert({
          user_id: user.id,
          admin_id: qrData.admin_id,
          is_active: true
        });

      if (affiliationError) throw affiliationError;

      // Deactivate QR code (optional - can be reused)
      await supabase
        .from('qr_codes')
        .update({ is_active: false })
        .eq('id', qrData.id);

      toast.success('¡Afiliación exitosa! Ahora puedes ver la ubicación en tiempo real');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error during affiliation:', error);
      toast.error('Error al procesar la afiliación');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleAffiliation(manualCode.trim());
    }
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      
      // Request camera permissions first by getting available cameras
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error("No se encontraron cámaras disponibles");
      }

      // Use the back camera (usually last in list) or first available
      const cameraId = cameras.length > 1 ? cameras[cameras.length - 1].id : cameras[0].id;
      
      const html5QrCode = new Html5Qrcode("qr-reader");

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          html5QrCode.stop().then(() => {
            setScanning(false);
            handleAffiliation(decodedText);
          }).catch(err => {
            console.error("Error stopping scanner:", err);
            setScanning(false);
            handleAffiliation(decodedText);
          });
        },
        (errorMessage) => {
          // This is normal - fires when no QR code is detected in frame
          console.log(errorMessage);
        }
      );
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setScanning(false);
      
      if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
        toast.error("Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.");
      } else if (err.message.includes("cámara")) {
        toast.error(err.message);
      } else {
        toast.error("No se pudo acceder a la cámara. Verifica los permisos en tu navegador.");
      }
    }
  };

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
            Escanear QR
          </h1>
          <div className="w-20"></div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-6 bg-card/50 backdrop-blur-sm border-border/40">
          <div className="space-y-6">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Escanea el código de afiliación</h2>
              <p className="text-muted-foreground">
                Escanea el código QR proporcionado por el administrador para afiliarte
              </p>
            </div>

            {!scanning ? (
              <>
                <Button
                  onClick={startScanning}
                  disabled={processing}
                  className="w-full"
                  size="lg"
                >
                  <QrCode className="h-5 w-5 mr-2" />
                  Abrir cámara
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      o ingresa el código
                    </span>
                  </div>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código del paseo</Label>
                    <Input
                      id="code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Ej: ABC123XYZ"
                      disabled={processing}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!manualCode.trim() || processing}
                    className="w-full"
                  >
                    {processing ? 'Procesando...' : 'Afiliarme'}
                  </Button>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <div id="qr-reader" className="w-full"></div>
                <Button
                  onClick={() => setScanning(false)}
                  variant="outline"
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ScanQR;
