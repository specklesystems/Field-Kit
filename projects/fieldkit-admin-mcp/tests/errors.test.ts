import assert from "node:assert/strict";
import test from "node:test";
import {
  accessErrorFromGraphQL,
  accessErrorFromHttp,
  assertAuthenticatedResponse,
  FieldKitConfigurationError,
  formatToolError,
  redactSensitive,
  SpeckleAccessError,
} from "../src/errors.js";
import { safe } from "../src/tools/index.js";

test("missing configuration gives a corrective message", () => {
  const message = formatToolError(new FieldKitConfigurationError("SPECKLE_TOKEN is not set."));
  assert.match(message, /not configured/i);
  assert.match(message, /restart/i);
});

test("HTTP 401 is classified as authentication", () => {
  const error = accessErrorFromHttp(401, { operation: "list projects" });
  assert.ok(error instanceof SpeckleAccessError);
  assert.equal(error.kind, "authentication");
  assert.match(formatToolError(error), /invalid, expired, or issued by a different/i);
});

test("ambiguous HTTP 403 remains tentative", () => {
  const error = accessErrorFromHttp(403, {
    operation: "read workspace",
    resource: "the requested workspace",
  });
  assert.ok(error instanceof SpeckleAccessError);
  const message = formatToolError(error);
  assert.match(message, /may mean/i);
  assert.match(message, /workspace\/project access/i);
  assert.doesNotMatch(message, /required scope is/i);
});

test("structured GraphQL codes take precedence", () => {
  const error = accessErrorFromGraphQL([
    { message: "A deliberately vague message", extensions: { code: "FORBIDDEN" } },
  ]);
  assert.ok(error instanceof SpeckleAccessError);
  assert.equal(error.kind, "authorization");
});

test("ordinary GraphQL errors are not misclassified", () => {
  assert.equal(accessErrorFromGraphQL([{ message: "Version was not found" }]), null);
});

test("authenticated HTTP failures do not expose response bodies", () => {
  const response = new Response("Bearer secret-token and internal details", { status: 403 });
  assert.throws(
    () => assertAuthenticatedResponse(response, { operation: "download model data" }),
    (error: unknown) => error instanceof SpeckleAccessError && !error.message.includes("secret-token"),
  );
});

test("redaction covers configured tokens, bearer values and query parameters", () => {
  const previous = process.env.SPECKLE_TOKEN;
  process.env.SPECKLE_TOKEN = "configured-secret";
  try {
    const message = redactSensitive(
      "configured-secret Bearer another-secret https://example.test/?access_token=query-secret",
    );
    assert.doesNotMatch(message, /configured-secret|another-secret|query-secret/);
    assert.match(message, /\[REDACTED\]/);
  } finally {
    if (previous === undefined) delete process.env.SPECKLE_TOKEN;
    else process.env.SPECKLE_TOKEN = previous;
  }
});

test("safe returns a graceful MCP error with tentative scope hints", async () => {
  const handler = safe(async () => {
    throw new SpeckleAccessError("authorization", {
      operation: "admin query",
      scopeHints: ["server:setup"],
    });
  });
  const result = await handler({});
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /server:setup/);
  assert.match(result.content[0].text, /other tools may still work/i);
});
