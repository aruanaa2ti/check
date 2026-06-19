import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Loader2, Plus } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { checkMeFn } from "@/lib/check.functions";
import { createSupplierFn, listSupplierCategoriesFn, listSuppliersFn } from "@/lib/payables.functions";

const opts = {
  queryKey: ["check-suppliers"],
  queryFn: async () => {
    const [suppliers, categories] = await Promise.all([listSuppliersFn(), listSupplierCategoriesFn()]);
    return { suppliers, categories };
  },
};

export const Route = createFileRoute("/check/fornecedores")({
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    try {
      const data = await context.queryClient.ensureQueryData(opts);
      return { me, ...data, suppliersLoadError: "" };
    } catch (error) {
      return {
        me,
        suppliers: [],
        categories: [],
        suppliersLoadError: error instanceof Error ? error.message : "Nao foi possivel carregar os fornecedores.",
      };
    }
  },
  component: CheckSuppliersPage,
});

function CheckSuppliersPage() {
  const initial = Route.useLoaderData();
  const createSupplier = useServerFn(createSupplierFn);
  const [suppliers, setSuppliers] = useState(initial.suppliers);
  const [term, setTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    return suppliers.filter((supplier) => {
      const haystack = [
        supplier.name,
        supplier.document,
        supplier.email,
        supplier.phone,
        supplier.whatsapp,
        supplier.categoryName,
        supplier.status,
      ].join(" ").toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [suppliers, term]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await createSupplier({
        data: {
          categoryId: Number(form.get("categoryId") || 0) || undefined,
          name: String(form.get("name") || ""),
          document: String(form.get("document") || ""),
          email: String(form.get("email") || ""),
          phone: String(form.get("phone") || ""),
          whatsapp: String(form.get("whatsapp") || ""),
          pixKey: String(form.get("pixKey") || ""),
          notes: String(form.get("notes") || ""),
        },
      });
      setSuppliers(await listSuppliersFn());
      event.currentTarget.reset();
      setNotice("Fornecedor cadastrado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o fornecedor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CheckLayout title="Fornecedores" subtitle="Cadastro interno de fornecedores." userName={initial.me.name}>
      <div className="space-y-6">
        {initial.suppliersLoadError && (
          <section className="card-soft border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {initial.suppliersLoadError}
          </section>
        )}
        <section className="card-soft overflow-hidden">
          <Header icon={<Building2 className="h-4 w-4" />} title="Novo fornecedor" />
          {(notice || error) && (
            <div className={`border-b px-5 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {error || notice}
            </div>
          )}
          <form onSubmit={onSubmit} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Nome/Razão social" name="name" required />
            <Field label="CPF/CNPJ" name="document" />
            <Field label="E-mail" name="email" type="email" />
            <Field label="Telefone" name="phone" />
            <Field label="WhatsApp" name="whatsapp" />
            <Field label="Chave Pix" name="pixKey" />
            <label className="text-sm">
              <span className="mb-1 block font-medium">Categoria</span>
              <select name="categoryId" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand">
                <option value="">Sem categoria</option>
                {initial.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Observações" name="notes" />
            <div className="md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Cadastrar fornecedor
              </button>
            </div>
          </form>
        </section>

        <section className="card-soft overflow-hidden">
          <Header icon={<Building2 className="h-4 w-4" />} title="Fornecedores" />
          <div className="border-b border-border p-4">
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder="Filtrar por nome, documento, e-mail, telefone ou categoria"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum fornecedor encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Fornecedor", "Categoria", "Contato", "Documento", "Pix", "Status"].map((header) => (
                      <th key={header} className="px-5 py-3 text-left font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-muted/40">
                      <td className="px-5 py-4 font-medium">{supplier.name}</td>
                      <td className="px-5 py-4 text-muted-foreground">{supplier.categoryName || "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <div>{supplier.email || "—"}</div>
                        <div className="text-xs">{supplier.whatsapp || supplier.phone || ""}</div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{supplier.document || "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{supplier.pixKey || "—"}</td>
                      <td className="px-5 py-4">{supplier.status === "active" ? "Ativo" : "Inativo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
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

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-brand"
      />
    </label>
  );
}
