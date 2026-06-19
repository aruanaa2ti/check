import { MessageCircle } from "lucide-react";

export function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/5517981516598?text=Olá!%20Gostaria%20de%20conhecer%20os%20serviços%20da%20a2."
      target="_blank"
      rel="noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform hover:scale-110 sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" />
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-30" />
    </a>
  );
}
