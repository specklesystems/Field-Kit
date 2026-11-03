import { z } from "zod";
import { assertWritesAllowed, speckleQuery, writesAllowed } from "../speckle.js";
import { listPropertyPaths, propertyBreakdown, queryPackfile, resolveDataset } from "../packfiles.js";
import { createSupportProject, getFileImportStatus, inviteToSupportProject, uploadFileAndImport } from "../supportIntake.js";
import { formatToolError } from "../errors.js";
/** Wrap a result object as MCP text content (pretty-printed JSON). */
function json(data) {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
/** Wrap a handler so thrown errors become MCP error results instead of crashing the server. */
export function safe(fn) {
    return async (args) => {
        try {
            return await fn(args);
        }
        catch (err) {
            const message = formatToolError(err);
            return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
        }
    };
}
export function registerTools(server) {
    // ---------------------------------------------------------------------------
    // about
    // ---------------------------------------------------------------------------
    server.registerTool("about", {
        title: "About FieldKit Admin + Data MCP",
        description: "Explain what this connector is, what it can do, and whether write access is enabled.",
        inputSchema: {},
    }, safe(async () => ({
        content: [
            {
                type: "text",
                text: [
                    "# FieldKit Admin + Data MCP",
                    "Local FieldKit tools for Speckle administration and data investigation. Separate from the official Speckle MCP.",
                    "",
                    "Talks directly to one Speckle Server's GraphQL API using a personal access token.",
                    "Not affiliated with specklepy — this is a thin, hand-written GraphQL client scoped to the admin surface.",
                    "",
                    `Write access (role changes, user deletion, server config, invites) is currently **${writesAllowed() ? "ENABLED" : "disabled — read-only mode"}**.`,
                    "Toggle with SPECKLE_ADMIN_ALLOW_WRITES in the environment.",
                    "",
                    "## Read tools",
                    "get_server_info, get_server_statistics, list_workspaces, get_workspace, get_workspace_activity, get_project_team, get_contribution_rollup, list_users, get_user, list_projects, get_project, list_dashboards, get_dashboard, list_issues, list_project_insights, get_insight_results, list_invites",
                    "",
                    "Hierarchy: workspace -> projects -> models/versions -> content. get_workspace_activity is the fastest way to answer \"what's actually being worked on\" — real usage from source, not a lagging CRM proxy.",
                    "",
                    "## Model data analytics (EAV/packfile/bundle)",
                    "check_dataset_availability, list_model_property_paths, get_model_property_breakdown, run_model_sql — analyze what's actually modeled in a project/version (categories, levels, parameters) via DuckDB, same as the Speckle web app's AI feature. Handles both dataset formats: the legacy packfile-era duckdb pair, and the server-2026.9+ bundle format (parquet + /v2 artifacts). check_dataset_availability tells you which format a version is in — always call it first, since the two formats mount different views and run_model_sql's SQL differs accordingly.",
                    "",
                    "## Write tools (require SPECKLE_ADMIN_ALLOW_WRITES=true)",
                    "update_user_role, delete_user, update_email_verification, update_server_info, create_server_invite, create_support_project, upload_file_to_project",
                    "",
                    "## Support case intake",
                    "create_support_project, upload_file_to_project, get_file_import_status — create a private project for a support case, upload a customer's native CAD/BIM file (Revit .rvt, Rhino .3dm, IFC, DWG, and more) straight into it via Speckle's server-side importer (no Revit/Rhino license needed), and check on the import. Requires the token to have the streams:write scope in addition to the scopes listed in the README.",
                ].join("\n"),
            },
        ],
    })));
    // ---------------------------------------------------------------------------
    // get_server_info
    // ---------------------------------------------------------------------------
    server.registerTool("get_server_info", {
        title: "Get server info",
        description: "Get this Speckle Server's identity and configuration: name, description, version, company, admin contact, invite-only/guest-mode flags, auth strategies, and role/scope definitions.",
        inputSchema: {},
    }, safe(async () => {
        const data = await speckleQuery(`query ServerInfo {
          serverInfo {
            name
            description
            company
            adminContact
            canonicalUrl
            version
            inviteOnly
            guestModeEnabled
            termsOfService
            authStrategies { id name }
            roles { name description resourceTarget }
            scopes { name description }
          }
        }`);
        return json(data.serverInfo);
    }));
    // ---------------------------------------------------------------------------
    // get_server_statistics
    // ---------------------------------------------------------------------------
    server.registerTool("get_server_statistics", {
        title: "Get server statistics",
        description: "Get server-wide counts: total users, total projects, total pending invites. Requires admin.",
        inputSchema: {},
    }, safe(async () => {
        const data = await speckleQuery(`query ServerStatistics {
          admin {
            serverStatistics { totalUserCount totalProjectCount totalPendingInvites }
          }
        }`);
        return json(data.admin.serverStatistics);
    }));
    // ---------------------------------------------------------------------------
    // list_workspaces
    // ---------------------------------------------------------------------------
    server.registerTool("list_workspaces", {
        title: "List workspaces",
        description: "List/search workspaces on the server (admin view): id, name, slug, description, plan, dates. Top of the hierarchy — use get_workspace_activity next to see what's actually happening inside one, or get_workspace for team/plan detail. Requires admin.",
        inputSchema: {
            query: z.string().optional().describe("Substring to search in workspace name."),
            limit: z.number().int().min(1).max(200).default(25),
            cursor: z.string().optional(),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query AdminWorkspaceList($limit: Int!, $cursor: String, $query: String) {
          admin {
            workspaceList(limit: $limit, cursor: $cursor, query: $query) {
              totalCount
              cursor
              items { id name slug description createdAt updatedAt }
            }
          }
        }`, { limit: args.limit ?? 25, cursor: args.cursor, query: args.query });
        return json(data.admin.workspaceList);
    }));
    // ---------------------------------------------------------------------------
    // get_workspace
    // ---------------------------------------------------------------------------
    server.registerTool("get_workspace", {
        title: "Get a workspace",
        description: "Get one workspace's detail by id or slug: name, description, plan, team size, project count. Use list_workspaces to find an id/slug (e.g. by searching a client name).",
        inputSchema: {
            workspaceId: z.string().optional().describe("Workspace id. Provide this or slug."),
            slug: z.string().optional().describe("Workspace slug (e.g. from its URL). Provide this or workspaceId."),
        },
    }, safe(async (args) => {
        if (!args.workspaceId && !args.slug) {
            throw new Error("Provide either workspaceId or slug.");
        }
        const query = args.workspaceId
            ? `query Workspace($id: String!) {
            workspace(id: $id) {
              id name slug description createdAt updatedAt
              plan { name status createdAt }
              team { totalCount }
              projects { totalCount }
            }
          }`
            : `query WorkspaceBySlug($slug: String!) {
            workspaceBySlug(slug: $slug) {
              id name slug description createdAt updatedAt
              plan { name status createdAt }
              team { totalCount }
              projects { totalCount }
            }
          }`;
        const data = await speckleQuery(query, args.workspaceId ? { id: args.workspaceId } : { slug: args.slug });
        return json(data.workspace ?? data.workspaceBySlug);
    }));
    // ---------------------------------------------------------------------------
    // get_workspace_activity
    // ---------------------------------------------------------------------------
    server.registerTool("get_workspace_activity", {
        title: "Get workspace activity timeline",
        description: "The real usage signal, straight from source rather than a lagging CRM proxy: projects in a workspace with their recent versions, ordered by most recent activity — who (authorUser), what model, when (createdAt), from what tool (sourceApplication: Revit/Rhino/etc). Use this to see which projects/teams are actually active right now, not just which exist. Paginate older activity with the returned cursor.",
        inputSchema: {
            workspaceId: z.string(),
            dateRangeDays: z.number().int().min(1).max(365).default(7).describe("Size of the lookback window in days."),
            projectLimit: z.number().int().min(1).max(100).default(20).describe("Max projects to discover by recent activity. Ignored if cursor is set."),
            withProjectRoleOnly: z
                .boolean()
                .default(false)
                .describe("Restrict to projects the token's user has an explicit role on. Ignored if cursor is set."),
            cursor: z.string().optional().describe("Cursor from a previous call, to page further back in time."),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query WorkspaceProjectActivityTimeline($workspaceId: String!, $input: WorkspaceProjectActivityTimelineInput!) {
            workspace(id: $workspaceId) {
              projectActivityTimeline(input: $input) {
                cursor
                projectGroups {
                  project { id name updatedAt }
                  versions {
                    id
                    createdAt
                    message
                    sourceApplication
                    model { id name }
                    authorUser { id name }
                  }
                }
              }
            }
          }`, {
            workspaceId: args.workspaceId,
            input: {
                dateRangeDays: args.dateRangeDays ?? 7,
                projectLimit: args.projectLimit ?? 20,
                withProjectRoleOnly: args.withProjectRoleOnly ?? false,
                cursor: args.cursor,
            },
        });
        return json(data.workspace.projectActivityTimeline ?? { cursor: null, projectGroups: [] });
    }));
    // ---------------------------------------------------------------------------
    // get_project_team
    // ---------------------------------------------------------------------------
    server.registerTool("get_project_team", {
        title: "Get a project's team and seat types",
        description: "Who collaborates on a project, their role, and their workspace seat type. Ported from Speckle's own internal AI tool (team_roles) — pairs with get_contribution_rollup to see seats assigned vs. seats actually contributing (a team member with a paid seat and zero recent activity is a different signal than a healthy team).",
        inputSchema: {
            projectId: z.string(),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query ProjectTeam($projectId: String!) {
          project(id: $projectId) {
            id name
            team { role seatType user { id name } }
          }
        }`, { projectId: args.projectId });
        if (!data.project)
            throw new Error(`Project ${args.projectId} not found.`);
        return json({
            projectId: data.project.id,
            projectName: data.project.name,
            memberCount: data.project.team.length,
            members: data.project.team.map((c) => ({ userId: c.user.id, name: c.user.name, role: c.role, seatType: c.seatType })),
        });
    }));
    // ---------------------------------------------------------------------------
    // get_contribution_rollup
    // ---------------------------------------------------------------------------
    server.registerTool("get_contribution_rollup", {
        title: "Get per-person contribution rollup",
        description: "Who's actually active on a project and how much, over a lookback window — ported from Speckle's own internal AI tool (contribution_rollup). Aggregates per-person counts of versions authored and issues authored/assigned, paginating newest-first until the window boundary. This is a real 'seats paid for vs. seats used' signal: a project with 8 team members and 1 contributor is a very different account-health story than one with even activity across the team. Honesty caveat baked in: counts are authorship-based, so reviewers/coordinators who don't upload or file issues under-count — these are activity signals, not a performance ranking.",
        inputSchema: {
            projectId: z.string(),
            windowDays: z.number().int().min(1).max(365).default(30),
        },
    }, safe(async (args) => {
        const windowDays = Math.min(Math.max(args.windowDays ?? 30, 1), 365);
        const cutoffMs = Date.now() - windowDays * 86_400_000;
        const PAGE_SIZE = 100;
        const MAX_PAGES = 20;
        const byUser = new Map();
        const bump = (userId, name, metric) => {
            let p = byUser.get(userId);
            if (!p) {
                p = { userId, name, versionsAuthored: 0, issuesAuthored: 0, issuesAssigned: 0, total: 0 };
                byUser.set(userId, p);
            }
            p[metric]++;
            p.total++;
        };
        let versionsPartial = false;
        let cursor = null;
        for (let page = 0; page < MAX_PAGES; page++) {
            const data = await speckleQuery(`query RollupVersions($projectId: String!, $limit: Int!, $cursor: String) {
            project(id: $projectId) {
              versions(limit: $limit, cursor: $cursor) {
                cursor
                items { createdAt authorUser { id name } }
              }
            }
          }`, { projectId: args.projectId, limit: PAGE_SIZE, cursor });
            if (!data.project)
                throw new Error(`Project ${args.projectId} not found.`);
            const versions = data.project.versions;
            let hitBoundary = false;
            for (const v of versions.items) {
                const createdMs = new Date(v.createdAt).getTime();
                if (!Number.isFinite(createdMs))
                    continue;
                if (createdMs < cutoffMs) {
                    hitBoundary = true;
                    break;
                }
                if (v.authorUser)
                    bump(v.authorUser.id, v.authorUser.name, "versionsAuthored");
            }
            if (hitBoundary || !versions.cursor)
                break;
            cursor = versions.cursor;
            if (page === MAX_PAGES - 1)
                versionsPartial = true;
        }
        let issuesPartial = false;
        cursor = null;
        for (let page = 0; page < MAX_PAGES; page++) {
            const data = await speckleQuery(`query RollupIssues($projectId: String!, $limit: Int!, $cursor: String) {
            project(id: $projectId) {
              issues(input: { limit: $limit, cursor: $cursor, sortBy: createdAt, sortDirection: desc }) {
                cursor
                items {
                  createdAt
                  author { user { id name } }
                  assignee { user { id name } }
                }
              }
            }
          }`, { projectId: args.projectId, limit: PAGE_SIZE, cursor });
            if (!data.project)
                throw new Error(`Project ${args.projectId} not found.`);
            const issues = data.project.issues;
            let hitBoundary = false;
            for (const i of issues.items) {
                const createdMs = new Date(i.createdAt).getTime();
                if (!Number.isFinite(createdMs))
                    continue;
                if (createdMs < cutoffMs) {
                    hitBoundary = true;
                    break;
                }
                if (i.author)
                    bump(i.author.user.id, i.author.user.name, "issuesAuthored");
                if (i.assignee)
                    bump(i.assignee.user.id, i.assignee.user.name, "issuesAssigned");
            }
            if (hitBoundary || !issues.cursor)
                break;
            cursor = issues.cursor;
            if (page === MAX_PAGES - 1)
                issuesPartial = true;
        }
        const contributors = [...byUser.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
        return json({
            projectId: args.projectId,
            windowDays,
            partial: versionsPartial || issuesPartial,
            contributors,
            note: "Counts are authorship-based (versions pushed + issues authored/assigned in the window). People who review or coordinate without uploading or filing issues will under-count. These are activity signals, not a performance ranking. If partial is true, only the most recent slice of the window was counted (paging cap reached).",
        });
    }));
    // ---------------------------------------------------------------------------
    // list_users
    // ---------------------------------------------------------------------------
    server.registerTool("list_users", {
        title: "List users",
        description: "List/search registered users on the server (admin view): id, name, email, role, company, verified status. Optionally filter by name/email substring or by server role. Requires admin.",
        inputSchema: {
            query: z.string().optional().describe("Substring to search in name/email/company."),
            role: z
                .enum(["server:admin", "server:user", "server:guest", "server:archived-user"])
                .optional()
                .describe("Filter to a specific server role."),
            limit: z.number().int().min(1).max(200).default(25),
            cursor: z.string().optional().describe("Pagination cursor from a previous call."),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query AdminUserList($limit: Int!, $cursor: String, $query: String, $role: ServerRole) {
          admin {
            userList(limit: $limit, cursor: $cursor, query: $query, role: $role) {
              totalCount
              cursor
              items { id name email company role avatar verified }
            }
          }
        }`, { limit: args.limit ?? 25, cursor: args.cursor, query: args.query, role: args.role });
        return json(data.admin.userList);
    }));
    // ---------------------------------------------------------------------------
    // get_user
    // ---------------------------------------------------------------------------
    server.registerTool("get_user", {
        title: "Get a user",
        description: "Get another user's public profile by their user id (name, bio, avatar, company, verified). Use list_users to find ids.",
        inputSchema: {
            userId: z.string().describe("The Speckle user id."),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query OtherUser($id: String!) {
          otherUser(id: $id) { id name bio company avatar verified role }
        }`, { id: args.userId });
        if (!data.otherUser)
            return json({ found: false, userId: args.userId });
        return json(data.otherUser);
    }));
    // ---------------------------------------------------------------------------
    // list_projects
    // ---------------------------------------------------------------------------
    server.registerTool("list_projects", {
        title: "List projects (admin)",
        description: "List/search all projects on the server (admin view, crosses ownership) — id, name, visibility, created/updated dates. Requires admin.",
        inputSchema: {
            query: z.string().optional().describe("Substring to search in project name/description."),
            visibility: z.string().optional().describe("Filter by visibility, e.g. \"public\" or \"private\"."),
            limit: z.number().int().min(1).max(200).default(25),
            cursor: z.string().optional(),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query AdminProjectList($limit: Int!, $cursor: String, $query: String, $visibility: String) {
          admin {
            projectList(limit: $limit, cursor: $cursor, query: $query, visibility: $visibility) {
              totalCount
              cursor
              items { id name visibility createdAt updatedAt workspaceId }
            }
          }
        }`, { limit: args.limit ?? 25, cursor: args.cursor, query: args.query, visibility: args.visibility });
        return json(data.admin.projectList);
    }));
    // ---------------------------------------------------------------------------
    // get_project
    // ---------------------------------------------------------------------------
    server.registerTool("get_project", {
        title: "Get a project",
        description: "Get one project's details by id: name, description, visibility, dates, the workspace it belongs to, and counts of models/versions, dashboards, and issues — a quick engagement snapshot (a project with dashboards and open issues is being actively used, not just sitting with old versions).",
        inputSchema: {
            projectId: z.string(),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query Project($id: String!) {
          project(id: $id) {
            id name description visibility createdAt updatedAt workspaceId
            models { totalCount }
            versions { totalCount }
            dashboards(limit: 0) { totalCount }
            issues(input: { limit: 0 }) { totalCount }
          }
        }`, { id: args.projectId });
        return json(data.project);
    }));
    // ---------------------------------------------------------------------------
    // list_dashboards
    // ---------------------------------------------------------------------------
    server.registerTool("list_dashboards", {
        title: "List dashboards",
        description: "List dashboards (Speckle's data-analytics/reporting surface, built on the same model data as the EAV tools) in a workspace or a single project. Dashboard count and recency is an activity signal in its own right — teams building dashboards are actively analyzing their models, not just storing them. Provide workspaceId or projectId (not both).",
        inputSchema: {
            workspaceId: z.string().optional(),
            projectId: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            cursor: z.string().optional(),
        },
    }, safe(async (args) => {
        if (!args.workspaceId && !args.projectId) {
            throw new Error("Provide either workspaceId or projectId.");
        }
        if (args.workspaceId) {
            const data = await speckleQuery(`query WorkspaceDashboards($workspaceId: String!, $limit: Int!, $cursor: String) {
            workspace(id: $workspaceId) {
              dashboards(limit: $limit, cursor: $cursor) {
                totalCount
                cursor
                items { id name createdAt updatedAt createdBy { id name } projects { id name } }
              }
            }
          }`, { workspaceId: args.workspaceId, limit: args.limit ?? 25, cursor: args.cursor });
            return json(data.workspace.dashboards);
        }
        const data = await speckleQuery(`query ProjectDashboards($projectId: String!, $limit: Int!, $cursor: String) {
          project(id: $projectId) {
            dashboards(limit: $limit, cursor: $cursor) {
              totalCount
              cursor
              items { id name createdAt updatedAt createdBy { id name } }
            }
          }
        }`, { projectId: args.projectId, limit: args.limit ?? 25, cursor: args.cursor });
        return json(data.project.dashboards);
    }));
    // ---------------------------------------------------------------------------
    // get_dashboard
    // ---------------------------------------------------------------------------
    server.registerTool("get_dashboard", {
        title: "Get a dashboard's content and sharing status",
        description: "Get one dashboard's full layout and whether it's been shared. Returns the raw parsed `state` (its block/widget tree — types include chart, kpi, table, legend, viewer, card, text, section, tabs, grid, report, divider, input) plus a rough content-bearing widget count (chart/kpi/table/legend/viewer/card blocks, excluding pure layout containers like grid/section/tabs/divider/text) so you can gauge complexity without hand-parsing the tree yourself. `shareTokens` lists any active share links created for it (Project.shareTokens filtered to sourceType=dashboard) — non-empty means it's been shared outside the workspace; each entry shows who created it, when, whether it's password-protected, and last-used/load activity.",
        inputSchema: {
            dashboardId: z.string(),
            projectId: z.string().describe("The project the dashboard belongs to (needed to look up its share tokens)."),
        },
    }, safe(async (args) => {
        const [dashboardData, shareData] = await Promise.all([
            speckleQuery(`query Dashboard($id: String!) {
            dashboard(id: $id) {
              id name state createdAt updatedAt
              createdBy { id name }
              projects { id name }
            }
          }`, { id: args.dashboardId }),
            speckleQuery(`query DashboardShareTokens($projectId: String!) {
            project(id: $projectId) {
              shareTokens(filter: { sourceType: dashboard }, limit: 100) {
                items { id sourceId label createdAt expiresAt hasPassword lastUsed createdBy { id name } }
              }
            }
          }`, { projectId: args.projectId }),
        ]);
        const CONTENT_WIDGET_TYPES = new Set(["chart", "kpi", "table", "legend", "viewer", "card"]);
        let state = null;
        let widgetCount = null;
        let widgetTypeCounts = {};
        if (dashboardData.dashboard.state) {
            try {
                state = JSON.parse(dashboardData.dashboard.state);
                const counts = {};
                const walk = (node) => {
                    if (Array.isArray(node)) {
                        node.forEach(walk);
                    }
                    else if (node && typeof node === "object") {
                        const obj = node;
                        if (typeof obj.type === "string") {
                            counts[obj.type] = (counts[obj.type] ?? 0) + 1;
                        }
                        Object.values(obj).forEach(walk);
                    }
                };
                walk(state);
                widgetTypeCounts = counts;
                widgetCount = Object.entries(counts)
                    .filter(([type]) => CONTENT_WIDGET_TYPES.has(type))
                    .reduce((sum, [, count]) => sum + count, 0);
            }
            catch {
                // state wasn't valid JSON (or shape changed) — surface the raw string instead of failing the whole call
            }
        }
        const shareTokens = shareData.project.shareTokens.items.filter((t) => t.sourceId === args.dashboardId);
        return json({
            id: dashboardData.dashboard.id,
            name: dashboardData.dashboard.name,
            createdAt: dashboardData.dashboard.createdAt,
            updatedAt: dashboardData.dashboard.updatedAt,
            createdBy: dashboardData.dashboard.createdBy,
            projects: dashboardData.dashboard.projects,
            widgetCount,
            widgetTypeCounts,
            state,
            isShared: shareTokens.length > 0,
            shareTokens,
        });
    }));
    // ---------------------------------------------------------------------------
    // list_issues
    // ---------------------------------------------------------------------------
    server.registerTool("list_issues", {
        title: "List Speckle Issues",
        description: "List issues (Speckle's built-in issue-tracking on models/versions) for a project — status, priority, assignee, dates. Open/recently-updated issue volume is a strong activity signal: it means people are actively reviewing and flagging problems in the model, not just uploading it once and leaving.",
        inputSchema: {
            projectId: z.string(),
            statuses: z.array(z.enum(["open", "readyForReview", "resolved"])).optional(),
            search: z.string().optional().describe("Filter by issue name/description substring."),
            limit: z.number().int().min(1).max(100).default(25),
            cursor: z.string().optional(),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query ProjectIssues($projectId: String!, $input: ProjectIssuesInput) {
            project(id: $projectId) {
              issues(input: $input) {
                totalCount
                cursor
                items {
                  id identifier number title status priority
                  createdAt updatedAt dueDate
                  author { id user { id name } }
                  assignee { id user { id name } }
                  labels { id name hexColor }
                }
              }
            }
          }`, {
            projectId: args.projectId,
            input: {
                statuses: args.statuses,
                search: args.search,
                limit: args.limit ?? 25,
                cursor: args.cursor,
            },
        });
        return json(data.project.issues);
    }));
    // ---------------------------------------------------------------------------
    // list_project_insights
    // ---------------------------------------------------------------------------
    server.registerTool("list_project_insights", {
        title: "List data validation checks/standards",
        description: "List Speckle's data-validation entities (\"Insights\" in the API) for a project: validation checks and the ruleset standards they're derived from. This is the strongest activity signal available — checks run automatically whenever a new version is pushed to their tracked models, so recent/frequent results mean the team is actively validating their work, not just uploading it once. Each item includes its latest pass/fail result. Use get_insight_results for full run history and trend.",
        inputSchema: {
            projectId: z.string(),
            type: z.string().optional().describe("Filter by insight type if you know it (e.g. a check vs. a ruleset/standard) — otherwise omit to get everything."),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query ProjectInsights($projectId: String!, $type: String) {
          projectInsights(projectId: $projectId, type: $type) {
            id name type trigger version customized
            projectId modelIds
            createdAt updatedAt createdBy updatedBy
            derivedPackageCount
            sourceRuleset { id name }
            template { id name }
            latestResults { id modelId versionId timestamp summary }
          }
        }`, { projectId: args.projectId, type: args.type });
        return json(data.projectInsights);
    }));
    // ---------------------------------------------------------------------------
    // get_insight_results
    // ---------------------------------------------------------------------------
    server.registerTool("get_insight_results", {
        title: "Get a validation check's run history",
        description: "Get the pass/fail result history for one validation check/standard (an \"Insight\"). `scope: \"aggregate\"` gives the combined trend across all its tracked models (newest first) — the best single view of \"is this getting better or worse over time\". `\"model\"` narrows to one model's history; `\"version\"` gets the single result stored for one specific version. Each result's `summary` JSON typically has pass/fail counts; `timestamp` and `versionId` tie it to when/what was checked.",
        inputSchema: {
            projectId: z.string(),
            insightId: z.string(),
            scope: z.enum(["aggregate", "model", "version"]).default("aggregate"),
            modelId: z.string().optional().describe("Required for scope \"model\" or \"version\"."),
            versionId: z.string().optional().describe("Required for scope \"version\"."),
            limit: z.number().int().min(1).max(200).default(25).describe("Applies to aggregate/model scopes."),
        },
    }, safe(async (args) => {
        const scope = args.scope ?? "aggregate";
        if ((scope === "model" || scope === "version") && !args.modelId) {
            throw new Error(`scope "${scope}" requires modelId.`);
        }
        if (scope === "version" && !args.versionId) {
            throw new Error('scope "version" requires versionId.');
        }
        const field = scope === "aggregate"
            ? `aggregateResults(limit: $limit) { id modelId versionId timestamp summary result }`
            : scope === "model"
                ? `modelResults(modelId: $modelId, limit: $limit) { id modelId versionId timestamp summary result }`
                : `versionResults(modelId: $modelId, versionId: $versionId) { id modelId versionId timestamp summary result }`;
        const data = await speckleQuery(`query InsightResults($projectId: String!, $insightId: String!, $limit: Int, $modelId: String, $versionId: String) {
            insight(id: $insightId, projectId: $projectId) {
              id
              ${field}
            }
          }`, {
            projectId: args.projectId,
            insightId: args.insightId,
            limit: args.limit ?? 25,
            modelId: args.modelId,
            versionId: args.versionId,
        });
        if (!data.insight) {
            throw new Error(`Insight ${args.insightId} not found in project ${args.projectId}.`);
        }
        const results = data.insight.aggregateResults ?? data.insight.modelResults ?? data.insight.versionResults ?? [];
        return json({ insightId: args.insightId, scope, results });
    }));
    // ---------------------------------------------------------------------------
    // list_invites
    // ---------------------------------------------------------------------------
    server.registerTool("list_invites", {
        title: "List pending server invites",
        description: "List pending server-level invitations awaiting acceptance. Requires admin.",
        inputSchema: {
            query: z.string().optional(),
            limit: z.number().int().min(1).max(200).default(25),
            cursor: z.string().optional(),
        },
    }, safe(async (args) => {
        const data = await speckleQuery(`query AdminInviteList($limit: Int!, $cursor: String, $query: String) {
          admin {
            inviteList(limit: $limit, cursor: $cursor, query: $query) {
              totalCount
              cursor
              items { id email invitedBy { id name } }
            }
          }
        }`, { limit: args.limit ?? 25, cursor: args.cursor, query: args.query });
        return json(data.admin.inviteList);
    }));
    // ===========================================================================
    // Model data analytics — EAV/packfile/bundle tools
    //
    // Speckle publishes a per-version model dataset, in one of two incompatible
    // formats depending on when it was published:
    //   - legacy/packfile era: a DuckDB "packfile" with all of a version's
    //     objects, plus a companion EAV dataset pre-extracting every object's
    //     properties into a queryable `eav.properties` table. Same mechanism
    //     the Speckle web app's own AI/analytics feature used client-side.
    //   - bundle era (server 2026.9+, schemaVersion 3): a set of parquet files
    //     served from the /v2 artifacts rail (speckle-bundle-spec schema) —
    //     property values live in `bundle.object_properties` joined against
    //     `bundle.paths`, not a single flat table.
    // check_dataset_availability's `format` field tells you which one a version
    // is in — always call it first, since it changes what SQL run_model_sql
    // expects. list_model_property_paths/get_model_property_breakdown handle
    // the dispatch for you; run_model_sql does not (you write the SQL).
    // ===========================================================================
    // ---------------------------------------------------------------------------
    // check_dataset_availability
    // ---------------------------------------------------------------------------
    server.registerTool("check_dataset_availability", {
        title: "Check model data availability",
        description: "Check whether a project/model/version has a queryable dataset available for analytics before trying to query it, and which format it's in. `format: \"bundle\"` (server 2026.9+, schemaVersion 3) means run_model_sql mounts schema `bundle` (object_properties/paths/nodes/relations/...); `format: \"legacy\"` means the older packfile duckdb pair (`pf.*` / `eav.properties`). `hasDataset` is the one field to check — `hasPackfile`/`packfileSizeBytes` only describe the legacy artifact and are always false/null for bundle versions even though their dataset is fully queryable.",
        inputSchema: {
            projectId: z.string(),
            modelId: z.string(),
            versionId: z.string(),
        },
    }, safe(async (args) => {
        const info = await resolveDataset(args.projectId, args.modelId, args.versionId);
        return json(info);
    }));
    // ---------------------------------------------------------------------------
    // list_model_property_paths
    // ---------------------------------------------------------------------------
    server.registerTool("list_model_property_paths", {
        title: "List a model version's property paths",
        description: "List every distinct object property path present in a version (e.g. category, level, Material Quantities.Volume), how many objects carry each, and its type. Good first call to see what's actually in a model before drilling in — use it to gauge how much/what kind of work exists in a project (structural vs. MEP vs. architectural categories, parameter completeness, etc.). Works against either dataset format transparently (see check_dataset_availability).",
        inputSchema: {
            projectId: z.string(),
            modelId: z.string(),
            versionId: z.string(),
        },
    }, safe(async (args) => {
        const result = await listPropertyPaths(args);
        return json(result);
    }));
    // ---------------------------------------------------------------------------
    // get_model_property_breakdown
    // ---------------------------------------------------------------------------
    server.registerTool("get_model_property_breakdown", {
        title: "Break down a model by a property",
        description: "Count objects grouped by the value of one property path (e.g. \"category\" to see Wall/Door/Pipe counts, or \"level\" to see objects per floor). Use list_model_property_paths first to see what paths exist. Works against either dataset format transparently (see check_dataset_availability).",
        inputSchema: {
            projectId: z.string(),
            modelId: z.string(),
            versionId: z.string(),
            path: z.string().default("category").describe("Property path to group by, e.g. \"category\" or \"level\"."),
        },
    }, safe(async (args) => {
        const result = await propertyBreakdown(args, args.path ?? "category");
        return json(result);
    }));
    // ---------------------------------------------------------------------------
    // run_model_sql
    // ---------------------------------------------------------------------------
    server.registerTool("run_model_sql", {
        title: "Run SQL against a model's dataset",
        description: "Run a read-only SELECT/WITH query against a version's downloaded dataset via DuckDB. Call check_dataset_availability first to see which format you're querying: " +
            "for `format: \"legacy\"`, use `dataset: \"eav\"` for the properties table (columns: object_id, path, type, value_text, value_num — one row per object per property; most questions belong here), \"main\" for the raw object dataset (schema not fully mapped; explore with `DESCRIBE pf.objects`), or \"both\" to join across them. " +
            "For `format: \"bundle\"`, the `dataset` param is ignored — everything mounts under schema `bundle` per speckle-bundle-spec: `bundle.object_properties` (object_index, path_index, value_string/value_double/value_boolean, unit — join to `bundle.paths` on path_index for human-readable names; numeric rows carry BOTH value_double and value_string (the number as text) despite the spec's one-column rule, so test value_double first; `unit` is the producer's display label, e.g. 'Square feet', not a symbol) is the properties equivalent of eav.properties, plus `bundle.objects`, `bundle.nodes`, `bundle.relations`, `bundle.rel_types`, `bundle.node_kinds`, `bundle.types`/`type_eav`/`object_type`, and optional tables (`bundle.model`, `bundle.structural_results`, `bundle.property_set_definitions`) when the bundle carries them. Explore with `DESCRIBE bundle.<table>`. Geometry is never mounted (not queryable as SQL). " +
            "Results are capped at 500 rows either way.",
        inputSchema: {
            projectId: z.string(),
            modelId: z.string(),
            versionId: z.string(),
            sql: z.string().describe("A single SELECT or WITH statement. Legacy: eav.properties or pf.<table>. Bundle: bundle.<view>, e.g. bundle.object_properties."),
            dataset: z.enum(["main", "eav", "both"]).default("eav").describe("Legacy format only — ignored for bundle-format versions."),
        },
    }, safe(async (args) => {
        const result = await queryPackfile(args, args.sql, args.dataset ?? "eav");
        return json(result);
    }));
    // ===========================================================================
    // Write tools — all gated behind SPECKLE_ADMIN_ALLOW_WRITES=true
    // ===========================================================================
    // ---------------------------------------------------------------------------
    // update_user_role
    // ---------------------------------------------------------------------------
    server.registerTool("update_user_role", {
        title: "Change a user's server role",
        description: "Promote or demote a user's server role (e.g. to server:admin or server:user). DESTRUCTIVE-ish: grants/revokes admin power. Requires SPECKLE_ADMIN_ALLOW_WRITES=true and server:admin.",
        inputSchema: {
            userId: z.string(),
            role: z.enum(["server:admin", "server:user", "server:guest", "server:archived-user"]),
        },
    }, safe(async (args) => {
        assertWritesAllowed("update_user_role");
        const data = await speckleQuery(`mutation UserRoleChange($input: UserRoleInput!) {
          userRoleChange(userRoleInput: $input)
        }`, { input: { id: args.userId, role: args.role } });
        return json({ success: data.userRoleChange, userId: args.userId, role: args.role });
    }));
    // ---------------------------------------------------------------------------
    // delete_user
    // ---------------------------------------------------------------------------
    server.registerTool("delete_user", {
        title: "Delete a user (admin)",
        description: "Permanently delete a user account and their deletable data. IRREVERSIBLE. As a safety check, you must pass the target user's exact email as confirmEmail (mirrors Speckle's own UI confirmation). Requires SPECKLE_ADMIN_ALLOW_WRITES=true and server:admin.",
        inputSchema: {
            confirmEmail: z.string().email().describe("The exact email address of the user to delete — acts as a confirmation."),
        },
    }, safe(async (args) => {
        assertWritesAllowed("delete_user");
        const data = await speckleQuery(`mutation AdminDeleteUser($input: UserDeleteInput!) {
          adminDeleteUser(userConfirmation: $input)
        }`, { input: { email: args.confirmEmail } });
        return json({ success: data.adminDeleteUser, email: args.confirmEmail });
    }));
    // ---------------------------------------------------------------------------
    // update_email_verification
    // ---------------------------------------------------------------------------
    server.registerTool("update_email_verification", {
        title: "Set a user's email verification status",
        description: "Mark an email address as verified or unverified. Speckle recommends confirming ownership with the user first. Requires SPECKLE_ADMIN_ALLOW_WRITES=true and server:admin.",
        inputSchema: {
            email: z.string().email(),
            verified: z.boolean().default(true),
        },
    }, safe(async (args) => {
        assertWritesAllowed("update_email_verification");
        const data = await speckleQuery(`mutation AdminUpdateEmailVerification($input: AdminUpdateEmailVerificationInput!) {
          admin { updateEmailVerification(input: $input) }
        }`, { input: { email: args.email, verified: args.verified ?? true } });
        return json({ success: data.admin.updateEmailVerification, email: args.email, verified: args.verified ?? true });
    }));
    // ---------------------------------------------------------------------------
    // update_server_info
    // ---------------------------------------------------------------------------
    server.registerTool("update_server_info", {
        title: "Update server configuration",
        description: "Update server-wide settings: name (required by the API even if unchanged), description, company, admin contact, terms of service, invite-only mode, guest mode. Pass only the fields you want to change plus the current name. Requires SPECKLE_ADMIN_ALLOW_WRITES=true and server:admin.",
        inputSchema: {
            name: z.string().describe("Required by the Speckle API on every update — pass the current server name if unchanged."),
            description: z.string().optional(),
            company: z.string().optional(),
            adminContact: z.string().optional(),
            termsOfService: z.string().optional(),
            inviteOnly: z.boolean().optional(),
            guestModeEnabled: z.boolean().optional(),
        },
    }, safe(async (args) => {
        assertWritesAllowed("update_server_info");
        const data = await speckleQuery(`mutation ServerInfoUpdate($info: ServerInfoUpdateInput!) {
            serverInfoUpdate(info: $info)
          }`, { info: args });
        return json({ success: data.serverInfoUpdate ?? false });
    }));
    // ---------------------------------------------------------------------------
    // create_server_invite
    // ---------------------------------------------------------------------------
    server.registerTool("create_server_invite", {
        title: "Invite a user to the server",
        description: "Send a server-level invitation email to join this Speckle Server. Requires SPECKLE_ADMIN_ALLOW_WRITES=true.",
        inputSchema: {
            email: z.string().email(),
            message: z.string().optional().describe("Optional custom message included in the invite email."),
            serverRole: z
                .enum(["server:admin", "server:user", "server:guest"])
                .optional()
                .describe("Server role to grant on acceptance. Defaults to server:user."),
        },
    }, safe(async (args) => {
        assertWritesAllowed("create_server_invite");
        const data = await speckleQuery(`mutation ServerInviteCreate($input: ServerInviteCreateInput!) {
          serverInviteCreate(input: $input)
        }`, {
            input: {
                email: args.email,
                message: args.message,
                serverRole: args.serverRole,
            },
        });
        return json({ success: data.serverInviteCreate, email: args.email });
    }));
    // ===========================================================================
    // Support case intake — get a customer's native binary into a dedicated
    // project via Speckle's server-side file importer. All gated behind
    // SPECKLE_ADMIN_ALLOW_WRITES=true like the other write tools, and all
    // additionally require the streams:write scope on the token (not part of
    // this connector's original required-scope list — see README).
    // ===========================================================================
    // ---------------------------------------------------------------------------
    // create_support_project
    // ---------------------------------------------------------------------------
    server.registerTool("create_support_project", {
        title: "Create a dedicated support-case project",
        description: "Create a new project in a workspace (private by default) for one support case, and optionally invite the customer to it. Intended for a support workspace where each case gets its own isolated project (e.g. Speckle's own speckle-community-support pattern) — pair with upload_file_to_project to get their file into it. Requires SPECKLE_ADMIN_ALLOW_WRITES=true and a token with streams:write (+ users:invite if inviting).",
        inputSchema: {
            name: z.string().describe("Project name, e.g. a case/ticket reference or customer name."),
            workspaceId: z.string().describe("The workspace this project belongs to (use list_workspaces/get_workspace to find it)."),
            description: z.string().optional(),
            visibility: z.enum(["PRIVATE", "WORKSPACE"]).default("PRIVATE").describe("PRIVATE = only explicit collaborators (recommended for support cases). WORKSPACE = visible to everyone in the workspace."),
            inviteEmail: z.string().email().optional().describe("If set, invite this email to the new project immediately."),
            inviteRole: z.string().optional().describe("Project role for the invite, e.g. \"stream:contributor\" or \"stream:owner\". Defaults to contributor if omitted."),
            inviteWorkspaceRole: z.string().optional().describe("Workspace role/seat implication for the invite. Defaults to guest access if omitted."),
        },
    }, safe(async (args) => {
        assertWritesAllowed("create_support_project");
        const project = await createSupportProject({
            name: args.name,
            description: args.description,
            workspaceId: args.workspaceId,
            visibility: args.visibility ?? "PRIVATE",
        });
        let invite = null;
        if (args.inviteEmail) {
            invite = await inviteToSupportProject({
                projectId: project.id,
                email: args.inviteEmail,
                role: args.inviteRole,
                workspaceRole: args.inviteWorkspaceRole,
            });
        }
        return json({ project, invite });
    }));
    // ---------------------------------------------------------------------------
    // upload_file_to_project
    // ---------------------------------------------------------------------------
    server.registerTool("upload_file_to_project", {
        title: "Upload a binary file and start its Speckle import",
        description: "Upload a local file (Revit .rvt, Rhino .3dm, IFC, DWG, and everything else Speckle's direct-upload pipeline supports — see docs.speckle.systems/connectors/direct-uploads) into a project and queue Speckle's server-side importer for it. No Revit/Rhino license or connector needed — this is the same headless import used by the web app's drag-and-drop upload. Creates a new model named after the file unless modelId is given (pass an existing modelId to land a follow-up file as a new version on the same model). filePath must be readable from wherever this MCP server process runs. Files over 2GB will be rejected before upload starts. Use get_file_import_status afterwards to check on progress — importing happens asynchronously and this tool returns as soon as the job is queued, not once it's finished. Requires SPECKLE_ADMIN_ALLOW_WRITES=true and a token with streams:write.",
        inputSchema: {
            projectId: z.string(),
            filePath: z.string().describe("Absolute path to the file on the machine running this MCP server."),
            modelId: z.string().optional().describe("Upload into this existing model instead of creating a new one."),
            modelName: z.string().optional().describe("Name for the new model. Defaults to the file name without its extension. Ignored if modelId is given."),
        },
    }, safe(async (args) => {
        assertWritesAllowed("upload_file_to_project");
        const result = await uploadFileAndImport(args);
        return json(result);
    }));
    // ---------------------------------------------------------------------------
    // get_file_import_status
    // ---------------------------------------------------------------------------
    server.registerTool("get_file_import_status", {
        title: "Check a file import's progress",
        description: "Check the most recent import queued via upload_file_to_project for one model: latestIngestion.status.kind is one of Queued, Processing, Success (includes the new versionId), Failed (errorReason), Cancelled, or Invalid — plus recentVersions, which picks up the resulting version once it lands. Poll this after upload_file_to_project since importing is asynchronous.",
        inputSchema: {
            projectId: z.string(),
            modelId: z.string(),
        },
    }, safe(async (args) => {
        const result = await getFileImportStatus(args);
        return json(result);
    }));
}
