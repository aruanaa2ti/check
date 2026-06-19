import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle, Loader2, Plus, RotateCcw, WalletCards, X, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { checkMeFn } from "@/lib/check.functions";
import {
  createPayableFn,
  listPayablesFn,
  listSupplierCategoriesFn,
  listSuppliersFn,
  updatePayableStatusFn,
} from "@/lib/payables.functions";
import { formatDateBR, formatMoneyBR } from "@/lib/format";

const opts = {
  queryKey: ["check-payables"],
  queryFn: async () => {
    const [payables, suppliers, categories] = await Promise.all([
      listPayablesFn(),
      listSuppliersFn(),
      listSupplierCategoriesFn(),
    ]);
    return { payables, suppliers, categories };
  },
};

const statusLabels = {
  open: "Aberta",
  paid: "Paga",
  overdue: "Vencida",
  cancelled: "Cancelada",
} as Record<string, string>;

const recurrenceLabels = {
  none: "Unica",
  monthly: "Mensal",
  yearly: "Anual",
} as Record<string, string>;

export const Route = createFileRoute("/check/contas-a-pagar")({
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    try {
      const data = await context.queryClient.ensureQueryData(opts);
      return { me, ...data, payablesLoadError: "" };
    } catch (error) {
      return {
        me,
        payables: [],
        suppliers: [],
        categories: [],
        payablesLoadError: error instanceof Error ? error.message : "Nao foi possivel carregar as contas a pagar.",
      };
    }
  },
  component: CheckPayablesPage,
});

function CheckPayablesPage() {
  const initial = Route.useLoaderData();
  const createPayable = useServerFn(createPayableFn);
  const updateStatus = useServerFn(updatePayableStatusFn);
  const [payables, setPayables] = useState(initial.payables);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    return payables.filter((payable) => {
      const haystack = [
        payable.description,
        payable.supplierName,
        payable.categoryName,
        payable.status,
        payable.dueDate,
        payable.paymentMethod,
      ].join(" ").toLowerCase();
      return (
        (!q || haystack.includes(q)) &&
        (!status || payable.status === status) &&
        isIsoDateInRange(payable.dueDate, dateFrom, dateTo)
      );
    });
  }, [dateFrom, dateTo, payables, status, term]);

  const totals = useMemo(() => {
    const open = payables.filter((item) => item.status === "open" || item.status === "overdue");
    const paid = payables.filter((item) => item.status === "paid");
    return {
      open: open.reduce((total, item) => total + Number(item.amount), 0),
      paid: paid.reduce((total, item) => total + Number(item.amount), 0),
      overdue: payables.filter((item) => item.status === "overdue").reduce((total, item) => total + Number(item.amount), 0),
    };
  }, [payables]);

  const refresh = async () => setPayables(await listPayablesFn());

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await createPayable({
        data: {
          supplierId: Number(form.get("supplierId") || 0) || undefined,
          categoryId: Number(form.get("categoryId") || 0) || undefined,
          description: String(form.get("description") || ""),
          amount: Number(String(form.get("amount") || "0").replace(",", ".")),
          dueDate: String(form.get("dueDate") || ""),
          competency: String(form.get("competency") || ""),
          recurrence: String(form.get("recurrence") || "none") as "none" | "monthly" | "yearly",
          paymentMethod: String(form.get("paymentMethod") || ""),
          notes: String(form.get("notes") || ""),
        },
      });
      await refresh();
      event.currentTarget.reset();
      setNewAccountOpen(false);
      setNotice("Conta cadastrada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar a conta.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: number, nextStatus: "paid" | "cancelled" | "open") => {
    setActionId(id);
    setNotice("");
    setError("");
    try {
      await updateStatus({ data: { id, status: nextStatus } });
      await refresh();
      setNotice("Status atualizado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar a conta.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <CheckLayout title="Contas a Pagar" subtitle="Controle interno de pagamentos e vencimentos." userName={initial.me.name}>
      <div className="space-y-6">
        {initial.payablesLoadError && (
          <section className="card-soft border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {initial.payablesLoadError}
          </section>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Em aberto" value={formatMoneyBR(totals.open)} />
          <SummaryCard label="Vencido" value={formatMoneyBR(totals.overdue)} danger />
          <SummaryCard label="Pago" value={formatMoneyBR(totals.paid)} />
        </section>

        <section className="card-soft overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <WalletCards className="h-4 w-4" />
              <h2 className="text-base font-bold">Contas</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
                setNewAccountOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark"
            >
              <Plus className="h-4 w-4" />
              Nova Conta
            </button>
          </div>
          {(notice || error) && (
            <div className={`border-b px-5 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {error || notice}
            </div>
          )}
          <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[1fr_180px_180px_220px]">
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder="Filtrar por descrição, fornecedor, categoria ou vencimento"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              aria-label="Data inicial"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              aria-label="Data final"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">Todos os status</option>
              <option value="open">Abertas</option>
              <option value="overdue">Vencidas</option>
              <option value="paid">Pagas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Descrição", "Fornecedor", "Vencimento", "Valor", "Status", "Recorrência", "Ações"].map((header) => (
                      <th key={header} className="px-5 py-3 text-left font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((payable) => (
                    <tr key={payable.id} className="hover:bg-muted/40">
                      <td className="px-5 py-4">
                        <div className="font-medium">{payable.description}</div>
                        <div className="text-xs text-muted-foreground">{payable.categoryName || "Sem categoria"}</div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{payable.supplierName || "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{formatDateBR(payable.dueDate)}</td>
                      <td className="px-5 py-4 font-semibold">{formatMoneyBR(payable.amount)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(payable.status)}`}>
                          {statusLabels[payable.status] || payable.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{recurrenceLabels[payable.recurrence] || payable.recurrence}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {payable.status !== "paid" && payable.status !== "cancelled" && (
                            <IconButton title="Marcar como paga" disabled={actionId === payable.id} onClick={() => changeStatus(payable.id, "paid")}>
                              {actionId === payable.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            </IconButton>
                          )}
                          {payable.status !== "cancelled" && (
                            <IconButton title="Cancelar" disabled={actionId === payable.id} onClick={() => changeStatus(payable.id, "cancelled")}>
                              <XCircle className="h-4 w-4" />
                            </IconButton>
                          )}
                          {(payable.status === "paid" || payable.status === "cancelled") && (
                            <IconButton title="Reabrir" disabled={actionId === payable.id} onClick={() => changeStatus(payable.id, "open")}>
                              <RotateCcw className="h-4 w-4" />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {newAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4" />
                <h2 className="text-base font-bold">Nova Conta</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) setNewAccountOpen(false);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={onSubmit} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Descrição" name="description" required />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Fornecedor</span>
                <select name="supplierId" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="">Sem fornecedor</option>
                  {initial.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Categoria</span>
                <select name="categoryId" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="">Sem categoria</option>
                  {initial.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <Field label="Valor" name="amount" type="number" step="0.01" required />
              <Field label="Vencimento" name="dueDate" type="date" required />
              <Field label="Competência" name="competency" type="date" />
              <Field label="Forma de pagamento" name="paymentMethod" />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Recorrência</span>
                <select name="recurrence" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="none">Unica</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Observações</span>
                  <input name="notes" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand" />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4 md:col-span-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setNewAccountOpen(false)}
                  className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Cadastrar conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CheckLayout>
  );
}

function Header({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-4">
      {icon}
      <h2 className="text-base font-bold">{title}</h2>
    </div>
  );
}

function SummaryCard({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="card-soft p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${danger ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
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

function IconButton({ title, disabled, onClick, children }: { title: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function statusClass(status: string) {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "overdue") return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-muted text-muted-foreground";
  return "bg-amber-100 text-amber-700";
}

function isIsoDateInRange(value: string, from: string, to: string) {
  if (!from && !to) return true;
  if (!value) return false;
  return (!from || value >= from) && (!to || value <= to);
}
