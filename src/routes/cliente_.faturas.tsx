import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getInvoiceSsoUrlFn, getInvoicesFn, meFn } from "@/lib/portal.functions";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { formatDateBR, formatMoneyBR, invoiceStatusLabel } from "@/lib/format";
import { ExternalLink, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const opts = queryOptions({ queryKey: ["invoices"], queryFn: () => getInvoicesFn({ data: {} }) });
const meOpts = queryOptions({ queryKey: ["me"], queryFn: () => meFn() });

export const Route = createFileRoute("/cliente_/faturas")({
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meOpts);
    if (!me) throw redirect({ to: "/cliente" });
    return context.queryClient.ensureQueryData(opts);
  },
  component: InvoicesPage,
});

const TABS: Array<{ key: "all" | "open" | "paid"; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "open", label: "Em aberto" },
  { key: "paid", label: "Pagas" },
];

function InvoicesPage() {
  const { data: list } = useSuspenseQuery(opts);
  const { data: me } = useSuspenseQuery(meOpts);
  const getSso = useServerFn(getInvoiceSsoUrlFn);
  const [filter, setFilter] = useState<"all" | "open" | "paid">("all");
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<number | null>(null);

  const openInvoice = async (id: number) => {
    setLoadingInvoiceId(id);
    try {
      const { url } = await getSso({ data: { id } });
      window.open(url, "_blank", "noopener");
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const filtered = list.filter((i) => {
    if (filter === "open") return ["Unpaid", "Overdue", "Payment Pending"].includes(i.status);
    if (filter === "paid") return i.status === "Paid";
    return true;
  });

  return (
    <PortalLayout
      title="Minhas Faturas"
      subtitle="Consulte vencimentos, valores e status das suas faturas."
      userName={me?.name ?? "Cliente"}
    >
      <div className="mb-5 inline-flex rounded-md border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              filter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-soft flex flex-col items-center justify-center py-16 text-center">
          <Receipt className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma fatura nesta categoria.</p>
        </div>
      ) : (
        <div className="card-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Fatura</th>
                  <th className="px-6 py-3 text-left font-medium">Vencimento</th>
                  <th className="px-6 py-3 text-left font-medium">Pagamento</th>
                  <th className="px-6 py-3 text-left font-medium">Valor</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-muted/40">
                    <td className="px-6 py-4 font-medium">#{i.id}</td>
                    <td className="px-6 py-4">{formatDateBR(i.duedate)}</td>
                    <td className="px-6 py-4">{formatDateBR(i.datepaid)}</td>
                    <td className="px-6 py-4 font-semibold">{formatMoneyBR(i.total)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={i.status} label={invoiceStatusLabel(i.status)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openInvoice(i.id)}
                          disabled={loadingInvoiceId === i.id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition hover:bg-brand-dark disabled:opacity-60"
                        >
                          {loadingInvoiceId === i.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              Abrir boleto
                              <ExternalLink className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
