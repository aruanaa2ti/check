import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Building2,
  Globe,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Server,
  Users,
  WalletCards,
  ChevronDown,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { checkLogoutFn } from "@/lib/check.functions";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/portal/Logo";

const NAV = [
  { to: "/check", label: "Dashboard", icon: LayoutDashboard },
  { to: "/check/chamados", label: "Chamados", icon: MessageSquare },
  { to: "/check/clientes", label: "Clientes", icon: Users },
  { to: "/check/dominios", label: "Domínios", icon: Globe },
  {
    label: "Financeiro",
    icon: Receipt,
    children: [
      { to: "/check/contas-a-receber", label: "Contas a Receber", icon: Receipt },
      { to: "/check/contas-a-pagar", label: "Contas a Pagar", icon: WalletCards },
    ],
  },
  { to: "/check/fornecedores", label: "Fornecedores", icon: Building2 },
  { to: "/check/servicos", label: "Serviços", icon: Server },
] as const;

export function CheckLayout({
  title,
  subtitle,
  userName,
  children,
}: {
  title: string;
  subtitle?: string;
  userName: string;
  children: ReactNode;
}) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  const logout = useServerFn(checkLogoutFn);
  const [open, setOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    await logout({});
    await router.navigate({ to: "/check/login", replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="flex w-full">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-card text-foreground shadow-soft transition-transform lg:static lg:translate-x-0 lg:shadow-none",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="relative flex items-center justify-center px-6 pb-8 pt-7">
            <Link to="/check" className="block">
              <Logo className="h-16 w-auto" />
            </Link>
            <button
              className="absolute right-4 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {NAV.map((item) => {
              if ("children" in item) {
                const ParentIcon = item.icon;
                const parentActive = item.children.some(
                  (child) => path === child.to || path.startsWith(child.to + "/"),
                );
                const expanded = expandedMenus[item.label] ?? parentActive;
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMenus((current) => ({
                          ...current,
                          [item.label]: !(current[item.label] ?? parentActive),
                        }))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
                        parentActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <ParentIcon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                    {expanded && (
                      <div className="space-y-1 pl-7">
                        {item.children.map((child) => {
                          const active = path === child.to || path.startsWith(child.to + "/");
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.to}
                              to={child.to}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "group flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground shadow-glow"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                              )}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const active =
                item.to === "/check"
                  ? path === "/check" || path === "/check/"
                  : path === item.to || path.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </aside>

        {open && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
        )}

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-border bg-background/80 px-5 py-5 backdrop-blur lg:px-10">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-md p-2 text-foreground hover:bg-muted lg:hidden"
                  onClick={() => setOpen(true)}
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">{title}</h1>
                  {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
                </div>
              </div>
              <div className="hidden rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium sm:block">
                {userName}
              </div>
            </div>
          </header>

          <div className="flex-1 px-5 py-8 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
