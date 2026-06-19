import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe, Copy, Check, MapPin, Building2, Network } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { reverseDnsFn } from "@/lib/tools.functions";
import { ToolCard, ToolPageShell } from "@/components/tool-page-shell";

export const Route = createFileRoute("/meuip")({
  head: () => ({
    meta: [
      { title: "a2 Soluções em T.I." },
      {
        name: "description",
        content:
          "Descubra seu endereço IP público, localização aproximada e provedor de internet.",
      },
    ],
  }),
  component: MeuIp,
});

type IpInfo = {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  asn?: string;
};

type IpWhoResponse = {
  success?: boolean;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
  timezone?: {
    id?: string;
  };
  connection?: {
    asn?: number;
    isp?: string;
    org?: string;
  };
};

function normalizeIpWho(data: IpWhoResponse): IpInfo {
  return {
    ip: data.ip ?? "",
    city: data.city,
    region: data.region,
    country_name: data.country,
    org: data.connection?.isp || data.connection?.org,
    postal: data.postal,
    timezone: data.timezone?.id,
    asn: data.connection?.asn ? `AS${data.connection.asn}` : undefined,
  };
}

function mergeIpInfo(base: IpInfo, fallback: IpInfo): IpInfo {
  return {
    ip: base.ip || fallback.ip,
    city: base.city || fallback.city,
    region: base.region || fallback.region,
    country_name: base.country_name || fallback.country_name,
    org: base.org || fallback.org,
    postal: base.postal || fallback.postal,
    timezone: base.timezone || fallback.timezone,
    asn: base.asn || fallback.asn,
  };
}

function MeuIp() {
  const reverseDns = useServerFn(reverseDnsFn);
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [reverseHostname, setReverseHostname] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchIp = async () => {
    setLoading(true);
    setError(null);
    setReverseHostname("");
    try {
      const r = await fetch("https://ipapi.co/json/");
      if (!r.ok) throw new Error("falha");
      const data = await r.json();
      let nextInfo = data as IpInfo;

      if (!nextInfo.org || !nextInfo.city || !nextInfo.region) {
        try {
          const enriched = await fetch(`https://ipwho.is/${nextInfo.ip}`);
          if (enriched.ok) {
            const enrichedData = await enriched.json();
            if (enrichedData.success !== false) {
              nextInfo = mergeIpInfo(nextInfo, normalizeIpWho(enrichedData));
            }
          }
        } catch {
          // The primary IP lookup is enough to keep the tool useful.
        }
      }

      setInfo(nextInfo);
      if (nextInfo.ip) {
        const reverse = await reverseDns({ data: { ip: nextInfo.ip } });
        setReverseHostname(reverse.hostname);
      }
    } catch {
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        const d = await r.json();
        let nextInfo: IpInfo = { ip: d.ip };
        try {
          const enriched = await fetch(`https://ipwho.is/${d.ip}`);
          if (enriched.ok) {
            const enrichedData = await enriched.json();
            if (enrichedData.success !== false) {
              nextInfo = normalizeIpWho(enrichedData);
            }
          }
        } catch {
          // Keep the IP-only fallback when enrichment is unavailable.
        }
        setInfo(nextInfo);
        const reverse = await reverseDns({ data: { ip: d.ip } });
        setReverseHostname(reverse.hostname);
      } catch {
        setError("Não foi possível obter seu IP.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIp();
  }, []);

  const copy = async () => {
    if (!info?.ip) return;
    await navigator.clipboard.writeText(info.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const locality = info
    ? [info.city, info.region, info.country_name].filter(Boolean).join(", ")
    : "";

  return (
    <ToolPageShell
      title="Meu IP"
      subtitle="Seu endereço IP público e informações da conexão."
    >
      <ToolCard className="p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Seu IP público</h2>
            <p className="text-sm text-muted-foreground">
              Dados básicos da conexão atual.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="h-10 w-56 animate-pulse rounded-lg bg-secondary" />
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-secondary/40 p-5 text-center sm:flex-row">
            <div className="min-w-0 break-all font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              {info?.ip}
            </div>
            <button
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-primary" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar
                </>
              )}
            </button>
          </div>
        )}

        {info && (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Network className="h-4 w-4 text-primary" /> Reverso
              </div>
              <div className="mt-2 break-all font-mono text-sm font-medium">
                {reverseHostname || "Não identificado"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-4 w-4 text-primary" /> Operadora
              </div>
              <div className="mt-2 text-sm font-semibold">
                {info.org || "Não identificada"}
              </div>
              {info.asn && (
                <div className="text-sm text-muted-foreground">{info.asn}</div>
              )}
            </div>
            <div className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Localidade
              </div>
              <div className="mt-2 text-sm font-semibold">
                {locality || "Não identificada"}
              </div>
              {info.postal && (
                <div className="text-sm text-muted-foreground">
                  CEP: {info.postal}
                </div>
              )}
            </div>
          </div>
        )}
      </ToolCard>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        As informações são obtidas via APIs públicas e podem ser aproximadas. A
        a2 não armazena nenhum dado.
      </p>
    </ToolPageShell>
  );
}
