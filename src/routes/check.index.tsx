import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Loader2,
  MessageSquare,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useState } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { checkClientContactsFn, checkDashboardFn, checkGlobalSearchFn, checkMeFn } from "@/lib/check.functions";
import { serviceStatusLabel } from "@/lib/format";

type SearchResult = Awaited<ReturnType<typeof checkGlobalSearchFn>>;

const opts = {
  queryKey: ["check-dashboard"],
  queryFn: () => checkDashboardFn(),
};

export const Route = createFileRoute("/check/")({
  head: () => ({
    meta: [
      { title: "Check | a2 Soluções em T.I." },
      { name: "description", content: "Dashboard interno para consulta de clientes, serviços e chamados." },
    ],
  }),
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    return context.queryClient.ensureQueryData(opts);
  },
  component: CheckDashboardPage,
});

function CheckDashboardPage() {
  const data = Route.useLoaderData();
  const searchWhmcs = useServerFn(checkGlobalSearchFn);
  const loadContacts = useServerFn(checkClientContactsFn);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contacts, setContacts] = useState<Awaited<ReturnType<typeof checkClientContactsFn>>>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const firstName = data.me.name.split(" ")[0] || "Colaborador";
  const stats = [
    {
      label: "Ordens",
      value: data.stats.orders_pending,
      icon: ShoppingCart,
      accent: "bg-amber-100 text-amber-800",
    },
    {
      label: "Chamados",
      value: data.stats.tickets_awaitingreply,
      icon: MessageSquare,
      accent: "bg-blue-100 text-blue-700",
    },
    {
      label: "Cancelamentos",
      value: data.stats.cancellations_pending,
      icon: AlertCircle,
      accent: "bg-red-100 text-red-700",
    },
    {
      label: "Modulos Pendentes",
      value: data.stats.modules_pending,
      icon: Clock,
      accent: "bg-primary/10 text-primary",
    },
  ];

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSearching(true);
    try {
      const found = await searchWhmcs({ data: { search: query } });
      setResults(found);
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível buscar no WHMCS.");
    } finally {
      setSearching(false);
    }
  };

  const openContacts = async (clientId: number) => {
    setContactsOpen(true);
    setContacts([]);
    setContactsError(null);
    setContactsLoading(true);
    try {
      setContacts(await loadContacts({ data: { clientId } }));
    } catch (err: any) {
      setContactsError(err?.message ?? "Não foi possível carregar os contatos.");
    } finally {
      setContactsLoading(false);
    }
  };

  const copyEmail = async (email: string) => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    window.setTimeout(() => setCopiedEmail(null), 1400);
  };

  return (
    <CheckLayout
      title="Dashboard"
      subtitle="Visão geral do WHMCS e busca rápida."
      userName={data.me.name}
    >
      <section className="card-soft relative mb-8 overflow-hidden p-8">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 100% at 100% 0%, oklch(0.55 0.18 145 / 0.12), transparent 60%)",
          }}
        />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-dark">Bem-vindo</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Olá, {firstName}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Acompanhe os principais indicadores do WHMCS e consulte rapidamente um domínio.
          </p>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card-soft p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${stat.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="card-soft mb-8 p-5">
        <form onSubmit={onSearch} className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 w-full rounded-md border border-input bg-background px-10 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder="Digite o domínio, exemplo: a2ti.com.br"
            />
          </div>
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60 md:w-40"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </button>
        </form>
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {results && <SearchResults results={results} onOpenContacts={openContacts} />}
      </section>
      {contactsOpen && (
        <ContactsModal
          contacts={contacts}
          copiedEmail={copiedEmail}
          error={contactsError}
          loading={contactsLoading}
          onClose={() => setContactsOpen(false)}
          onCopyEmail={copyEmail}
        />
      )}
    </CheckLayout>
  );
}

function SearchResults({
  results,
  onOpenContacts,
}: {
  results: SearchResult;
  onOpenContacts: (clientId: number) => void;
}) {
  const empty =
    !results.domainCheck;

  if (empty) {
    return (
      <div className="mt-5 rounded-md border border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Digite um domínio válido para consultar.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {results.domainCheck && <DomainCheckCards check={results.domainCheck} onOpenContacts={onOpenContacts} />}
    </div>
  );
}

function DomainCheckCards({
  check,
  onOpenContacts,
}: {
  check: NonNullable<SearchResult["domainCheck"]>;
  onOpenContacts: (clientId: number) => void;
}) {
  const rootA = check.dns?.rootA ?? [];
  const wwwA = check.dns?.wwwA ?? [];
  const mx = check.dns?.mx ?? [];
  const spf = check.dns?.spf ?? [];
  const registro = check.registro;
  const whmcs = check.whmcs;

  return (
    <div className="space-y-4">
      <InfoCard title="WHMCS">
        <InfoRow label="Cliente">
          <div className="flex flex-wrap items-center gap-2">
            <span>{whmcs.client || "—"}</span>
            {whmcs.clientId > 0 && (
              <button
                type="button"
                title="Contatos"
                aria-label="Ver contatos"
                onClick={() => onOpenContacts(whmcs.clientId)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-brand-dark"
              >
                <Users className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </InfoRow>
        <InfoRow label="Domínio" value={whmcs.domain || check.domain} />
        <InfoRow label="Servidor" value={whmcs.server || "—"} />
        <InfoRow label="Plano" value={whmcs.plan || "—"} />
        <InfoRow label="Status">
          <StatusBadge status={whmcs.status} label={serviceStatusLabel(whmcs.status)} />
        </InfoRow>
        <InfoRow label="Uso em Disco" value={formatDisk(whmcs.disk)} />
        <InfoRow label="E-mail" value={formatEmailCount(whmcs.email)} />
      </InfoCard>

      <InfoCard title={registro?.sourceLabel || "Registro do Domínio"}>
        <InfoRow label="Domínio" value={registro?.domain || check.domain} />
        <InfoRow label="Status">
          <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {formatRegistroStatus(registro?.status)}
          </span>
        </InfoRow>
        {registro?.source === "registrobr" ? (
          <>
            <InfoRow label="ID do Titular" value={registro?.ownerId || "—"} />
            <InfoRow label="ID Técnico" value={registro?.techId || "—"} />
            <InfoRow label="Titular" value={registro?.holder || "—"} />
            <InfoRow label="Documento" value={registro?.holderDocument || "—"} />
          </>
        ) : (
          <InfoRow label="Registrador" value={registro?.registrar || "—"} />
        )}
        <InfoRow label="Criação" value={registro?.created || "—"} />
        <InfoRow label="Atualização" value={registro?.changed || "—"} />
        <InfoRow label="Vencimento" value={registro?.expires || "—"} />
        <InfoRow label="DNS:" value={(registro?.nameservers ?? []).join("\n") || "—"} preserve />
      </InfoCard>

      <InfoCard title="DNS">
        <InfoRow label="NS" value={(check.dns?.ns ?? []).join("\n") || "—"} preserve />
        <InfoRow label="A (root)" value={formatA(rootA)} preserve />
        <InfoRow label="A (www)" value={formatA(wwwA)} preserve />
        <InfoRow label="MX" value={mx.map((item) => `${item.priority} ${item.exchange}`).join("\n") || "—"} preserve />
        <InfoRow label="SPF" value={spf.join("\n") || "—"} preserve />
      </InfoCard>
    </div>
  );
}

function formatA(records: { ip: string; reverse: string }[]) {
  if (records.length === 0) return "—";
  return records.map((record) => `${record.ip}${record.reverse ? ` - ${record.reverse}` : ""}`).join("\n");
}

function formatDisk(value: string) {
  if (!value) return "—";
  return /\b(kb|mb|gb|tb)\b/i.test(value) ? value : `${value} GB`;
}

function formatEmailCount(value: string) {
  if (!value) return "—";
  return /caixa|e-mail|email/i.test(value) ? value : `${value} caixas`;
}

function formatRegistroStatus(value?: string) {
  const status = String(value ?? "").toLowerCase();
  if (!status) return "—";
  if (status.includes("published") || status.includes("active")) return "Publicado";
  if (status.includes("hold") || status.includes("frozen")) return "Congelado";
  if (status.includes("pending")) return "Pendente";
  if (status.includes("expired")) return "Expirado";
  if (status.includes("inactive")) return "Inativo";
  return value || "—";
}

function ContactsModal({
  contacts,
  copiedEmail,
  error,
  loading,
  onClose,
  onCopyEmail,
}: {
  contacts: Awaited<ReturnType<typeof checkClientContactsFn>>;
  copiedEmail: string | null;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onCopyEmail: (email: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 className="text-xl font-bold tracking-tight">Contatos do cliente</h2>
          <button
            onClick={onClose}
            className="hidden rounded-md border border-border px-4 py-2 text-xs font-bold text-foreground transition hover:bg-secondary sm:inline-flex"
          >
            Fechar
          </button>
        </div>
        <div className="max-h-[66vh] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Carregando contatos...
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : contacts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => {
                const name = `${contact.firstname} ${contact.lastname}`.trim() || contact.email;
                return (
                  <div
                    key={`${contact.principal ? "principal" : "contact"}-${contact.id}`}
                    className="rounded-md border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-muted-foreground">{name}</h3>
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {contact.principal ? "Principal" : "Adicional"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <p>
                        <strong>E-mail:</strong>{" "}
                        {contact.email ? (
                          <>
                            <span className="font-bold text-primary">{contact.email}</span>
                            <button
                              title={copiedEmail === contact.email ? "Copiado" : "Copiar e-mail"}
                              aria-label={copiedEmail === contact.email ? "E-mail copiado" : "Copiar e-mail"}
                              onClick={() => onCopyEmail(contact.email)}
                              className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-brand-dark"
                            >
                              {copiedEmail === contact.email ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </p>
                      <p>
                        <strong>Telefone:</strong> <span>{contact.phonenumber || "—"}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-border px-5 py-4 sm:hidden">
          <button
            onClick={onClose}
            className="w-full rounded-md border border-border px-4 py-2 text-xs font-bold text-foreground transition hover:bg-secondary"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <div className="px-4 py-3 text-sm font-bold">{title}</div>
      <div className="px-4 pb-3">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  children,
  preserve = false,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  preserve?: boolean;
}) {
  return (
    <div className="grid border-t border-border py-2 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
      <div className="font-semibold">{label}</div>
      <div className={preserve ? "whitespace-pre-wrap" : ""}>{children ?? value}</div>
    </div>
  );
}
