export const formatMoneyBR = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const formatDateBR = (d: string | null | undefined) => {
  const value = String(d ?? "").trim();
  if (!value || value.startsWith("0000-00-00")) return "—";

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  }

  const brDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brDate) {
    return `${brDate[1]}/${brDate[2]}/${brDate[3]}`;
  }

  const dt = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(dt.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(dt);
};

export const billingCycleLabel = (s: string) =>
  ({
    Free: "Grátis",
    FreeAccount: "Grátis",
    OneTime: "Único",
    Monthly: "Mensal",
    Quarterly: "Trimestral",
    SemiAnnually: "Semestral",
    Annually: "Anual",
    Biennially: "Bienal",
    Triennially: "Trienal",
  } as Record<string, string>)[s] ?? s;

export const invoiceStatusLabel = (s: string) =>
  ({
    Paid: "Paga",
    Unpaid: "Em aberto",
    Overdue: "Vencida",
    Cancelled: "Cancelada",
    Collections: "Cobrança",
    Draft: "Rascunho",
    Refunded: "Estornada",
    "Payment Pending": "Pagamento pendente",
  } as Record<string, string>)[s] ?? s;

export const serviceStatusLabel = (s: string) =>
  ({
    Active: "Ativo",
    Suspended: "Suspenso",
    Pending: "Pendente",
    Terminated: "Encerrado",
    Cancelled: "Encerrado",
    Fraud: "Fraude",
    Completed: "Concluído",
  } as Record<string, string>)[s] ?? s;

export const ticketStatusLabel = (s: string) =>
  ({
    Open: "Aberto",
    Answered: "Respondido",
    "Customer-Reply": "Resposta do cliente",
    "On Hold": "Em espera",
    "In Progress": "Em atendimento",
    Closed: "Fechado",
  } as Record<string, string>)[s] ?? s;

export const ticketPriorityLabel = (s: string) =>
  ({
    Low: "Baixa",
    Medium: "Média",
    High: "Alta",
  } as Record<string, string>)[s] ?? s;

export type Tone = "success" | "warning" | "danger" | "muted";

export const statusTone = (s: string): Tone => {
  const v = s.toLowerCase().trim();
  if (v === "active" || v === "paid") return "success";
  if (v === "pending" || v === "payment pending" || v === "on hold" || v === "answered") return "warning";
  if (v === "unpaid" || v === "overdue" || v === "suspended") return "danger";
  if (v === "closed") return "success";
  return "muted";
};
