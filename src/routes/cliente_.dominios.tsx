import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDomainsFn, meFn } from "@/lib/portal.functions";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { formatDateBR, formatMoneyBR } from "@/lib/format";
import { Globe } from "lucide-react";

const opts = queryOptions({ queryKey: ["domains"], queryFn: () => getDomainsFn() });
const meOpts = queryOptions({ queryKey: ["me"], queryFn: () => meFn() });

export const Route = createFileRoute("/cliente_/dominios")({
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meOpts);
    if (!me) throw redirect({ to: "/cliente" });
    return context.queryClient.ensureQueryData(opts);
  },
  component: DomainsPage,
});

function DomainsPage() {
  const { data: list } = useSuspenseQuery(opts);
  const { data: me } = useSuspenseQuery(meOpts);
  return (
    <PortalLayout
      title="Meus Domínios"
      subtitle="Confira os domínios vinculados à sua conta."
      userName={me?.name ?? "Cliente"}
    >
      {list.length === 0 ? (
        <div className="card-soft flex flex-col items-center justify-center py-16 text-center">
          <Globe className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum domínio vinculado à sua conta.</p>
        </div>
      ) : (
        <div className="card-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Domínio</th>
                  <th className="px-6 py-3 text-left font-medium">Registrar</th>
                  <th className="px-6 py-3 text-left font-medium">Registro</th>
                  <th className="px-6 py-3 text-left font-medium">Expira em</th>
                  <th className="px-6 py-3 text-left font-medium">Valor</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-medium">
                        <Globe className="h-4 w-4 text-brand-dark" />
                        {d.domain}
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">{d.registrar || "—"}</td>
                    <td className="px-6 py-4">{formatDateBR(d.registrationdate)}</td>
                    <td className="px-6 py-4">{formatDateBR(d.expirydate)}</td>
                    <td className="px-6 py-4 font-medium">{formatMoneyBR(d.recurringamount)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.status} />
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
