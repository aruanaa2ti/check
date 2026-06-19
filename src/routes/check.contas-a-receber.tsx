import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, ChevronLeft, ChevronRight, Loader2, LoaderCircle, MailCheck, Plus, Receipt, X } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { checkCreateInvoiceFn, checkFinanceOverviewFn, checkListClientsFn, checkMeFn, checkResendInvoiceEmailFn } from "@/lib/check.functions";
import { formatDateBR, formatMoneyBR, invoiceStatusLabel } from "@/lib/format";

const opts = {
  queryKey: ["check-finance"],
  queryFn: () => checkFinanceOverviewFn(),
};

export const Route = createFileRoute("/check/contas-a-receber")({
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    const clients = me.canViewFinance ? await checkListClientsFn().catch(() => []) : [];
    try {
      const finance = await context.queryClient.ensureQueryData(opts);
      return { me, finance, clients, financeLoadError: "" };
    } catch (error) {
      return {
        me,
        clients,
        finance: { canViewFinance: me.canViewFinance, invoices: [], totalReceived: 0 },
        financeLoadError: error instanceof Error ? error.message : "Nao foi possivel carregar as contas a receber.",
      };
    }
  },
  component: CheckFinancePage,
});

function CheckFinancePage() {
  const { me, finance: initialFinance, clients, financeLoadError } = Route.useLoaderData();
  const createInvoice = useServerFn(checkCreateInvoiceFn);
  const [finance, setFinance] = useState(initialFinance);
  const [invoiceTerm, setInvoiceTerm] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [invoiceDateFrom, setInvoiceDateFrom] = useState("");
  const [invoiceDateTo, setInvoiceDateTo] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<number | null>(null);
  const [resendNotice, setResendNotice] = useState("");
  const [resendError, setResendError] = useState("");
  const invoiceStatuses = Array.from(new Set(finance.invoices.map((invoice) => invoice.status).filter(Boolean))).sort();
  const openStatuses = ["Unpaid", "Overdue", "Payment Pending"];
  const openInvoices = finance.invoices.filter((invoice) => openStatuses.includes(invoice.status));
  const paidInvoices = finance.invoices.filter((invoice) => invoice.status === "Paid");
  const overdueInvoices = finance.invoices.filter(isInvoiceOverdue);
  const openTotal = openInvoices.reduce((total, invoice) => total + invoiceAmountDue(invoice), 0);
  const paidTotal = paidInvoices.reduce((total, invoice) => total + invoice.total, 0);
  const totalReceived = Number(finance.totalReceived || 0) || paidTotal;
  const overdueTotal = overdueInvoices.reduce((total, invoice) => total + invoiceAmountDue(invoice), 0);

  const filteredInvoices = useMemo(() => {
    const q = invoiceTerm.toLowerCase().trim();
    return finance.invoices.filter((invoice) => {
      const haystack = [
        invoice.invoiceNum,
        String(invoice.id),
        String(invoice.clientId),
        invoice.clientName,
        invoice.status,
        invoice.date,
        invoice.duedate,
      ].join(" ").toLowerCase();
      const statusMatches = invoiceStatus === "__overdue"
        ? isInvoiceOverdue(invoice)
        : !invoiceStatus || invoice.status === invoiceStatus;
      return (
        (!q || haystack.includes(q)) &&
        statusMatches &&
        isDateInRange(invoice.duedate, invoiceDateFrom, invoiceDateTo)
      );
    });
  }, [finance.invoices, invoiceDateFrom, invoiceDateTo, invoiceStatus, invoiceTerm]);

  const invoicePager = paginate(filteredInvoices, invoicePage, 15);

  const refreshFinance = async () => {
    setFinance(await checkFinanceOverviewFn());
  };

  const createReceivable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingInvoice(true);
    setResendNotice("");
    setResendError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await createInvoice({
        data: {
          clientId: Number(form.get("clientId") || 0),
          description: String(form.get("description") || ""),
          amount: Number(String(form.get("amount") || "0").replace(",", ".")),
          dueDate: String(form.get("dueDate") || ""),
          sendInvoice: form.get("sendInvoice") === "on",
        },
      });
      await refreshFinance();
      event.currentTarget.reset();
      setNewAccountOpen(false);
      setInvoicePage(1);
      setResendNotice(result.message);
    } catch (error) {
      setResendError(error instanceof Error ? error.message : "Nao foi possivel criar a conta no WHMCS.");
    } finally {
      setSavingInvoice(false);
    }
  };

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
    <CheckLayout title="Contas a Receber" subtitle="Faturas e cobranças vindas do WHMCS." userName={me.name}>
      {!finance.canViewFinance ? (
        <section className="card-soft p-8 text-center text-sm text-muted-foreground">
          Seu usuário não tem permissão para visualizar o financeiro.
        </section>
      ) : (
        <div className="space-y-6">
          {financeLoadError && (
            <section className="card-soft border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {financeLoadError}
            </section>
          )}
          <section className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Total Recebido" value={formatMoneyBR(totalReceived)} hint={`${paidInvoices.length} fatura(s) paga(s) listada(s)`} />
            <SummaryCard label="A receber" value={formatMoneyBR(openTotal)} hint={`${openInvoices.length} fatura(s) em aberto`} variant="success" />
            <SummaryCard label="Vencido / em atraso" value={formatMoneyBR(overdueTotal)} hint={`${overdueInvoices.length} fatura(s) vencida(s)`} variant="danger" />
          </section>

          <section className="card-soft overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <h2 className="text-base font-bold">Faturas</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResendError("");
                  setResendNotice("");
                  setNewAccountOpen(true);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" />
                Nova Conta
              </button>
            </div>
            {(resendNotice || resendError) && (
              <div className={`border-b px-5 py-3 text-sm ${resendError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {resendError || resendNotice}
              </div>
            )}
            <div className="border-b border-border p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_280px_220px]">
                <input
                  value={invoiceTerm}
                  onChange={(event) => {
                    setInvoiceTerm(event.target.value);
                    setInvoicePage(1);
                  }}
                  className="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                  placeholder="Filtrar por cliente, fatura, status ou data"
                />
                <DateRangeField
                  from={invoiceDateFrom}
                  to={invoiceDateTo}
                  onFrom={(value) => {
                    setInvoiceDateFrom(value);
                    setInvoicePage(1);
                  }}
                  onTo={(value) => {
                    setInvoiceDateTo(value);
                    setInvoicePage(1);
                  }}
                />
                <select
                  value={invoiceStatus}
                  onChange={(event) => {
                    setInvoiceStatus(event.target.value);
                    setInvoicePage(1);
                  }}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                >
                  <option value="">Todos os status</option>
                  <option value="__overdue">Vencidas</option>
                  {invoiceStatuses.map((item) => (
                    <option key={item} value={item}>
                      {invoiceStatusLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <FinanceTable
              empty="Nenhuma fatura encontrada."
              headers={["Fatura", "Cliente", "Emissão", "Vencimento", "Total", "Saldo", "Status", "Ações"]}
              rows={invoicePager.items.map((invoice) => [
                invoice.invoiceNum || `#${invoice.id}`,
                invoice.clientName || (invoice.clientId ? `Cliente #${invoice.clientId}` : "—"),
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
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <MailCheck className="h-4 w-4" />
                  )}
                </button>,
              ])}
            />
            <Pagination pager={invoicePager} label="faturas" onPage={setInvoicePage} />
          </section>
        </div>
      )}

      {newAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <h2 className="text-base font-bold">Nova Conta</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!savingInvoice) setNewAccountOpen(false);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {resendError && (
              <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                {resendError}
              </div>
            )}
            <form onSubmit={createReceivable} className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium">Cliente WHMCS</span>
                <select name="clientId" required className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyname || `${client.firstname} ${client.lastname}`.trim() || client.email || `Cliente #${client.id}`}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Descrição" name="description" required />
              <Field label="Valor" name="amount" type="number" step="0.01" required />
              <Field label="Vencimento" name="dueDate" type="date" required />
              <label className="flex items-center gap-2 pt-7 text-sm font-medium">
                <input name="sendInvoice" type="checkbox" defaultChecked className="h-4 w-4 rounded border-input" />
                Enviar e-mail pelo WHMCS
              </label>
              <div className="flex justify-end gap-2 border-t border-border pt-4 md:col-span-2">
                <button
                  type="button"
                  disabled={savingInvoice}
                  onClick={() => setNewAccountOpen(false)}
                  className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {savingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Criar conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CheckLayout>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  variant?: "default" | "success" | "danger";
}) {
  return (
    <div className="card-soft p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${variant === "success" ? "text-emerald-700" : variant === "danger" ? "text-red-700" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DateRangeField({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = from || to ? `${from ? formatDateBR(from) : "Inicio"} - ${to ? formatDateBR(to) : "Fim"}` : "Intervalo de vencimento";
  const applyRange = (range: "today" | "week" | "month") => {
    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);

    if (range === "week") {
      const weekday = today.getDay();
      const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
      start.setDate(today.getDate() + mondayOffset);
      end.setDate(start.getDate() + 6);
    }

    if (range === "month") {
      start.setDate(1);
      end.setMonth(today.getMonth() + 1, 0);
    }

    onFrom(formatInputDate(start));
    onTo(formatInputDate(end));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm outline-none transition hover:bg-secondary focus:border-brand focus:ring-2 focus:ring-brand/30"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-20 w-[min(92vw,520px)] rounded-md border border-border bg-card shadow-soft">
          <div className="grid md:grid-cols-[150px_1fr]">
            <div className="border-b border-border bg-muted/40 p-2 md:border-b-0 md:border-r">
              {[
                ["today", "Hoje"],
                ["week", "Essa Semana"],
                ["month", "Esse Mês"],
              ].map(([range, text]) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => applyRange(range as "today" | "week" | "month")}
                  className="flex h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium transition hover:bg-secondary"
                >
                  {text}
                </button>
              ))}
            </div>
            <div className="grid gap-3 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Data inicial
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => onFrom(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="text-xs font-medium text-muted-foreground">
                  Data final
                  <input
                    type="date"
                    value={to}
                    onChange={(event) => onTo(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-brand"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="truncate text-sm text-muted-foreground">{label}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onFrom("");
                      onTo("");
                    }}
                    className="h-9 rounded-md border border-border px-3 text-xs font-semibold transition hover:bg-secondary"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-brand-dark"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function invoiceAmountDue(invoice: { balance: number; total: number }) {
  return invoice.balance > 0 ? invoice.balance : invoice.total;
}

function isInvoiceOverdue(invoice: { duedate: string; status: string }) {
  if (invoice.status === "Overdue") return true;
  if (!["Unpaid", "Payment Pending"].includes(invoice.status)) return false;

  const due = parseInvoiceDate(invoice.duedate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function isDateInRange(value: string, from: string, to: string) {
  if (!from && !to) return true;
  const date = parseInvoiceDate(value);
  if (!date) return false;

  const start = from ? parseInvoiceDate(from) : null;
  const end = to ? parseInvoiceDate(to) : null;
  return (!start || date >= start) && (!end || date <= end);
}

function parseInvoiceDate(value: string) {
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function Field({ label, name, type = "text", step, required = false }: { label: string; name: string; type?: string; step?: string; required?: boolean }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand"
      />
    </label>
  );
}

function FinanceTable({
  empty,
  headers,
  rows,
}: {
  empty: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-5 py-3 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-muted/40">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-5 py-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Pager<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
};

function paginate<T>(items: T[], page: number, pageSize: number): Pager<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, items.length);
  return {
    items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    currentPage,
    totalPages,
    pageStart,
    pageEnd,
    total: items.length,
  };
}

function Pagination<T>({
  pager,
  label,
  onPage,
}: {
  pager: Pager<T>;
  label: string;
  onPage: (page: number | ((page: number) => number)) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Mostrando {pager.pageStart}-{pager.pageEnd} de {pager.total} {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage((value) => Math.max(1, value - 1))}
          disabled={pager.currentPage <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span className="min-w-16 text-center text-xs font-medium">
          {pager.currentPage}/{pager.totalPages}
        </span>
        <button
          onClick={() => onPage((value) => Math.min(pager.totalPages, value + 1))}
          disabled={pager.currentPage >= pager.totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
