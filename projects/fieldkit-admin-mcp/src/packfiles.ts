import { mkdir, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { speckleQuery } from "./speckle.js";
import { assertReadOnlySelect, runCapped, type SqlResult } from "./sqlSafety.js";
import { bundleListPropertyPaths, bundlePropertyBreakdown, queryBundle } from "./bundles.js";
import { assertAuthenticatedResponse, FieldKitConfigurationError } from "./errors.js";

/**
 * Model-data analytics: downloads and queries the per-version "packfile"
 * datasets that the Speckle web app's own AI/analytics feature uses —
 * DuckDB files bundling a version's objects (main dataset) and a
 * pre-extracted entity-attribute-value table of every object's properties
 * (EAV dataset), so questions like "what's actually been modeled in this
 * project" can be answered with SQL instead of walking the object graph.
 *
 * Reverse-engineered from `@speckle/packfile-manager` /
 * `packages/frontend-3/lib/eav` in the server monorepo (the browser-side
 * implementation runs on DuckDB-WASM + OPFS; this is the same download +
 * query logic re-hosted for Node using @duckdb/node-api, since that browser
 * plumbing doesn't run server-side). Confirmed against source, not docs:
 *  - GraphQL fields: Version.objectKey / .packfileSize / .referencedObject
 *  - REST endpoints: /api/v1/projects/{p}/models/{m}/versions/{v}/download
 *    and .../eav/download, both Bearer-token authenticated
 *  - EAV `properties` table columns: object_id, path, type, value_text, value_num
 * This is a newer feature (present in the internal monorepo, not in the
 * public speckle-server OSS repo as of mid-2026) — if these paths/fields
 * change server-side, these tools will fail with a clear HTTP/SQL error
 * rather than silently returning wrong data.
 *
 * Server 2026.9 introduced a SECOND, incompatible dataset format on top of
 * this one: the bundle era (`Version.schemaVersion === 3`), served from the
 * `/v2/.../artifacts` rail with a different parquet schema (see
 * speckle-bundle-spec) instead of this module's packfile duckdb + EAV
 * duckdb pair. `resolveDataset` below reads `schemaVersion` and every
 * exported function here dispatches to bundles.ts for bundle-only versions
 * — see that file's header for why the two formats can't share one query
 * path.
 */

export interface VersionDatasetInfo {
  projectId: string;
  modelId: string;
  versionId: string;
  projectName: string;
  modelName: string;
  createdAt: string;
  referencedObject: string;
  /** Legacy packfile-era dataset presence (objectKey !== null). False for bundle-era versions, which never populate objectKey. */
  hasPackfile: boolean;
  packfileSizeBytes: number | null;
  /** Server-owned storage-shape flag: null/absent = legacy (objects or packfile era), 3 = bundle (server 2026.9+). Public GraphQL vocabulary — see Version.schemaVersion. */
  schemaVersion: number | null;
  /** Which dataset format run_model_sql/list_model_property_paths/get_model_property_breakdown will actually query. */
  format: "legacy" | "bundle";
  /** Whether a dataset actually exists to query. For bundle-only versions this is inferred from schemaVersion alone (ADR-0003: a version is never born before its bundle exists, so schemaVersion===3 guarantees the artifacts are present) — no extra network call needed to check. */
  hasDataset: boolean;
}

function serverUrl(): string {
  const url = process.env.SPECKLE_SERVER_URL;
  if (!url) throw new FieldKitConfigurationError("SPECKLE_SERVER_URL is not set.");
  return url.replace(/\/$/, "");
}

function token(): string {
  const t = process.env.SPECKLE_TOKEN;
  if (!t) throw new FieldKitConfigurationError("SPECKLE_TOKEN is not set.");
  return t;
}

/** Check whether a version has a generated packfile dataset, and how big it is. */
export async function resolveDataset(
  projectId: string,
  modelId: string,
  versionId: string,
): Promise<VersionDatasetInfo> {
  const data = await speckleQuery<{
    project: {
      name: string;
      model: {
        name: string;
        version: {
          id: string;
          referencedObject: string;
          objectKey: string | null;
          createdAt: string;
          packfileSize: number | string | null;
          schemaVersion: number | null;
        } | null;
      } | null;
    } | null;
  }>(
    `query PackfileResolveVersion($projectId: String!, $modelId: String!, $versionId: String!) {
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
    }`,
    { projectId, modelId, versionId },
  );

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

function cacheDir(): string {
  return join(tmpdir(), "fieldkit-admin-mcp", "packfiles");
}

function cacheKey(ref: { projectId: string; modelId: string; versionId: string }): string {
  return `${ref.projectId}_${ref.modelId}_${ref.versionId}`;
}

async function downloadFile(url: string, destPath: string): Promise<number> {
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
export async function ensurePackfilesDownloaded(
  ref: { projectId: string; modelId: string; versionId: string },
  which: "main" | "eav" | "both",
): Promise<{ mainPath: string | null; eavPath: string | null }> {
  const key = cacheKey(ref);
  const mainPath = join(cacheDir(), `${key}.duckdb`);
  const eavPath = join(cacheDir(), `${key}.eav.duckdb`);
  const base = `${serverUrl()}/api/v1/projects/${ref.projectId}/models/${ref.modelId}/versions/${ref.versionId}`;

  const result: { mainPath: string | null; eavPath: string | null } = { mainPath: null, eavPath: null };

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

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

type VersionRef = { projectId: string; modelId: string; versionId: string };

/** Legacy-era-only: run a read-only SQL query against one or both attached packfiles for a single version. */
async function queryLegacyPackfile(ref: VersionRef, sql: string, which: "main" | "eav" | "both"): Promise<SqlResult> {
  const trimmed = assertReadOnlySelect(sql);
  const { mainPath, eavPath } = await ensurePackfilesDownloaded(ref, which);

  const instance = await DuckDBInstance.create(":memory:");
  const conn = await instance.connect();
  try {
    if (mainPath) await conn.run(`ATTACH '${mainPath.replaceAll("'", "''")}' AS pf (READ_ONLY)`);
    if (eavPath) await conn.run(`ATTACH '${eavPath.replaceAll("'", "''")}' AS eav (READ_ONLY)`);
    return await runCapped(conn, trimmed);
  } finally {
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
export async function queryPackfile(ref: VersionRef, sql: string, which: "main" | "eav" | "both"): Promise<SqlResult> {
  const info = await resolveDataset(ref.projectId, ref.modelId, ref.versionId);
  if (info.format === "bundle") {
    return queryBundle(ref, sql);
  }
  return queryLegacyPackfile(ref, sql, which);
}

/** Convenience: object counts grouped by a given property path (default "category"). Format-dispatching — see queryPackfile. */
export async function propertyBreakdown(ref: VersionRef, path: string): Promise<SqlResult> {
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
export async function listPropertyPaths(ref: VersionRef): Promise<SqlResult> {
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
