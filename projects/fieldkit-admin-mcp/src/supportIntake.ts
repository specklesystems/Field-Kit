import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { speckleQuery } from "./speckle.js";
import { FieldKitConfigurationError } from "./errors.js";

/**
 * Support-case file intake: create a dedicated project in the support
 * workspace, invite the customer to it, and get a native CAD/BIM file
 * (Revit .rvt, Rhino .3dm, IFC, DWG, ...) into it as a model version.
 *
 * This does NOT go through Speckle connectors or Revit/Rhino automation —
 * it uses Speckle's server-side direct file upload pipeline (a headless
 * importer, Rhino.Inside-based for most formats), the same mechanism behind
 * the "drag a file into a project" flow in the web app. No Revit/Rhino
 * license needed.
 *
 * Flow: workspaceMutations.projects.create (private project) ->
 * projectMutations.invites.createForWorkspace (optional) ->
 * modelMutations.create -> fileUploadMutations.generateUploadUrl ->
 * PUT the file to the returned presigned URL -> fileUploadMutations.startFileIngestion.
 *
 * All four mutations require the `streams:write` scope on the token, which
 * is NOT in this connector's original required-scope list (profile:read,
 * users:read, users:invite, server:setup) — see README.
 *
 * Provenance note: this was first written against
 * `specklesystems/speckle-server` OSS source + the Sept-2025 community
 * migration notice, which both describe `fileUploadMutations.startFileImport`
 * (returning a `FileUpload` with an int `convertedStatus`). Live-tested
 * against app.speckle.systems (Sept 2026), that mutation is gone server-side
 * — an authenticated call gets `UNSUPPORTED_FILE_TYPE`: "The deprecated
 * startFileImport mutation supports no file types on this deployment. Use
 * startFileIngestion instead." Confirmed via GraphQL introspection against
 * the live schema instead: same `StartFileImportInput` shape (projectId,
 * modelId, fileId, etag, + an optional revitUploadSettings), but the
 * mutation is `startFileIngestion` and it returns a `ModelIngestion` with a
 * `statusData` union (Queued/Processing/Success/Failed/Cancelled/Invalid)
 * rather than an int enum. `generateUploadUrl`, the presigned PUT, and
 * `workspaceMutations.projects.create` all still work exactly as written —
 * only the final "register the upload" step moved. None of this is in
 * public docs yet as of writing; re-verify with introspection if it fails
 * again in the future rather than trusting docs or this comment.
 */

function serverUrl(): string {
  const url = process.env.SPECKLE_SERVER_URL;
  if (!url) throw new FieldKitConfigurationError("SPECKLE_SERVER_URL is not set.");
  return url.replace(/\/$/, "");
}

export interface SupportProject {
  id: string;
  name: string;
  visibility: string;
  workspaceId: string | null;
  url: string;
}

/** Create a new project in a workspace, private by default. */
export async function createSupportProject(args: {
  name: string;
  description?: string;
  workspaceId: string;
  visibility?: "PRIVATE" | "WORKSPACE";
}): Promise<SupportProject> {
  const data = await speckleQuery<{
    workspaceMutations: { projects: { create: { id: string; name: string; visibility: string; workspaceId: string | null } } };
  }>(
    `mutation SupportWorkspaceProjectCreate($input: WorkspaceProjectCreateInput!) {
      workspaceMutations {
        projects {
          create(input: $input) { id name visibility workspaceId }
        }
      }
    }`,
    {
      input: {
        name: args.name,
        description: args.description,
        visibility: args.visibility ?? "PRIVATE",
        workspaceId: args.workspaceId,
      },
    },
  );
  const project = data.workspaceMutations.projects.create;
  return { ...project, url: `${serverUrl()}/projects/${project.id}` };
}

/**
 * Invite someone to a project that belongs to a workspace. Unlike a plain
 * project invite, this also lets a workspace role/seat be assigned on
 * acceptance — the right call for a workspace-scoped project like a support
 * case, per Speckle's own `createForWorkspace` mutation (the frontend uses
 * this one, not the base `projectMutations.invites.create`, for any project
 * that lives in a workspace).
 */
export async function inviteToSupportProject(args: {
  projectId: string;
  email: string;
  role?: string;
  workspaceRole?: string;
}): Promise<{ invited: boolean; email: string }> {
  await speckleQuery<{ projectMutations: { invites: { createForWorkspace: { id: string } } } }>(
    `mutation SupportProjectInvite($projectId: ID!, $inputs: [WorkspaceProjectInviteCreateInput!]!) {
      projectMutations {
        invites {
          createForWorkspace(projectId: $projectId, inputs: $inputs) { id }
        }
      }
    }`,
    {
      projectId: args.projectId,
      inputs: [
        {
          email: args.email,
          // Defaults to the contributor project role / guest workspace role if omitted,
          // per WorkspaceProjectInviteCreateInput.
          role: args.role,
          workspaceRole: args.workspaceRole,
        },
      ],
    },
  );
  return { invited: true, email: args.email };
}

/** Create a new model in a project (a named "branch" that versions attach to). */
async function createModel(args: { projectId: string; name: string; description?: string }): Promise<{ id: string; name: string }> {
  const data = await speckleQuery<{ modelMutations: { create: { id: string; name: string } } }>(
    `mutation SupportModelCreate($input: CreateModelInput!) {
      modelMutations { create(input: $input) { id name } }
    }`,
    { input: { projectId: args.projectId, name: args.name, description: args.description } },
  );
  return data.modelMutations.create;
}

export interface UploadResult {
  ingestionId: string;
  projectId: string;
  modelId: string;
  modelName: string;
  fileName: string;
  fileSizeBytes: number;
  modelUrl: string;
}

/**
 * Upload a local binary file to a project and start Speckle's server-side
 * import for it, creating a new model for it first unless an existing
 * modelId is given (e.g. to land a second/updated file from the same
 * customer as a new version on the same model).
 *
 * filePath must be readable from wherever this MCP server process runs
 * (this connector is stdio/local-only — see README — so in practice that's
 * the same machine driving the Claude session that calls this tool).
 */
export async function uploadFileAndImport(args: {
  projectId: string;
  filePath: string;
  modelId?: string;
  modelName?: string;
}): Promise<UploadResult> {
  const fileStat = await stat(args.filePath).catch(() => {
    throw new Error(`File not found or unreadable: ${args.filePath}`);
  });
  if (!fileStat.isFile()) {
    throw new Error(`Not a file: ${args.filePath}`);
  }
  if (fileStat.size === 0) {
    throw new Error(`File is empty: ${args.filePath}`);
  }
  // Server-side limit is 2GB as of the current direct-upload docs; fail fast
  // with a clear message rather than a slow upload that gets rejected server-side.
  const TWO_GB = 2 * 1024 * 1024 * 1024;
  if (fileStat.size > TWO_GB) {
    throw new Error(
      `File is ${(fileStat.size / 1e9).toFixed(2)}GB, which is over Speckle's 2GB direct-upload limit: ${args.filePath}`,
    );
  }

  const fileName = basename(args.filePath);
  const extension = extname(fileName).replace(/^\./, "").toLowerCase();

  // Check against the project's actual accepted formats (workspace-routed —
  // can differ per project/workspace) rather than trusting a hardcoded list.
  const acceptedData = await speckleQuery<{ project: { acceptedIngestionFileTypes: string[] } }>(
    `query SupportAcceptedFileTypes($projectId: String!) {
      project(id: $projectId) { acceptedIngestionFileTypes }
    }`,
    { projectId: args.projectId },
  );
  const accepted = acceptedData.project.acceptedIngestionFileTypes;
  if (accepted.length > 0 && extension && !accepted.includes(extension)) {
    throw new Error(`.${extension} is not an accepted upload format for this project. Accepted: ${accepted.join(", ")}`);
  }

  let modelId = args.modelId;
  let resolvedModelName: string;
  if (modelId) {
    // Uploading into an existing model (e.g. a follow-up file on the same case) — look up its name for the result.
    const data = await speckleQuery<{ project: { model: { name: string } } }>(
      `query SupportExistingModelName($projectId: String!, $modelId: String!) {
        project(id: $projectId) { model(id: $modelId) { name } }
      }`,
      { projectId: args.projectId, modelId },
    );
    resolvedModelName = data.project.model.name;
  } else {
    const name = args.modelName ?? fileName.replace(extname(fileName), "");
    const model = await createModel({ projectId: args.projectId, name, description: `Uploaded from ${fileName}` });
    modelId = model.id;
    resolvedModelName = model.name;
  }

  // Step 1: get a pre-signed upload URL + fileId.
  const generateData = await speckleQuery<{
    fileUploadMutations: { generateUploadUrl: { url: string; fileId: string } };
  }>(
    `mutation SupportGenerateUploadUrl($input: GenerateFileUploadUrlInput!) {
      fileUploadMutations { generateUploadUrl(input: $input) { url fileId } }
    }`,
    { input: { projectId: args.projectId, fileName } },
  );
  const { url: uploadUrl, fileId } = generateData.fileUploadMutations.generateUploadUrl;

  // Step 2: PUT the raw file bytes to that URL. Content-Type isn't validated
  // against anything the mutation input specified (generateUploadUrl only
  // takes projectId/fileName), so a generic binary type is fine here — this
  // mirrors what Speckle's own frontend sends for files the browser can't
  // sniff a specific MIME type for.
  const fileBuffer = await readFile(args.filePath);
  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": "application/octet-stream" },
    body: fileBuffer,
  });
  if (!putResponse.ok) {
    const body = await putResponse.text().catch(() => "");
    throw new Error(`Upload PUT to blob storage failed (${putResponse.status}): ${body.slice(0, 500)}`);
  }
  const etag = putResponse.headers.get("etag");
  if (!etag) {
    throw new Error("Blob storage did not return an ETag header — cannot confirm upload integrity.");
  }

  // Step 3: register the completed upload and queue the ingestion job.
  // Note: this is `startFileIngestion`, not the older `startFileImport` that
  // Speckle's own OSS source/docs still describe — see the file header.
  const startData = await speckleQuery<{
    fileUploadMutations: { startFileIngestion: { id: string } };
  }>(
    `mutation SupportStartFileIngestion($input: StartFileImportInput!) {
      fileUploadMutations { startFileIngestion(input: $input) { id } }
    }`,
    { input: { projectId: args.projectId, modelId, fileId, etag } },
  );

  return {
    ingestionId: startData.fileUploadMutations.startFileIngestion.id,
    projectId: args.projectId,
    modelId,
    modelName: resolvedModelName,
    fileName,
    fileSizeBytes: fileStat.size,
    modelUrl: `${serverUrl()}/projects/${args.projectId}/models/${modelId}`,
  };
}

interface IngestionStatus {
  kind: "Queued" | "Processing" | "Success" | "Failed" | "Cancelled" | "Invalid" | "Unknown";
  progressMessage?: string;
  progress?: number | null;
  versionId?: string;
  errorReason?: string;
  cancellationMessage?: string;
  validationMessage?: string;
}

/**
 * Check on the most recent file import queued via upload_file_to_project for
 * a model. Once it reaches Success, the resulting version also shows up
 * under recentVersions. See the module header for why this queries
 * `latestIngestion` rather than the older `pendingImportedVersions` /
 * `convertedStatus` fields Speckle's own OSS docs still describe.
 */
export async function getFileImportStatus(args: { projectId: string; modelId: string }): Promise<{
  modelId: string;
  modelName: string;
  latestIngestion: { id: string; createdAt: string; updatedAt: string; status: IngestionStatus } | null;
  recentVersions: Array<{ id: string; message: string | null; createdAt: string; sourceApplication: string | null }>;
}> {
  const data = await speckleQuery<{
    project: {
      model: {
        id: string;
        name: string;
        latestIngestion: {
          id: string;
          createdAt: string;
          updatedAt: string;
          statusData:
            | { __typename: "ModelIngestionQueuedStatus"; progressMessage: string }
            | { __typename: "ModelIngestionProcessingStatus"; progressMessage: string; progress: number | null }
            | { __typename: "ModelIngestionSuccessStatus"; versionId: string }
            | { __typename: "ModelIngestionFailedStatus"; errorReason: string }
            | { __typename: "ModelIngestionCancelledStatus"; cancellationMessage: string }
            | { __typename: "ModelIngestionInvalidStatus"; validationMessage: string };
        } | null;
        versions: { items: Array<{ id: string; message: string | null; createdAt: string; sourceApplication: string | null }> };
      };
    };
  }>(
    `query SupportFileImportStatus($projectId: String!, $modelId: String!) {
      project(id: $projectId) {
        model(id: $modelId) {
          id
          name
          latestIngestion {
            id
            createdAt
            updatedAt
            statusData {
              __typename
              ... on ModelIngestionQueuedStatus { progressMessage }
              ... on ModelIngestionProcessingStatus { progressMessage progress }
              ... on ModelIngestionSuccessStatus { versionId }
              ... on ModelIngestionFailedStatus { errorReason }
              ... on ModelIngestionCancelledStatus { cancellationMessage }
              ... on ModelIngestionInvalidStatus { validationMessage }
            }
          }
          versions(limit: 3) {
            items { id message createdAt sourceApplication }
          }
        }
      }
    }`,
    { projectId: args.projectId, modelId: args.modelId },
  );

  const model = data.project.model;
  const ingestion = model.latestIngestion;
  let status: IngestionStatus | null = null;
  if (ingestion) {
    const d = ingestion.statusData;
    switch (d.__typename) {
      case "ModelIngestionQueuedStatus":
        status = { kind: "Queued", progressMessage: d.progressMessage };
        break;
      case "ModelIngestionProcessingStatus":
        status = { kind: "Processing", progressMessage: d.progressMessage, progress: d.progress };
        break;
      case "ModelIngestionSuccessStatus":
        status = { kind: "Success", versionId: d.versionId };
        break;
      case "ModelIngestionFailedStatus":
        status = { kind: "Failed", errorReason: d.errorReason };
        break;
      case "ModelIngestionCancelledStatus":
        status = { kind: "Cancelled", cancellationMessage: d.cancellationMessage };
        break;
      case "ModelIngestionInvalidStatus":
        status = { kind: "Invalid", validationMessage: d.validationMessage };
        break;
      default:
        status = { kind: "Unknown" };
    }
  }

  return {
    modelId: model.id,
    modelName: model.name,
    latestIngestion: ingestion && status ? { id: ingestion.id, createdAt: ingestion.createdAt, updatedAt: ingestion.updatedAt, status } : null,
    recentVersions: model.versions.items,
  };
}
