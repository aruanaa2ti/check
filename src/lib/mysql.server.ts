import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getPool() {
  pool ??= mysql.createPool({
    host: env("MYSQL_HOST"),
    port: Number(process.env.MYSQL_PORT || 3306),
    database: env("MYSQL_DATABASE"),
    user: env("MYSQL_USER"),
    password: env("MYSQL_PASSWORD"),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    charset: "utf8mb4",
  });
  return pool;
}

export async function mysqlQuery<T = any>(sql: string, params: Record<string, unknown> = {}) {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

export async function mysqlOne<T = any>(sql: string, params: Record<string, unknown> = {}) {
  const rows = await mysqlQuery<T>(sql, params);
  return rows[0] ?? null;
}

export async function mysqlExec(sql: string, params: Record<string, unknown> = {}) {
  const [result] = await getPool().execute(sql, params);
  return result;
}
