# FieldKit Admin + Data MCP

A local FieldKit companion for querying and administering **one Speckle
Server**. It talks straight to that server's GraphQL API using your personal
access token—no specklepy, OAuth dance or shared infrastructure. It runs as a
local stdio MCP with safe error handling and self-documenting tools.

> **This is not the official Speckle MCP.** Mike's Speckle MCP is the official
> product integration. This separate FieldKit companion is intended for
> administration, customer-success workflows and deeper data investigation.

## Why not specklepy?

specklepy is a great fit if you're scripting from Python or need its object
transport layer (`operations`, `Base`). The admin surface used here —
`AdminQueries`/`AdminMutations`, `ServerInfo`, `userRoleChange`,
`adminDeleteUser` — is a small, stable slice of the GraphQL schema, simple
enough to call directly with `fetch`. Staying in TypeScript also means this
reuses the same MCP SDK, tool-registration pattern, and error-wrapping as
Freckle, so it's a five-minute read for anyone who's seen that codebase.

## Design intent: customer success, not project analytics

This started as a general Speckle Server admin connector, but the motivating
use case is **customer success** — understanding how an account is actually
using Speckle, not deep project-content analysis. Two things follow from
that:

- **Metrics alone aren't the goal.** `get_contribution_rollup` and
  `get_workspace_activity` tell you *how much* activity there is; the
  content-bearing tools (`list_issues` titles/descriptions,
  `list_project_insights` check names and what they validate,
  `get_dashboard`'s widget tree, `sourceApplication` on versions) are what
  actually surface *what kind of work* an account is doing — Revit vs. Rhino
  vs. IFC, automated compliance checks running on every push, issue threads
  about clash detection. Read those alongside the counts, not instead of
  them.
- **Where it overlaps with Speckle's own internal AI tool** ("Magic",
  `packages/frontend-3/lib/ai` in the monorepo): `get_project_team` and
  `get_contribution_rollup` are direct ports of Magic's `team_roles` and
  `contribution_rollup` tools — same logic, same caveats, adapted from
  Apollo/browser to a plain `fetch` server. Magic itself has no
  billing/support-session tooling (it's a customer-facing product, so that
  wouldn't be exposed to a customer's own AI chat) — those signals
  (`Workspace.subscription`/`plan`/`seats`/`activeSupportSession`) are a real
  gap here and would need building directly from the schema if account-health
  scoring becomes the next priority.

## Read tools

The natural hierarchy is **workspace → projects → models/versions → content**.
For "who's actually active" questions, `get_workspace_activity` is the tool
to reach for — it's real usage data (recent versions, authors, source apps)
straight from the server, not a lagging proxy like CRM/deal data.

| Tool | Description |
| --- | --- |
| `get_server_info` | Server identity/config: name, description, version, invite-only/guest-mode, auth strategies, roles, scopes. |
| `get_server_statistics` | Total users, projects, pending invites. |
| `list_workspaces` | Search/paginate workspaces (admin view). |
| `get_workspace` | One workspace's detail by id or slug — plan, team size, project count. |
| `get_workspace_activity` | Projects in a workspace with their recent versions, ordered by most recent activity — who, what model, when, from what source app. The real usage signal. |
| `get_project_team` | Who collaborates on a project, their role, and workspace seat type. Ported from Speckle's own internal AI tool (`team_roles`). |
| `get_contribution_rollup` | Per-person activity rollup over a lookback window — versions authored, issues authored/assigned. Ported from Speckle's own internal AI tool (`contribution_rollup`), same pagination/aggregation logic, same honesty caveats about undercounting reviewers. Pairs with `get_project_team`: a paid seat with zero recent contributions is a real account-health signal. |
| `list_users` | Search/paginate all users (admin view) — id, name, email, role, verified. |
| `get_user` | One user's public profile by id. |
| `list_projects` | Search/paginate all projects on the server (admin view). |
| `get_project` | One project's details by id, including its `workspaceId` and quick counts of models/versions/dashboards/issues. |
| `list_dashboards` | Dashboards (Speckle's analytics/reporting surface) in a workspace or project — count and recency is itself an activity signal. |
| `get_dashboard` | One dashboard's parsed layout (block/widget tree — chart, kpi, table, legend, viewer, card, etc.), a rough content-widget count, and its sharing status via `Project.shareTokens` (who shared it, when, password-protected, last used). |
| `list_issues` | Speckle Issues (built-in issue tracking on models/versions) for a project — status, priority, assignee. Open/recent issue volume signals active review, not just a one-time upload. |
| `list_project_insights` | Data validation checks and the ruleset "standards" they're derived from, for a project. **The strongest activity signal available** — checks run automatically whenever a new version is pushed to a tracked model, so recent/frequent results mean the team is actively validating, not just uploading once. Includes each check's latest pass/fail result. |
| `get_insight_results` | Full run history for one check — pass/fail trend over time (aggregate across all its models, one model, or one specific version), tied to `timestamp`/`versionId`. |
| `list_invites` | Pending server-level invitations. |

**Correction on data validation:** an earlier version of this README said
validations weren't independently queryable and persisted as `Dashboard`s.
That was wrong — after reading the actual `data-validation` Vue components
(`SaveDialog.vue`, `InsightCard.vue`, `InsightHistory.vue`,
`StandardCard.vue`), it's clear they're a distinct first-class GraphQL type,
`Insight` (queried via `projectInsights`/`modelInsights`/`insight`), with its
own `derivedPackageCount`, `aggregateResults`/`modelResults`/`versionResults`,
and `sourceRuleset`/`template` lineage — not a `Dashboard` at all. `type`
distinguishes a one-off "check" from a reusable "ruleset"/"standard" (exact
string values aren't enumerated in the schema — pass `type` through if you
know it, or omit to get both).

## Model data analytics (EAV/packfile)

Speckle publishes a per-version "packfile" dataset — a DuckDB file with every
object in that version, plus a companion EAV (entity-attribute-value)
dataset that pre-extracts every object's properties into one flat, queryable
table. It's the same mechanism the Speckle web app's own AI/model-analytics
chat feature uses client-side (DuckDB-WASM in the browser); these tools do
the equivalent download-and-query server-side with `@duckdb/node-api`.
**Not every version has one** — it requires having been published from a
recent-enough Speckle Connector — so always call `check_dataset_availability`
first.

| Tool | Description |
| --- | --- |
| `check_dataset_availability` | Does this project/model/version have a dataset? How big is it? |
| `list_model_property_paths` | Every distinct property path in the version (category, level, Material Quantities.Volume, ...), with object counts — the map of what's actually in the model. |
| `get_model_property_breakdown` | Object counts grouped by one property path, e.g. `category` → Wall/Door/Pipe counts, or `level` → objects per floor. |
| `run_model_sql` | Raw read-only SQL (SELECT/WITH only) against the downloaded packfile(s) via DuckDB. `eav.properties` has columns `object_id, path, type, value_text, value_num`. Capped at 500 rows. |

Downloaded packfiles are cached under the OS temp dir
(`$TMPDIR/fieldkit-admin-mcp/packfiles`) keyed by project/model/version, so
repeated queries against the same version don't re-download.

**Provenance note (workspace activity):** `get_workspace_activity` wraps
`Workspace.projectActivityTimeline`, confirmed directly in the server
GraphQL schema (`WorkspaceProjectActivityTimelineInput`/`...Result`,
`Project.workspaceId`). Note this reads the *token owner's* workspace
activity — your PAT needs to actually be a member of the workspace you're
asking about (server:admin alone may not be enough for workspace-scoped
data, unlike the AdminQueries surface).

**Provenance note (model data):** the GraphQL fields (`objectKey`, `packfileSize`,
`referencedObject`) and REST endpoints
(`/api/v1/projects/{p}/models/{m}/versions/{v}/download` and `.../eav/download`)
were confirmed by reading `@speckle/packfile-manager` and
`packages/frontend-3/lib/eav` directly in the server monorepo — not from
docs, which for this specific feature turned out to describe the real
mechanism accurately but is for a very new capability not yet in the public
`speckle-server` OSS repo as of mid-2026. The `properties` table columns are
confirmed the same way (`@speckle/eav-queries`). The main (non-EAV) packfile
dataset's table schema was **not** fully mapped — `run_model_sql` with
`dataset: "main"` works but you'll want to `DESCRIBE` first.

## Write tools (off by default)

Gated behind `SPECKLE_ADMIN_ALLOW_WRITES=true`. Each one still requires your
PAT to actually have `server:admin` on the target server — this env flag is
just a local kill-switch so read-only exploration can never accidentally
mutate anything.

| Tool | Description |
| --- | --- |
| `update_user_role` | Promote/demote a user's server role. |
| `delete_user` | Permanently delete a user. Requires their exact email as confirmation (mirrors Speckle's own UI safeguard). **Irreversible.** |
| `update_email_verification` | Mark an email verified/unverified. |
| `update_server_info` | Update server name/description/company/ToS/invite-only/guest-mode. |
| `create_server_invite` | Send a server invite email. |
| `create_support_project` | Create a private (by default) project in a workspace for one support case, optionally inviting the customer to it. |
| `upload_file_to_project` | Upload a local binary (Revit `.rvt`, Rhino `.3dm`, IFC, DWG, ...) into a project and queue Speckle's server-side import for it. |

## Support case intake

`create_support_project` + `upload_file_to_project` + `get_file_import_status`
(the last is a read tool, not gated) cover the loop of: get a customer's
native file into an isolated project without them needing a Speckle
connector, a Revit/Rhino license, or even a Speckle account beforehand — the
same workflow as Speckle's own `speckle-community-support` workspace (each
case gets its own project; the customer only sees what they're invited to).

This does **not** go through desktop connectors or Revit/Rhino automation.
It uses Speckle's server-side direct-upload pipeline — the same "drag a file
into a project" mechanism in the web app, a headless importer (Rhino.Inside
for most formats) that runs without the authoring application installed.
See [docs.speckle.systems/connectors/direct-uploads](https://docs.speckle.systems/connectors/direct-uploads/introduction)
for the full supported-format list (currently includes `.rvt`, `.3dm`,
`.ifc`, `.dwg`, `.dxf`, `.dgn`, `.skp`, `.sldprt`, `.stp`/`.step`, `.fbx`,
`.obj`, `.e57`, `.nwc`/`.nwd`, and more) — 2GB upload limit.

The mechanism (confirmed against `specklesystems/speckle-server` source, not
docs, since the REST endpoint this used to go through — `POST
/api/file/autodetect/:streamId/:branch` — was deprecated server-side in
September 2025):

1. `workspaceMutations.projects.create` — new project, `visibility: PRIVATE` by default
2. `projectMutations.invites.createForWorkspace` — optional, invites the customer
3. `modelMutations.create` — a model for the upload (or reuse an existing `modelId` for a follow-up file)
4. `fileUploadMutations.generateUploadUrl` — pre-signed blob-storage URL
5. Raw `PUT` of the file bytes to that URL
6. `fileUploadMutations.startFileImport` — queues the actual parse/import job

Importing is asynchronous — `upload_file_to_project` returns once the job is
*queued*, not once it's finished. Poll `get_file_import_status` afterwards;
`convertedStatus` goes queued → processing → success/error, and a successful
import shows up under the model's `recentVersions` instead of staying
pending.

**Scope note:** all three mutations require `streams:write` on the token,
which is not in this connector's original required-scope list below — add
it to your PAT (or issue a new one) before using these tools.

`filePath` must be readable from wherever this MCP server process actually
runs. Since this connector is stdio/local-only (see Notes below), that's the
same machine driving whatever Claude session calls the tool.

## Setup

### 1. Create a personal access token

Follow Speckle's official
[Building with PATs](https://docs.speckle.systems/developers/authentication/pats)
guide. In brief: sign in to the Speckle Server you intend to use, open your
user **Developer** settings, select **New token**, give it a recognisable name
and copy it when it is shown.

Select only the scopes you need. FieldKit Admin + Data MCP contains tools with different
access requirements, so one token does not have to unlock every tool:

| Intended use | Scopes commonly needed |
| --- | --- |
| Read projects and model data | The appropriate profile and project/stream read scopes, plus membership of the relevant workspace or project |
| Server administration | `profile:read`, `users:read`, `server:setup` |
| Send invitations | `users:invite` in addition to the relevant administration access |
| Create projects or upload files | `streams:write` in addition to access to the target workspace |

These are least-privilege starting points, not a promise that every Speckle
Server version or workspace policy behaves identically. If a token cannot run
a tool, FieldKit Admin + Data MCP explains the likely scope or membership issue and keeps
the other tools available.

### 2. Add it to FieldKit's local secrets

At the **FieldKit root**—the folder containing `AGENTS.md`—create a file named
`mise.local.toml`:

```toml
[env]
SPECKLE_SERVER_URL = "https://app.speckle.systems"
SPECKLE_TOKEN = "paste-your-personal-access-token-here"
SPECKLE_ADMIN_ALLOW_WRITES = "false"
```

Use your own server URL if you are not using `app.speckle.systems`. Keep write
mode set to the quoted string `"false"` unless you deliberately need mutation
tools. The quotes ensure the MCP receives the exact environment value it
expects.

FieldKit and this child project both ignore `mise.local.toml`, but it remains
an **unencrypted plaintext file**. Never commit, paste, email or upload it.
For stronger storage, use a secret manager supported by
[mise](https://mise.jdx.dev/environments/secrets/).

### 3. Trust and verify the local configuration

Mise asks you to trust project configuration before it exports environment
variables. From the FieldKit root, run:

```bash
mise trust mise.local.toml
```

Then move into `projects/fieldkit-admin-mcp` and run this check. It reports only
whether a token exists; it never prints the token:

```bash
mise exec -- node -e 'console.log({ tokenPresent: Boolean(process.env.SPECKLE_TOKEN), writesEnabled: process.env.SPECKLE_ADMIN_ALLOW_WRITES === "true" })'
```

The expected result is `tokenPresent: true` and `writesEnabled: false`.

### 4. Install and build

From `projects/fieldkit-admin-mcp`:

```bash
mise exec -- npm ci
mise exec -- npm test
mise exec -- npm run build
```

### Standalone fallback without mise

If you use this child repository outside FieldKit, copy `.env.example` to
`.env` and fill in the same values. `.env` is ignored by Git and loaded by the
project's development/start scripts. Do not maintain both files: choose one
local source of truth so an old token cannot unexpectedly take precedence.

Register the built server using the instructions for your client below.

### If the token cannot run a tool

FieldKit Admin + Data MCP stays running when Speckle rejects a call. It returns a short,
actionable error instead of a raw GraphQL response:

- **Authentication failed** usually means the token is invalid, expired, or
  was issued by a different Speckle Server.
- **Operation refused** may mean the token is missing a scope, but it can also
  mean its owner is not a member of the requested workspace or project, or
  that the server's policy blocks the action.
- Administration operations commonly need `server:setup`; invitations may
  need `users:invite`; project creation and file intake need `streams:write`.
  These are troubleshooting hints rather than a claim that every refusal has
  the same cause.

The failed call does not change data. Other tools whose access requirements
the token does satisfy remain available. FieldKit Admin + Data MCP does not print the token
or authenticated response bodies in its tool errors.

### Claude Code

```bash
claude mcp add fieldkit-admin-mcp -- \
  mise exec -C "/absolute/path/to/Field-Kit" -- \
  node "/absolute/path/to/Field-Kit/projects/fieldkit-admin-mcp/dist/index.js"
```

Using `mise exec -C` makes the client load FieldKit's `mise.local.toml` even
when it launches the MCP from another working directory. The token is not
copied into the Claude command or its project configuration.

### Claude Desktop / Cowork

Cowork's **Connectors** settings only accept *remote* MCP servers reachable
over the public internet — even though Cowork runs locally, that flow
proxies through Anthropic's cloud, which is the wrong shape for a private
server holding your PAT. The supported path for a local server like this one
is a **Desktop Extension** (`.mcpb`) — a single-click-installable bundle,
which is also the only path if step 3 was skipped assuming you built inside
some other environment: native modules (this project depends on
`@duckdb/node-api`) must be installed/packed on the same OS/arch that will
run them, so do this on the actual machine running Claude Desktop, not in a
cloud sandbox or VM.

```bash
cd "/absolute/path/to/Field-Kit/projects/fieldkit-admin-mcp"
npm install              # full install — tsc (build) is a devDependency
npm run build
npm prune --omit=dev     # drop devDependencies now that dist/ exists, keeps the bundle smaller
npm install -g @anthropic-ai/mcpb
mcpb pack . fieldkit-admin-mcp.mcpb
```

Then either double-click `fieldkit-admin-mcp.mcpb`, or in Claude Desktop go to
**Settings → Extensions → Advanced settings → Install Extension…** and pick
the file. `manifest.json` (already in this repo) defines three prompts the
install flow will ask for — no manual env vars or config file editing:

| Prompt | Maps to |
| --- | --- |
| Speckle Server URL | `SPECKLE_SERVER_URL` |
| Personal Access Token | `SPECKLE_TOKEN` |
| Allow write operations | `SPECKLE_ADMIN_ALLOW_WRITES` (defaults to `false`) |

## Development

```bash
npm run dev        # stdio, from source with tsx
npm test           # permission handling and redaction tests
npm run typecheck  # type-check without emitting
```

## Notes

- **Single server only.** No multi-tenant support — one PAT, one
  `SPECKLE_SERVER_URL`. If you need to administer a second server, run a
  second instance with a different `.env`.
- **No HTTP transport.** Unlike Freckle, this doesn't ship an HTTP/OAuth mode
  — it's meant to run locally as a subprocess, one person, one token. If you
  later want to share it with a team, look at how Freckle's `oauth.ts` /
  `auth.ts` layer works (self-issued OAuth 2.1 server, Google SSO gated to a
  domain) and consider per-user Speckle OAuth (real PKCE login against the
  target server, not a shared PAT) rather than reusing this design's
  single-token model at scale.
- **Schema verified against `specklesystems/speckle-server` source**
  (`modules/core/graph/resolvers/admin.ts`, `modules/core/graph/resolvers/users.ts`,
  `modules/core/graph/generated/graphql.ts`) rather than the public docs,
  which are mid-migration and missing admin-scope details as of writing.
  Re-check against your server's `/graphql` explorer if it's running an
  older or newer version — field names in the admin surface have moved
  before (e.g. legacy REST-era admin endpoints vs. today's `AdminQueries`).
