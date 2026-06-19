import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCheckUser } from "./session.server";
import { mysqlExec, mysqlQuery } from "./mysql.server";

function canManagePayables(user: { adminId?: number; permissions?: string; role?: string; roleId?: number }) {
  if (Number(user.roleId ?? 0) === 1 || Number(user.adminId ?? 0) === 1) return true;
  const value = `${user.role ?? ""} ${user.permissions ?? ""}`.toLowerCase();
  return ["full administrator", "administrator", "manage invoices", "view invoices", "faturas", "finance"].some((item) =>
    value.includes(item),
  );
}

async function requirePayablesUser() {
  const user = await requireCheckUser();
  if (!canManagePayables(user)) {
    throw new Error("Seu usuario nao tem permissao para acessar contas a pagar.");
  }
  return user;
}

const numberFromForm = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}, z.number());

export const listSupplierCategoriesFn = createServerFn({ method: "GET" }).handler(async () => {
  await requirePayablesUser();
  return mysqlQuery<{ id: number; name: string; color: string | null }>(
    "SELECT id, name, color FROM a2_supplier_categories ORDER BY name",
  );
});

export const createSupplierCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2, "Informe o nome da categoria."),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requirePayablesUser();
    const result: any = await mysqlExec(
      "INSERT INTO a2_supplier_categories (name) VALUES (:name)",
      { name: data.name },
    );
    return { ok: true, id: Number(result.insertId ?? 0) };
  });

export const listPaymentMethodsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requirePayablesUser();
  return mysqlQuery<{ id: number; name: string; status: "active" | "inactive" }>(
    "SELECT id, name, status FROM a2_payment_methods WHERE status = 'active' ORDER BY name",
  );
});

export const createPaymentMethodFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2, "Informe o nome da forma de pagamento."),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requirePayablesUser();
    const result: any = await mysqlExec(
      "INSERT INTO a2_payment_methods (name) VALUES (:name)",
      { name: data.name },
    );
    return { ok: true, id: Number(result.insertId ?? 0) };
  });

export const listSuppliersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requirePayablesUser();
  return mysqlQuery<{
    id: number;
    categoryId: number | null;
    categoryName: string | null;
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    pixKey: string | null;
    status: "active" | "inactive";
    notes: string | null;
  }>(`
    SELECT
      s.id,
      s.category_id AS categoryId,
      c.name AS categoryName,
      s.name,
      s.document,
      s.email,
      s.phone,
      s.whatsapp,
      s.pix_key AS pixKey,
      s.status,
      s.notes
    FROM a2_suppliers s
    LEFT JOIN a2_supplier_categories c ON c.id = s.category_id
    ORDER BY s.name
  `);
});

export const createSupplierFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        categoryId: numberFromForm.optional(),
        name: z.string().trim().min(2),
        document: z.string().trim().optional(),
        email: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        whatsapp: z.string().trim().optional(),
        pixKey: z.string().trim().optional(),
        status: z.enum(["active", "inactive"]).default("active"),
        notes: z.string().trim().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requirePayablesUser();
    const result: any = await mysqlExec(
      `INSERT INTO a2_suppliers
        (category_id, name, document, email, phone, whatsapp, pix_key, status, notes)
       VALUES
        (:categoryId, :name, :document, :email, :phone, :whatsapp, :pixKey, :status, :notes)`,
      {
        categoryId: data.categoryId || null,
        name: data.name,
        document: data.document || null,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        pixKey: data.pixKey || null,
        status: data.status,
        notes: data.notes || `Criado por ${user.email}`,
      },
    );
    return { ok: true, id: Number(result.insertId ?? 0) };
  });

export const updateSupplierFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.number().int().positive(),
        categoryId: numberFromForm.optional(),
        name: z.string().trim().min(2),
        document: z.string().trim().optional(),
        email: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        whatsapp: z.string().trim().optional(),
        pixKey: z.string().trim().optional(),
        status: z.enum(["active", "inactive"]).default("active"),
        notes: z.string().trim().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requirePayablesUser();
    await mysqlExec(
      `UPDATE a2_suppliers
       SET category_id = :categoryId,
           name = :name,
           document = :document,
           email = :email,
           phone = :phone,
           whatsapp = :whatsapp,
           pix_key = :pixKey,
           status = :status,
           notes = :notes
       WHERE id = :id`,
      {
        id: data.id,
        categoryId: data.categoryId || null,
        name: data.name,
        document: data.document || null,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        pixKey: data.pixKey || null,
        status: data.status,
        notes: data.notes || null,
      },
    );
    return { ok: true };
  });

export const listPayablesFn = createServerFn({ method: "GET" }).handler(async () => {
  await requirePayablesUser();
  return mysqlQuery<{
    id: number;
    supplierId: number | null;
    supplierName: string | null;
    categoryName: string | null;
    description: string;
    amount: number;
    dueDate: string;
    competency: string | null;
    status: "open" | "paid" | "overdue" | "cancelled";
    recurrence: "none" | "monthly" | "yearly";
    paymentMethodId: number | null;
    paymentMethod: string | null;
    paidAt: string | null;
    notes: string | null;
  }>(`
    SELECT
      p.id,
      p.supplier_id AS supplierId,
      s.name AS supplierName,
      c.name AS categoryName,
      p.description,
      p.amount,
      DATE_FORMAT(p.due_date, '%Y-%m-%d') AS dueDate,
      DATE_FORMAT(p.competency, '%Y-%m-%d') AS competency,
      CASE
        WHEN p.status = 'open' AND p.due_date < CURDATE() THEN 'overdue'
        ELSE p.status
      END AS status,
      p.recurrence,
      p.payment_method_id AS paymentMethodId,
      COALESCE(pm.name, p.payment_method) AS paymentMethod,
      DATE_FORMAT(p.paid_at, '%Y-%m-%d') AS paidAt,
      p.notes
    FROM a2_payables p
    LEFT JOIN a2_suppliers s ON s.id = p.supplier_id
    LEFT JOIN a2_supplier_categories c ON c.id = p.category_id
    LEFT JOIN a2_payment_methods pm ON pm.id = p.payment_method_id
    ORDER BY p.due_date ASC, p.id DESC
  `);
});

export const createPayableFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        supplierId: numberFromForm.optional(),
        categoryId: numberFromForm.optional(),
        description: z.string().trim().min(2),
        amount: numberFromForm.refine((value) => value > 0, "Valor deve ser maior que zero."),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        competency: z.string().optional(),
        recurrence: z.enum(["none", "monthly", "yearly"]).default("none"),
        paymentMethodId: numberFromForm.optional(),
        paymentMethod: z.string().trim().optional(),
        notes: z.string().trim().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requirePayablesUser();
    const result: any = await mysqlExec(
      `INSERT INTO a2_payables
        (supplier_id, category_id, description, amount, due_date, competency, recurrence, payment_method_id, payment_method, notes, created_by)
       VALUES
        (:supplierId, :categoryId, :description, :amount, :dueDate, :competency, :recurrence, :paymentMethodId, :paymentMethod, :notes, :createdBy)`,
      {
        supplierId: data.supplierId || null,
        categoryId: data.categoryId || null,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        competency: data.competency || null,
        recurrence: data.recurrence,
        paymentMethodId: data.paymentMethodId || null,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        createdBy: user.email,
      },
    );
    return { ok: true, id: Number(result.insertId ?? 0) };
  });

export const updatePayableStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.number().int().positive(),
        status: z.enum(["paid", "cancelled", "open"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requirePayablesUser();
    await mysqlExec(
      `UPDATE a2_payables
       SET status = :status,
           paid_at = CASE WHEN :status = 'paid' THEN CURDATE() WHEN :status = 'open' THEN NULL ELSE paid_at END,
           paid_by = CASE WHEN :status = 'paid' THEN :userEmail WHEN :status = 'open' THEN NULL ELSE paid_by END
       WHERE id = :id`,
      { id: data.id, status: data.status, userEmail: user.email },
    );
    await mysqlExec(
      "INSERT INTO a2_payable_activity (payable_id, actor, action) VALUES (:id, :actor, :action)",
      { id: data.id, actor: user.email, action: data.status },
    );
    return { ok: true };
  });
