import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDashboardFn, meFn } from "@/lib/portal.functions";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { formatDateBR, formatMoneyBR, invoiceStatusLabel } from "@/lib/format";
import { Server, Globe, Receipt, AlertCircle, ArrowUpRight, MessageSquare } from "lucide-react";

const opts = queryOptions({ queryKey: ["dashboard"], queryFn: () => getDashboardFn() });

export const Route = createFileRoute("/cliente_/dashboard")({
  head: () => ({
    meta: [
      { title: "Cliente | a2 Soluções em T.I." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ context }) => {
    const me = await meFn();
    if (!me) throw redirect({ to: "/cliente" });
    return context.queryClient.ensureQueryData(opts);
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(opts);
  const { me, summary, recentInvoices, client } = data;
  const firstName = client.firstname || me.name.split(" ")[0];

  const stats = [
    { label: "Serviços ativos", value: summary.services_total, icon: Server, accent: "bg-brand/10 text-brand-dark" },
    { label: "Domínios", value: summary.domains_total, icon: Globe, accent: "bg-blue-100 text-blue-700" },
    { label: "Chamados", value: summary.tickets_total, icon: MessageSquare, accent: "bg-emerald-100 text-emerald-700" },
    { label: "Faturas em aberto", value: summary.invoices_open, icon: Receipt, accent: "bg-amber-100 text-amber-800" },
    { label: "Faturas vencidas", value: summary.invoices_overdue, icon: AlertCircle, accent: "bg-red-100 text-red-700" },
  ];

  return (
    <PortalLayout title="Dashboard" subtitle="Visão geral dos seus serviços, domínios e faturas." userName={me.name}>
      {/* Hero greeting */}
      <section className="card-soft relative mb-8 overflow-hidden p-8">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(60% 100% at 100% 0%, oklch(0.55 0.18 145 / 0.12), transparent 60%)" }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-dark">Bem-vindo</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">Olá, {firstName} 👋</h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Tudo certo por aqui. Você tem <strong className="text-foreground">{summary.invoices_open}</strong> fatura(s)
              em aberto totalizando <strong className="text-foreground">{formatMoneyBR(summary.invoices_open_total)}</strong>.
            </p>
          </div>
          <Link
            to="/cliente/faturas"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark"
          >
            Ver faturas
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-soft p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{s.value}</p>
                </div>
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${s.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Recent invoices */}
      <section className="card-soft overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold">Faturas recentes</h3>
            <p className="text-sm text-muted-foreground">Suas últimas 5 faturas emitidas.</p>
          </div>
          <Link to="/cliente/faturas" className="text-sm font-medium text-brand-dark hover:underline">
            Ver todas →
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Sem faturas no momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">#</th>
                  <th className="px-6 py-3 text-left font-medium">Vencimento</th>
                  <th className="px-6 py-3 text-left font-medium">Valor</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentInvoices.map((i) => (
                  <tr key={i.id} className="hover:bg-muted/40">
                    <td className="px-6 py-4 font-medium">#{i.id}</td>
                    <td className="px-6 py-4">{formatDateBR(i.duedate)}</td>
                    <td className="px-6 py-4 font-semibold">{formatMoneyBR(i.total)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={i.status} label={invoiceStatusLabel(i.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalLayout>
  );
}
