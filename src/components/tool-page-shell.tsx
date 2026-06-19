import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export function ToolPageShell({
  title,
  subtitle,
  maxWidth = "max-w-3xl",
  children,
}: {
  title: string;
  subtitle: string;
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border bg-gradient-hero py-9">
        <div className={`mx-auto ${maxWidth} px-4 sm:px-6 lg:px-8`}>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            Ferramentas
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </section>

      <main className="py-10">
        <div className={`mx-auto ${maxWidth} px-4 sm:px-6 lg:px-8`}>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function ToolCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-card shadow-soft ${className}`}
    >
      {children}
    </div>
  );
}
