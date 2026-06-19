import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronLeft, ChevronRight, Copy, Eye, Loader2, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import {
  checkListServicesFn,
  checkMeFn,
  checkServiceDetailsFn,
  checkUnsuspendServiceFn,
} from "@/lib/check.functions";
import { formatDateBR, formatMoneyBR, serviceStatusLabel } from "@/lib/format";

const opts = {
  queryKey: ["check-services"],
  queryFn: () => checkListServicesFn(),
};

export const Route = createFileRoute("/check/servicos")({
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    const services = await context.queryClient.ensureQueryData(opts);
    return { me, services };
  },
  component: CheckServicesPage,
});

function CheckServicesPage() {
  const initial = Route.useLoaderData();
  const loadDetails = useServerFn(checkServiceDetailsFn);
  const unsuspend = useServerFn(checkUnsuspendServiceFn);
  const [services, setServices] = useState(initial.services);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<Awaited<ReturnType<typeof checkServiceDetailsFn>> | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const statuses = Array.from(new Set(services.map((service) => service.status).filter(Boolean))).sort();
  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    return services.filter((service) => {
      const haystack = [
        service.domain,
        service.name,
        service.server,
        service.clientName,
        service.status,
        service.billingcycle,
      ].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (!status || service.status === status);
    });
  }, [services, status, term]);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedServices = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);

  const openDetails = async (serviceId: number) => {
    setDetails(null);
    setDetailsLoading(true);
    try {
      setDetails(await loadDetails({ data: { serviceId } }));
    } finally {
      setDetailsLoading(false);
    }
  };

  const copyValue = async (label: string, value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const onUnsuspend = async (serviceId: number) => {
    const confirmed = window.confirm("Reativar este serviço no WHMCS?");
    if (!confirmed) return;
    setActionId(serviceId);
    try {
      await unsuspend({ data: { serviceId } });
      setServices((items) => items.map((item) => item.id === serviceId ? { ...item, status: "Active" } : item));
    } finally {
      setActionId(null);
    }
  };

  return (
    <CheckLayout title="Serviços" subtitle="Serviços dos clientes no WHMCS." userName={initial.me.name}>
      <section className="card-soft mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="Filtrar por domínio, serviço, cliente ou servidor"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Todos os status</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {serviceStatusLabel(item)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Domínio</th>
                <th className="px-5 py-3 text-left font-medium">Serviço</th>
                <th className="px-5 py-3 text-left font-medium">Servidor</th>
                <th className="px-5 py-3 text-left font-medium">Ciclo</th>
                <th className="px-5 py-3 text-left font-medium">Vencimento</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedServices.map((service) => (
                <tr key={service.id} className="hover:bg-muted/40">
                  <td className="px-5 py-4 font-semibold">{service.domain || "—"}</td>
                  <td className="px-5 py-4">
                    <div>{service.name}</div>
                    <div className="text-xs text-muted-foreground">{service.clientName || "—"}</div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{service.server || "—"}</td>
                  <td className="px-5 py-4">{service.billingcycle || "—"}</td>
                  <td className="px-5 py-4">{formatDateBR(service.nextduedate)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={service.status} label={serviceStatusLabel(service.status)} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        title="Detalhes"
                        aria-label="Ver detalhes"
                        onClick={() => openDetails(service.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {service.status === "Suspended" && (
                        <button
                          title="Reativar"
                          aria-label="Reativar serviço"
                          onClick={() => onUnsuspend(service.id)}
                          disabled={actionId === service.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60"
                        >
                          {actionId === service.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando {pageStart}-{pageEnd} de {filtered.length} serviços
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="min-w-16 text-center text-xs font-medium">
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {(details || detailsLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <h2 className="text-xl font-bold tracking-tight">Detalhes do serviço</h2>
              <button
                onClick={() => setDetails(null)}
                className="rounded-md border border-border px-4 py-2 text-xs font-bold transition hover:bg-secondary"
              >
                Fechar
              </button>
            </div>
            <div className="max-h-[66vh] overflow-y-auto px-5 py-4">
              {detailsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Carregando detalhes...
                </div>
              ) : details ? (
                <div className="space-y-2 text-sm">
                  <DetailRow label="Domínio" value={details.domain} />
                  <DetailRow label="Serviço" value={details.name} />
                  <DetailRow label="Servidor" value={details.server} />
                  <DetailRow label="Usuário" value={details.username} onCopy={() => copyValue("Usuário", details.username)} copied={copied === "Usuário"} />
                  <DetailRow label="Senha" value={details.password} emptyText="Não retornada pelo WHMCS" onCopy={() => copyValue("Senha", details.password)} copied={copied === "Senha"} />
                  <DetailRow label="Ciclo" value={details.billingcycle} />
                  <DetailRow label="Vencimento" value={formatDateBR(details.nextduedate)} />
                  <DetailRow label="Valor recorrente" value={formatMoneyBR(details.recurringAmount)} />
                  <DetailRow label="Motivo da suspensão" value={details.suspensionReason} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </CheckLayout>
  );
}

function DetailRow({
  label,
  value,
  emptyText = "—",
  copied = false,
  onCopy,
}: {
  label: string;
  value?: string | number;
  emptyText?: string;
  copied?: boolean;
  onCopy?: () => void;
}) {
  const display = value === undefined || value === null || value === "" ? emptyText : String(value);
  return (
    <div className="grid gap-2 border-b border-border py-2 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="font-semibold text-muted-foreground">{label}</div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="break-all">{display}</span>
        {onCopy && value && (
          <button
            onClick={onCopy}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-brand-dark"
            aria-label={`Copiar ${label}`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
