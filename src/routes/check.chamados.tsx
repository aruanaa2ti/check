import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { CheckLayout } from "@/components/check/CheckLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { checkListTicketsFn, checkMeFn, checkReplyTicketFn } from "@/lib/check.functions";
import { formatDateBR, ticketStatusLabel } from "@/lib/format";

const opts = {
  queryKey: ["check-tickets"],
  queryFn: () => checkListTicketsFn(),
};

export const Route = createFileRoute("/check/chamados")({
  loader: async ({ context }) => {
    const me = await checkMeFn();
    if (!me) throw redirect({ to: "/check/login" });
    const tickets = await context.queryClient.ensureQueryData(opts);
    return { me, tickets };
  },
  component: CheckTicketsPage,
});

function CheckTicketsPage() {
  const initial = Route.useLoaderData();
  const replyTicket = useServerFn(checkReplyTicketFn);
  const [tickets, setTickets] = useState(initial.tickets);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<(typeof tickets)[number] | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statuses = Array.from(new Set(tickets.map((ticket) => ticket.status).filter(Boolean))).sort();
  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    return tickets.filter((ticket) => {
      const haystack = [
        ticket.tid,
        ticket.subject,
        ticket.clientName,
        ticket.status,
        ticket.priority,
        ticket.department,
      ].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (!status || ticket.status === status);
    });
  }, [tickets, status, term]);

  const sendReply = async () => {
    if (!selected) return;
    setError(null);
    setSending(true);
    try {
      await replyTicket({ data: { ticketId: selected.id, message } });
      setTickets((items) => items.map((item) => item.id === selected.id ? { ...item, status: "Answered" } : item));
      setSelected(null);
      setMessage("");
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível responder o chamado.");
    } finally {
      setSending(false);
    }
  };

  return (
    <CheckLayout title="Chamados" subtitle="Chamados recentes do WHMCS." userName={initial.me.name}>
      <section className="card-soft mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="Filtrar por protocolo, assunto, cliente ou departamento"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Todos os status</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {ticketStatusLabel(item)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Chamado</th>
                <th className="px-5 py-3 text-left font-medium">Cliente</th>
                <th className="px-5 py-3 text-left font-medium">Departamento</th>
                <th className="px-5 py-3 text-left font-medium">Prioridade</th>
                <th className="px-5 py-3 text-left font-medium">Atualizado</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-muted/40">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{ticket.subject}</div>
                    <div className="text-xs text-muted-foreground">{ticket.tid || `#${ticket.id}`}</div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{ticket.clientName || "—"}</td>
                  <td className="px-5 py-4">{ticket.department || "—"}</td>
                  <td className="px-5 py-4">{ticket.priority || "—"}</td>
                  <td className="px-5 py-4">{formatDateBR(ticket.updatedAt)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={ticket.status} label={ticketStatusLabel(ticket.status)} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      title="Responder"
                      aria-label="Responder chamado"
                      onClick={() => {
                        setSelected(ticket);
                        setMessage("");
                        setError(null);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-soft">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-xl font-bold tracking-tight">Responder chamado</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.tid || `#${selected.id}`} · {selected.subject}
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                placeholder="Digite a resposta..."
              />
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border border-border px-4 py-2 text-xs font-bold transition hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={sendReply}
                disabled={sending || message.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </CheckLayout>
  );
}
