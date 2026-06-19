import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import banner1 from "@/assets/banner-1.jpg";
import banner2 from "@/assets/banner-2.jpg";
import banner3 from "@/assets/banner-3.jpg";

const slides = [
  {
    image: banner1,
    title: "Prevenção de incidentes, monitoramento e soluções de segurança",
    subtitle: "Que garantem o funcionamento dos seus negócios.",
    cta: "Entre em Contato",
    href: "/#contato",
  },
  {
    image: banner2,
    title: "Segurança de última geração para sua empresa",
    subtitle: "Firewall, antivírus e proteção contra ransomware.",
    cta: "Conheça nossos serviços",
    href: "/#servicos",
  },
  {
    image: banner3,
    title: "Monitoramento 24/7 da sua infraestrutura",
    subtitle: "Disponibilidade, performance e tranquilidade para o seu negócio.",
    cta: "Fale com um especialista",
    href: "/#contato",
  },
];

export function HeroBanner() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, []);

  const go = (n: number) => setI((n + slides.length) % slides.length);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {slides.map((s, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={s.image}
            alt={s.title}
            className="h-full w-full object-cover"
            loading={idx === 0 ? "eager" : "lazy"}
            width={1600}
            height={900}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mx-auto w-full max-w-7xl px-6 text-center lg:px-8">
              <div className="mx-auto max-w-3xl text-white">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-[3.4rem]">
                  {s.title}
                </h1>
                <p className="mt-5 text-lg text-white/85 sm:text-xl">{s.subtitle}</p>
                <a
                  href={s.href}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
                >
                  {s.cta} <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        aria-label="Anterior"
        onClick={() => go(i - 1)}
        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/25 sm:left-6"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        aria-label="Próximo"
        onClick={() => go(i + 1)}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/25 sm:right-6"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Slide ${idx + 1}`}
            onClick={() => go(idx)}
            className={`h-2 rounded-full transition-all ${
              i === idx ? "w-8 bg-primary" : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
