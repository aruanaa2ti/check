import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getClientDetailsFn, meFn } from "@/lib/portal.functions";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";

const opts = queryOptions({ queryKey: ["client-details"], queryFn: () => getClientDetailsFn() });
const meOpts = queryOptions({ queryKey: ["me"], queryFn: () => meFn() });

export const Route = createFileRoute("/cliente_/meus-dados")({
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
  component: MyDataPage,
});

function MyDataPage() {
  const { data: c } = useSuspenseQuery(opts);
  const { data: me } = useSuspenseQuery(meOpts);

  const fields: Array<{ label: string; value: string }> = [
    { label: "Nome", value: `${c.firstname} ${c.lastname}`.trim() || "—" },
    { label: "Empresa", value: c.companyname || "—" },
    { label: "E-mail", value: c.email || "—" },
    { label: "Telefone", value: c.phonenumber || "—" },
    { label: "Endereço", value: [c.address1, c.address2].filter(Boolean).join(", ") || "—" },
    { label: "Cidade / Estado", value: [c.city, c.state].filter(Boolean).join(" / ") || "—" },
    { label: "CEP", value: c.postcode || "—" },
    { label: "País", value: c.country || "—" },
  ];

  return (
    <PortalLayout
      title="Meus Dados"
      subtitle="Revise seus dados cadastrais no portal."
      userName={me?.name ?? "Cliente"}
    >
      <div className="card-soft overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/40 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Conta</p>
            <h3 className="text-lg font-semibold">{`${c.firstname} ${c.lastname}`.trim() || "Cliente"}</h3>
          </div>
          {c.status && <StatusBadge status={c.status} />}
        </div>
        <dl className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label} className="bg-card px-6 py-5">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</dt>
              <dd className="mt-1 text-sm font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-border bg-muted/30 px-6 py-4 text-xs text-muted-foreground">
          Para atualizar seus dados cadastrais, entre em contato com{" "}
          <a className="text-brand-dark hover:underline" href="mailto:contato@a2ti.com.br">
            contato@a2ti.com.br
          </a>
          .
        </div>
      </div>
    </PortalLayout>
  );
}
