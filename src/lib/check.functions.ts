import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkSession, requireCheckUser } from "./session.server";
import { queryRegistroBr, resolveDomainDns } from "./domain-check.server";
import {
  whmcsAddTicketReply,
  whmcsBuildSummary,
  whmcsDomainWhois,
  whmcsGetAllTickets,
  whmcsGetClientDetails,
  whmcsGetClientDomains,
  whmcsGetClientProducts,
  whmcsCreateInvoice,
  whmcsGetClients,
  whmcsGetContacts,
  whmcsGetDomains,
  whmcsFindDomainsByDomain,
  whmcsGetInvoices,
  whmcsGetProductByServiceId,
  whmcsGetProducts,
  whmcsGetServiceMetrics,
  whmcsGetStats,
  whmcsGetTransactions,
  whmcsSearchProducts,
  whmcsSearchClients,
  whmcsSendInvoiceEmail,
  whmcsUnsuspendService,
  whmcsValidateAdminLogin,
  whmcsDecryptPassword,
} from "./whmcs.server";

const clientSummary = (client: any) => ({
  id: Number(client.id ?? client.userid ?? 0),
  firstname: String(client.firstname ?? ""),
  lastname: String(client.lastname ?? ""),
  companyname: String(client.companyname ?? ""),
  email: String(client.email ?? ""),
  phonenumber: String(client.phonenumber ?? ""),
  status: String(client.status ?? ""),
  datecreated: String(client.datecreated ?? client.created_at ?? ""),
});

const principalContactSummary = (client: any) => ({
  id: 0,
  userId: Number(client.client_id ?? client.userid ?? client.id ?? 0),
  firstname: String(client.firstname ?? ""),
  lastname: String(client.lastname ?? ""),
  companyname: String(client.companyname ?? ""),
  email: String(client.email ?? ""),
  phonenumber: String(client.phonenumber ?? ""),
  address1: String(client.address1 ?? ""),
  city: String(client.city ?? ""),
  state: String(client.state ?? ""),
  generalemails: true,
  invoiceemails: true,
  productemails: true,
  supportemails: true,
  domainemails: true,
  principal: true,
});

const serviceSummary = (service: any) => ({
  id: Number(service.id ?? 0),
  clientId: Number(service.clientid ?? service.userid ?? 0),
  clientName: String(service.clientname ?? service.name_on_account ?? service.companyname ?? ""),
  name: String(service.name ?? service.productname ?? "Serviço"),
  domain: String(service.domain ?? ""),
  status: String(service.status ?? ""),
  nextduedate: String(service.nextduedate ?? service.nextinvoicedate ?? ""),
  billingcycle: String(service.billingcycle ?? ""),
  server: String(service.serverhostname ?? service.servername ?? service.serverip ?? ""),
  username: String(service.username ?? ""),
  password: String(service.password ?? ""),
  dedicatedIp: String(service.dedicatedip ?? ""),
  assignedIps: String(service.assignedips ?? ""),
  firstPaymentAmount: Number(service.firstpaymentamount ?? 0),
  recurringAmount: Number(service.recurringamount ?? service.amount ?? 0),
  registrationDate: String(service.regdate ?? service.registrationdate ?? ""),
  suspensionReason: String(service.suspensionreason ?? ""),
  diskUsage: String(service.disk_usage_gb ?? service.diskusage ?? service.disk_usage ?? ""),
  diskLimit: String(service.disklimit ?? service.disk_limit ?? ""),
  emailAccounts: String(
    service.emailaccounts ??
      service.email_accounts ??
      service.configoptions?.configoption?.find?.((option: any) =>
        String(option.option ?? option.name ?? "").toLowerCase().includes("email"),
      )?.value ??
      "",
  ),
});

const ticketSummary = (ticket: any) => ({
  id: Number(ticket.id ?? 0),
  tid: String(ticket.tid ?? ""),
  clientId: Number(ticket.userid ?? ticket.clientid ?? 0),
  clientName: String(ticket.name ?? ticket.clientname ?? ""),
  subject: String(ticket.subject ?? "Chamado"),
  status: String(ticket.status ?? ""),
  priority: String(ticket.priority ?? ""),
  department: String(ticket.deptname ?? ticket.department ?? ""),
  updatedAt: String(ticket.lastreply ?? ticket.date ?? ""),
});

const domainSummary = (domain: any) => ({
  id: Number(domain.id ?? 0),
  clientId: Number(domain.userid ?? domain.clientid ?? 0),
  domain: String(domain.domainname ?? domain.domain ?? ""),
  registrar: String(domain.registrar ?? ""),
  regtype: String(domain.regtype ?? ""),
  regdate: String(domain.regdate ?? ""),
  expirydate: String(domain.expirydate ?? domain.nextduedate ?? ""),
  status: String(domain.status ?? ""),
  dnsmanagement: String(domain.dnsmanagement ?? ""),
  idprotection: String(domain.idprotection ?? ""),
  donotrenew: String(domain.donotrenew ?? ""),
});

function moneyNumber(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  const normalized = comma >= 0 && dot >= 0
    ? comma > dot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "")
    : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const invoiceSummary = (invoice: any) => ({
  id: Number(invoice.id ?? invoice.invoiceid ?? 0),
  clientId: Number(invoice.userid ?? invoice.clientid ?? 0),
  clientName: String(invoice.clientname ?? invoice.name ?? ""),
  invoiceNum: String(invoice.invoicenum ?? invoice.invoice_num ?? ""),
  date: String(invoice.date ?? ""),
  duedate: String(invoice.duedate ?? ""),
  total: moneyNumber(invoice.total),
  balance: moneyNumber(invoice.balance),
  status: String(invoice.status ?? ""),
});

const transactionSummary = (transaction: any) => ({
  id: Number(transaction.id ?? transaction.transid ?? 0),
  clientId: Number(transaction.userid ?? transaction.clientid ?? 0),
  clientName: String(transaction.clientname ?? transaction.name ?? ""),
  invoiceId: Number(transaction.invoiceid ?? 0),
  date: String(transaction.date ?? transaction.dateline ?? ""),
  description: String(transaction.description ?? ""),
  gateway: String(transaction.gateway ?? ""),
  transactionId: String(transaction.transid ?? transaction.transactionid ?? ""),
  amountIn: moneyNumber(transaction.amountin ?? transaction.amount_in),
  amountOut: moneyNumber(transaction.amountout ?? transaction.amount_out),
  fees: moneyNumber(transaction.fees),
});

const contactSummary = (contact: any) => ({
  id: Number(contact.id ?? 0),
  userId: Number(contact.userid ?? 0),
  firstname: String(contact.firstname ?? ""),
  lastname: String(contact.lastname ?? ""),
  companyname: String(contact.companyname ?? ""),
  email: String(contact.email ?? ""),
  phonenumber: String(contact.phonenumber ?? ""),
  address1: String(contact.address1 ?? ""),
  city: String(contact.city ?? ""),
  state: String(contact.state ?? ""),
  generalemails: Boolean(contact.generalemails),
  invoiceemails: Boolean(contact.invoiceemails),
  productemails: Boolean(contact.productemails),
  supportemails: Boolean(contact.supportemails),
  domainemails: Boolean(contact.domainemails),
  principal: false,
});

function includesTerm(values: string[], term: string) {
  const q = term.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(q));
}

function looksLikeDomain(value: string) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value.trim());
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

function uniqueByIdOrDomain<T extends { id: number; domain?: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id > 0 ? `id:${item.id}` : `domain:${normalizeDomain(item.domain ?? "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatMetricGb(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return value.toFixed(2).replace(".", ",");
}

function statNumber(source: any, keys: string[]) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function isAwaitingReplyTicket(ticket: any) {
  const status = String(ticket.status ?? "").toLowerCase().trim();
  return ["customer-reply", "customer reply", "open", "new"].includes(status);
}

function canViewCheckFinance(user: { adminId?: number; permissions?: string; role?: string; roleId?: number }) {
  if (Number(user.roleId ?? 0) === 1) return true;

  const value = `${user.role ?? ""} ${user.permissions ?? ""}`.toLowerCase();
  return [
    "administrator",
    "administrators",
    "full administrator",
    "view invoices",
    "manage invoices",
    "list transactions",
    "view transactions",
    "transactions",
    "invoices",
    "faturas",
    "transações",
    "transacoes",
  ].some((permission) => value.includes(permission));
}

function isFullCheckAdministrator(user: { adminId?: number; permissions?: string; role?: string; roleId?: number }) {
  if (Number(user.roleId ?? 0) === 1) return true;
  if (Number(user.adminId ?? 0) === 1) return true;
  const value = `${user.role ?? ""} ${user.permissions ?? ""}`.toLowerCase();
  return [
    "full administrator",
    "full admin",
    "super administrator",
    "super admin",
    "administrator",
    "administrators",
  ].some((permission) => value.includes(permission));
}

function statMoney(source: any, keys: string[]) {
  for (const key of keys) {
    const raw = source?.[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const value = moneyNumber(raw);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

async function fallback<T>(task: Promise<T>, value: T, label: string): Promise<T> {
  try {
    return await task;
  } catch (error) {
    console.error(`WHMCS ${label} failed`, error);
    return value;
  }
}

export const checkLoginFn = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) =>
    z.object({ username: z.string().trim().min(1), password: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await whmcsValidateAdminLogin(data.username, data.password);

    const session = await checkSession();
    await session.update({
      email: data.username,
      name: admin.name,
      adminId: admin.adminId,
      permissions: admin.permissions,
      role: admin.role,
      roleId: admin.roleId,
    });
    return {
      ok: true,
      email: data.username,
      name: admin.name,
      adminId: admin.adminId,
      permissions: admin.permissions,
      role: admin.role,
      roleId: admin.roleId,
      canViewFinance: canViewCheckFinance(admin),
    };
  });

export const checkLogoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const session = await checkSession();
  await session.clear();
  return { ok: true };
});

export const checkMeFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await checkSession();
  if (!session.data?.email) return null;
  const me = {
    email: session.data.email,
    name: session.data.name ?? session.data.email,
    adminId: Number(session.data.adminId ?? 0),
    permissions: session.data.permissions ?? "",
    role: session.data.role ?? "",
    roleId: Number(session.data.roleId ?? 0),
  };
  return { ...me, canViewFinance: canViewCheckFinance(me) };
});

export const checkDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireCheckUser();
  const isFullAdmin = isFullCheckAdministrator(me);
  const [stats, clients, services, tickets, invoices] = await Promise.all([
    fallback(whmcsGetStats(), {}, "GetStats"),
    fallback(whmcsGetClients(5), [], "GetClients"),
    fallback(whmcsGetProducts(100), [], "GetClientsProducts"),
    fallback(whmcsGetAllTickets(100), [], "GetTickets"),
    isFullAdmin ? fallback(whmcsGetInvoices(undefined, undefined, 250), [], "GetInvoices dashboard") : Promise.resolve([]),
  ]);
  const normalizedServices = services.map(serviceSummary);
  const normalizedInvoices = invoices.map(invoiceSummary);
  const awaitingTicketsFromList = tickets.filter(isAwaitingReplyTicket).length;
  const awaitingTicketsFromStats = statNumber(stats, [
    "tickets_awaitingreply",
    "tickets_awaiting_reply",
    "ticketsawaitingreply",
    "unansweredtickets",
    "tickets_unanswered",
    "awaitingreplytickets",
  ]);

  return {
    me,
    stats: {
      orders_pending: statNumber(stats, ["orders_pending", "pendingorders", "orderspending"]),
      tickets_awaitingreply: Math.max(awaitingTicketsFromStats, awaitingTicketsFromList),
      tickets_open: statNumber(stats, ["tickets_open", "opentickets", "activetickets"]),
      services_suspended: statNumber(stats, ["services_suspended", "suspendedservices"]) ||
        normalizedServices.filter((service) => service.status === "Suspended").length,
      cancellations_pending: statNumber(stats, [
        "cancellations_pending",
        "cancellationrequests",
        "pendingcancellations",
        "pending_cancellations",
      ]),
      modules_pending: statNumber(stats, ["modules_pending", "services_pending", "pendingservices"]) ||
        normalizedServices.filter((service) => service.status === "Pending").length,
      staff_online: statNumber(stats, ["staff_online", "staffonline"]),
    },
    adminInsights: isFullAdmin
      ? {
          billing: {
            today: statMoney(stats, ["income_today", "incometoday", "todayincome", "today_income", "todays_income"]),
            month: statMoney(stats, ["income_thismonth", "income_this_month", "thismonthincome", "monthly_income", "month_income"]),
            year: statMoney(stats, ["income_thisyear", "income_this_year", "thisyearincome", "yearly_income", "year_income"]),
            allTime: statMoney(stats, ["income_alltime", "income_all_time", "alltimeincome", "all_time_income", "total_income"]),
          },
          finance: {
            open: normalizedInvoices.filter((invoice) => ["Unpaid", "Overdue", "Payment Pending"].includes(invoice.status)).length,
            overdue: normalizedInvoices.filter((invoice) => invoice.status === "Overdue").length,
            openTotal: normalizedInvoices
              .filter((invoice) => ["Unpaid", "Overdue", "Payment Pending"].includes(invoice.status))
              .reduce((total, invoice) => total + (invoice.balance > 0 ? invoice.balance : invoice.total), 0),
            overdueTotal: normalizedInvoices
              .filter((invoice) => invoice.status === "Overdue")
              .reduce((total, invoice) => total + (invoice.balance > 0 ? invoice.balance : invoice.total), 0),
          },
          services: {
            active: normalizedServices.filter((service) => service.status === "Active").length,
            suspended: normalizedServices.filter((service) => service.status === "Suspended").length,
            pending: normalizedServices.filter((service) => service.status === "Pending").length,
          },
          tickets: {
            open: statNumber(stats, ["tickets_open", "opentickets", "activetickets"]),
            awaitingReply: Math.max(awaitingTicketsFromStats, awaitingTicketsFromList),
            listed: tickets.length,
          },
        }
      : null,
    recentClients: clients.map(clientSummary),
    recentServices: normalizedServices.slice(0, 5),
    recentTickets: tickets.map(ticketSummary),
  };
});

export const checkSearchClientsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { search?: string } | undefined) =>
    z.object({ search: z.string().trim().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    await requireCheckUser();
    const search = data?.search?.trim() || "";
    if (search.length < 2) return [];
    const clients = await whmcsSearchClients(search, 25);
    return clients.map(clientSummary);
  });

export const checkGlobalSearchFn = createServerFn({ method: "GET" })
  .inputValidator((d: { search?: string } | undefined) =>
    z.object({ search: z.string().trim().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    await requireCheckUser();
    const search = data?.search?.trim() || "";
    if (search.length < 2) {
      return { clients: [], services: [], tickets: [], domains: [], whois: null, domainCheck: null };
    }
    const domainSearch = looksLikeDomain(search) ? normalizeDomain(search) : "";
    if (!domainSearch) {
      return { clients: [], services: [], tickets: [], domains: [], whois: null, domainCheck: null };
    }

    const [domainServices, directDomains, registro, dnsCheck] = await Promise.all([
      domainSearch ? fallback(whmcsSearchProducts(domainSearch, 50), [], "GetClientsProducts domain") : Promise.resolve([]),
      domainSearch ? fallback(whmcsFindDomainsByDomain(domainSearch, 50), [], "GetClientsDomains domain") : Promise.resolve([]),
      domainSearch ? fallback(queryRegistroBr(domainSearch), null, "RegistroBr") : Promise.resolve(null),
      domainSearch ? fallback(resolveDomainDns(domainSearch), null, "DNS") : Promise.resolve(null),
    ]);

    const allServices = uniqueByIdOrDomain(domainServices.map(serviceSummary));
    const allDomains = uniqueByIdOrDomain(directDomains.map(domainSummary));
    const matchedService = domainSearch
      ? allServices.find((service) => normalizeDomain(service.domain) === domainSearch)
      : undefined;
    const matchedDomain = domainSearch
      ? allDomains.find((domain) => normalizeDomain(domain.domain) === domainSearch)
      : undefined;
    const matchedClient =
      matchedService?.clientId || matchedDomain?.clientId
        ? await fallback(whmcsGetClientDetails(matchedService?.clientId || matchedDomain?.clientId || 0), null, "GetClientsDetails domain")
        : null;
    const metrics = matchedService?.id
      ? await fallback(whmcsGetServiceMetrics(matchedService.id), null, "Metrics domain")
      : null;

    return {
      clients: [],
      services: [],
      tickets: [],
      domains: [],
      whois: null,
      domainCheck: domainSearch
        ? {
            domain: domainSearch,
            whmcs: {
              client: matchedClient
                ? `${String((matchedClient as any).firstname ?? "")} ${String((matchedClient as any).lastname ?? "")}`.trim() ||
                  String((matchedClient as any).companyname ?? "")
                : "",
              clientId: Number((matchedClient as any)?.client_id ?? (matchedClient as any)?.userid ?? matchedService?.clientId ?? matchedDomain?.clientId ?? 0),
              domain: matchedService?.domain || matchedDomain?.domain || domainSearch,
              server: matchedService?.server || "",
              plan: matchedService?.name || "",
              status: matchedService?.status || matchedDomain?.status || "",
              disk: formatMetricGb(metrics?.diskUsageGb) || matchedService?.diskUsage || "",
              email: metrics?.emailAccounts || matchedService?.emailAccounts || "",
            },
            registro,
            dns: dnsCheck,
          }
        : null,
    };
  });

export const checkListClientsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireCheckUser();
  const clients = await fallback(whmcsGetClients(100), [], "GetClients");
  return clients.map(clientSummary);
});

export const checkClientServicesFn = createServerFn({ method: "GET" })
  .inputValidator((d: { clientId: number }) =>
    z.object({ clientId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireCheckUser();
    const services = await fallback(whmcsGetClientProducts(data.clientId, 100), [], "GetClientsProducts client");
    return services.map(serviceSummary);
  });

export const checkListServicesFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireCheckUser();
  const services = await fallback(whmcsGetProducts(100), [], "GetClientsProducts");
  const normalized = services.map(serviceSummary);
  return normalized.sort((a, b) => Number(b.status === "Suspended") - Number(a.status === "Suspended"));
});

export const checkServiceDetailsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { serviceId: number }) =>
    z.object({ serviceId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireCheckUser();
    const service = await whmcsGetProductByServiceId(data.serviceId);
    if (!service) throw new Error("Serviço não encontrado.");

    const normalized = serviceSummary(service);
    const encryptedPassword = String((service as any).password ?? "");
    const looksMasked = /^x+$/i.test(encryptedPassword.trim());
    if (encryptedPassword && !looksMasked) {
      normalized.password = await fallback(
        whmcsDecryptPassword(encryptedPassword),
        "",
        "DecryptPassword",
      );
    }

    return normalized;
  });

export const checkListTicketsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireCheckUser();
  const tickets = await fallback(whmcsGetAllTickets(250), [], "GetTickets");
  return tickets.map(ticketSummary);
});

export const checkListDomainsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireCheckUser();
  const domains = await fallback(whmcsGetDomains(100), [], "GetClientsDomains");
  return domains.map(domainSummary);
});

export const checkClientContactsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { clientId: number }) =>
    z.object({ clientId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireCheckUser();
    const [details, contacts] = await Promise.all([
      fallback(whmcsGetClientDetails(data.clientId), null, "GetClientsDetails contact"),
      fallback(whmcsGetContacts(data.clientId, 100), [], "GetContacts"),
    ]);
    return [
      ...(details ? [principalContactSummary(details)] : []),
      ...contacts.map(contactSummary),
    ];
  });

export const checkReplyTicketFn = createServerFn({ method: "POST" })
  .inputValidator((d: { ticketId: number; message: string }) =>
    z
      .object({
        ticketId: z.number().int().positive(),
        message: z.string().trim().min(3, "Digite uma resposta para o chamado."),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireCheckUser();
    await whmcsAddTicketReply({
      ticketId: data.ticketId,
      message: data.message,
      adminUsername: me.email,
    });
    return { ok: true };
  });

export const checkClientOverviewFn = createServerFn({ method: "GET" })
  .inputValidator((d: { clientId: number }) =>
    z.object({ clientId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireCheckUser();
    const canViewFinance = canViewCheckFinance(me);
    const [details, summary, services, domains, invoices, transactions] = await Promise.all([
      whmcsGetClientDetails(data.clientId),
      whmcsBuildSummary(data.clientId),
      whmcsGetClientProducts(data.clientId, 50),
      whmcsGetClientDomains(data.clientId, 50),
      canViewFinance ? whmcsGetInvoices(data.clientId, undefined, 50) : Promise.resolve([]),
      canViewFinance ? whmcsGetTransactions(data.clientId, 50) : Promise.resolve([]),
    ]);

    return {
      client: {
        id: data.clientId,
        firstname: String(details.firstname ?? ""),
        lastname: String(details.lastname ?? ""),
        companyname: String(details.companyname ?? ""),
        email: String(details.email ?? ""),
        phonenumber: String(details.phonenumber ?? ""),
        city: String(details.city ?? ""),
        state: String(details.state ?? ""),
        status: String(details.status ?? ""),
      },
      summary,
      services: services.map((service: any) => ({
        id: Number(service.id ?? 0),
        name: String(service.name ?? service.productname ?? "Serviço"),
        domain: String(service.domain ?? ""),
        status: String(service.status ?? ""),
        nextduedate: String(service.nextduedate ?? service.nextinvoicedate ?? ""),
        billingcycle: String(service.billingcycle ?? ""),
      })),
      domains: domains.map((domain: any) => ({
        id: Number(domain.id ?? 0),
        domain: String(domain.domainname ?? domain.domain ?? ""),
        status: String(domain.status ?? ""),
        registrar: String(domain.registrar ?? ""),
        expirydate: String(domain.expirydate ?? domain.nextduedate ?? ""),
      })),
      canViewFinance,
      invoices: invoices.map(invoiceSummary),
      transactions: transactions.map(transactionSummary),
    };
  });

export const checkFinanceOverviewFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireCheckUser();
  const canViewFinance = canViewCheckFinance(me);
  if (!canViewFinance) {
    return { canViewFinance, invoices: [] };
  }

  const [invoices, stats] = await Promise.all([
    fallback(whmcsGetInvoices(undefined, undefined, 250), [], "GetInvoices finance"),
    fallback(whmcsGetStats(), {}, "GetStats finance"),
  ]);

  return {
    canViewFinance,
    invoices: invoices.map(invoiceSummary),
    totalReceived: statMoney(stats, ["income_alltime", "income_all_time", "alltimeincome", "all_time_income", "total_income"]),
  };
});

export const checkCreateInvoiceFn = createServerFn({ method: "POST" })
  .inputValidator((d: { clientId: number; description: string; amount: number; dueDate: string; sendInvoice?: boolean }) =>
    z
      .object({
        clientId: z.number().int().positive("Selecione um cliente."),
        description: z.string().trim().min(3, "Informe uma descricao para a conta."),
        amount: z.number().positive("Informe um valor maior que zero."),
        dueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data de vencimento valida."),
        sendInvoice: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireCheckUser();
    if (!canViewCheckFinance(me)) {
      throw new Error("Seu usuario nao tem permissao para criar faturas.");
    }

    const result = await whmcsCreateInvoice({
      clientId: data.clientId,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate,
      sendInvoice: Boolean(data.sendInvoice),
    });
    const invoiceId = Number(result.invoiceid ?? result.id ?? 0);
    return {
      ok: true,
      invoiceId,
      message: invoiceId > 0 ? `Conta #${invoiceId} criada com sucesso no WHMCS.` : "Conta criada com sucesso no WHMCS.",
    };
  });

export const checkResendInvoiceEmailFn = createServerFn({ method: "POST" })
  .inputValidator((d: { invoiceId: number }) =>
    z.object({ invoiceId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireCheckUser();
    if (!canViewCheckFinance(me)) {
      throw new Error("Seu usuario nao tem permissao para reenviar faturas.");
    }

    await whmcsSendInvoiceEmail(data.invoiceId);
    return { ok: true, message: "E-mail da fatura reenviado com sucesso." };
  });

export const checkUnsuspendServiceFn = createServerFn({ method: "POST" })
  .inputValidator((d: { serviceId: number }) =>
    z.object({ serviceId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireCheckUser();
    await whmcsUnsuspendService(data.serviceId);
    return { ok: true };
  });
