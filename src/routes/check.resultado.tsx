import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownCircle, ArrowUpCircle, BarChart3, Loader2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { checkFinancialResultFn, checkMeFn } from "@/lib/check.functions";
import { formatMoneyBR } from "@/lib/format";

const opts = {
  queryKey: ["check-financial-result", 3],
  queryFn: () => checkFinancialResultFn({ data: { months: 3 } }),
};

export const Route = createFileRoute("/check/resultado")({
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    try {
      const result = await context.queryClient.ensureQueryData(opts);
      return { me, result, resultLoadError: "" };
    } catch (error) {
      return {
        me,
        result: { canViewFinance: me.canViewFinance, months: [] },
        resultLoadError: error instanceof Error ? error.message : "Nao foi possivel carregar o resultado financeiro.",
      };
    }
  },
  component: CheckResultPage,
});

function CheckResultPage() {
  const initial = Route.useLoaderData();
  const loadResult = useServerFn(checkFinancialResultFn);
  const [monthsRange, setMonthsRange] = useState(3);
  const [result, setResult] = useState(initial.result);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initial.resultLoadError);

  const totals = useMemo(() => {
    const income = result.months.reduce((total, item) => total + Number(item.income || 0), 0);
    const expenses = result.months.reduce((total, item) => total + Number(item.expenses || 0), 0);
    return { income, expenses, result: income - expenses };
  }, [result.months]);

  const changeRange = async (value: number) => {
    setMonthsRange(value);
    setLoading(true);
    setError("");
    try {
      setResult(await loadResult({ data: { months: value } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o resultado financeiro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CheckLayout title="Resultado Financeiro" subtitle="Entradas do WHMCS, saidas do Contas a Pagar e resultado mensal." userName={initial.me.name}>
      {!result.canViewFinance ? (
        <section className="card-soft p-8 text-center text-sm text-muted-foreground">
          Seu usuário não tem permissão para visualizar o financeiro.
        </section>
      ) : (
        <div className="space-y-6">
          {error && (
            <section className="card-soft border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Entradas" value={formatMoneyBR(totals.income)} icon={<ArrowUpCircle className="h-5 w-5" />} variant="success" />
            <SummaryCard label="Saídas" value={formatMoneyBR(totals.expenses)} icon={<ArrowDownCircle className="h-5 w-5" />} variant="danger" />
            <SummaryCard label="Resultado" value={formatMoneyBR(totals.result)} icon={<TrendingUp className="h-5 w-5" />} variant={totals.result < 0 ? "danger" : "success"} />
          </section>

          <section className="card-soft overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <h2 className="text-base font-bold">Resultado por mês</h2>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Período</span>
                <select
                  value={monthsRange}
                  onChange={(event) => changeRange(Number(event.target.value))}
                  className="h-10 rounded-md border border-input bg-background px-3 outline-none focus:border-brand"
                >
                  <option value={3}>Últimos 3 meses</option>
                  <option value={6}>Últimos 6 meses</option>
                  <option value={12}>Últimos 12 meses</option>
                  <option value={24}>Últimos 24 meses</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando resultado...
              </div>
            ) : result.months.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      {["Mês", "Entradas", "Saídas", "Resultado"].map((header) => (
                        <th key={header} className="px-5 py-3 text-left font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.months.map((month) => (
                      <tr key={month.key} className="hover:bg-muted/40">
                        <td className="px-5 py-4 font-medium capitalize">{month.label}</td>
                        <td className="px-5 py-4 font-semibold text-emerald-700">{formatMoneyBR(month.income)}</td>
                        <td className="px-5 py-4 font-semibold text-red-700">{formatMoneyBR(month.expenses)}</td>
                        <td className={`px-5 py-4 font-bold ${month.result < 0 ? "text-red-700" : "text-emerald-700"}`}>
                          {formatMoneyBR(month.result)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </CheckLayout>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "danger";
}) {
  const iconClass = variant === "success" ? "bg-emerald-100 text-emerald-700" : variant === "danger" ? "bg-red-100 text-red-700" : "bg-secondary text-foreground";
  const valueClass = variant === "success" ? "text-emerald-700" : variant === "danger" ? "text-red-700" : "text-foreground";
  return (
    <div className="card-soft flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-2 whitespace-nowrap text-2xl font-bold ${valueClass}`}>{value}</p>
      </div>
      <div className={`rounded-md p-3 ${iconClass}`}>{icon}</div>
    </div>
  );
}
