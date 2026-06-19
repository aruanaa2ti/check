import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronLeft, ChevronRight, Copy, CreditCard, Loader2, MailCheck, Receipt, Server, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import {
  checkClientContactsFn,
  checkClientOverviewFn,
  checkClientServicesFn,
  checkListClientsFn,
  checkMeFn,
  checkResendInvoiceEmailFn,
} from "@/lib/check.functions";
import { billingCycleLabel, formatDateBR, formatMoneyBR, invoiceStatusLabel, serviceStatusLabel } from "@/lib/format";

const opts = {
  queryKey: ["check-clients"],
  queryFn: () => checkListClientsFn(),
};

export const Route = createFileRoute("/check/clientes")({
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    const clients = await context.queryClient.ensureQueryData(opts);
    return { me, clients };
  },
  component: CheckClientsPage,
});

function CheckClientsPage() {
  const { me, clients } = Route.useLoaderData();
  const loadContacts = useServerFn(checkClientContactsFn);
  const loadServices = useServerFn(checkClientServicesFn);
  const loadOverview = useServerFn(checkClientOverviewFn);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contacts, setContacts] = useState<Awaited<ReturnType<typeof checkClientContactsFn>>>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [servicesClientName, setServicesClientName] = useState("");
  const [services, setServices] = useState<Awaited<ReturnType<typeof checkClientServicesFn>>>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [financeClientName, setFinanceClientName] = useState("");
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof checkClientOverviewFn>> | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const statuses = Array.from(new Set(clients.map((client) => client.status).filter(Boolean))).sort();
  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    return clients.filter((client) => {
      const haystack = [
        client.companyname,
        client.firstname,
        client.lastname,
        client.email,
        client.phonenumber,
        client.status,
      ].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (!status || client.status === status);
    });
  }, [clients, status, term]);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedClients = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);

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

  const openServices = async (clientId: number, clientName: string) => {
    setServicesOpen(true);
    setServicesClientName(clientName);
    setServices([]);
    setServicesError(null);
    setServicesLoading(true);
    try {
      setServices(await loadServices({ data: { clientId } }));
    } catch (err: any) {
      setServicesError(err?.message ?? "Não foi possível carregar os serviços.");
    } finally {
      setServicesLoading(false);
    }
  };

  const openFinance = async (clientId: number, clientName: string) => {
    setFinanceOpen(true);
    setFinanceClientName(clientName);
    setOverview(null);
    setFinanceError(null);
    setFinanceLoading(true);
    try {
      setOverview(await loadOverview({ data: { clientId } }));
    } catch (err: any) {
      setFinanceError(err?.message ?? "Não foi possível carregar o financeiro.");
    } finally {
      setFinanceLoading(false);
    }
  };

  const copyEmail = async (email: string) => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    window.setTimeout(() => setCopiedEmail(null), 1400);
  };

  return (
    <CheckLayout title="Clientes" subtitle="Últimos clientes cadastrados no WHMCS." userName={me.name}>
      <section className="card-soft mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="Filtrar por nome, empresa, e-mail ou telefone"
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
                <th className="px-5 py-3 text-left font-medium">Cliente</th>
                <th className="px-5 py-3 text-left font-medium">E-mail</th>
                <th className="px-5 py-3 text-left font-medium">Telefone</th>
                <th className="px-5 py-3 text-left font-medium">Criado em</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedClients.map((client) => {
                const name = client.companyname || `${client.firstname} ${client.lastname}`.trim() || client.email;
                return (
                  <tr key={client.id} className="hover:bg-muted/40">
                    <td className="px-5 py-4 font-semibold">{name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{client.email}</td>
                    <td className="px-5 py-4 text-muted-foreground">{client.phonenumber || "—"}</td>
                    <td className="px-5 py-4">{formatDateBR(client.datecreated)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          title="Contatos"
                          aria-label="Ver contatos"
                          onClick={() => openContacts(client.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary"
                        >
                          <Users className="h-3.5 w-3.5" />
                        </button>
                        {me.canViewFinance && (
                          <button
                            title="Financeiro"
                            aria-label="Ver financeiro"
                            onClick={() => openFinance(client.id, name)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          title="Serviços"
                          aria-label="Ver serviços"
                          onClick={() => openServices(client.id, name)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary"
                        >
                          <Server className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={filtered.length}
          label="clientes"
          onPage={setPage}
        />
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
      {servicesOpen && (
        <ServicesModal
          clientName={servicesClientName}
          error={servicesError}
          loading={servicesLoading}
          services={services}
          onClose={() => setServicesOpen(false)}
        />
      )}
      {financeOpen && (
        <FinanceModal
          clientName={financeClientName}
          error={financeError}
          loading={financeLoading}
          overview={overview}
          onClose={() => setFinanceOpen(false)}
        />
      )}
    </CheckLayout>
  );
}

function Pagination({
  currentPage,
  totalPages,
  pageStart,
  pageEnd,
  total,
  label,
  onPage,
}: {
  currentPage: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  label: string;
  onPage: (page: number | ((page: number) => number)) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Mostrando {pageStart}-{pageEnd} de {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage((value) => Math.max(1, value - 1))}
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
          onClick={() => onPage((value) => Math.min(totalPages, value + 1))}
          disabled={currentPage >= totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum contato adicional encontrado.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => {
                const name = `${contact.firstname} ${contact.lastname}`.trim() || contact.companyname || contact.email;
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
                              {copiedEmail === contact.email ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
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

function ServicesModal({
  clientName,
  error,
  loading,
  services,
  onClose,
}: {
  clientName: string;
  error: string | null;
  loading: boolean;
  services: Awaited<ReturnType<typeof checkClientServicesFn>>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Serviços do cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">{clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-bold text-foreground transition hover:bg-secondary"
          >
            Fechar
          </button>
        </div>
        <div className="max-h-[66vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Carregando serviços...
            </div>
          ) : error ? (
            <div className="m-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : services.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum serviço encontrado para este cliente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Domínio</th>
                    <th className="px-5 py-3 text-left font-medium">Serviço</th>
                    <th className="px-5 py-3 text-left font-medium">Servidor</th>
                    <th className="px-5 py-3 text-left font-medium">Ciclo</th>
                    <th className="px-5 py-3 text-left font-medium">Vencimento</th>
                    <th className="px-5 py-3 text-left font-medium">Valor</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-muted/40">
                      <td className="px-5 py-4 font-semibold">{service.domain || "—"}</td>
                      <td className="px-5 py-4">{service.name}</td>
                      <td className="px-5 py-4 text-muted-foreground">{service.server || "—"}</td>
                      <td className="px-5 py-4">{service.billingcycle ? billingCycleLabel(service.billingcycle) : "—"}</td>
                      <td className="px-5 py-4">{formatDateBR(service.nextduedate)}</td>
                      <td className="px-5 py-4 font-semibold">{formatMoneyBR(service.recurringAmount)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={service.status} label={serviceStatusLabel(service.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FinanceModal({
  clientName,
  error,
  loading,
  overview,
  onClose,
}: {
  clientName: string;
  error: string | null;
  loading: boolean;
  overview: Awaited<ReturnType<typeof checkClientOverviewFn>> | null;
  onClose: () => void;
}) {
  const invoices = overview?.invoices ?? [];
  const transactions = overview?.transactions ?? [];
  const [sendingInvoiceId, setSendingInvoiceId] = useState<number | null>(null);
  const [resendNotice, setResendNotice] = useState("");
  const [resendError, setResendError] = useState("");

  const resendInvoiceEmail = async (invoiceId: number) => {
    setSendingInvoiceId(invoiceId);
    setResendNotice("");
    setResendError("");
    try {
      const result = await checkResendInvoiceEmailFn({ data: { invoiceId } });
      setResendNotice(result.message);
    } catch (error) {
      setResendError(error instanceof Error ? error.message : "Nao foi possivel reenviar o boleto.");
    } finally {
      setSendingInvoiceId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="max-h-[86vh] w-full max-w-6xl overflow-hidden rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Financeiro do cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">{clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-bold text-foreground transition hover:bg-secondary"
          >
            Fechar
          </button>
        </div>
        <div className="max-h-[66vh] space-y-6 overflow-y-auto p-5">
          {(resendNotice || resendError) && (
            <div className={`rounded-md border px-4 py-3 text-sm ${resendError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {resendError || resendNotice}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Carregando financeiro...
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : overview?.canViewFinance === false ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Seu usuário não tem permissão para visualizar faturas e transações.
            </p>
          ) : (
            <>
              <FinanceTable
                icon={<Receipt className="h-4 w-4" />}
                title="Faturas"
                empty="Nenhuma fatura encontrada para este cliente."
                headers={["Fatura", "Emissão", "Vencimento", "Total", "Saldo", "Status", "Ações"]}
                rows={invoices.map((invoice) => [
                  invoice.invoiceNum || `#${invoice.id}`,
                  formatDateBR(invoice.date),
                  formatDateBR(invoice.duedate),
                  formatMoneyBR(invoice.total),
                  formatMoneyBR(invoice.balance),
                  <StatusBadge key="status" status={invoice.status} label={invoiceStatusLabel(invoice.status)} />,
                  <button
                    key="resend"
                    type="button"
                    title="Reenviar boleto"
                    aria-label={`Reenviar boleto da fatura ${invoice.invoiceNum || `#${invoice.id}`}`}
                    onClick={() => resendInvoiceEmail(invoice.id)}
                    disabled={sendingInvoiceId === invoice.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingInvoiceId === invoice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MailCheck className="h-4 w-4" />
                    )}
                  </button>,
                ])}
              />
              <FinanceTable
                icon={<CreditCard className="h-4 w-4" />}
                title="Transações"
                empty="Nenhuma transação encontrada para este cliente."
                headers={["Data", "Gateway", "Transação", "Fatura", "Entrada", "Taxas"]}
                rows={transactions.map((transaction) => [
                  formatDateBR(transaction.date),
                  transaction.gateway || "—",
                  transaction.transactionId || transaction.description || `#${transaction.id}`,
                  transaction.invoiceId ? `#${transaction.invoiceId}` : "—",
                  formatMoneyBR(transaction.amountIn),
                  formatMoneyBR(transaction.fees),
                ])}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FinanceTable({
  icon,
  title,
  empty,
  headers,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
        {icon}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-muted/40">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
