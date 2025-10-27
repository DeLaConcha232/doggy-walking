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

  const startWalk = async (code: string) => {
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
        .select('*, walks(*)')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (qrError || !qrData) {
        toast.error('Código QR inválido o expirado');
        return;
      }

      // Check if walk exists and update it
      if (qrData.walk_id) {
        const { error: updateError } = await supabase
          .from('walks')
          .update({
            walker_id: user.id,
            status: 'active',
            start_time: new Date().toISOString()
          })
          .eq('id', qrData.walk_id);

        if (updateError) throw updateError;

        // Deactivate QR code
        await supabase
          .from('qr_codes')
          .update({ is_active: false })
          .eq('id', qrData.id);

        toast.success('Paseo iniciado correctamente');
        navigate(`/walk/${qrData.walk_id}`);
      }
    } catch (error) {
      console.error('Error starting walk:', error);
      toast.error('Error al iniciar el paseo');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      startWalk(manualCode.trim());
    }
  };

  const startScanning = async () => {
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          html5QrCode.stop();
          setScanning(false);
          startWalk(decodedText);
        },
        (errorMessage) => {
          // Silent errors while scanning
        }
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast.error('No se pudo acceder a la cámara');
      setScanning(false);
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
              <h2 className="text-2xl font-bold mb-2">Escanea el código QR</h2>
              <p className="text-muted-foreground">
                Escanea el código proporcionado por el dueño o ingrésalo manualmente
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
                    {processing ? 'Procesando...' : 'Iniciar paseo'}
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
