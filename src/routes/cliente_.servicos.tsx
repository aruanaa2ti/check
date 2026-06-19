import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getServicesFn, meFn } from "@/lib/portal.functions";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { billingCycleLabel, formatDateBR, formatMoneyBR, serviceStatusLabel } from "@/lib/format";
import { Server } from "lucide-react";

const opts = queryOptions({ queryKey: ["services"], queryFn: () => getServicesFn() });
const meOpts = queryOptions({ queryKey: ["me"], queryFn: () => meFn() });

export const Route = createFileRoute("/cliente_/servicos")({
  head: () => ({
    meta: [
      { title: "Cliente | a2 Soluções em T.I." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meOpts);
    if (!me) throw redirect({ to: "/cliente" });
    return context.queryClient.ensureQueryData(opts);
  },
  component: ServicesPage,
});

function ServicesPage() {
  const { data: list } = useSuspenseQuery(opts);
  const { data: me } = useSuspenseQuery(meOpts);
  return (
    <PortalLayout
      title="Meus Serviços"
      subtitle="Acompanhe os serviços contratados e seus status."
      userName={me?.name ?? "Cliente"}
    >
      {list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Serviço</th>
                  <th className="px-6 py-3 text-left font-medium">Domínio</th>
                  <th className="px-6 py-3 text-left font-medium">Vencimento</th>
                  <th className="px-6 py-3 text-left font-medium">Ciclo</th>
                  <th className="px-6 py-3 text-left font-medium">Valor</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Server className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="font-medium">{s.name}</div>
                          {s.serverhostname && (
                            <div className="mt-0.5 max-w-48 truncate font-mono text-xs text-muted-foreground">
                              {s.serverhostname}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{s.domain || "—"}</td>
                    <td className="px-6 py-4">{formatDateBR(s.nextduedate)}</td>
                    <td className="px-6 py-4">{s.billingcycle ? billingCycleLabel(s.billingcycle) : "—"}</td>
                    <td className="px-6 py-4 font-semibold">{formatMoneyBR(s.recurringamount)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.status} label={serviceStatusLabel(s.status)} />
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

function EmptyState() {
  return (
    <div className="card-soft flex flex-col items-center justify-center py-16 text-center">
      <Server className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Nenhum serviço encontrado em sua conta.</p>
    </div>
  );
}
