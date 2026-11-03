import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Shared SQL-safety logic for both dataset formats (legacy packfile in
 * packfiles.ts, bundle in bundles.ts). Kept in its own module — rather than
 * one importing from the other — so the two format implementations don't
 * become circularly dependent, and so this security-relevant check (only a
 * single read-only SELECT/WITH, capped row count) exists in exactly one
 * place instead of drifting between two copies.
 */

export interface SqlResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export const ROW_CAP = 500;

/** Validate a caller-supplied SQL string is a single read-only SELECT/WITH statement. Returns it trimmed (trailing semicolon stripped), or throws. */
export function assertReadOnlySelect(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!/^(select|with)\b/i.test(trimmed)) {
    throw new Error("Only SELECT/WITH (read-only) statements are allowed.");
  }
  if (trimmed.includes(";")) {
    throw new Error("Only a single statement is allowed (no semicolons).");
  }
  return trimmed;
}

/** Run an already-validated statement through a DuckDB connection, capped at ROW_CAP rows. */
export async function runCapped(conn: DuckDBConnection, trimmedSql: string): Promise<SqlResult> {
  const capped = `SELECT * FROM (${trimmedSql}) _q LIMIT ${ROW_CAP + 1}`;
  const reader = await conn.runAndReadAll(capped);
  const rows = reader.getRowObjects() as Record<string, unknown>[];
  const truncated = rows.length > ROW_CAP;
  const finalRows = truncated ? rows.slice(0, ROW_CAP) : rows;
  const columns = finalRows.length > 0 ? Object.keys(finalRows[0]) : [];
  return { columns, rows: finalRows, rowCount: finalRows.length, truncated };
}
