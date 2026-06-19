import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, MessageSquare, PlusCircle, Send, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { getTicketFn, getTicketsFn, meFn, openTicketFn, replyTicketFn } from "@/lib/portal.functions";
import { formatDateBR, ticketPriorityLabel, ticketStatusLabel } from "@/lib/format";

const opts = queryOptions({ queryKey: ["tickets"], queryFn: () => getTicketsFn() });
const meOpts = queryOptions({ queryKey: ["me"], queryFn: () => meFn() });

type TicketRow = {
  id: number;
  tid: string;
  subject: string;
  status: string;
  priority: string;
  department: string;
  openedAt: string;
  updatedAt: string;
};

type TicketDetail = TicketRow & {
  message: string;
  replies: Array<{
    id: number;
    name: string;
    email: string;
    message: string;
    date: string;
    admin: boolean;
  }>;
};

export const Route = createFileRoute("/cliente_/chamados")({
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meOpts);
    if (!me) throw redirect({ to: "/cliente" });
    return context.queryClient.ensureQueryData(opts);
  },
  component: TicketsPage,
});

function TicketsPage() {
  const { data: tickets } = useSuspenseQuery(opts);
  const { data: me } = useSuspenseQuery(meOpts);
  const loadTicket = useServerFn(getTicketFn);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [loadingTicketId, setLoadingTicketId] = useState<number | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const openTicketDetail = async (ticket: TicketRow) => {
    setLoadingTicketId(ticket.id);
    setTicketError(null);
    try {
      setSelectedTicket(await loadTicket({ data: { ticketId: ticket.id } }));
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : "Não foi possível carregar o chamado.");
    } finally {
      setLoadingTicketId(null);
    }
  };

  const refreshSelectedTicket = async () => {
    if (!selectedTicket) return;
    setSelectedTicket(await loadTicket({ data: { ticketId: selectedTicket.id } }));
  };

  return (
    <PortalLayout
      title="Chamados"
      subtitle="Abra e acompanhe seus chamados de suporte."
      userName={me?.name ?? "Cliente"}
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-dark"
          >
            <PlusCircle className="h-4 w-4" />
            Abrir chamado
          </button>
        </div>
        {ticketError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ticketError}
          </div>
        )}
        {tickets.length === 0 ? (
          <EmptyState />
        ) : (
          <TicketsTable tickets={tickets} loadingTicketId={loadingTicketId} onOpen={openTicketDetail} />
        )}
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Abrir chamado</h2>
                <p className="mt-1 text-sm text-muted-foreground">Envie sua solicitação diretamente para o suporte.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              <TicketForm onSuccess={() => setModalOpen(false)} />
            </div>
          </div>
        </div>
      )}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onRefresh={refreshSelectedTicket}
        />
      )}
    </PortalLayout>
  );
}

function TicketForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const openTicket = useServerFn(openTicketFn);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const ticket = await openTicket({ data: { subject, message, priority } });
      setSubject("");
      setMessage("");
      setPriority("Medium");
      setSuccess(ticket.tid ? `Chamado #${ticket.tid} aberto com sucesso.` : "Chamado aberto com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      window.setTimeout(onSuccess, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o chamado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <label htmlFor="subject" className="text-sm font-medium">Assunto</label>
          <input
            id="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="block w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="Ex.: Problema no e-mail"
            required
            minLength={3}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="priority" className="text-sm font-medium">Prioridade</label>
          <select
            id="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as "Low" | "Medium" | "High")}
            className="block w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="Low">Baixa</option>
            <option value="Medium">Média</option>
            <option value="High">Alta</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label htmlFor="message" className="text-sm font-medium">Mensagem</label>
        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="block min-h-36 w-full resize-y rounded-md border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          placeholder="Descreva o que está acontecendo e inclua detalhes úteis para o suporte."
          required
          minLength={10}
        />
      </div>

      {(error || success) && (
        <div
          className={
            error
              ? "mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              : "mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          }
        >
          {error ?? success}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-dark disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Abrindo..." : "Abrir chamado"}
        </button>
      </div>
    </form>
  );
}

function TicketsTable({
  tickets,
  loadingTicketId,
  onOpen,
}: {
  tickets: TicketRow[];
  loadingTicketId: number | null;
  onOpen: (ticket: TicketRow) => void;
}) {
  return (
    <div className="card-soft overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold">Chamados recentes</h2>
        <p className="text-sm text-muted-foreground">Histórico dos chamados vinculados à sua conta.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3 text-left font-medium">#</th>
              <th className="px-6 py-3 text-left font-medium">Assunto</th>
              <th className="px-6 py-3 text-left font-medium">Abertura</th>
              <th className="px-6 py-3 text-left font-medium">Atualização</th>
              <th className="px-6 py-3 text-left font-medium">Prioridade</th>
              <th className="px-6 py-3 text-left font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-muted/40">
                <td className="px-6 py-4 font-medium">#{ticket.tid || ticket.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-medium">{ticket.subject}</div>
                      {ticket.department && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{ticket.department}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{formatDateBR(ticket.openedAt)}</td>
                <td className="px-6 py-4">{formatDateBR(ticket.updatedAt)}</td>
                <td className="px-6 py-4">{ticketPriorityLabel(ticket.priority) || "—"}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={ticket.status} label={ticketStatusLabel(ticket.status)} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(ticket)}
                    disabled={loadingTicketId === ticket.id}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-brand hover:text-brand disabled:opacity-60"
                  >
                    <Eye className="h-4 w-4" />
                    {loadingTicketId === ticket.id ? "Abrindo..." : "Acompanhar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketDetailModal({
  ticket,
  onClose,
  onRefresh,
}: {
  ticket: TicketDetail;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const replyTicket = useServerFn(replyTicketFn);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await replyTicket({ data: { ticketId: ticket.id, message } });
      setMessage("");
      await Promise.all([
        onRefresh(),
        queryClient.invalidateQueries({ queryKey: ["tickets"] }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível responder o chamado.");
    } finally {
      setSubmitting(false);
    }
  };

  const timeline = [
    {
      id: 0,
      name: "Cliente",
      email: "",
      message: ticket.message,
      date: ticket.openedAt,
      admin: false,
    },
    ...ticket.replies,
  ].filter((item) => item.message);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">#{ticket.tid || ticket.id}</h2>
              <StatusBadge status={ticket.status} label={ticketStatusLabel(ticket.status)} />
            </div>
            <p className="mt-1 truncate text-sm font-medium">{ticket.subject}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aberto em {formatDateBR(ticket.openedAt)} · Atualizado em {formatDateBR(ticket.updatedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {timeline.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="rounded-md border border-border bg-background px-4 py-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.name || (item.admin ? "Suporte" : "Cliente")}</p>
                    {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateBR(item.date)}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleReply} className="mt-5 rounded-md border border-border bg-muted/30 p-4">
            <label htmlFor="ticket-reply" className="text-sm font-semibold">Responder chamado</label>
            <textarea
              id="ticket-reply"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-2 block min-h-28 w-full resize-y rounded-md border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder="Digite sua resposta..."
              required
              minLength={3}
            />
            {error && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-dark disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Enviando..." : "Enviar resposta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card-soft flex flex-col items-center justify-center py-16 text-center">
      <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Nenhum chamado encontrado em sua conta.</p>
    </div>
  );
}
