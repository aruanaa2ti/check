import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { loginFn, meFn } from "@/lib/portal.functions";
import { Logo } from "@/components/portal/Logo";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: "Cliente | a2 Soluções em T.I." },
      {
        name: "description",
        content:
          "Acesse sua área do cliente A2 TI para gerenciar serviços, domínios e faturas.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async () => {
    const me = await meFn();
    if (me) throw redirect({ to: "/cliente/dashboard" });
    return null;
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const doLogin = useServerFn(loginFn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await doLogin({ data: { email, password } });
      await router.navigate({ to: "/cliente/dashboard", replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background flair */}
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
          {/* Left — brand */}
          <div className="relative hidden flex-col justify-between ink-gradient p-10 text-white lg:flex">
            <div className="flex justify-center">
              <Logo variant="light" className="h-16 w-auto" />
            </div>
            <div>
              <h2 className="text-3xl font-bold leading-tight">
                Sua infraestrutura,
                <br />
                <span className="text-brand">no controle</span>.
              </h2>
              <p className="mt-4 max-w-sm text-sm text-white/70">
                Gerencie serviços, domínios e faturas em um único lugar — com a
                tranquilidade de quem confia na A2 Soluções em T.I.
              </p>
            </div>
            <div className="flex gap-6 text-xs text-white/50">
              <span>● Monitoramento 24/7</span>
              <span>● Suporte especializado</span>
            </div>
          </div>

          {/* Right — form */}
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo className="h-16 w-auto" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Acesse sua conta
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre com seu e-mail e senha.
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

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-10 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex justify-end">
                  <Link
                    to="/esqueci-senha"
                    className="text-xs font-medium text-brand-dark hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-dark disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-start text-xs text-muted-foreground">
                <a href="/" className="hover:text-foreground">
                  ← Voltar ao site
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
