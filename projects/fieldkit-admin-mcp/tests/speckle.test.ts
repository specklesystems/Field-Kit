import assert from "node:assert/strict";
import test from "node:test";
import { FieldKitConfigurationError, SpeckleAccessError } from "../src/errors.js";
import { speckleQuery } from "../src/speckle.js";

test("speckleQuery classifies authentication and authorization responses", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SPECKLE_SERVER_URL;
  const originalToken = process.env.SPECKLE_TOKEN;
  process.env.SPECKLE_SERVER_URL = "https://example.test";
  process.env.SPECKLE_TOKEN = "test-secret-token";

  try {
    globalThis.fetch = async () => new Response("test-secret-token must not escape", { status: 401 });
    await assert.rejects(
      speckleQuery("query ListProjects { activeUser { id } }"),
      (error: unknown) => error instanceof SpeckleAccessError && error.kind === "authentication",
    );

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ errors: [{ message: "denied", extensions: { code: "FORBIDDEN" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    await assert.rejects(
      speckleQuery("query AdminProjectList { admin { projectList { totalCount } } }"),
      (error: unknown) =>
        error instanceof SpeckleAccessError &&
        error.kind === "authorization" &&
        error.context.scopeHints?.includes("server:setup") === true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SPECKLE_SERVER_URL;
    else process.env.SPECKLE_SERVER_URL = originalUrl;
    if (originalToken === undefined) delete process.env.SPECKLE_TOKEN;
    else process.env.SPECKLE_TOKEN = originalToken;
  }
});

test("speckleQuery reports missing token before making a request", async () => {
  const originalUrl = process.env.SPECKLE_SERVER_URL;
  const originalToken = process.env.SPECKLE_TOKEN;
  process.env.SPECKLE_SERVER_URL = "https://example.test";
  delete process.env.SPECKLE_TOKEN;
  try {
    await assert.rejects(
      speckleQuery("query ServerInfo { serverInfo { name } }"),
      (error: unknown) => error instanceof FieldKitConfigurationError,
    );
  } finally {
    if (originalUrl === undefined) delete process.env.SPECKLE_SERVER_URL;
    else process.env.SPECKLE_SERVER_URL = originalUrl;
    if (originalToken === undefined) delete process.env.SPECKLE_TOKEN;
    else process.env.SPECKLE_TOKEN = originalToken;
  }
});
