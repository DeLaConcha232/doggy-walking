import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WhatsAppButton = () => {
  const phoneNumber = "524491431962";
  const message = encodeURIComponent("Hola, necesito ayuda con Doggy-walking");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 animate-fade-in"
    >
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-[#25D366] hover:bg-[#20BA5A] text-white"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </Button>
    </a>
  );
};

export default WhatsAppButton;
