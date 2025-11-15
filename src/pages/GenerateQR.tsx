import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, QrCode as QrCodeIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const GenerateQR = () => {
  const navigate = useNavigate();
  const [dogName, setDogName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dogName.trim()) {
      toast.error('Por favor ingresa el nombre del perro');
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Create walk
      const { data: walk, error: walkError } = await supabase
        .from('walks')
        .insert({
          dog_name: dogName,
          client_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (walkError) throw walkError;

      // Generate QR code
      const code = generateCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

      const { error: qrError } = await supabase
        .from('qr_codes')
        .insert({
          code: code,
          walk_id: walk.id,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (qrError) throw qrError;

      setQrCode(code);
      toast.success('Código QR generado correctamente');
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Error al generar el código QR');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-canvas') as unknown as SVGElement;
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `doggy-walking-${dogName}-${qrCode}.png`;
        link.click();
        toast.success('QR descargado');
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const handleNewQR = () => {
    setQrCode(null);
    setDogName('');
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
            Generar QR
          </h1>
          <div className="w-20"></div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-6 bg-card/50 backdrop-blur-sm border-border/40">
          {!qrCode ? (
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                  <QrCodeIcon className="h-10 w-10 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Crear código QR</h2>
                <p className="text-muted-foreground">
                  Genera un código QR para que el paseador pueda iniciar el seguimiento
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dogName">Nombre del perro</Label>
                <Input
                  id="dogName"
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  placeholder="Ej: Max"
                  disabled={generating}
                />
              </div>

              <Button
                type="submit"
                disabled={!dogName.trim() || generating}
                className="w-full"
                size="lg"
              >
                {generating ? 'Generando...' : 'Generar código QR'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">¡Código generado!</h2>
                <p className="text-muted-foreground mb-6">
                  Comparte este código con el paseador de {dogName}
                </p>

                <div className="bg-white p-6 rounded-lg inline-block mb-4">
                  <QRCodeSVG
                    id="qr-canvas"
                    value={qrCode}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Código:</p>
                  <p className="text-2xl font-mono font-bold">{qrCode}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleDownload}
                  className="w-full"
                  size="lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Descargar QR
                </Button>
                <Button
                  onClick={handleNewQR}
                  variant="outline"
                  className="w-full"
                >
                  Generar otro código
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Este código expira en 24 horas
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GenerateQR;
