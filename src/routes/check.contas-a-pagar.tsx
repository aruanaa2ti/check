import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, CheckCircle, Eye, Loader2, Pencil, Plus, RotateCcw, WalletCards, X, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { checkMeFn } from "@/lib/check.functions";
import {
  createPaymentMethodFn,
  createPayableFn,
  createRecurringPayableFn,
  listPayablesFn,
  listPaymentMethodsFn,
  listRecurringPayablesFn,
  listSupplierCategoriesFn,
  listSuppliersFn,
  settlePayableFn,
  updatePayableFn,
  updateRecurringPayableFn,
  updateRecurringPayableStatusFn,
  updatePayableStatusFn,
} from "@/lib/payables.functions";
import { formatDateBR, formatMoneyBR } from "@/lib/format";

const opts = {
  queryKey: ["check-payables"],
  queryFn: async () => {
    const [payables, suppliers, categories, paymentMethods, recurringRules] = await Promise.all([
      listPayablesFn(),
      listSuppliersFn(),
      listSupplierCategoriesFn(),
      listPaymentMethodsFn(),
      listRecurringPayablesFn(),
    ]);
    return { payables, suppliers, categories, paymentMethods, recurringRules };
  },
};

const statusLabels = {
  open: "Aberta",
  paid: "Paga",
  overdue: "Vencida",
  cancelled: "Cancelada",
} as Record<string, string>;

const recurrenceLabels = {
  monthly: "Mensal",
  yearly: "Anual",
} as Record<string, string>;

const valueTypeLabels = {
  fixed: "Fixo",
  variable: "Variavel",
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
        paymentMethods: [],
        recurringRules: [],
        payablesLoadError: error instanceof Error ? error.message : "Nao foi possivel carregar as contas a pagar.",
      };
    }
  },
  component: CheckPayablesPage,
});

function CheckPayablesPage() {
  const initial = Route.useLoaderData();
  const createPayable = useServerFn(createPayableFn);
  const createPaymentMethod = useServerFn(createPaymentMethodFn);
  const createRecurringPayable = useServerFn(createRecurringPayableFn);
  const updatePayable = useServerFn(updatePayableFn);
  const updateRecurringPayable = useServerFn(updateRecurringPayableFn);
  const updateRecurringStatus = useServerFn(updateRecurringPayableStatusFn);
  const settlePayable = useServerFn(settlePayableFn);
  const updateStatus = useServerFn(updatePayableStatusFn);
  const [payables, setPayables] = useState(initial.payables);
  const [recurringRules, setRecurringRules] = useState(initial.recurringRules);
  const [paymentMethods, setPaymentMethods] = useState(initial.paymentMethods);
  const [activeTab, setActiveTab] = useState<"accounts" | "recurring">("accounts");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<(typeof initial.payables)[number] | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<(typeof initial.recurringRules)[number] | null>(null);
  const [settlingPayable, setSettlingPayable] = useState<(typeof initial.payables)[number] | null>(null);
  const [viewingSettlement, setViewingSettlement] = useState<(typeof initial.payables)[number] | null>(null);
  const [newPaymentMethodOpen, setNewPaymentMethodOpen] = useState(false);
  const [newPaymentMethodName, setNewPaymentMethodName] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);
  const [settlePaidAt, setSettlePaidAt] = useState(formatInputDate(new Date()));
  const [settleInterest, setSettleInterest] = useState("R$ 0,00");
  const [settleDiscount, setSettleDiscount] = useState("R$ 0,00");
  const [settlePaymentMethodId, setSettlePaymentMethodId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const settlementBaseAmount = settlingPayable ? Number(settlingPayable.amount || 0) : 0;
  const settlementInterestAmount = parseMoneyBR(settleInterest);
  const settlementDiscountAmount = parseMoneyBR(settleDiscount);
  const settlementPaidAmount = Math.max(settlementBaseAmount + settlementInterestAmount - settlementDiscountAmount, 0);
  const viewedPaidAmount = viewingSettlement
    ? Number(viewingSettlement.paidAmount || 0) || Math.max(Number(viewingSettlement.amount || 0) + Number(viewingSettlement.interestAmount || 0) - Number(viewingSettlement.discountAmount || 0), 0)
    : 0;

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

  const filteredRecurring = useMemo(() => {
    const q = term.toLowerCase().trim();
    return recurringRules.filter((rule) => {
      const haystack = [
        rule.description,
        rule.supplierName,
        rule.categoryName,
        rule.paymentMethod,
        rule.status,
        rule.valueType,
        String(rule.dueDay),
      ].join(" ").toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [recurringRules, term]);

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
  const refreshRecurring = async () => setRecurringRules(await listRecurringPayablesFn());

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const payload = {
      supplierId: Number(form.get("supplierId") || 0) || undefined,
      categoryId: Number(form.get("categoryId") || 0) || undefined,
      description: String(form.get("description") || ""),
      amount: parseMoneyBR(String(form.get("amount") || "0")),
      dueDate: String(form.get("dueDate") || ""),
      competency: String(form.get("competency") || ""),
      recurrence: "none" as const,
      paymentMethodId: Number(form.get("paymentMethodId") || 0) || undefined,
      notes: String(form.get("notes") || ""),
    };
    try {
      if (editingPayable) {
        await updatePayable({ data: { id: editingPayable.id, ...payload } });
      } else {
        await createPayable({ data: payload });
      }
      await refresh();
      formEl.reset();
      setSelectedPaymentMethodId("");
      setNewPaymentMethodOpen(false);
      setNewPaymentMethodName("");
      setNewAccountOpen(false);
      setEditingPayable(null);
      setNotice(editingPayable ? "Conta atualizada com sucesso." : "Conta cadastrada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar a conta.");
    } finally {
      setSaving(false);
    }
  };

  const submitRecurring = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const valueType = String(form.get("valueType") || "variable") as "fixed" | "variable";
    const payload = {
      supplierId: Number(form.get("supplierId") || 0) || undefined,
      categoryId: Number(form.get("categoryId") || 0) || undefined,
      paymentMethodId: Number(form.get("paymentMethodId") || 0) || undefined,
      description: String(form.get("description") || ""),
      dueDay: Number(form.get("dueDay") || 0),
      valueType,
      amount: valueType === "fixed" ? parseMoneyBR(String(form.get("amount") || "0")) : undefined,
      recurrence: String(form.get("recurrence") || "monthly") as "monthly" | "yearly",
      notes: String(form.get("notes") || ""),
    };
    try {
      if (editingRecurring) {
        await updateRecurringPayable({ data: { id: editingRecurring.id, ...payload } });
      } else {
        await createRecurringPayable({ data: payload });
      }
      await refreshRecurring();
      formEl.reset();
      setRecurringOpen(false);
      setEditingRecurring(null);
      setNotice(editingRecurring ? "Recorrente atualizado com sucesso." : "Recorrente cadastrado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o recorrente.");
    } finally {
      setSaving(false);
    }
  };

  const openNewAccount = () => {
    setError("");
    setNotice("");
    setEditingPayable(null);
    setSelectedPaymentMethodId("");
    setNewPaymentMethodOpen(false);
    setNewPaymentMethodName("");
    setNewAccountOpen(true);
  };

  const openNewRecurring = () => {
    setError("");
    setNotice("");
    setEditingRecurring(null);
    setRecurringOpen(true);
  };

  const openEditAccount = (payable: (typeof initial.payables)[number]) => {
    setError("");
    setNotice("");
    setEditingPayable(payable);
    setSelectedPaymentMethodId(payable.paymentMethodId ? String(payable.paymentMethodId) : "");
    setNewPaymentMethodOpen(false);
    setNewPaymentMethodName("");
    setNewAccountOpen(true);
  };

  const openEditRecurring = (rule: (typeof initial.recurringRules)[number]) => {
    setError("");
    setNotice("");
    setEditingRecurring(rule);
    setRecurringOpen(true);
  };

  const changeRecurringStatus = async (id: number, nextStatus: "active" | "inactive") => {
    setActionId(id);
    setNotice("");
    setError("");
    try {
      await updateRecurringStatus({ data: { id, status: nextStatus } });
      await refreshRecurring();
      setNotice(nextStatus === "active" ? "Recorrente reativado com sucesso." : "Recorrente desativado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o recorrente.");
    } finally {
      setActionId(null);
    }
  };

  const openSettlement = (payable: (typeof initial.payables)[number]) => {
    setError("");
    setNotice("");
    setSettlingPayable(payable);
    setSettlePaidAt(formatInputDate(new Date()));
    setSettleInterest("R$ 0,00");
    setSettleDiscount("R$ 0,00");
    setSettlePaymentMethodId(payable.paymentMethodId ? String(payable.paymentMethodId) : "");
  };

  const openViewSettlement = (payable: (typeof initial.payables)[number]) => {
    setError("");
    setNotice("");
    setViewingSettlement(payable);
  };

  const submitSettlement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settlingPayable) return;
    setSaving(true);
    setNotice("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await settlePayable({
        data: {
          id: settlingPayable.id,
          paidAt: String(form.get("paidAt") || ""),
          interestAmount: parseMoneyBR(String(form.get("interestAmount") || "0")),
          discountAmount: parseMoneyBR(String(form.get("discountAmount") || "0")),
          paymentMethodId: Number(form.get("paymentMethodId") || 0) || undefined,
          notes: String(form.get("notes") || ""),
        },
      });
      await refresh();
      setSettlingPayable(null);
      setNotice(`Baixa registrada com sucesso. Valor pago: ${formatMoneyBR(result.paidAmount)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar a baixa.");
    } finally {
      setSaving(false);
    }
  };

  const addPaymentMethod = async () => {
    setSavingPaymentMethod(true);
    setNotice("");
    setError("");
    try {
      const result = await createPaymentMethod({ data: { name: newPaymentMethodName } });
      const nextMethods = await listPaymentMethodsFn();
      setPaymentMethods(nextMethods);
      setSelectedPaymentMethodId(String(result.id || nextMethods.find((method) => method.name === newPaymentMethodName.trim())?.id || ""));
      setNewPaymentMethodName("");
      setNewPaymentMethodOpen(false);
      setNotice("Forma de pagamento cadastrada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar a forma de pagamento.");
    } finally {
      setSavingPaymentMethod(false);
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
        {activeTab === "accounts" && (
          <section className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Em aberto" value={formatMoneyBR(totals.open)} />
            <SummaryCard label="Vencido" value={formatMoneyBR(totals.overdue)} variant="danger" />
            <SummaryCard label="Pago" value={formatMoneyBR(totals.paid)} variant="success" />
          </section>
        )}

        <section className="card-soft overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4" />
                <h2 className="text-base font-bold">Contas a Pagar</h2>
              </div>
              <div className="inline-flex w-fit rounded-md border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("accounts")}
                  className={`h-8 rounded px-3 text-xs font-semibold transition ${activeTab === "accounts" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Contas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("recurring")}
                  className={`h-8 rounded px-3 text-xs font-semibold transition ${activeTab === "recurring" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  Recorrentes
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={activeTab === "accounts" ? openNewAccount : openNewRecurring}
              className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              {activeTab === "accounts" ? "Nova Conta" : "Novo Recorrente"}
            </button>
          </div>
          {(notice || error) && (
            <div className={`border-b px-5 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {error || notice}
            </div>
          )}
          <div className={`grid gap-3 border-b border-border p-4 ${activeTab === "accounts" ? "lg:grid-cols-[1fr_280px_220px]" : ""}`}>
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder={activeTab === "accounts" ? "Filtrar por descrição, fornecedor, categoria ou vencimento" : "Filtrar por descrição, fornecedor, categoria, pagamento ou dia"}
            />
            {activeTab === "accounts" && (
              <>
                <DateRangeField from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
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
              </>
            )}
          </div>
          {activeTab === "accounts" && (filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Descrição", "Fornecedor", "Vencimento", "Valor", "Pagamento", "Status", "Ações"].map((header) => (
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
                      <td className="px-5 py-4 text-muted-foreground">{payable.paymentMethod || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(payable.status)}`}>
                          {statusLabels[payable.status] || payable.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {payable.status !== "paid" && payable.status !== "cancelled" && (
                            <IconButton title="Registrar baixa" disabled={actionId === payable.id} onClick={() => openSettlement(payable)}>
                              <CheckCircle className="h-4 w-4" />
                            </IconButton>
                          )}
                          {payable.status === "paid" ? (
                            <IconButton title="Ver baixa" disabled={actionId === payable.id} onClick={() => openViewSettlement(payable)}>
                              <Eye className="h-4 w-4" />
                            </IconButton>
                          ) : (
                            <IconButton title="Editar conta" disabled={actionId === payable.id} onClick={() => openEditAccount(payable)}>
                              <Pencil className="h-4 w-4" />
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
          ))}

          {activeTab === "recurring" && (filteredRecurring.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum recorrente encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Descrição", "Fornecedor", "Dia", "Valor", "Pagamento", "Status", "Ações"].map((header) => (
                      <th key={header} className="px-5 py-3 text-left font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecurring.map((rule) => (
                    <tr key={rule.id} className="hover:bg-muted/40">
                      <td className="px-5 py-4">
                        <div className="font-medium">{rule.description}</div>
                        <div className="text-xs text-muted-foreground">{rule.categoryName || "Sem categoria"}</div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{rule.supplierName || "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">Dia {rule.dueDay}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold">{valueTypeLabels[rule.valueType]}</div>
                        <div className="text-xs text-muted-foreground">{rule.valueType === "fixed" ? formatMoneyBR(rule.amount || 0) : "Informar na baixa"}</div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{rule.paymentMethod || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${rule.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {rule.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <IconButton title="Editar recorrente" disabled={actionId === rule.id} onClick={() => openEditRecurring(rule)}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          {rule.status === "active" ? (
                            <IconButton title="Desativar recorrente" disabled={actionId === rule.id} onClick={() => changeRecurringStatus(rule.id, "inactive")}>
                              <XCircle className="h-4 w-4" />
                            </IconButton>
                          ) : (
                            <IconButton title="Reativar recorrente" disabled={actionId === rule.id} onClick={() => changeRecurringStatus(rule.id, "active")}>
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
          ))}
        </section>
      </div>

      {newAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4" />
                <h2 className="text-base font-bold">{editingPayable ? "Editar Conta" : "Nova Conta"}</h2>
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
            <form key={editingPayable?.id ?? "new"} onSubmit={onSubmit} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Descrição" name="description" defaultValue={editingPayable?.description ?? ""} required />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Fornecedor</span>
                <select name="supplierId" defaultValue={editingPayable?.supplierId ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="">Sem fornecedor</option>
                  {initial.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Categoria</span>
                <select name="categoryId" defaultValue={editingPayable?.categoryId ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="">Sem categoria</option>
                  {initial.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <Field label="Valor" name="amount" defaultValue={editingPayable ? formatMoneyInput(String(Math.round(Number(editingPayable.amount) * 100))) : "R$ 0,00"} mask={formatMoneyInput} required />
              <Field label="Vencimento" name="dueDate" type="date" defaultValue={editingPayable?.dueDate ?? ""} required />
              <Field label="Competência" name="competency" type="date" defaultValue={editingPayable?.competency ?? ""} />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Forma de pagamento</span>
                <div className="flex gap-2">
                  <select
                    name="paymentMethodId"
                    value={selectedPaymentMethodId}
                    onChange={(event) => setSelectedPaymentMethodId(event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 outline-none focus:border-brand"
                  >
                    <option value="">Selecione</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>{method.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setNewPaymentMethodOpen((value) => !value)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary"
                    title="Nova forma de pagamento"
                    aria-label="Nova forma de pagamento"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {newPaymentMethodOpen && (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newPaymentMethodName}
                      onChange={(event) => setNewPaymentMethodName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (!savingPaymentMethod) void addPaymentMethod();
                        }
                      }}
                      className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 outline-none focus:border-brand"
                      placeholder="Nome da forma"
                    />
                    <button
                      type="button"
                      disabled={savingPaymentMethod}
                      onClick={addPaymentMethod}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60"
                    >
                      {savingPaymentMethod ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Salvar
                    </button>
                  </div>
                )}
              </label>
              <div className="md:col-span-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Observações</span>
                  <input name="notes" defaultValue={editingPayable?.notes ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand" />
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
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPayable ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingPayable ? "Salvar conta" : "Cadastrar conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {recurringOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                <h2 className="text-base font-bold">{editingRecurring ? "Editar Recorrente" : "Novo Recorrente"}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) setRecurringOpen(false);
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
            <form key={editingRecurring?.id ?? "new-recurring"} onSubmit={submitRecurring} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Descrição" name="description" defaultValue={editingRecurring?.description ?? ""} required />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Fornecedor</span>
                <select name="supplierId" defaultValue={editingRecurring?.supplierId ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="">Sem fornecedor</option>
                  {initial.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Categoria</span>
                <select name="categoryId" defaultValue={editingRecurring?.categoryId ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="">Sem categoria</option>
                  {initial.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Forma de pagamento</span>
                <select name="paymentMethodId" defaultValue={editingRecurring?.paymentMethodId ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="">Selecione</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>{method.name}</option>
                  ))}
                </select>
              </label>
              <Field label="Dia do vencimento" name="dueDay" type="number" defaultValue={editingRecurring ? String(editingRecurring.dueDay) : "10"} required />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Tipo de valor</span>
                <select name="valueType" defaultValue={editingRecurring?.valueType ?? "variable"} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="variable">Variável</option>
                  <option value="fixed">Fixo</option>
                </select>
              </label>
              <Field
                label="Valor padrão"
                name="amount"
                defaultValue={editingRecurring?.valueType === "fixed" ? formatMoneyInput(String(Math.round(Number(editingRecurring.amount || 0) * 100))) : "R$ 0,00"}
                mask={formatMoneyInput}
              />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Repetição</span>
                <select name="recurrence" defaultValue={editingRecurring?.recurrence ?? "monthly"} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Observações</span>
                  <input name="notes" defaultValue={editingRecurring?.notes ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand" />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4 md:col-span-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setRecurringOpen(false)}
                  className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRecurring ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingRecurring ? "Salvar recorrente" : "Cadastrar recorrente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <h2 className="text-base font-bold">Baixa da Conta</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingSettlement(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <ReadonlyField label="Descrição" value={viewingSettlement.description} className="md:col-span-2" />
              <ReadonlyField label="Fornecedor" value={viewingSettlement.supplierName || "—"} />
              <ReadonlyField label="Vencimento" value={formatDateBR(viewingSettlement.dueDate)} />
              <ReadonlyMoneyField label="Valor" value={Number(viewingSettlement.amount || 0)} />
              <ReadonlyMoneyField label="Valor Pago" value={viewedPaidAmount} />
            </div>
            <div className="flex justify-end border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setViewingSettlement(null)}
                className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold transition hover:bg-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {settlingPayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <h2 className="text-base font-bold">Baixa de Conta</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) setSettlingPayable(null);
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
            <form onSubmit={submitSettlement} className="grid gap-4 p-5 md:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/30 p-4 md:col-span-2">
                <p className="text-sm font-semibold">{settlingPayable.description}</p>
              </div>
              <Field label="Data do pagamento" name="paidAt" type="date" defaultValue={settlePaidAt} required />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Forma de pagamento</span>
                <select
                  name="paymentMethodId"
                  value={settlePaymentMethodId}
                  onChange={(event) => setSettlePaymentMethodId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand"
                >
                  <option value="">Selecione</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>{method.name}</option>
                  ))}
                </select>
              </label>
              <ReadonlyMoneyField label="Valor" value={settlementBaseAmount} />
              <ReadonlyMoneyField label="Valor Pago" value={settlementPaidAmount} />
              <MoneyField label="Juros" name="interestAmount" value={settleInterest} onChange={setSettleInterest} />
              <MoneyField label="Desconto" name="discountAmount" value={settleDiscount} onChange={setSettleDiscount} />
              <div className="md:col-span-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Observações da baixa</span>
                  <input name="notes" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand" />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4 md:col-span-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setSettlingPayable(null)}
                  className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Registrar baixa
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

function SummaryCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "success" | "danger";
}) {
  return (
    <div className="card-soft p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${variant === "success" ? "text-emerald-700" : variant === "danger" ? "text-red-700" : ""}`}>{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  defaultValue = "",
  mask,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string;
  mask?: (value: string) => string;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        onInput={(event) => {
          if (!mask) return;
          event.currentTarget.value = mask(event.currentTarget.value);
        }}
        required={required}
        className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand"
      />
    </label>
  );
}

function MoneyField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(formatMoneyInput(event.target.value))}
        className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand"
      />
    </label>
  );
}

function ReadonlyMoneyField({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        value={formatMoneyBR(value)}
        readOnly
        tabIndex={-1}
        className="h-10 w-full rounded-md border border-input bg-muted/40 px-3 font-semibold text-foreground outline-none"
      />
    </label>
  );
}

function ReadonlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <label className={`text-sm ${className}`}>
      <span className="mb-1 block font-medium">{label}</span>
      <input
        value={value}
        readOnly
        tabIndex={-1}
        className="h-10 w-full rounded-md border border-input bg-muted/40 px-3 font-semibold text-foreground outline-none"
      />
    </label>
  );
}

function parseMoneyBR(value: string) {
  const digits = value.replace(/\D/g, "");
  return Number(digits || 0) / 100;
}

function formatMoneyInput(value: string) {
  return parseMoneyBR(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
