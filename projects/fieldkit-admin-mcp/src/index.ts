#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Important: never write to stdout — it is the MCP transport. Logs go to stderr.
  console.error("fieldkit-admin-mcp running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting fieldkit-admin-mcp:", err);
  process.exit(1);
});
