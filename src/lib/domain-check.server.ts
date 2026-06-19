import { promises as dns } from "node:dns";

export type DnsCheck = {
  rootA: { ip: string; reverse: string }[];
  wwwA: { ip: string; reverse: string }[];
  mx: { priority: number; exchange: string }[];
  spf: string[];
  ns: string[];
};

export type RegistroCheck = {
  domain: string;
  source: string;
  sourceLabel: string;
  status: string;
  ownerId: string;
  techId: string;
  created: string;
  changed: string;
  expires: string;
  registrar: string;
  holder: string;
  holderDocument: string;
  nameservers: string[];
};

async function dohQuery(name: string, type: string) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/dns-json",
      "User-Agent": "A2CheckDNS/2.0",
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const answers = Array.isArray(data.Answer) ? data.Answer : [];
  return answers.map((answer: any) => String(answer.data ?? "").trim()).filter(Boolean);
}

async function safeReverse(ip: string) {
  try {
    return (await dns.reverse(ip))[0] ?? "";
  } catch {
    return "";
  }
}

async function resolveAWithReverse(hostname: string) {
  const ips = (await dohQuery(hostname, "A")).filter((value) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value));
  return Promise.all(
    ips.map(async (ip) => ({
      ip,
      reverse: await safeReverse(ip),
    })),
  );
}

async function safeResolveMx(domain: string) {
  const values = await dohQuery(domain, "MX");
  return values
    .map((value) => {
      const [priority, ...host] = value.split(/\s+/);
      return { priority: Number(priority) || 0, exchange: host.join(" ").replace(/\.$/, "") };
    })
    .filter((item) => item.exchange)
    .sort((a, b) => a.priority - b.priority);
}

async function safeResolveSpf(domain: string) {
  const values = await dohQuery(domain, "TXT");
  return values
    .map((entry) => entry.replace(/^"|"$/g, "").replace(/"\s+"/g, ""))
    .filter((entry) => entry.toLowerCase().startsWith("v=spf1"));
}

async function safeResolveNs(domain: string) {
  return (await dohQuery(domain, "NS")).map((entry) => entry.replace(/\.$/, "").toLowerCase());
}

export async function resolveDomainDns(domain: string): Promise<DnsCheck> {
  const normalized = domain.trim().toLowerCase();
  const [rootA, wwwA, mx, spf, ns] = await Promise.all([
    resolveAWithReverse(normalized),
    resolveAWithReverse(`www.${normalized}`),
    safeResolveMx(normalized),
    safeResolveSpf(normalized),
    safeResolveNs(normalized),
  ]);

  return { rootA, wwwA, mx, spf, ns };
}

function formatDateBR(value: string | null | undefined) {
  if (!value) return "";
  const date = String(value).split("T")[0];
  const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const compact = date.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[3]}/${compact[2]}/${compact[1]}`;
  return String(value);
}

function findEventDate(events: any[], needles: string[]) {
  for (const event of events) {
    const action = String(event?.eventAction ?? "").toLowerCase();
    if (needles.some((needle) => action.includes(needle))) return String(event?.eventDate ?? "");
  }
  return "";
}

function entityName(entity: any) {
  if (entity?.fn) return String(entity.fn);
  const rows = entity?.vcardArray?.[1];
  if (!Array.isArray(rows)) return "";
  const row = rows.find((item: any[]) => item?.[0] === "fn" || item?.[0] === "org");
  return String(row?.[3] ?? "");
}

function entityVcardValue(entity: any, field: string) {
  const rows = entity?.vcardArray?.[1];
  if (!Array.isArray(rows)) return "";
  const row = rows.find((item: any[]) => item?.[0] === field);
  return String(row?.[3] ?? "");
}

function entityPublicId(entity: any, type: string) {
  const ids = Array.isArray(entity?.publicIds) ? entity.publicIds : [];
  return String(ids.find((id: any) => String(id?.type ?? "").toLowerCase() === type)?.identifier ?? "");
}

function findEntityByRole(entities: any[], role: string) {
  return entities.find((entity) => {
    const roles = Array.isArray(entity?.roles) ? entity.roles : [];
    return roles.map((item: string) => item.toLowerCase()).includes(role);
  });
}

function contactId(entity: any) {
  return String(entity?.handle ?? entityVcardValue(entity, "email") ?? "").trim();
}

function registrarName(data: any) {
  if (data?.registrarName) return String(data.registrarName);
  const registrar = findEntityByRole(Array.isArray(data?.entities) ? data.entities : [], "registrar");
  return entityName(registrar) || String(registrar?.handle ?? "");
}

function rdapSource(domain: string) {
  if (domain.endsWith(".br")) {
    return {
      supported: true,
      source: "registrobr",
      label: "Registro.br",
      url: `https://rdap.registro.br/domain/${encodeURIComponent(domain)}`,
      accept: "application/json",
    };
  }
  if (domain.endsWith(".com")) {
    return {
      supported: true,
      source: "verisign_rdap",
      label: "Domínio .com",
      url: `https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(domain)}`,
      accept: "application/rdap+json, application/json",
    };
  }
  return { supported: false, source: "unsupported", label: "Registro do Domínio", url: "", accept: "application/json" };
}

export async function queryRegistroBr(domain: string): Promise<RegistroCheck | null> {
  const normalized = domain.trim().toLowerCase();
  const source = rdapSource(normalized);
  if (!source.supported) return null;

  const res = await fetch(source.url, {
    headers: {
      Accept: source.accept,
      "User-Agent": "A2CheckRegistro/2.0",
    },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const events = Array.isArray(data.events) ? data.events : [];
  const entities = Array.isArray(data.entities) ? data.entities : [];
  const registrant = findEntityByRole(entities, "registrant");
  const technical = findEntityByRole(entities, "technical");
  const holderContact = findEntityByRole(Array.isArray(registrant?.entities) ? registrant.entities : [], "administrative");

  return {
    domain: normalized,
    source: source.source,
    sourceLabel: source.label,
    status: (Array.isArray(data.status) ? data.status : [data.status]).filter(Boolean).join(", "),
    ownerId: contactId(holderContact) || String(registrant?.handle ?? ""),
    techId: contactId(technical),
    created: formatDateBR(findEventDate(events, ["registration", "registered", "creation"])),
    changed: formatDateBR(findEventDate(events, ["last changed", "last update of rdap database", "updated", "update"])),
    expires: formatDateBR(findEventDate(events, ["expiration", "expiry", "expired"])),
    registrar: registrarName(data),
    holder: entityName(registrant),
    holderDocument: entityPublicId(registrant, "cnpj") || entityPublicId(registrant, "cpf"),
    nameservers: (Array.isArray(data.nameservers) ? data.nameservers : [])
      .map((item: any) => String(item?.ldhName ?? "").toLowerCase())
      .filter(Boolean),
  };
}
