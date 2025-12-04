import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, RefreshCw, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface WalkerQRDisplayProps {
  userId: string;
}

const WalkerQRDisplay = ({ userId }: WalkerQRDisplayProps) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadQRCode = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('admin_qr_codes')
        .select('code')
        .eq('admin_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setQrCode(data.code);
      } else {
        // Generate a new QR code if none exists
        await generateNewQR();
      }
    } catch (err) {
      console.error('Error loading QR:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateNewQR = async () => {
    if (!userId) return;
    
    setGenerating(true);
    try {
      const newCode = `WALKER_${userId.substring(0, 8)}_${Date.now().toString(36).toUpperCase()}`;

      // Delete existing QR codes for this admin
      await supabase
        .from('admin_qr_codes')
        .delete()
        .eq('admin_id', userId);

      // Insert new QR code
      const { error } = await supabase
        .from('admin_qr_codes')
        .insert({
          admin_id: userId,
          code: newCode
        });

      if (error) throw error;
      
      setQrCode(newCode);
      toast.success('Código QR generado');
    } catch (err) {
      console.error('Error generating QR:', err);
      toast.error('Error al generar código QR');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('walker-qr-canvas') as unknown as SVGElement;
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
        link.download = `doggy-walking-qr-${qrCode}.png`;
        link.click();
        toast.success('QR descargado');
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  useEffect(() => {
    loadQRCode();
  }, [userId]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="aspect-square bg-muted rounded max-w-[200px] mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Mi Código QR
            </CardTitle>
            <CardDescription>
              Los clientes escanean este código para afiliarse
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={generateNewQR}
            disabled={generating}
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrCode ? (
          <>
            <div className="bg-white p-4 rounded-lg inline-block w-full flex justify-center">
              <QRCodeSVG
                id="walker-qr-canvas"
                value={qrCode}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Código:</p>
              <p className="text-sm font-mono font-bold break-all">{qrCode}</p>
            </div>
            <Button 
              onClick={handleDownload} 
              variant="outline" 
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar QR
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No tienes un código QR</p>
            <Button onClick={generateNewQR} disabled={generating}>
              {generating ? 'Generando...' : 'Generar código QR'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalkerQRDisplay;
