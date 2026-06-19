import { createServerFn } from "@tanstack/react-start";
import { promises as dns } from "node:dns";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const reverseDnsFn = createServerFn({ method: "POST" })
  .inputValidator((d: { ip: string }) =>
    z.object({ ip: z.string().ip() }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const hosts = await dns.reverse(data.ip);
      return { hostname: hosts[0] ?? "" };
    } catch {
      return { hostname: "" };
    }
  });

export const getDownloadFilesFn = createServerFn({ method: "GET" }).handler(async () => {
  const dir = path.join(process.cwd(), "public", "downloads");
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".exe"))
        .map(async (entry) => {
          const fileStat = await stat(path.join(dir, entry.name));
          return {
            name: entry.name,
            href: `/downloads/${encodeURIComponent(entry.name)}`,
            size: fileStat.size,
            modifiedAt: fileStat.mtime.toISOString(),
          };
        }),
    );
    return files.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } catch {
    return [];
  }
});
