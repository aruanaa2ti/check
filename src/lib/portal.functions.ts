import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { portalSession, requireSessionUser } from "./session.server";
import {
  whmcsBuildSummary,
  whmcsAddClientTicketReply,
  whmcsFindClientByEmail,
  whmcsFindContactByEmail,
  whmcsFindContactById,
  whmcsGetClientDetails,
  whmcsGetClientDomains,
  whmcsGetClientProducts,
  whmcsGetClientTicket,
  whmcsGetInvoice,
  whmcsGetInvoices,
  whmcsGetTickets,
  whmcsInvoiceAccessUrl,
  whmcsOpenTicket,
  whmcsResetPassword,
  whmcsTicketReplies,
  whmcsValidateLogin,
} from "./whmcs.server";

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) =>
    z.object({ email: z.string().email(), password: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const login = await whmcsValidateLogin(data.email, data.password);
    const client = await whmcsFindClientByEmail(data.email);
    const contact =
      client
        ? null
        : (await whmcsFindContactById(login.contactId || login.userId)) ||
          (await whmcsFindContactByEmail(data.email));
    let userId = Number(client?.id ?? contact?.userid ?? contact?.clientid ?? 0);
    const contactId = Number(contact?.id ?? login.contactId ?? 0) || undefined;

    if (!userId && login.userId) {
      try {
        await whmcsGetClientDetails(login.userId);
        userId = login.userId;
      } catch {
        userId = 0;
      }
    }

    if (!userId) {
      throw new Error("Login validado, mas nenhum cliente foi encontrado para este e-mail.");
    }
    const details = await whmcsGetClientDetails(userId);
    const name =
      contact
        ? `${String(contact.firstname ?? "")} ${String(contact.lastname ?? "")}`.trim()
        : String(details.firstname ?? "") + (details.lastname ? " " + details.lastname : "");
    const s = await portalSession();
    await s.update({ userId, contactId, email: data.email, name: name || data.email });
    return { ok: true, userId, contactId, name };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const s = await portalSession();
  await s.clear();
  return { ok: true };
});

export const resetPasswordFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) =>
    z.object({ email: z.string().email() }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      await whmcsResetPassword(data.email);
    } catch (error) {
      console.error("WHMCS ResetPassword failed", error);
    }
    return { ok: true };
  });

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  const s = await portalSession();
  if (!s.data?.userId) return null;
  return {
    userId: s.data.userId,
    contactId: s.data.contactId,
    email: s.data.email ?? "",
    name: s.data.name ?? "Cliente",
  };
});

export const getDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireSessionUser();
  const [summary, details] = await Promise.all([
    whmcsBuildSummary(me.userId),
    whmcsGetClientDetails(me.userId),
  ]);
  const recent = await whmcsGetInvoices(me.userId, undefined, 5);
  return {
    me,
    summary,
    client: {
      firstname: String(details.firstname ?? ""),
      lastname: String(details.lastname ?? ""),
      companyname: String(details.companyname ?? ""),
      email: String(details.email ?? ""),
      status: String(details.status ?? ""),
    },
    recentInvoices: recent.map((i: any) => ({
      id: Number(i.id),
      duedate: String(i.duedate ?? ""),
      total: Number(i.total ?? 0),
      status: String(i.status ?? ""),
    })),
  };
});

export const getServicesFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireSessionUser();
  const list = await whmcsGetClientProducts(me.userId, 100);
  return list.filter((p: any) => !p.userid || Number(p.userid) === me.userId).map((p: any) => ({
    id: Number(p.id),
    name: String(p.name ?? p.productname ?? "Serviço"),
    domain: String(p.domain ?? ""),
    status: String(p.status ?? ""),
    nextduedate: String(p.nextduedate ?? p.nextinvoicedate ?? p.overidesuspenduntil ?? ""),
    billingcycle: String(p.billingcycle ?? ""),
    recurringamount: Number(p.recurringamount ?? p.amount ?? 0),
    serverhostname: String(p.serverhostname ?? p.servername ?? ""),
  }));
});

export const getTicketsFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireSessionUser();
  const list = await whmcsGetTickets(me.userId, 100);
  return list.map((t: any) => ({
    id: Number(t.id ?? 0),
    tid: String(t.tid ?? ""),
    subject: String(t.subject ?? "Chamado"),
    status: String(t.status ?? ""),
    priority: String(t.priority ?? ""),
    department: String(t.deptname ?? t.department ?? ""),
    openedAt: String(t.date ?? ""),
    updatedAt: String(t.lastreply ?? ""),
  }));
});

export const openTicketFn = createServerFn({ method: "POST" })
  .inputValidator((d: { subject: string; message: string; priority: string }) =>
    z.object({
      subject: z.string().trim().min(3, "Informe um assunto com pelo menos 3 caracteres."),
      message: z.string().trim().min(10, "Descreva o chamado com pelo menos 10 caracteres."),
      priority: z.enum(["Low", "Medium", "High"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireSessionUser();
    const ticket = await whmcsOpenTicket({
      clientId: me.userId,
      contactId: me.contactId,
      subject: data.subject,
      message: data.message,
      priority: data.priority,
    });
    return {
      id: Number(ticket.id ?? 0),
      tid: String(ticket.tid ?? ""),
    };
  });

export const getTicketFn = createServerFn({ method: "GET" })
  .inputValidator((d: { ticketId: number }) =>
    z.object({ ticketId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireSessionUser();
    const ticket = await whmcsGetClientTicket(me.userId, data.ticketId);
    return {
      id: Number(ticket.id ?? data.ticketId),
      tid: String(ticket.tid ?? ""),
      subject: String(ticket.subject ?? "Chamado"),
      status: String(ticket.status ?? ""),
      priority: String(ticket.priority ?? ""),
      department: String(ticket.deptname ?? ticket.department ?? ""),
      openedAt: String(ticket.date ?? ""),
      updatedAt: String(ticket.lastreply ?? ""),
      message: String(ticket.message ?? ""),
      replies: whmcsTicketReplies(ticket).map((reply: any) => ({
        id: Number(reply.id ?? 0),
        name: String(reply.name ?? reply.admin ?? ""),
        email: String(reply.email ?? ""),
        message: String(reply.message ?? ""),
        date: String(reply.date ?? ""),
        admin: Boolean(reply.admin),
      })),
    };
  });

export const replyTicketFn = createServerFn({ method: "POST" })
  .inputValidator((d: { ticketId: number; message: string }) =>
    z.object({
      ticketId: z.number().int().positive(),
      message: z.string().trim().min(3, "Digite uma resposta para o chamado."),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireSessionUser();
    await whmcsAddClientTicketReply({
      ticketId: data.ticketId,
      clientId: me.userId,
      contactId: me.contactId,
      message: data.message,
    });
    return { ok: true };
  });

export const getDomainsFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireSessionUser();
  const list = await whmcsGetClientDomains(me.userId, 100);
  return list.filter((d: any) => !d.userid || Number(d.userid) === me.userId).map((d: any) => ({
    id: Number(d.id),
    domain: String(d.domainname ?? d.domain ?? ""),
    status: String(d.status ?? ""),
    registrar: String(d.registrar ?? ""),
    registrationdate: String(d.regdate ?? ""),
    expirydate: String(d.expirydate ?? d.nextduedate ?? ""),
    recurringamount: Number(d.recurringamount ?? 0),
  }));
});

export const getInvoicesFn = createServerFn({ method: "GET" })
  .inputValidator((d: { status?: string } | undefined) =>
    z.object({ status: z.string().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const me = await requireSessionUser();
    const list = await whmcsGetInvoices(me.userId, data?.status, 100);
    return list.filter((i: any) => !i.userid || Number(i.userid) === me.userId).map((i: any) => ({
      id: Number(i.id),
      duedate: String(i.duedate ?? ""),
      datepaid: String(i.datepaid ?? ""),
      total: Number(i.total ?? 0),
      status: String(i.status ?? ""),
    }));
  });

export const getInvoiceFn = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSessionUser();
    const inv = await whmcsGetInvoice(data.id);
    if (Number(inv.userid) !== me.userId) throw new Error("Acesso negado");
    const items = inv.items?.item ?? [];
    return {
      id: Number(inv.invoiceid ?? data.id),
      status: String(inv.status ?? ""),
      duedate: String(inv.duedate ?? ""),
      datepaid: String(inv.datepaid ?? ""),
      subtotal: Number(inv.subtotal ?? 0),
      tax: Number(inv.tax ?? 0),
      credit: Number(inv.credit ?? 0),
      total: Number(inv.total ?? 0),
      paymentmethod: String(inv.paymentmethodname ?? inv.paymentmethod ?? ""),
      notes: String(inv.notes ?? ""),
      items: (Array.isArray(items) ? items : [items]).map((it: any) => ({
        id: Number(it.id ?? 0),
        description: String(it.description ?? ""),
        amount: Number(it.amount ?? 0),
      })),
    };
  });

export const getInvoiceSsoUrlFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSessionUser();
    const inv = await whmcsGetInvoice(data.id);
    if (Number(inv.userid) !== me.userId) throw new Error("Acesso negado");
    const url = await whmcsInvoiceAccessUrl(me.userId, data.id);
    return { url };
  });

export const getClientDetailsFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireSessionUser();
  const d = await whmcsGetClientDetails(me.userId);
  return {
    firstname: String(d.firstname ?? ""),
    lastname: String(d.lastname ?? ""),
    companyname: String(d.companyname ?? ""),
    email: String(d.email ?? ""),
    address1: String(d.address1 ?? ""),
    address2: String(d.address2 ?? ""),
    city: String(d.city ?? ""),
    state: String(d.state ?? ""),
    postcode: String(d.postcode ?? ""),
    country: String(d.country ?? ""),
    phonenumber: String(d.phonenumber ?? ""),
    status: String(d.status ?? ""),
  };
});
