import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { checkListDomainsFn, checkMeFn } from "@/lib/check.functions";
import { formatDateBR } from "@/lib/format";

const opts = {
  queryKey: ["check-domains"],
  queryFn: () => checkListDomainsFn(),
};

export const Route = createFileRoute("/check/dominios")({
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    const domains = await context.queryClient.ensureQueryData(opts);
    return { me, domains };
  },
  component: CheckDomainsPage,
});

function CheckDomainsPage() {
  const { me, domains } = Route.useLoaderData();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const statuses = Array.from(new Set(domains.map((domain) => domain.status).filter(Boolean))).sort();
  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    return domains.filter((domain) => {
      const haystack = [domain.domain, domain.registrar, domain.regtype, domain.status, domain.regdate, domain.expirydate]
        .join(" ")
        .toLowerCase();
      return (!q || haystack.includes(q)) && (!status || domain.status === status);
    });
  }, [domains, status, term]);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedDomains = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);

  return (
    <CheckLayout title="Domínios" subtitle="Registro e vencimento dos domínios no WHMCS." userName={me.name}>
      <section className="card-soft mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="Filtrar por domínio, registrador ou tipo de registro"
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
                {item}
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
                <th className="px-5 py-3 text-left font-medium">Registro</th>
                <th className="px-5 py-3 text-left font-medium">Registrador</th>
                <th className="px-5 py-3 text-left font-medium">Vencimento</th>
                <th className="px-5 py-3 text-left font-medium">Recursos</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedDomains.map((domain) => (
                <tr key={domain.id} className="hover:bg-muted/40">
                  <td className="px-5 py-4 font-semibold">{domain.domain}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <div>{domain.regtype || "—"}</div>
                    <div className="text-xs">Criado em {formatDateBR(domain.regdate)}</div>
                  </td>
                  <td className="px-5 py-4">{domain.registrar || "—"}</td>
                  <td className="px-5 py-4">{formatDateBR(domain.expirydate)}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    <div>DNS: {domain.dnsmanagement === "1" ? "Sim" : "Não"}</div>
                    <div>ID Protect: {domain.idprotection === "1" ? "Sim" : "Não"}</div>
                    <div>Não renovar: {domain.donotrenew === "1" ? "Sim" : "Não"}</div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={domain.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando {pageStart}-{pageEnd} de {filtered.length} domínios
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
    </CheckLayout>
  );
}
