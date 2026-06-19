import { useSession } from "@tanstack/react-start/server";
import { createHash } from "crypto";

export type PortalSession = {
  userId?: number;
  contactId?: number;
  email?: string;
  name?: string;
};

export type CheckSession = {
  email?: string;
  name?: string;
  adminId?: number;
  permissions?: string;
  role?: string;
  roleId?: number;
};

function derivedPassword(): string {
  const raw = process.env.PORTAL_SESSION_SECRET || "dev-insecure-portal-secret-fallback";
  // Always return a 64-char hex (>=32 chars required by iron-session/useSession).
  return createHash("sha256").update(raw).digest("hex");
}

export function portalSession() {
  return useSession<PortalSession>({
    password: derivedPassword(),
    name: "a2_portal_session",
    maxAge: 60 * 60 * 8, // 8h
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}

export function checkSession() {
  return useSession<CheckSession>({
    password: derivedPassword(),
    name: "a2_check_session",
    maxAge: 60 * 60 * 8, // 8h
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}

export async function requireSessionUser(): Promise<{ userId: number; contactId?: number; email: string; name: string }> {
  const s = await portalSession();
  if (!s.data?.userId) {
    throw new Error("Não autenticado");
  }
  return {
    userId: s.data.userId,
    contactId: s.data.contactId,
    email: s.data.email ?? "",
    name: s.data.name ?? "Cliente",
  };
}

export async function requireCheckUser(): Promise<{
  email: string;
  name: string;
  adminId: number;
  permissions: string;
  role: string;
  roleId: number;
}> {
  const s = await checkSession();
  if (!s.data?.email) {
    throw new Error("Não autenticado");
  }
  return {
    email: s.data.email,
    name: s.data.name ?? s.data.email,
    adminId: Number(s.data.adminId ?? 0),
    permissions: s.data.permissions ?? "",
    role: s.data.role ?? "",
    roleId: Number(s.data.roleId ?? 0),
  };
}
