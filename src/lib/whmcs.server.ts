// Server-only helpers calling the WHMCS API.
// Mirrors the legacy includes/whmcs.php behaviour.
import { createHash } from "crypto";

const PAGE_SIZE = 25;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function list<T = any>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function ticketList(response: any) {
  return list(response.tickets?.ticket ?? response.tickets);
}

function ticketKey(ticket: any) {
  return String(ticket.id ?? ticket.tid ?? `${ticket.date ?? ""}:${ticket.subject ?? ""}:${ticket.email ?? ""}`);
}

function uniqueTickets(tickets: any[]) {
  const seen = new Set<string>();
  return tickets.filter((ticket) => {
    const key = ticketKey(ticket);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function ticketBelongsToClient(ticket: any, clientId: number, emails: string[]) {
  const ownerId = Number(ticket.userid ?? ticket.clientid ?? ticket.client_id ?? 0);
  const email = String(ticket.email ?? "").trim().toLowerCase();
  return ownerId === clientId || (!!email && emails.includes(email));
}

function replyList(response: any) {
  return list(response.replies?.reply ?? response.replies);
}

async function tryWhmcsCall(action: string, params: Record<string, string | number> = {}) {
  try {
    return await whmcsCall(action, params);
  } catch {
    return null;
  }
}

export async function whmcsApi(params: Record<string, string | number>): Promise<any> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.append(k, String(v));
  body.append("identifier", env("WHMCS_API_IDENTIFIER"));
  body.append("secret", env("WHMCS_API_SECRET"));
  body.append("responsetype", "json");

  const res = await fetch(env("WHMCS_API_URL"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API WHMCS (HTTP ${res.status})`);
  }
  return data;
}

export async function whmcsAdminLoginApi(
  username: string,
  password: string,
  params: Record<string, string | number>,
): Promise<any> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.append(k, String(v));
  body.append("username", username);
  body.append("password", createHash("md5").update(password).digest("hex"));
  body.append("responsetype", "json");

  const res = await fetch(env("WHMCS_API_URL"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API WHMCS (HTTP ${res.status})`);
  }
  return data;
}

export async function whmcsCall(action: string, params: Record<string, string | number> = {}) {
  const result = await whmcsApi({ ...params, action });
  if (result.result !== "success") {
    throw new Error(String(result.message ?? "Erro não informado pela API do WHMCS."));
  }
  return result;
}

export async function whmcsValidateAdminLogin(username: string, password: string) {
  const result = await whmcsAdminLoginApi(username, password, { action: "GetAdminDetails" });
  if (result.result !== "success") {
    throw new Error(String(result.message ?? "Usuário ou senha de admin inválidos."));
  }
  return {
    adminId: Number(result.adminid ?? 0),
    name: String(result.name ?? username),
    permissions: String(result.allowedpermissions ?? ""),
    role: String(result.role ?? result.rolename ?? result.role_name ?? result.adminrole ?? ""),
    roleId: Number(result.roleid ?? result.role_id ?? result.adminroleid ?? 0),
  };
}

export async function whmcsValidateLogin(email: string, password: string) {
  const r = await whmcsCall("ValidateLogin", { email, password2: password });
  if (r.twoFactorEnabled) {
    throw new Error("Conta com 2FA não é suportada nesta versão do portal.");
  }
  const userid = Number(r.userid ?? 0);
  if (!userid) throw new Error("Login inválido.");
  return {
    userId: userid,
    contactId: Number(r.contactid ?? r.contact_id ?? 0),
    passwordHash: String(r.passwordhash ?? ""),
  };
}

export async function whmcsResetPassword(email: string) {
  return whmcsApi({ action: "ResetPassword", email });
}

export async function whmcsFindClientByEmail(email: string) {
  const r = await whmcsCall("GetClients", { search: email, limitnum: 25 });
  const clients = list(r.clients?.client);
  return clients.find((client: any) => {
    return String(client.email ?? "").toLowerCase() === email.toLowerCase();
  });
}

export async function whmcsFindContactByEmail(email: string) {
  const normalized = email.toLowerCase();
  const direct = await whmcsApi({
    action: "GetContacts",
    email,
    limitnum: 10,
  });
  if (direct.result === "success") {
    const found = list(direct.contacts?.contact).find((contact: any) => {
      return String(contact.email ?? "").toLowerCase() === normalized;
    });
    if (found) return found;
  }

  const clients = await whmcsSearchClients(email, 25);
  for (const client of clients) {
    const clientId = Number(client.id ?? client.userid ?? 0);
    if (!clientId) continue;
    const contacts = await whmcsGetContacts(clientId, 100);
    const found = contacts.find((contact: any) => {
      return String(contact.email ?? "").toLowerCase() === normalized;
    });
    if (found) return found;
  }

  return null;
}

export async function whmcsFindContactById(contactId: number) {
  if (!contactId) return null;
  for (const key of ["contactid", "id"]) {
    const direct = await whmcsApi({
      action: "GetContacts",
      [key]: contactId,
      limitnum: 1,
    });
    if (direct.result !== "success") continue;
    const found = list(direct.contacts?.contact)[0];
    if (found) return found;
  }
  return null;
}

export async function whmcsSearchClients(search: string, limit = PAGE_SIZE) {
  const r = await whmcsCall("GetClients", { search, limitnum: limit });
  return list(r.clients?.client);
}

export async function whmcsGetClients(limit = PAGE_SIZE) {
  const r = await whmcsCall("GetClients", { limitnum: limit, orderby: "datecreated", order: "desc" });
  return list(r.clients?.client);
}

export async function whmcsGetClientDetails(clientId: number) {
  return whmcsCall("GetClientsDetails", { clientid: clientId, stats: "true" });
}

export async function whmcsGetContacts(clientId: number, limit = PAGE_SIZE) {
  const r = await whmcsCall("GetContacts", { userid: clientId, limitnum: limit });
  return list(r.contacts?.contact);
}

export async function whmcsGetClientProducts(clientId: number, limit = PAGE_SIZE) {
  const r = await whmcsCall("GetClientsProducts", { clientid: clientId, limitnum: limit });
  return list(r.products?.product);
}

export async function whmcsGetProducts(limit = PAGE_SIZE) {
  const r = await whmcsCall("GetClientsProducts", { limitnum: limit });
  return list(r.products?.product);
}

export async function whmcsSearchProducts(search: string, limit = PAGE_SIZE) {
  const r = await whmcsCall("GetClientsProducts", { search, limitnum: limit });
  return list(r.products?.product);
}

export async function whmcsGetProductByServiceId(serviceId: number) {
  const r = await whmcsCall("GetClientsProducts", { serviceid: serviceId, limitnum: 1 });
  return list(r.products?.product)[0] ?? null;
}

export async function whmcsDecryptPassword(password: string) {
  const r = await whmcsCall("DecryptPassword", { password2: password });
  return String(r.password ?? "");
}

export async function whmcsUnsuspendService(serviceId: number) {
  return whmcsCall("ModuleUnsuspend", { serviceid: serviceId });
}

export async function whmcsGetClientDomains(clientId: number, limit = PAGE_SIZE) {
  const r = await whmcsCall("GetClientsDomains", { clientid: clientId, limitnum: limit });
  return list(r.domains?.domain);
}

export async function whmcsGetDomains(limit = PAGE_SIZE) {
  const r = await whmcsCall("GetClientsDomains", { limitnum: limit });
  return list(r.domains?.domain);
}

export async function whmcsFindDomainsByDomain(domain: string, limit = PAGE_SIZE) {
  const r = await whmcsCall("GetClientsDomains", { domain, limitnum: limit });
  return list(r.domains?.domain);
}

export async function whmcsGetServiceMetrics(serviceId: number) {
  const baseUrl = optionalEnv("WHMCS_METRICS_URL")?.replace(/\/$/, "");
  const token = optionalEnv("WHMCS_METRICS_TOKEN");
  if (!baseUrl || !token || serviceId <= 0) return null;

  const url = new URL(baseUrl);
  url.searchParams.set("serviceid", String(serviceId));
  url.searchParams.set("token", token);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "A2Check/metrics-fetch",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.ok !== true) return null;

  const metricValue = (systemName: string) => {
    const metrics = Array.isArray(data.metrics) ? data.metrics : [];
    const found = metrics.find((metric: any) => metric?.system === systemName);
    const value = Number(found?.value);
    return Number.isFinite(value) ? value : null;
  };

  return {
    emailAccounts: data.email_accounts === undefined || data.email_accounts === null ? "" : String(data.email_accounts),
    diskUsageGb: metricValue("disk_usage"),
    bandwidthGb: metricValue("bandwidth_usage"),
  };
}

export async function whmcsGetInvoices(clientId?: number, status?: string, limit = PAGE_SIZE) {
  const params: Record<string, string | number> = {
    limitnum: limit,
    orderby: "duedate",
    order: "desc",
  };
  if (clientId) params.userid = clientId;
  if (status) params.status = status;
  const r = await whmcsCall("GetInvoices", params);
  return list(r.invoices?.invoice);
}

export async function whmcsCreateInvoice({
  clientId,
  description,
  amount,
  dueDate,
  sendInvoice,
}: {
  clientId: number;
  description: string;
  amount: number;
  dueDate: string;
  sendInvoice: boolean;
}) {
  return whmcsCall("CreateInvoice", {
    userid: clientId,
    status: "Unpaid",
    duedate: dueDate,
    itemdescription1: description,
    itemamount1: amount.toFixed(2),
    itemtaxed1: 0,
    autoapplycredit: 0,
    sendinvoice: sendInvoice ? 1 : 0,
  });
}

export async function whmcsGetTransactions(clientId?: number, limit = PAGE_SIZE) {
  const params: Record<string, string | number> = {
    limitnum: limit,
    orderby: "date",
    order: "desc",
  };
  if (clientId) params.userid = clientId;
  const r = await whmcsCall("GetTransactions", params);
  return list(r.transactions?.transaction);
}

export async function whmcsGetTickets(clientId: number, limit = PAGE_SIZE) {
  const { emails } = await whmcsClientTicketContext(clientId);
  const base = {
    limitnum: limit,
    orderby: "lastreply",
    order: "desc",
    ignore_dept_assignments: 1,
  };
  const results = await Promise.all([
    tryWhmcsCall("GetTickets", { ...base, clientid: clientId }),
    tryWhmcsCall("GetTickets", { ...base, userid: clientId }),
    ...emails.map((email) => tryWhmcsCall("GetTickets", { ...base, email })),
  ]);
  const tickets = uniqueTickets(results.flatMap((result) => ticketList(result))).filter((ticket) =>
    ticketBelongsToClient(ticket, clientId, emails),
  );
  if (tickets.length > 0) return tickets;

  const all = await whmcsCall("GetTickets", {
    limitnum: Math.max(limit, 500),
    orderby: "lastreply",
    order: "desc",
    ignore_dept_assignments: 1,
  });
  return ticketList(all).filter((ticket: any) => ticketBelongsToClient(ticket, clientId, emails));
}

async function whmcsClientTicketContext(clientId: number) {
  const [details, contacts] = await Promise.all([
    tryWhmcsCall("GetClientsDetails", { clientid: clientId }),
    tryWhmcsCall("GetContacts", { userid: clientId, limitnum: 100 }),
  ]);
  const emails = uniqueStrings(
    [{ email: details?.email }, ...list(contacts?.contacts?.contact)].map((item: any) =>
      String(item.email ?? "").trim().toLowerCase(),
    ),
  );
  return { emails };
}

export async function whmcsGetClientTicket(clientId: number, ticketId: number) {
  const { emails } = await whmcsClientTicketContext(clientId);
  const ticket = await whmcsCall("GetTicket", {
    ticketid: ticketId,
    ignore_dept_assignments: 1,
  });
  if (!ticketBelongsToClient(ticket, clientId, emails)) {
    const allowedTickets = await whmcsGetTickets(clientId, 250);
    const allowed = allowedTickets.some((item: any) => Number(item.id ?? 0) === ticketId);
    if (!allowed) throw new Error("Acesso negado ao chamado.");
  }
  return ticket;
}

export async function whmcsGetAllTickets(limit = PAGE_SIZE) {
  const base = {
    limitnum: limit,
    orderby: "lastreply",
    order: "desc",
    ignore_dept_assignments: 1,
  };
  const statuses = ["Open", "Customer-Reply", "Answered", "In Progress", "On Hold"];
  const results = await Promise.all([
    tryWhmcsCall("GetTickets", base),
    ...statuses.map((status) => tryWhmcsCall("GetTickets", { ...base, status })),
  ]);
  return uniqueTickets(results.flatMap((result) => ticketList(result)));
}

export async function whmcsAddTicketReply({
  ticketId,
  message,
  adminUsername,
}: {
  ticketId: number;
  message: string;
  adminUsername: string;
}) {
  return whmcsCall("AddTicketReply", {
    ticketid: ticketId,
    message,
    adminusername: adminUsername,
    markdown: "true",
  });
}

export async function whmcsAddClientTicketReply({
  ticketId,
  clientId,
  contactId,
  message,
}: {
  ticketId: number;
  clientId: number;
  contactId?: number;
  message: string;
}) {
  await whmcsGetClientTicket(clientId, ticketId);
  return whmcsCall("AddTicketReply", {
    ticketid: ticketId,
    clientid: clientId,
    ...(contactId ? { contactid: contactId } : {}),
    message,
    markdown: "true",
  });
}

export function whmcsTicketReplies(ticket: any) {
  return replyList(ticket);
}

export async function whmcsGetSupportDepartments() {
  const r = await whmcsCall("GetSupportDepartments");
  return list(r.departments?.department);
}

async function ticketDepartmentId() {
  return "3";
}

export async function whmcsDomainWhois(domain: string) {
  return whmcsCall("DomainWhois", { domain });
}

export async function whmcsGetStats() {
  return whmcsCall("GetStats", { timeline_days: 7 });
}

export async function whmcsOpenTicket({
  clientId,
  contactId,
  subject,
  message,
  priority,
}: {
  clientId: number;
  contactId?: number;
  subject: string;
  message: string;
  priority: string;
}) {
  const base = {
    clientid: clientId,
    ...(contactId ? { contactid: contactId } : {}),
    subject,
    message,
    priority,
  };
  try {
    return await whmcsCall("OpenTicket", {
      ...base,
      deptid: await ticketDepartmentId(),
    });
  } catch (error) {
    const configured = optionalEnv("WHMCS_TICKET_DEPARTMENT_ID");
    const messageText = error instanceof Error ? error.message : String(error);
    if (!configured || !/department/i.test(messageText)) throw error;

    const departments = await whmcsGetSupportDepartments();
    const fallback = departments.find((item: any) => String(item.id ?? item.deptid ?? "") !== configured);
    const fallbackId = String(fallback?.id ?? fallback?.deptid ?? "");
    if (!fallbackId) throw error;
    return whmcsCall("OpenTicket", {
      ...base,
      deptid: fallbackId,
    });
  }
}

export async function whmcsGetInvoice(invoiceId: number) {
  return whmcsCall("GetInvoice", { invoiceid: invoiceId });
}

export async function whmcsSendInvoiceEmail(invoiceId: number) {
  const configuredTemplate = optionalEnv("WHMCS_INVOICE_EMAIL_TEMPLATE");
  const templates = configuredTemplate
    ? [configuredTemplate]
    : ["Invoice Created", "Fatura Criada", "Invoice Payment Reminder"];

  let lastError: unknown;
  for (const messagename of templates) {
    try {
      return await whmcsCall("SendEmail", {
        messagename,
        id: invoiceId,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Nao foi possivel reenviar o e-mail da fatura.");
}

export async function whmcsCreateSsoToken(userId: number, destination = "clientarea:home") {
  return whmcsCall("CreateSsoToken", { user_id: userId, destination });
}

export async function whmcsInvoiceAccessUrl(userId: number, invoiceId: number): Promise<string> {
  try {
    const r = await whmcsCall("CreateSsoToken", {
      user_id: userId,
      destination: "sso:custom_redirect",
      sso_redirect_path: `viewinvoice.php?id=${invoiceId}`,
    });
    if (r.redirect_url) return String(r.redirect_url);
  } catch {
    /* fallback */
  }
  const base = env("WHMCS_API_URL").replace(/\/includes\/api\.php\/?$/, "").replace(/\/$/, "");
  return `${base}/viewinvoice.php?id=${invoiceId}`;
}

export async function whmcsBuildSummary(clientId: number) {
  const [products, domains, invoices, tickets] = await Promise.all([
    whmcsGetClientProducts(clientId, 100),
    whmcsGetClientDomains(clientId, 100),
    whmcsGetInvoices(clientId, undefined, 100),
    whmcsGetTickets(clientId, 100),
  ]);

  let openCount = 0;
  let overdueCount = 0;
  let openTotal = 0;
  for (const inv of invoices) {
    const status = String(inv.status ?? "");
    const total = Number(inv.total ?? 0);
    if (["Unpaid", "Overdue", "Payment Pending"].includes(status)) {
      openCount += 1;
      openTotal += total;
    }
    if (status === "Overdue") overdueCount += 1;
  }
  return {
    services_total: products.length,
    domains_total: domains.length,
    tickets_total: tickets.length,
    invoices_open: openCount,
    invoices_overdue: overdueCount,
    invoices_open_total: openTotal,
  };
}
