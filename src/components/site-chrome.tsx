import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  Globe,
  KeyRound,
  Instagram,
  Linkedin,
  Download,
  ShieldCheck,
} from "lucide-react";
import { WhatsAppFloat } from "./whatsapp-float";
import logoBlack from "@/assets/logo-black.png";

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/a2tioficial/",
    icon: Instagram,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/a2tioficial/",
    icon: Linkedin,
  },
];

const TOOLS_LINKS = [
  { label: "Check", to: "/check", icon: ShieldCheck },
  { label: "Downloads", to: "/download", icon: Download },
  { label: "Gerador de Senhas", to: "/senha", icon: KeyRound },
  { label: "Meu IP", to: "/meuip", icon: Globe },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { label: "Início", to: "/" },
    { label: "Serviços", to: "/#servicos" },
    { label: "Quem Somos", to: "/#quem-somos" },
    { label: "Contato", to: "/#contato" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-22 lg:px-8">
        <Link to="/" className="flex items-center">
          <img
            src={logoBlack}
            alt="A2 Soluções em T.I."
            className="h-16 w-auto object-contain"
            width={300}
            height={200}
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <a
              key={n.to}
              href={n.to}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                pathname === n.to ? "text-primary" : "text-foreground/80"
              }`}
            >
              {n.label}
            </a>
          ))}
          <div
            className="relative"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button
              className={`flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                pathname.startsWith("/check") ||
                pathname.startsWith("/meuip") ||
                pathname.startsWith("/senha") ||
                pathname.startsWith("/download") ||
                pathname.startsWith("/politica")
                  ? "text-primary"
                  : "text-foreground/80"
              }`}
            >
              Ferramentas <ChevronDown className="h-4 w-4" />
            </button>
            {toolsOpen && (
              <div className="absolute right-0 top-full w-44 pt-2">
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
                  {TOOLS_LINKS.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Link
                        key={tool.to}
                        to={tool.to}
                        className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary"
                      >
                        <Icon className="h-3.5 w-3.5 text-primary" />{" "}
                        {tool.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 md:flex">
            {SOCIAL_LINKS.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="rounded-md p-2 text-foreground/70 transition-colors hover:bg-secondary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
          <a
            href="/cliente"
            className="hidden rounded-lg bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 sm:inline-block"
          >
            Área do Cliente
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md p-2 text-foreground lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="flex flex-col p-4">
            {nav.map((n) => (
              <a
                key={n.to}
                href={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-3 text-sm font-medium hover:bg-secondary"
              >
                {n.label}
              </a>
            ))}
            <div className="my-2 border-t border-border" />
            <div className="flex items-center gap-2 px-4 py-2">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="rounded-md border border-border p-2 text-foreground/70 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
            <div className="my-2 border-t border-border" />
            <div className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Ferramentas
            </div>
            {TOOLS_LINKS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-4 py-3 text-sm hover:bg-secondary"
                >
                  <Icon className="h-4 w-4 text-primary" /> {tool.label}
                </Link>
              );
            })}
            <a
              href="/cliente"
              onClick={() => setOpen(false)}
              className="mt-3 rounded-lg bg-gradient-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Área do Cliente
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <>
      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center">
              <img
                src={logoBlack}
                alt="A2 Soluções em T.I."
                className="h-14 w-auto object-contain"
                width={300}
                height={200}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Tecnologia que cuida do seu negócio com proximidade e
              responsabilidade.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Empresa</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/#quem-somos" className="hover:text-primary">
                  Quem Somos
                </a>
              </li>
              <li>
                <a href="/#servicos" className="hover:text-primary">
                  Serviços
                </a>
              </li>
              <li>
                <a href="/#contato" className="hover:text-primary">
                  Contato
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Ferramentas</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {TOOLS_LINKS.map((tool) => (
                <li key={tool.to}>
                  <Link to={tool.to} className="hover:text-primary">
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Contato</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>17 3200.0045</li>
              <li>17 98151.6598</li>
              <li>contato@a2ti.com.br</li>
              <li>São José do Rio Preto / SP</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} a2 Soluções em T.I. — Todos os direitos
          reservados.
        </div>
      </footer>
      <WhatsAppFloat />
    </>
  );
}
