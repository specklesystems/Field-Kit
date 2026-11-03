import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";
import { writesAllowed } from "./speckle.js";
const INSTRUCTIONS = [
    "FieldKit Admin + Data MCP connects to ONE Speckle Server using a personal access token.",
    "It is a local FieldKit companion and is separate from the official Speckle MCP.",
    "Use it for questions about server users, projects, invites, and statistics, and (if write mode is enabled) for admin actions: changing a user's role, deleting a user, updating server config, or inviting someone.",
    "It can also analyze what's actually been modeled in a project/version — categories, levels, parameter completeness — via check_dataset_availability / list_model_property_paths / get_model_property_breakdown / run_model_sql. Not every version has a dataset; check availability first.",
    writesAllowed()
        ? "Write mode is ENABLED — mutation tools (update_user_role, delete_user, update_email_verification, update_server_info, create_server_invite) will actually change server state. Treat them as irreversible; confirm intent with the user before calling delete_user or update_user_role."
        : "Write mode is DISABLED — mutation tools will refuse to run. This connector is currently read-only.",
    "Call `about` first if you're unsure what's available.",
].join(" ");
/** Build a fresh FieldKit Admin + Data MCP instance with all tools registered. */
export function createServer() {
    const server = new McpServer({
        name: "fieldkit-admin-mcp",
        version: "0.3.0",
        title: "FieldKit Admin + Data MCP",
        description: "Local FieldKit companion for Speckle administration and data investigation, separate from the official Speckle MCP.",
    }, { instructions: INSTRUCTIONS });
    registerTools(server);
    return server;
}
