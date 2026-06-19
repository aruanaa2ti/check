import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CookieNotice } from "@/components/cookie-notice";

import appCss from "../styles.css?url";

const siteUrl = "https://a2ti.com.br";
const siteName = "a2 Soluções em T.I.";
const siteTitle = "a2 Soluções em T.I.";
const siteDescription =
  "A2 TI, A2 Soluções em T.I. e Aruan: consultoria em TI, suporte, segurança, monitoramento, hospedagem de sites e e-mails, VPS e backup em São José do Rio Preto.";
const logoUrl = `${siteUrl}/a2-logo.png`;
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${siteUrl}/#organization`,
  name: siteName,
  alternateName: [
    "A2 TI",
    "A2 Soluções",
    "A2 Soluções em TI",
    "a2ti",
    "Aruan A2 TI",
  ],
  url: siteUrl,
  logo: logoUrl,
  image: logoUrl,
  description: siteDescription,
  telephone: "+55 17 3200-0045",
  email: "contato@a2ti.com.br",
  founder: {
    "@type": "Person",
    name: "Aruan Soares de Cerqueira",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua São Valdomir, 479 - Sala 13",
    addressLocality: "São José do Rio Preto",
    addressRegion: "SP",
    postalCode: "15010-210",
    addressCountry: "BR",
  },
  areaServed: ["São José do Rio Preto", "São Paulo", "Brasil"],
  sameAs: [
    "https://www.instagram.com/a2tioficial/",
    "https://www.linkedin.com/company/a2tioficial/",
  ],
  makesOffer: [
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Consultoria em T.I." },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Segurança da Informação" },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Monitoramento de Ativos" },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Infraestrutura de Rede" },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Backup em Nuvem" },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Hospedagem de Sites" },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Hospedagem de E-mail" },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Servidor VPS" },
    },
  ],
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: siteTitle },
        { name: "description", content: siteDescription },
        {
          name: "keywords",
          content:
            "A2 TI, A2 Soluções, A2 Soluções em T.I., Aruan, Aruan Soares, hospedagem de sites, hospedagem de email, hospedagem de e-mail, consultoria em TI, suporte em TI, segurança da informação, monitoramento de ativos, infraestrutura de rede, backup em nuvem, servidores, VPS, São José do Rio Preto",
        },
        { name: "author", content: siteName },
        { name: "robots", content: "index, follow" },
        { name: "theme-color", content: "#198C19" },
        { property: "og:title", content: siteTitle },
        { property: "og:description", content: siteDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: siteUrl },
        { property: "og:site_name", content: siteName },
        { property: "og:locale", content: "pt_BR" },
        { property: "og:image", content: logoUrl },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: siteTitle },
        { name: "twitter:description", content: siteDescription },
        { name: "twitter:image", content: logoUrl },
      ],
      links: [
        { rel: "icon", href: "https://a2ti.com.br/favicon.ico" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap",
        },
        {
          rel: "stylesheet",
          href: appCss,
        },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <CookieNotice />
    </QueryClientProvider>
  );
}
