import { mkdir, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { assertReadOnlySelect, runCapped } from "./sqlSafety.js";
import { assertAuthenticatedResponse, FieldKitConfigurationError } from "./errors.js";
/**
 * Bundle-era (server 2026.9+, `Version.schemaVersion === 3`) model-data
 * support. This is a DIFFERENT wire protocol and a DIFFERENT parquet schema
 * from the packfile era in packfiles.ts — see the atlas glossary's
 * objects/packfile/bundle eras and the big-truck-dev-compat spec:
 *
 *  - Data is served from the `/v2/.../artifacts` presigned-URL listing, not
 *    the old `.../download` / `.../eav/download` streaming endpoints.
 *  - The files are a set of `eav.*` / `envelope.*` parquet files (schema
 *    defined in speckle-bundle-spec's spec/bundle-spec.sql), not a single
 *    packfile duckdb + a separate flat EAV duckdb.
 *  - There is no single denormalized `path`/`value_text` column: property
 *    values live in `eav`/`type_eav` keyed by `path_index` into a `paths`
 *    dictionary, and type-level parameters are a separate join through
 *    `object_type`.
 *
 * The mount logic below (view naming, the synthesized `paths` and
 * `object_properties` views) is ported verbatim from speckle-bundle-spec's
 * query conformance harness (conformance/query/harness.mjs) and
 * speckle-server-internal's packages/ts-sdk/src/data/bundleAttach.ts, which
 * every bundle query engine (server Query Engine, browser attach path, both
 * SDKs) must match byte-for-byte per the "replica invariant" (big-truck spec
 * §8). If either upstream changes this SQL, re-port it here — don't
 * improvise a variant.
 */
const GEOMETRY_SHARD_RE = /\.geometries(?:\.\d+)?\.parquet$/;
const VIEW_NAME_RE = /\.(?:eav|envelope)\.(.+)\.parquet$/;
const VALID_VIEW_NAME_RE = /^[a-zA-Z0-9_]+$/;
const PATHS_RAW_VIEW = "paths_raw";
const APPLICATION_ID_PATH = "applicationId";
const APPLICATION_ID_PATH_INDEX = -1;
const BUNDLE_SCHEMA = "bundle";
/** The view a bundle file mounts as, or null if it's a geometry shard or an unrecognized name (never mounted). */
function viewNameOf(fileName) {
    if (GEOMETRY_SHARD_RE.test(fileName))
        return null;
    const m = fileName.match(VIEW_NAME_RE);
    if (!m)
        return null;
    return VALID_VIEW_NAME_RE.test(m[1]) ? m[1] : null;
}
/** Guard for the synthesized `paths` view: active only when the producer did not already emit applicationId as a real eav path. */
function virtualPathGuard(schema) {
    return `NOT EXISTS (SELECT 1 FROM "${schema}"."${PATHS_RAW_VIEW}" WHERE path = '${APPLICATION_ID_PATH}')`;
}
/** Same guard, phrased against the public `paths` view (real dictionary rows only — the virtual row is negative). */
function virtualArmGuard(schema) {
    return `NOT EXISTS (SELECT 1 FROM "${schema}"."paths" WHERE path = '${APPLICATION_ID_PATH}' AND path_index >= 0)`;
}
/** The public `paths` view: the raw dictionary ∪ the virtual applicationId row. */
function pathsViewSql(schema) {
    return (`CREATE OR REPLACE VIEW "${schema}"."paths" AS ` +
        `SELECT path_index, path FROM "${schema}"."${PATHS_RAW_VIEW}" ` +
        `UNION ALL ` +
        `SELECT ${APPLICATION_ID_PATH_INDEX} AS path_index, '${APPLICATION_ID_PATH}' AS path ` +
        `WHERE ${virtualPathGuard(schema)}`);
}
/** The canonical `object_properties` view: instance eav ∪ type params resolved through object_type ∪ the guarded applicationId arm. */
function objectPropertiesViewSql(schema) {
    const cols = "object_index, path_index, value_string, value_double, value_boolean, unit, internal_definition_name";
    return (`CREATE OR REPLACE VIEW "${schema}"."object_properties" AS ` +
        `SELECT ${cols} FROM "${schema}"."eav" ` +
        `UNION ALL ` +
        `SELECT ot.object_index, te.path_index, te.value_string, te.value_double, ` +
        `te.value_boolean, te.unit, te.internal_definition_name ` +
        `FROM "${schema}"."object_type" ot JOIN "${schema}"."type_eav" te ON te.type_index = ot.type_index ` +
        `UNION ALL ` +
        `SELECT o.object_index, ${APPLICATION_ID_PATH_INDEX}, o.application_id, ` +
        `NULL, NULL, NULL, NULL ` +
        `FROM "${schema}"."objects" o WHERE ${virtualArmGuard(schema)}`);
}
function serverUrl() {
    const url = process.env.SPECKLE_SERVER_URL;
    if (!url)
        throw new FieldKitConfigurationError("SPECKLE_SERVER_URL is not set.");
    return url.replace(/\/$/, "");
}
function token() {
    const t = process.env.SPECKLE_TOKEN;
    if (!t)
        throw new FieldKitConfigurationError("SPECKLE_TOKEN is not set.");
    return t;
}
/** GET the presigned artifact-file listing for a version. Requires Bearer auth (unlike the presigned per-file URLs it returns). */
async function fetchArtifacts(ref) {
    const url = `${serverUrl()}/api/v2/projects/${ref.projectId}/models/${ref.modelId}/versions/${ref.versionId}/artifacts`;
    const res = await fetch(url, { headers: { authorization: `Bearer ${token()}` } });
    if (res.status === 404) {
        throw new Error(`Version ${ref.versionId} has no bundle artifacts (404 from /v2/.../artifacts). ` +
            `Its schemaVersion says bundle, but nothing is stored yet — the ingestion may still be running.`);
    }
    assertAuthenticatedResponse(res, {
        operation: "list bundle artifacts",
        resource: "the requested project, model and version",
        scopeHints: ["profile:read"],
    });
    const body = (await res.json());
    if (!body.files?.length)
        throw new Error("Bundle artifacts response had no files.");
    return body;
}
function cacheDir() {
    return join(tmpdir(), "fieldkit-admin-mcp", "bundles");
}
function cacheKey(ref) {
    return `${ref.projectId}_${ref.modelId}_${ref.versionId}`;
}
async function fileExists(path) {
    try {
        await stat(path);
        return true;
    }
    catch {
        return false;
    }
}
/** Download one artifact file from its presigned URL (no auth header — the URL itself is the credential). */
async function downloadFile(url, destPath) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Bundle file download failed: ${res.status} ${res.statusText} (${url})`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buf);
}
/**
 * Download (or reuse cached copies of) every mountable eav/envelope file in a
 * version's bundle. Geometry shards and any file with an unrecognized name
 * are skipped — they're never mounted as SQL views (geometry is raw mesh
 * blobs, not queryable data; per speckle-bundle-spec's query conformance
 * suite these are exactly the `notMounted` set).
 */
async function ensureBundleDownloaded(ref) {
    const { files } = await fetchArtifacts(ref);
    const dir = join(cacheDir(), cacheKey(ref));
    await mkdir(dir, { recursive: true });
    const seen = new Set();
    const views = [];
    for (const file of files) {
        const view = viewNameOf(file.name);
        if (!view || seen.has(view))
            continue; // geometry shard, unrecognized name, or duplicate view name (first wins)
        seen.add(view);
        const destPath = join(dir, file.name);
        if (!(await fileExists(destPath))) {
            await downloadFile(file.url, destPath);
        }
        views.push({ view: view === "paths" ? PATHS_RAW_VIEW : view, path: destPath });
    }
    if (views.length === 0) {
        throw new Error("Bundle artifact list had no mountable eav/envelope parquet files.");
    }
    return views;
}
/** Mount a bundle's downloaded files as views under one DuckDB schema, including the synthesized paths/object_properties views. */
async function mountBundle(conn, schema, views) {
    await conn.run(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    for (const v of views) {
        const escaped = v.path.replaceAll("'", "''");
        await conn.run(`CREATE OR REPLACE VIEW "${schema}"."${v.view}" AS SELECT * FROM read_parquet('${escaped}')`);
    }
    // Order matters: `paths` must exist before `object_properties`, whose guard reads it.
    await conn.run(pathsViewSql(schema));
    await conn.run(objectPropertiesViewSql(schema));
}
/** Download + mount a bundle, then run the SQL chosen once the mounted view names are known. */
async function runOnBundle(ref, sqlFor) {
    const views = await ensureBundleDownloaded(ref);
    const trimmed = assertReadOnlySelect(sqlFor(new Set(views.map((v) => v.view))));
    const instance = await DuckDBInstance.create(":memory:");
    const conn = await instance.connect();
    try {
        await mountBundle(conn, BUNDLE_SCHEMA, views);
        return await runCapped(conn, trimmed);
    }
    finally {
        conn.closeSync();
    }
}
/** Run a read-only SQL query against a bundle-only version's mounted views (schema "bundle": objects, paths, eav, types, type_eav, object_type, nodes, relations, rel_types, node_kinds, meta, object_properties, and whatever optional tables the bundle carries). */
export async function queryBundle(ref, sql) {
    return runOnBundle(ref, () => sql);
}
/** Convenience: object counts grouped by a given property path, resolved through the bundle's paths dictionary and instance+type object_properties union. */
export async function bundlePropertyBreakdown(ref, path) {
    const escaped = path.replaceAll("'", "''");
    const sql = `SELECT COALESCE(op.value_string, CAST(op.value_double AS VARCHAR), CAST(op.value_boolean AS VARCHAR)) AS value,
    COUNT(DISTINCT op.object_index) AS object_count
    FROM "${BUNDLE_SCHEMA}".object_properties op
    JOIN "${BUNDLE_SCHEMA}".paths p ON p.path_index = op.path_index
    WHERE p.path = '${escaped}'
    GROUP BY value
    ORDER BY object_count DESC`;
    return queryBundle(ref, sql);
}
// Server-built bundles ship a `{base}.eav.path_stats.parquet` sidecar (path_index,
// object_count, n_string, n_double, n_boolean, ...) with per-path coverage
// precomputed across the instance+type union. It is NOT declared in
// speckle-bundle-spec's bundle_files, so it cannot be assumed present — the full
// object_properties scan stays as the fallback.
//
// Type inference in both arms tests double before string: producers set BOTH
// value_string (the number as text) and value_double on numeric rows, so a
// string-first test calls every numeric path 'string'. In the sidecar that shows
// up as n_string >= n_double always; a path is numeric when doubles cover at
// least half its string rows (mostly-text paths with a few numeric strays, like
// `name`, stay 'string').
const PATH_STATS_VIEW = "path_stats";
/** Convenience: every distinct property path present (instance + type-resolved), with how many objects carry it and its inferred value type. Excludes the synthesized applicationId path (path_index < 0) — a unique-per-object dimension isn't a useful grouping path. */
export async function bundleListPropertyPaths(ref) {
    return runOnBundle(ref, (mounted) => mounted.has(PATH_STATS_VIEW)
        ? `SELECT p.path,
          CASE WHEN s.n_boolean > s.n_string AND s.n_boolean > s.n_double THEN 'boolean'
               WHEN s.n_double > 0 AND s.n_double * 2 >= s.n_string THEN 'number'
               ELSE 'string' END AS type,
          s.object_count
        FROM "${BUNDLE_SCHEMA}".${PATH_STATS_VIEW} s
        JOIN "${BUNDLE_SCHEMA}".paths p ON p.path_index = s.path_index
        WHERE p.path_index >= 0
        ORDER BY s.object_count DESC`
        : `SELECT p.path,
          mode(CASE WHEN op.value_boolean IS NOT NULL THEN 'boolean'
                    WHEN op.value_double IS NOT NULL THEN 'number'
                    WHEN op.value_string IS NOT NULL THEN 'string' END) AS type,
          COUNT(DISTINCT op.object_index) AS object_count
        FROM "${BUNDLE_SCHEMA}".object_properties op
        JOIN "${BUNDLE_SCHEMA}".paths p ON p.path_index = op.path_index
        WHERE p.path_index >= 0
        GROUP BY p.path
        ORDER BY object_count DESC`);
}
