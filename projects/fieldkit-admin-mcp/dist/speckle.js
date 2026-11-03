/**
 * Minimal GraphQL client for Speckle Server's admin API.
 *
 * Deliberately not using specklepy or Speckle.Sdk: this is TypeScript, and
 * the admin surface (AdminQueries/AdminMutations, ServerInfo, userRoleChange,
 * adminDeleteUser, ...) is a thin, stable slice of the schema that's simpler
 * to call directly than to pull in a whole SDK for. One PAT, one fetch
 * wrapper — mirrors how Freckle wraps a single Discord bot token.
 */
import { accessErrorFromGraphQL, accessErrorFromHttp, FieldKitConfigurationError, } from "./errors.js";
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
export function writesAllowed() {
    return (process.env.SPECKLE_ADMIN_ALLOW_WRITES ?? "").toLowerCase() === "true";
}
export class SpeckleGraphQLError extends Error {
    errors;
    constructor(errors) {
        super(errors.map((e) => e.message).join("; "));
        this.errors = errors;
        this.name = "SpeckleGraphQLError";
    }
}
function accessContextForQuery(query) {
    const operation = query.match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)?.[1];
    const scopeHints = [];
    if (/\badmin\b|Admin(?:Queries|Mutations|Workspace|User|Project|Server)/.test(query))
        scopeHints.push("server:setup");
    if (/fileUploadMutations|modelMutations|workspaceMutations\.projects/.test(query))
        scopeHints.push("streams:write");
    if (/invites?\b/i.test(query))
        scopeHints.push("users:invite");
    const resource = /workspace|project|model|version/i.test(query) ? "the requested workspace or project" : undefined;
    return { operation, resource, scopeHints: [...new Set(scopeHints)] };
}
/** Run a GraphQL query/mutation against the configured Speckle Server. */
export async function speckleQuery(query, variables) {
    const accessContext = accessContextForQuery(query);
    const res = await fetch(`${serverUrl()}/graphql`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
        const accessError = accessErrorFromHttp(res.status, accessContext);
        if (accessError)
            throw accessError;
        throw new Error(`Speckle Server returned ${res.status} ${res.statusText}.`);
    }
    const json = (await res.json());
    if (json.errors && json.errors.length > 0) {
        const accessError = accessErrorFromGraphQL(json.errors, accessContext);
        if (accessError)
            throw accessError;
        throw new SpeckleGraphQLError(json.errors);
    }
    if (!json.data) {
        throw new Error("Speckle Server response had no data and no errors.");
    }
    return json.data;
}
/** Guard for the mutation tools: throws unless SPECKLE_ADMIN_ALLOW_WRITES=true. */
export function assertWritesAllowed(action) {
    if (!writesAllowed()) {
        throw new Error(`Refusing to "${action}": SPECKLE_ADMIN_ALLOW_WRITES is not "true". ` +
            `This server is running read-only. Set SPECKLE_ADMIN_ALLOW_WRITES=true in the environment to enable mutations.`);
    }
}
