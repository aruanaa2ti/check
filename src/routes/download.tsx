import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Download, FileDown } from "lucide-react";
import { getDownloadFilesFn } from "@/lib/tools.functions";
import { ToolCard, ToolPageShell } from "@/components/tool-page-shell";

const opts = queryOptions({
  queryKey: ["downloads"],
  queryFn: () => getDownloadFilesFn(),
});

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "a2 Soluções em T.I." },
      {
        name: "description",
        content:
          "Baixe aplicativos e instaladores disponibilizados pela A2 Soluções em T.I.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: DownloadPage,
});

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function DownloadPage() {
  const { data: files } = useSuspenseQuery(opts);

  return (
    <ToolPageShell
      title="Download"
      subtitle="Arquivos e instaladores disponibilizados pela A2."
    >
      <ToolCard>
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <FileDown className="mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Nenhum arquivo disponível</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Coloque arquivos `.exe` na pasta `public/downloads` para eles
              aparecerem aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {files.map((file) => (
              <div
                key={file.href}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileDown className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{file.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </div>
                  </div>
                </div>
                <a
                  href={file.href}
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01]"
                >
                  <Download className="h-4 w-4" />
                  Baixar
                </a>
              </div>
            ))}
          </div>
        )}
      </ToolCard>
    </ToolPageShell>
  );
}
