export class FieldKitConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = "FieldKitConfigurationError";
    }
}
export class SpeckleAccessError extends Error {
    kind;
    context;
    status;
    constructor(kind, context = {}, status) {
        super(kind === "authentication" ? "Speckle authentication failed." : "Speckle refused this operation.");
        this.kind = kind;
        this.context = context;
        this.status = status;
        this.name = "SpeckleAccessError";
    }
}
const AUTHENTICATION_CODES = new Set(["UNAUTHENTICATED", "INVALID_TOKEN", "TOKEN_EXPIRED"]);
const AUTHORIZATION_CODES = new Set(["FORBIDDEN", "UNAUTHORIZED", "ACCESS_DENIED"]);
function operationLabel(context) {
    return context.operation ? ` “${context.operation}”` : " this operation";
}
export function accessErrorFromHttp(status, context = {}) {
    if (status === 401)
        return new SpeckleAccessError("authentication", context, status);
    if (status === 403)
        return new SpeckleAccessError("authorization", context, status);
    return null;
}
export function assertAuthenticatedResponse(response, context = {}) {
    if (response.ok)
        return;
    const accessError = accessErrorFromHttp(response.status, context);
    if (accessError)
        throw accessError;
    // Never reflect arbitrary response bodies from authenticated endpoints.
    throw new Error(`Speckle Server returned ${response.status} ${response.statusText}.`);
}
export function accessErrorFromGraphQL(errors, context = {}) {
    const codes = errors
        .map((error) => error.extensions?.code?.toUpperCase())
        .filter((code) => Boolean(code));
    if (codes.some((code) => AUTHENTICATION_CODES.has(code))) {
        return new SpeckleAccessError("authentication", context);
    }
    if (codes.some((code) => AUTHORIZATION_CODES.has(code))) {
        return new SpeckleAccessError("authorization", context);
    }
    // Older server versions do not always return an extensions.code. Keep this
    // deliberately narrow and describe the result as tentative to the user.
    const combined = errors.map((error) => error.message).join("; ");
    if (/\b(authentication required|invalid token|token (?:has )?expired)\b/i.test(combined)) {
        return new SpeckleAccessError("authentication", context);
    }
    if (/\b(forbidden|access denied|not authorized|insufficient permissions?|missing required scope)\b/i.test(combined)) {
        return new SpeckleAccessError("authorization", context);
    }
    return null;
}
export function redactSensitive(value) {
    let redacted = value.replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]");
    redacted = redacted.replace(/([?&](?:access_?token|token|key)=)[^&\s]+/gi, "$1[REDACTED]");
    const configuredToken = process.env.SPECKLE_TOKEN;
    if (configuredToken && configuredToken.length >= 4) {
        redacted = redacted.split(configuredToken).join("[REDACTED]");
    }
    return redacted;
}
export function formatToolError(error) {
    if (error instanceof FieldKitConfigurationError) {
        return `FieldKit Admin + Data MCP is not configured: ${redactSensitive(error.message)} ` +
            "Add the missing value to your local environment and restart the MCP server.";
    }
    if (error instanceof SpeckleAccessError) {
        const operation = operationLabel(error.context);
        if (error.kind === "authentication") {
            return (`Speckle could not authenticate${operation}. ` +
                "The personal access token may be invalid, expired, or issued by a different Speckle Server. " +
                "Replace the token in your local configuration and retry. " +
                "FieldKit Admin + Data MCP is still running; no data was changed.");
        }
        const scopes = error.context.scopeHints?.length
            ? ` Relevant token scopes may include: ${error.context.scopeHints.join(", ")}.`
            : "";
        const resource = error.context.resource ? ` Access to ${error.context.resource} may also be required.` : "";
        return (`Speckle refused${operation}. ` +
            "This may mean the token lacks a required scope, the token owner is not a member of the requested resource, " +
            "or the server's policy does not allow the action." +
            scopes +
            resource +
            " Review the token scopes and the user's workspace/project access, then retry. " +
            "FieldKit Admin + Data MCP is still running; other tools may still work and no data was changed by this call.");
    }
    const message = error instanceof Error ? error.message : String(error);
    return redactSensitive(message);
}
