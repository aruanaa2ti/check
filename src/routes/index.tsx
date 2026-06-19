import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  Server,
  Wrench,
  Network,
  HardDrive,
  Cloud,
  Mail,
  Database,
  Activity,
  CheckCircle2,
  Phone,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { HeroBanner } from "@/components/hero-banner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "a2 Soluções em T.I.",
      },
      {
        name: "description",
        content:
          "A2 TI, A2 Soluções em T.I. e Aruan: hospedagem de sites e e-mails, servidores VPS, segurança, monitoramento, backup e suporte em São José do Rio Preto.",
      },
      {
        property: "og:title",
        content: "a2 Soluções em T.I.",
      },
      {
        property: "og:description",
        content:
          "A2 TI, A2 Soluções em T.I. e Aruan: infraestrutura, hospedagem, segurança, monitoramento e suporte em TI.",
      },
    ],
    links: [{ rel: "canonical", href: "https://a2ti.com.br/" }],
  }),
  component: Home,
});

const services = [
  {
    icon: Wrench,
    title: "Consultoria em T.I.",
    desc: "Análise do seu ambiente para identificar melhorias e propor estratégias de eficiência, segurança e desempenho.",
  },
  {
    icon: Activity,
    title: "Gerenciamento em T.I.",
    desc: "Pacote completo: consultoria, suporte remoto/presencial, hardware, software, monitoramento, segurança e rede.",
  },
  {
    icon: Server,
    title: "Servidores e Data Centers",
    desc: "Instalação, configuração e manutenção de servidores físicos ou virtuais e implantação em data centers.",
  },
  {
    icon: Shield,
    title: "Segurança",
    desc: "Firewall e antivírus de última geração contra vírus, malware, ransomware e demais ameaças.",
  },
  {
    icon: Activity,
    title: "Monitoramento de Ativos",
    desc: "Monitoramento em tempo real de servidores, redes e ativos de T.I. para máxima disponibilidade.",
  },
  {
    icon: Network,
    title: "Infraestrutura de Rede",
    desc: "Projetos, cabeamento estruturado, Wi-Fi corporativo, certificação e documentação.",
  },
  {
    icon: HardDrive,
    title: "Hardware e Software",
    desc: "Suporte para computadores e notebooks: manutenção, upgrades, formatação e instalação.",
  },
  {
    icon: Mail,
    title: "Hospedagem E-mail e Site",
    desc: "E-mail e sites corporativos @seudominio em ambiente seguro, estável e com backup.",
  },
  {
    icon: Database,
    title: "Servidor VPS",
    desc: "Hospedagem dedicada com alto desempenho, escalabilidade e segurança para suas aplicações.",
  },
  {
    icon: Cloud,
    title: "Backup em Nuvem",
    desc: "Cópias automáticas dos seus dados na nuvem com recuperação fácil em caso de falhas.",
  },
];

const testimonials = [
  {
    quote:
      "Atendimento ágil, equipe extremamente competente e soluções eficientes.",
    author: "José Antonyo",
    company: "Autentic Certificadora Digital",
  },
  {
    quote:
      "Como sempre o atendimento é extremamente profissional e humanizado, recomendo a todos.",
    author: "Marcelo Tranjan",
    company: "Link Etiquetas",
  },
  {
    quote:
      "Excelente empresa, excelentes profissionais, obrigada pela parceria de sempre.",
    author: "Vivian Hipólito",
    company: "ABM Soluções e Serviços",
  },
  {
    quote:
      "A a2 é uma parceira muito importante para a nossa operação. Infraestrutura altamente escalável que impacta diretamente estabilidade, performance e segurança do nosso negócio. Recomendo fortemente!",
    author: "Kim Tranjan",
    company: "WebPic Desenvolvimento de Software",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO BANNER */}
      <HeroBanner />

      {/* HIGHLIGHTS */}
      <section className="border-b border-border bg-card/30 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 sm:px-6 lg:px-8">
          {[
            "Atendimento humanizado",
            "Suporte ágil",
            "Segurança em primeiro lugar",
            "Monitoramento 24/7",
          ].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" /> {i}
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="servicos" className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              Serviços
            </div>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
              Soluções completas em T.I.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Da consultoria à execução — cuidamos de todo o ciclo da sua
              infraestrutura.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {services.map((s) => (
              <div
                key={s.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all hover:border-primary/40 hover:shadow-glow"
              >
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="quem-somos"
        className="border-t border-border bg-card/30 py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              Quem somos
            </div>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
              Tecnologia deve ajudar, não atrapalhar.
            </h2>
            <p className="mt-6 text-muted-foreground">
              A a2 Soluções em T.I., também encontrada como A2 TI ou A2
              Soluções, é uma empresa liderada por Aruan Soares de Cerqueira em
              São José do Rio Preto. Nosso trabalho é cuidar da sua T.I. com
              atenção, agilidade e responsabilidade.
            </p>
            <p className="mt-4 text-muted-foreground">
              Atendemos empresas que precisam de suporte técnico, consultoria,
              segurança, monitoramento, hospedagem de sites, hospedagem de
              e-mails, servidores VPS, backup em nuvem e infraestrutura de rede.
              Com a gente, você tem mais desempenho e tranquilidade para focar
              no que realmente importa: seu negócio.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                t: "Missão",
                d: "Oferecer soluções tecnológicas inovadoras e personalizadas, tornando a T.I. uma aliada estratégica do crescimento dos nossos clientes.",
              },
              {
                t: "Visão",
                d: "Ser referência em soluções de T.I. na região, destacando-se pela excelência no atendimento e inovação.",
              },
              {
                t: "Valores",
                d: "Cuidado com o cliente · Transparência e ética · Inovação constante · Honestidade.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="text-sm font-semibold text-primary">{c.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="clientes" className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              Clientes
            </div>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
              O que dizem sobre nós
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure
                key={t.author}
                className="rounded-2xl border border-border bg-card p-8 shadow-card"
              >
                <blockquote className="text-lg leading-relaxed text-foreground">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-6 border-t border-border pt-4">
                  <div className="font-semibold">{t.author}</div>
                  <div className="text-sm text-muted-foreground">
                    {t.company}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / CONTACT */}
      <section
        id="contato"
        className="border-t border-border bg-gradient-hero py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl font-bold sm:text-5xl">
                Vamos conversar?
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Conte para a gente o desafio do seu ambiente de T.I. Nossa
                equipe responde rápido e propõe a melhor solução.
              </p>
              <div className="mt-10 space-y-4">
                <a
                  href="tel:+551732000045"
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Telefone
                    </div>
                    <div className="font-semibold">17 3200.0045</div>
                  </div>
                </a>
                <a
                  href="https://wa.me/5517981516598"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      WhatsApp
                    </div>
                    <div className="font-semibold">17 98151.6598</div>
                  </div>
                </a>
                <a
                  href="mailto:contato@a2ti.com.br"
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">E-mail</div>
                    <div className="font-semibold">contato@a2ti.com.br</div>
                  </div>
                </a>
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Endereço
                    </div>
                    <div className="font-semibold">
                      Rua São Valdomir, 479 · Sala 13 — São José do Rio Preto /
                      SP
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[420px] overflow-hidden rounded-3xl border border-border bg-muted shadow-card lg:self-end">
              <iframe
                title="Localização a2 Soluções em T.I."
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3729.654207019001!2d-49.38837492474759!3d-20.79861148015405!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94bdab5e8c89f3d7%3A0x4dbef8e2f1c2c2e7!2sR.%20S%C3%A3o%20Valdomir%2C%20479%20-%20Jardim%20Yolanda%2C%20S%C3%A3o%20Jos%C3%A9%20do%20Rio%20Preto%20-%20SP%2C%2015010-210!5e0!3m2!1spt-BR!2sbr!4v1718800000000!5m2!1spt-BR!2sbr"
                width="100%"
                height="100%"
                className="block h-full w-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
