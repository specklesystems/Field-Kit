# Speckle FieldKit

**A small, portable code harness for building with Speckle and an AI coding agent.**

FieldKit gives Codex, Cursor, GitHub Copilot, Claude Cowork and Claude Code a
useful place to begin: a map of the work, shared instructions, reusable skills
and a curated set of public Speckle codebases.

You do not need to be a software engineer to use it. FieldKit is designed for
people who know the outcome they want, can describe it, and are prepared to
inspect and test what an agent makes with them.

> FieldKit is a harness, not an autopilot. It supplies context and guardrails;
> you still choose the destination and decide whether the result is sound.

## Start here

You need Git, Python 3.8 or newer, and one supported coding agent.

```sh
git clone https://github.com/specklesystems/Field-Kit.git
cd Field-Kit
python3 tools/fieldkit.py list
python3 tools/fieldkit.py checkout bundle-spec python-sdk docs
```

Open the **Field-Kit folder** in Codex, Cursor, Copilot or Claude. Then try:

> Read AGENTS.md and README.md. Orient me to this FieldKit, then explain the
> bundle specification in plain language. Do not change anything yet.

When you are ready to work:

> I want to [describe the outcome]. Help me choose the smallest public Speckle
> project and relevant skill. Inspect before editing, propose a short plan, and
> tell me how we will know it worked.

## Choose a route before choosing a tool

For anything beyond a small, read-only experiment, move through this path:

**Ask → Explore → Repeat → Run on change → Maintain → Productise**

- **Ask** when a direct question can produce the answer.
- **Explore** when you need to inspect data or test an idea.
- **Repeat** when a known operation should become a script.
- **Run on change** when the same process should respond to a model version.
- **Maintain** when you are building an owned integration or service.
- **Productise** when multiple users need a supported interface or operational
  dashboard.

These are routes, not levels. A notebook is better than an application when it
safely answers the question. A personal script is not enough when other people
depend on its answer.

The canonical decision procedure is
[`skills/choose-a-route/SKILL.md`](skills/choose-a-route/SKILL.md). Use it when
the route is unclear, or when the work will be shared, repeated, automated,
write data, or inform a consequential decision.

## What is a code harness?

A coding agent can write code, but it starts without your history, vocabulary
or judgement. A harness places the useful material around it:

```text
Field-Kit/                  ← the parent harness (this Git repository)
├── AGENTS.md               ← instructions every task should inherit
├── fieldkit.json           ← catalogue of approved public projects
├── context/                ← short maps of those projects
├── skills/                 ← reusable ways of doing common work
├── personal/               ← your private, uncommitted material
└── projects/               ← independent child Git repositories
    ├── speckle-bundle-spec/
    ├── specklepy/
    └── speckle-docs-NEW/
```

The files at the top help the agent understand the landscape. The projects
below are the real public codebases it can inspect or change.

Atlas is Speckle's larger internal version of this idea. FieldKit borrows the
architecture—not Atlas's private content, repositories, credentials or
internal operating machinery.

## A folder is not necessarily a repository

A **folder** is simply a container on your computer. A **Git repository** is a
folder with its own history, branches and remote destination.

FieldKit is one repository. Every checkout inside `projects/` is another,
independent repository. FieldKit ignores their contents; it does not swallow
them into one giant project.

Before committing, pushing or asking an agent to make a broad change, check
which repository you are standing in:

```sh
pwd
git rev-parse --show-toplevel
git status
git remote -v
```

If the top level ends in `Field-Kit`, you are changing the harness. If it ends
in `projects/specklepy`, for example, you are changing the Python SDK. Never
run `git init` inside a checked-out project: it is already a repository.

## The first-class public projects

FieldKit deliberately starts with a small public surface:

| FieldKit name | Public repository | Use it to |
|---|---|---|
| `bundle-spec` | `specklesystems/speckle-bundle-spec` | Understand the portable Speckle data contract |
| `python-sdk` | `specklesystems/specklepy` | Read and write Speckle data from Python |
| `dotnet-sdk` | `specklesystems/speckle-sharp-sdk` | Build .NET integrations and applications |
| `automate-python` | `specklesystems/speckle_automate_python_example` | Start a Python Automate function |
| `automate-dotnet` | `specklesystems/SpeckleAutomateDotnetExample` | Start a .NET Automate function |
| `automate-typescript` | `specklesystems/speckleAutomateTypescriptTemplate` | Start a TypeScript Automate function |
| `docs` | `specklesystems/speckle-docs-NEW` | Find and improve public product guidance |

List or check them out with:

```sh
python3 tools/fieldkit.py list
python3 tools/fieldkit.py checkout automate-python
python3 tools/fieldkit.py checkout --core
```

`--core` checks out Bundle Spec, both SDKs, all three Automate starters and
docs. It can take time and disk space; checking out one project is often the
better workshop choice.

## How the context layers work

Think from broad to specific:

1. **FieldKit instructions** — [`AGENTS.md`](AGENTS.md) applies to the whole
   workspace: safety, scope, verification and good agent behaviour.
2. **Project instructions** — a child repository may have its own
   `AGENTS.md`, README or contributor guide. The nearer instructions describe
   that codebase and should win when they do not conflict with safety.
3. **Shared skills** — [`skills/`](skills/README.md) contains committed,
   reusable procedures anyone may use.
4. **Personal skills** — [`personal/`](personal/README.md) is a private staging
   area for your own patterns. It is ignored by Git and is **not** guaranteed
   to be discovered automatically by every client.

`AGENTS.md` is the durable briefing. A skill is a procedure you invoke when it
is relevant. Neither is a magic prompt that makes an agent infallible.

## Four useful skills to begin with

- **`orient-me`** — map a repository before proposing changes.
- **`shape-a-task`** — turn an outcome into a small, testable task.
- **`choose-a-route`** — select the lightest safe implementation route.
- **`verify-work`** — inspect the evidence before calling work complete.

Ask directly when your client does not discover skills automatically:

> Follow `skills/orient-me/SKILL.md` for this task.

See [client setup](docs/client-setup.md) for the deliberately conservative
cross-client model.

## A safe working loop

Use the same rhythm whether you are asking, building or delegating:

1. **Name the outcome** — who benefits, and what changes for them?
2. **Choose the smallest project** — do not load the entire world by default.
3. **Orient before editing** — identify entry points, tests and local rules.
4. **Plan a thin slice** — one useful result with a visible success check.
5. **Build with checkpoints** — inspect diffs and outputs as you go.
6. **Verify independently** — run the appropriate checks and exercise the
   result as a user would.
7. **Record the learning** — improve context or a skill only when the lesson
   is reusable.

Good prompts include constraints and evidence:

> Work only in `projects/speckle_automate_python_example`. Explain the current
> flow first. Make the smallest change that produces [outcome]. Do not use
> secrets or private APIs. Run the repository's documented checks and show me
> the evidence.

## Public-safe by design

FieldKit contains public repository URLs only. Do not place tokens, private
URLs, customer models, confidential prompts or client data in this repository.
Use model files you are permitted to upload and experiment with.

Before publishing anything, follow [safe working](docs/safe-working.md). In
particular, inspect both the FieldKit repository and the active child
repository: they have separate histories and separate destinations.

## Where next?

- [Architecture](docs/architecture.md) — the parent/child model in more depth.
- [Client setup](docs/client-setup.md) — how to use the common layer without
  pretending every agent behaves identically.
- [Safe working](docs/safe-working.md) — data, secrets and publication checks.
- [Project catalogue](fieldkit.json) — the machine-readable public allow-list.
- [Project maps](context/README.md) — where to start in each codebase.

FieldKit is MIT licensed. Child projects retain their own licences and
contribution rules.

