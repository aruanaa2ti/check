import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Copy, RefreshCw, Check, Shield } from "lucide-react";
import { ToolCard, ToolPageShell } from "@/components/tool-page-shell";

export const Route = createFileRoute("/senha")({
  head: () => ({
    meta: [
      { title: "Gerador de Senha — Ferramentas a2" },
      {
        name: "description",
        content:
          "Gere senhas fortes e seguras direto no seu navegador. Personalize tamanho e caracteres.",
      },
    ],
  }),
  component: Senha,
});

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

function randomFrom(charset: string, n: number) {
  const out = new Array(n);
  const arr = new Uint32Array(n);
  crypto.getRandomValues(arr);
  for (let i = 0; i < n; i++) out[i] = charset[arr[i] % charset.length];
  return out.join("");
}

function generate(
  length: number,
  opts: { lower: boolean; upper: boolean; digits: boolean; symbols: boolean },
) {
  let charset = "";
  if (opts.lower) charset += LOWER;
  if (opts.upper) charset += UPPER;
  if (opts.digits) charset += DIGITS;
  if (opts.symbols) charset += SYMBOLS;
  if (!charset) return "";
  return randomFrom(charset, length);
}

function strength(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 14) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return Math.min(s, 5);
}

function Senha() {
  const [length, setLength] = useState(16);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [pwd, setPwd] = useState("");
  const [copied, setCopied] = useState(false);

  const regenerate = () =>
    setPwd(generate(length, { lower, upper, digits, symbols }));

  useEffect(() => {
    regenerate(); /* eslint-disable-next-line */
  }, [length, lower, upper, digits, symbols]);

  const score = useMemo(() => strength(pwd), [pwd]);
  const labels = [
    "Muito fraca",
    "Fraca",
    "Média",
    "Forte",
    "Muito forte",
    "Excelente",
  ];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-yellow-500",
    "bg-yellow-400",
    "bg-primary",
    "bg-primary",
  ];

  const copy = async () => {
    if (!pwd) return;
    await navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolPageShell
      title="Gerador de Senha"
      subtitle="Crie senhas seguras geradas localmente no seu navegador."
      maxWidth="max-w-2xl"
    >
      <ToolCard className="p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Senha segura</h2>
            <p className="text-sm text-muted-foreground">
              Personalize os critérios e copie o resultado.
            </p>
          </div>
        </div>

        {/* Password display */}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-3">
          <div className="flex-1 break-all font-mono text-sm sm:text-base">
            {pwd}
          </div>
          <button
            onClick={copy}
            className="rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/50"
            aria-label="Copiar"
          >
            {copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={regenerate}
            className="rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/50"
            aria-label="Gerar nova"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Strength */}
        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" /> Força
            </div>
            <div className="font-semibold">{labels[score]}</div>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${i < score ? colors[score] : "bg-secondary"}`}
              />
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="mt-6 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tamanho da senha</label>
              <span className="font-mono text-base font-semibold text-primary">
                {length}
              </span>
            </div>
            <input
              type="range"
              min={6}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--primary)]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Letras minúsculas (a-z)", val: lower, set: setLower },
              { label: "Letras maiúsculas (A-Z)", val: upper, set: setUpper },
              { label: "Números (0-9)", val: digits, set: setDigits },
              { label: "Símbolos (!@#$...)", val: symbols, set: setSymbols },
            ].map((o) => (
              <label
                key={o.label}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:border-primary/40"
              >
                <input
                  type="checkbox"
                  checked={o.val}
                  onChange={(e) => o.set(e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="text-sm">{o.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={regenerate}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]"
        >
          <RefreshCw className="h-4 w-4" /> Gerar nova senha
        </button>
      </ToolCard>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        As senhas são geradas localmente no seu navegador usando criptografia
        segura. Nada é enviado para nossos servidores.
      </p>
    </ToolPageShell>
  );
}
