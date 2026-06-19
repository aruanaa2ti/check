import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/portal/Logo";
import { checkLoginFn, checkMeFn } from "@/lib/check.functions";

export const Route = createFileRoute("/check/login")({
  head: () => ({
    meta: [
      { title: "Check | a2 Soluções em T.I." },
      {
        name: "description",
        content: "Acesso interno para colaboradores da A2 Soluções em T.I.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async () => {
    const me = await checkMeFn();
    if (me) throw redirect({ to: "/check" });
    return null;
  },
  component: CheckLoginPage,
});

function CheckLoginPage() {
  const router = useRouter();
  const login = useServerFn(checkLoginFn);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ data: { username, password } });
      await router.navigate({ to: "/check", replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Falha ao entrar.");
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
              <h2 className="text-3xl font-bold leading-tight">
                Check interno,
                <br />
                <span className="text-brand">integrado ao Sistema</span>.
              </h2>
              <p className="mt-4 max-w-sm text-sm text-white/70">
                Consulte clientes, serviços e execute ações administrativas com
                as credenciais do painel WHMCS.
              </p>
            </div>
            <div className="flex gap-6 text-xs text-white/50">
              <span>● Clientes</span>
              <span>● Serviços</span>
              <span>● Reativação</span>
            </div>
          </div>

          <div className="flex flex-col justify-center p-8 sm:p-12">
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo className="h-16 w-auto" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Acesse o Check
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre com usuário e senha de colaborador.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Usuário
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-10 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                    placeholder="admin"
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
                    onChange={(event) => setPassword(event.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-10 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                    placeholder="••••••••"
                  />
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

              <Link
                to="/"
                className="inline-block text-xs text-muted-foreground hover:text-foreground"
              >
                Voltar ao site
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
