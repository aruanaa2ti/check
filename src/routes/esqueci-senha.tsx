import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/portal/Logo";
import { meFn, resetPasswordFn } from "@/lib/portal.functions";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar Senha — A2 Soluções em T.I." },
      { name: "description", content: "Solicite o envio do e-mail de redefinição de senha da Área do Cliente A2." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async () => {
    const me = await meFn();
    if (me) throw redirect({ to: "/cliente/dashboard" });
    return null;
  },
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const sendReset = useServerFn(resetPasswordFn);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);
    try {
      await sendReset({ data: { email } });
      setSent(true);
    } catch {
      setError("Não foi possível enviar agora. Tente novamente em alguns instantes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 10%, oklch(0.55 0.18 145 / 0.18), transparent 60%), radial-gradient(45% 45% at 10% 90%, oklch(0 0 0 / 0.08), transparent 60%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full overflow-hidden rounded-lg bg-card shadow-soft ring-1 ring-border lg:grid-cols-2">
          <div className="relative hidden flex-col justify-between ink-gradient p-10 text-white lg:flex">
            <div className="flex justify-center">
              <Logo variant="light" className="h-16 w-auto" />
            </div>
            <div>
              <h2 className="text-3xl font-bold leading-tight">Recupere seu acesso.</h2>
              <p className="mt-4 max-w-sm text-sm text-white/70">
                Informe o e-mail cadastrado para receber as instruções de redefinição da sua
                Área do Cliente A2.
              </p>
            </div>
            <div className="flex gap-6 text-xs text-white/50">
              <span>● Link seguro</span>
              <span>● E-mail oficial</span>
            </div>
          </div>

          <div className="flex flex-col justify-center p-8 sm:p-12">
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo className="h-16 w-auto" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Digite o e-mail vinculado à sua conta para receber o link de redefinição.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-10 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                    placeholder="voce@empresa.com.br"
                  />
                </div>
              </div>

              {sent && (
                <div className="flex gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Se o e-mail estiver cadastrado, enviaremos as instruções para redefinir sua senha.
                  </span>
                </div>
              )}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-dark disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de redefinição"}
              </button>

              <Link
                to="/cliente"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao login
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
