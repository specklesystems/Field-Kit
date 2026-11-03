export const ROW_CAP = 500;
/** Validate a caller-supplied SQL string is a single read-only SELECT/WITH statement. Returns it trimmed (trailing semicolon stripped), or throws. */
export function assertReadOnlySelect(sql) {
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
export async function runCapped(conn, trimmedSql) {
    const capped = `SELECT * FROM (${trimmedSql}) _q LIMIT ${ROW_CAP + 1}`;
    const reader = await conn.runAndReadAll(capped);
    const rows = reader.getRowObjects();
    const truncated = rows.length > ROW_CAP;
    const finalRows = truncated ? rows.slice(0, ROW_CAP) : rows;
    const columns = finalRows.length > 0 ? Object.keys(finalRows[0]) : [];
    return { columns, rows: finalRows, rowCount: finalRows.length, truncated };
}
