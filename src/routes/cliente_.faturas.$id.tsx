import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getInvoiceFn, getInvoiceSsoUrlFn, meFn } from "@/lib/portal.functions";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { formatDateBR, formatMoneyBR, invoiceStatusLabel } from "@/lib/format";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

const meOpts = queryOptions({ queryKey: ["me"], queryFn: () => meFn() });

export const Route = createFileRoute("/cliente_/faturas/$id")({
  loader: async ({ context, params }) => {
    const id = Number(params.id);
    const opts = queryOptions({
      queryKey: ["invoice", id],
      queryFn: () => getInvoiceFn({ data: { id } }),
    });
    const me = await context.queryClient.ensureQueryData(meOpts);
    if (!me) throw redirect({ to: "/cliente" });
    return context.queryClient.ensureQueryData(opts);
  },
  component: InvoiceDetailPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center">
      <p className="text-sm text-red-600">{error.message}</p>
      <Link to="/cliente/faturas" className="mt-4 inline-block text-sm text-brand-dark hover:underline">
        ← Voltar para faturas
      </Link>
    </div>
  ),
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const numId = Number(id);
  const opts = queryOptions({ queryKey: ["invoice", numId], queryFn: () => getInvoiceFn({ data: { id: numId } }) });
  const { data: inv } = useSuspenseQuery(opts);
  const { data: me } = useSuspenseQuery(meOpts);
  const getSso = useServerFn(getInvoiceSsoUrlFn);
  const [loadingSso, setLoadingSso] = useState(false);

  const openInvoice = async () => {
    setLoadingSso(true);
    try {
      const { url } = await getSso({ data: { id: numId } });
      window.open(url, "_blank", "noopener");
    } finally {
      setLoadingSso(false);
    }
  };

  return (
    <PortalLayout
      title={`Fatura #${inv.id}`}
      subtitle="Veja os dados completos da fatura selecionada."
      userName={me?.name ?? "Cliente"}
    >
      <Link to="/cliente/faturas" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para faturas
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card-soft p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Itens</h3>
          {inv.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem itens.</p>
          ) : (
            <ul className="divide-y divide-border">
              {inv.items.map((it, idx) => (
                <li key={it.id || idx} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm">{it.description}</span>
                  <span className="text-sm font-semibold">{formatMoneyBR(it.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMoneyBR(inv.subtotal)}</span>
            </div>
            {inv.tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Impostos</span>
                <span>{formatMoneyBR(inv.tax)}</span>
              </div>
            )}
            {inv.credit > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Crédito</span>
                <span>-{formatMoneyBR(inv.credit)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatMoneyBR(inv.total)}</span>
            </div>
          </div>
        </div>

        <aside className="card-soft p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resumo</h3>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={inv.status} label={invoiceStatusLabel(inv.status)} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vencimento</dt>
              <dd className="mt-1 font-medium">{formatDateBR(inv.duedate)}</dd>
            </div>
            {formatDateBR(inv.datepaid) !== "—" && (
              <div>
                <dt className="text-muted-foreground">Pagamento</dt>
                <dd className="mt-1 font-medium">{formatDateBR(inv.datepaid)}</dd>
              </div>
            )}
            {inv.paymentmethod && (
              <div>
                <dt className="text-muted-foreground">Método</dt>
                <dd className="mt-1 font-medium capitalize">{inv.paymentmethod}</dd>
              </div>
            )}
          </dl>

          <button
            onClick={openInvoice}
            disabled={loadingSso}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loadingSso ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Abrir boleto
                <ExternalLink className="h-4 w-4" />
              </>
            )}
          </button>
        </aside>
      </div>
    </PortalLayout>
  );
}
