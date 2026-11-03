import { mkdir, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { speckleQuery } from "./speckle.js";
import { assertReadOnlySelect, runCapped } from "./sqlSafety.js";
import { bundleListPropertyPaths, bundlePropertyBreakdown, queryBundle } from "./bundles.js";
import { assertAuthenticatedResponse, FieldKitConfigurationError } from "./errors.js";
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
/** Check whether a version has a generated packfile dataset, and how big it is. */
export async function resolveDataset(projectId, modelId, versionId) {
    const data = await speckleQuery(`query PackfileResolveVersion($projectId: String!, $modelId: String!, $versionId: String!) {
      project(id: $projectId) {
        name
        model(id: $modelId) {
          name
          version(id: $versionId) {
            id
            referencedObject
            objectKey
            createdAt
            packfileSize
            schemaVersion
          }
        }
      }
    }`, { projectId, modelId, versionId });
    const project = data.project;
    const model = project?.model;
    const version = model?.version;
    if (!project || !model || !version) {
        throw new Error(`Version ${versionId} not found for model ${modelId} in project ${projectId}.`);
    }
    // Bundle (schemaVersion === 3): existence = readiness (ADR-0003) — the commit row is
    // only ever created at bundle-complete, so a bundle-only version's artifacts are
    // guaranteed present without a separate /v2/.../artifacts round trip to check.
    const isBundle = version.schemaVersion === 3;
    return {
        projectId,
        modelId,
        versionId: version.id,
        projectName: project.name,
        modelName: model.name,
        createdAt: version.createdAt,
        referencedObject: version.referencedObject,
        hasPackfile: version.objectKey !== null,
        packfileSizeBytes: version.packfileSize ? Number(version.packfileSize) : null,
        schemaVersion: version.schemaVersion,
        format: isBundle ? "bundle" : "legacy",
        hasDataset: isBundle ? true : version.objectKey !== null,
    };
}
function cacheDir() {
    return join(tmpdir(), "fieldkit-admin-mcp", "packfiles");
}
function cacheKey(ref) {
    return `${ref.projectId}_${ref.modelId}_${ref.versionId}`;
}
async function downloadFile(url, destPath) {
    const res = await fetch(url, { headers: { authorization: `Bearer ${token()}` } });
    assertAuthenticatedResponse(res, {
        operation: "download model data",
        resource: "the requested project, model and version",
        scopeHints: ["profile:read"],
    });
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(cacheDir(), { recursive: true });
    await writeFile(destPath, buf);
    return buf.byteLength;
}
/** Download (or reuse a cached copy of) a version's main and/or EAV packfile. Returns local paths. */
export async function ensurePackfilesDownloaded(ref, which) {
    const key = cacheKey(ref);
    const mainPath = join(cacheDir(), `${key}.duckdb`);
    const eavPath = join(cacheDir(), `${key}.eav.duckdb`);
    const base = `${serverUrl()}/api/v1/projects/${ref.projectId}/models/${ref.modelId}/versions/${ref.versionId}`;
    const result = { mainPath: null, eavPath: null };
    if (which === "main" || which === "both") {
        if (!(await fileExists(mainPath))) {
            await downloadFile(`${base}/download`, mainPath);
        }
        result.mainPath = mainPath;
    }
    if (which === "eav" || which === "both") {
        if (!(await fileExists(eavPath))) {
            await downloadFile(`${base}/eav/download`, eavPath);
        }
        result.eavPath = eavPath;
    }
    return result;
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
/** Legacy-era-only: run a read-only SQL query against one or both attached packfiles for a single version. */
async function queryLegacyPackfile(ref, sql, which) {
    const trimmed = assertReadOnlySelect(sql);
    const { mainPath, eavPath } = await ensurePackfilesDownloaded(ref, which);
    const instance = await DuckDBInstance.create(":memory:");
    const conn = await instance.connect();
    try {
        if (mainPath)
            await conn.run(`ATTACH '${mainPath.replaceAll("'", "''")}' AS pf (READ_ONLY)`);
        if (eavPath)
            await conn.run(`ATTACH '${eavPath.replaceAll("'", "''")}' AS eav (READ_ONLY)`);
        return await runCapped(conn, trimmed);
    }
    finally {
        conn.closeSync();
    }
}
/**
 * Run a read-only SQL query against a version's model dataset, whichever
 * format it's in. Legacy/packfile-era versions query `pf.*`/`eav.properties`
 * as before; bundle-era versions (schemaVersion 3) dispatch to bundles.ts,
 * which mounts a completely different set of views under schema `bundle`
 * (object_properties, paths, nodes, relations, ...) — see that file for why.
 */
export async function queryPackfile(ref, sql, which) {
    const info = await resolveDataset(ref.projectId, ref.modelId, ref.versionId);
    if (info.format === "bundle") {
        return queryBundle(ref, sql);
    }
    return queryLegacyPackfile(ref, sql, which);
}
/** Convenience: object counts grouped by a given property path (default "category"). Format-dispatching — see queryPackfile. */
export async function propertyBreakdown(ref, path) {
    const info = await resolveDataset(ref.projectId, ref.modelId, ref.versionId);
    if (info.format === "bundle") {
        return bundlePropertyBreakdown(ref, path);
    }
    const escaped = path.replaceAll("'", "''");
    const sql = `SELECT value_text AS value, COUNT(DISTINCT object_id) AS object_count
    FROM eav.properties
    WHERE path = '${escaped}'
    GROUP BY value_text
    ORDER BY object_count DESC`;
    return queryLegacyPackfile(ref, sql, "eav");
}
/** Convenience: every distinct property path present, with how many objects carry it. Format-dispatching — see queryPackfile. */
export async function listPropertyPaths(ref) {
    const info = await resolveDataset(ref.projectId, ref.modelId, ref.versionId);
    if (info.format === "bundle") {
        return bundleListPropertyPaths(ref);
    }
    const sql = `SELECT path, mode(type) AS type, COUNT(DISTINCT object_id) AS object_count
    FROM eav.properties
    GROUP BY path
    ORDER BY object_count DESC`;
    return queryLegacyPackfile(ref, sql, "eav");
}
