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

## A starting harness, not a lasting dependency

FieldKit was assembled as a temporary working harness for the Build with Speckle
workshop. It gives participants and their agents shared context, documented
resources, reusable skills and tested ways of working without requiring everyone
to construct that environment from scratch.

**You are welcome to keep using FieldKit, fork it or adapt it, but you do not
need to keep FieldKit to continue your work.** It is a starting point rather
than a prescribed development environment or a required dependency for the
applications, analyses and workflows you make.

Take useful instructions and patterns into your own repositories, tools and
organisational practices. Keep any actual runtime requirements your solution
uses, such as Speckle APIs or SDKs, authentication, data access and task
configuration, and test it outside the FieldKit workspace before assuming it
runs independently. Agent instructions and skills may also need to be copied
or adapted if you want the same agent-assisted development behaviour elsewhere.

The goal is to make the scaffolding disposable while the knowledge and the
things you build endure.

## Workshop presentations

- [Build with Speckle workshop slides (Figma)](https://www.figma.com/slides/DMOQs7A7rlh31X3O3Xz4VR) — the deck shared with participants.
- [As Built with Speckle keynote address](https://speckle.systems/speckle-events/as-built-with-speckle-keynote-address/) — the event keynote for additional context.

## Start here

You need Git and one supported coding agent. Python 3.8 or newer enables the
extended FieldKit setup, readiness report and analysis helpers, but is not
required for the minimal workshop setup.

For the workshop's minimal PowerShell, Command Prompt and bash/zsh commands,
including agent skill discovery, use the
[`workshop quick start`](docs/workshop-quick-start.md). It does not require
Python.

For a bounded first exercise, choose one of the
[`nine 45-minute challenges`](docs/45-minute-challenges.md): three each for
ASK, BUILD and DELEGATE.

```sh
git clone https://github.com/specklesystems/Field-Kit.git
cd Field-Kit
python3 tools/fieldkit.py setup
```

`setup` safely checks out the workshop foundations—Bundle specification,
Python SDK, documentation and the Python Automate starter—without updating or
overwriting an existing child repository. It then runs the read-only readiness report. Run
that report again at any time with:

```sh
python3 tools/fieldkit.py doctor
```

Open the **Field-Kit folder** in Codex, Cursor, Copilot or Claude. Then try:

> Read AGENTS.md and README.md. Orient me to this FieldKit, then explain the
> bundle specification in plain language. Do not change anything yet.

For a Speckle model-data question, begin with:

> Read `AGENTS.md` and follow
> `.agents/skills/ask-speckle/SKILL.md`. Start read-only and inspect the
> actual model version and available dataset before choosing SQL, an SDK,
> connector source or Automate. Do not invent missing classifications, units
> or project rules.

When you are ready to work:

> I want to [describe the outcome]. Help me choose the smallest public Speckle
> project and relevant skill. Inspect before editing, propose a short plan, and
> tell me how we will know it worked.

### Keep credentials local

Some FieldKit projects need credentials to work with your Speckle account.
Put them in `mise.local.toml` at the FieldKit root, never in a prompt, source
file or committed configuration. FieldKit ignores this file in Git and child
projects inherit its environment when run with `mise exec`.

`mise.local.toml` is still an ordinary plaintext file: “local” means it stays
in your checkout, not that it is encrypted. See the detailed token and setup
instructions in `projects/fieldkit-admin-mcp/README.md` when that companion project
is present.

## Things you can ask FieldKit to help with

You do not need to know the name of an API or the right repository before you
begin. Replace the words in `[square brackets]` with what you know, and let the
agent identify anything that is missing.

For these examples, use data and model files you are permitted to work with.
Ask the agent to begin with the checked-out `speckle-docs-NEW` documentation
and relevant source code before assuming a feature exists. It should use the
live public documentation only when the local copy is missing or out of date,
choose the lightest suitable route, avoid changing data unless you request it,
and show evidence for its answer.

### Explore project data

> Help me answer a question about `[project]`. Start with a read-only query and
> show me what projects, models and versions are available before writing a
> larger script. I want to know `[question]`.

> Query `[model]` in `[project]` and produce a table of `[properties or object
> types]`. Explain what each row represents, identify missing values and save
> the repeatable query separately from its output.

> Compare versions `[version A]` and `[version B]` of `[model]`. Tell me what
> was added, removed and changed, including which stable identifiers you used
> to match objects. Begin with a small sample so we can verify the method.

> I have several models in `[project]`. Test whether `[condition]` can be
> answered across them without first copying everything into another system.
> Recommend a direct query, notebook or small script and explain the trade-off.

> Create a notebook that reads approved Speckle data into useful tables for
> analysis with DuckDB or Parquet. Keep source queries, derived tables and
> presentation outputs clearly separated, and do not commit downloaded model
> data.

### Automate repeated work

> Start a Python Speckle Automate function for `[check or transformation]` from
> the public `automate-python` starter. First explain the starter's structure,
> inputs and local test path. Build the smallest working check and show me how
> to test it safely before connecting it to an automation.

> Turn this read-only analysis into a Speckle Automate function that runs when
> a new model version arrives: `[describe analysis]`. Keep the calculation
> separate from the Automate wrapper so we can test it with a small fixture.

> Review this Automate result as if another project team must rely on it. Check
> failure handling, messages, units, tolerances and test coverage. Do not add
> features; list the smallest changes needed to make its result trustworthy.

### Understand Speckle and its connectors

> Is `[object, property or workflow]` supported by the `[host application]`
> connector? Inspect the relevant public connector, shared connector code and
> documentation. Distinguish confirmed behaviour from an inference, and point
> me to the evidence.

> Trace how `[host application object]` becomes Speckle data. Show me where it
> is converted, which properties survive, and whether receive behaves
> differently from send. Explain the path in language a `[discipline]`
> practitioner would recognise.

> Explain how `[example object or relationship]` should be represented using
> the Bundle specification. Compare it with the SDK implementation and flag
> anything that is conventional rather than required by the specification.

> I need to move `[workflow]` between `[host A]` and `[host B]`. Check the
> public connector capabilities before proposing code. Identify what transfers
> directly, what needs mapping and what may not round-trip.

### Set up useful project structure

> Populate `[project]` with a proposed template of model and model/submodel
> containers for `[project type]`. Do not create anything yet. First inspect
> what the current public API supports, show the proposed hierarchy as a table,
> and identify naming, ownership and permission decisions I must make.

> Turn the agreed model-container template into a repeatable setup script. Make
> it safe to run twice without creating duplicates, include a preview mode and
> test it against a disposable project before touching the target project.

> Inspect `[project]` and report where its current model structure differs from
> `[our template or practice pack]`. Treat the practice pack as a scoped rule,
> not universal Speckle behaviour, and do not reorganise anything yet.

### Shape the next piece of work

> I currently do this manually: `[describe workflow]`. Help me separate the
> decision I am trying to make from the preparation needed to make it. Estimate
> where time is spent, then recommend whether to ask, explore, repeat or run on
> change.

> This experiment worked: `[describe it]`. Help me decide what belongs in a
> reusable script, a general FieldKit skill, or an organisation-specific
> practice pack. Do not turn a local convention into a universal rule.

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
[`.agents/skills/choose-a-route/SKILL.md`](.agents/skills/choose-a-route/SKILL.md). Use it when
the route is unclear, or when the work will be shared, repeated, automated,
write data, or inform a consequential decision.

## What is a code harness?

A coding agent can write code, but it starts without your history, vocabulary
or judgement. A harness places the useful material around it:

```text
Field-Kit/                  ← the parent harness (this Git repository)
├── AGENTS.md               ← instructions every task should inherit
├── fieldkit.json           ← catalogue of approved public projects
├── analyses/               ← repeatable queries, notebooks and evidence
├── context/                ← short maps of those projects
├── .agents/skills/         ← discoverable ASK, BUILD and DELEGATE skills
├── practice-packs/         ← scoped organisation/project rules
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

FieldKit also treats the active public connector family as first-class:

| FieldKit name | Public repository | Scope |
|---|---|---|
| `sharp-connectors` | `specklesystems/speckle-sharp-connectors` | .NET host connectors and shared connector logic |
| `connectors-ui` | `specklesystems/speckle-connectors-dui` | Shared connector web interface |
| `archicad-connector` | `specklesystems/speckle-archicad` | Archicad |
| `sketchup-connector` | `specklesystems/speckle-sketchup` | SketchUp |
| `powerbi-connector` | `specklesystems/speckle-powerbi` | Power BI |
| `blender-connector` | `specklesystems/speckle-blender` | Blender |

List or check them out with:

```sh
python3 tools/fieldkit.py list
python3 tools/fieldkit.py checkout automate-python
python3 tools/fieldkit.py resolve connectors
python3 tools/fieldkit.py checkout --group connectors
python3 tools/fieldkit.py checkout --core
```

`--core` remains the stable original set: Bundle Spec, both SDKs, all three
Automate starters and docs. Connector repositories are opt-in because the
complete family can take time and disk space. Check out only the repository
that owns your task when possible.

## How the context layers work

Think from broad to specific:

1. **FieldKit instructions** — [`AGENTS.md`](AGENTS.md) applies to the whole
   workspace: safety, scope, verification and good agent behaviour.
2. **Project instructions** — a child repository may have its own
   `AGENTS.md`, README or contributor guide. The nearer instructions describe
   that codebase and should win when they do not conflict with safety.
3. **Ways-of-working skills** — [`.agents/skills/`](.agents/skills/) contains
   public, portable procedures; [`skills/README.md`](skills/README.md) is their
   human-readable catalogue.
4. **Practice packs** — [`practice-packs/`](practice-packs/README.md) contains
   separately owned rules for what a correct result means in an organisation,
   project or jurisdiction.
5. **Personal skills** — [`personal/`](personal/README.md) is a private staging
   area for your own patterns. It is ignored by Git and is **not** guaranteed
   to be discovered automatically by every client.

`AGENTS.md` is the durable briefing. A skill is a procedure you invoke when it
is relevant. Neither is a magic prompt that makes an agent infallible.

## Ways of working are not organisational practice

FieldKit keeps two different kinds of agent knowledge separate:

| Kind | Question it answers | Example |
|---|---|---|
| **Way of working** | How should the agent approach this kind of work? | Orient before editing; choose the lightest safe route; verify before completion |
| **Practice pack** | What does correct mean in this particular setting? | How an organisation measures areas and quantities; a project's classification rules; a jurisdiction's reporting convention |

A general skill must not invent an organisation's measurement method. A
practice pack must not present a local convention as universal Speckle
behaviour.

Real practice packs are independent child repositories, often private, under
`practice-packs/`. FieldKit ignores their contents just as it ignores project
checkouts. Start from [`templates/practice-pack/`](templates/practice-pack/),
then give the pack a named owner, scope, authority, version and evidence.

## Three actions, plus four supporting skills

ASK, BUILD and DELEGATE are verbs, not job identities or stages. A participant
can begin and finish in any one pillar.

- **`ask-speckle`** — answer a bounded data, model-version or connector
  capability question with evidence, confidence and explicit gaps.
- **`build-with-speckle`** — create a bounded analysis, script or integration
  artefact with safe local data handling and observable tests.
- **`delegate-with-speckle`** — use Speckle Automate as the available-today
  route for defined version-triggered work, or clearly label agent workflows
  as supervised/local or preview; always define inputs, failures and ownership.

The supporting skills help whichever action is in play:

- **`orient-me`** — map a repository before proposing changes.
- **`shape-a-task`** — turn an outcome into a small, testable task.
- **`choose-a-route`** — select the lightest safe implementation route.
- **`verify-work`** — inspect the evidence before calling work complete.

Ask directly when your client does not discover skills automatically:

> Follow `.agents/skills/orient-me/SKILL.md` for this task.

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
- [Workshop quick start](docs/workshop-quick-start.md) — the exact on-screen
  clone, child-repository and agent instructions.
- [45-minute challenges](docs/45-minute-challenges.md) — nine ready-to-paste
  ASK, BUILD and DELEGATE prompts with valid fallback finishes.
- [Safe working](docs/safe-working.md) — data, secrets and publication checks.
- [Practice packs](practice-packs/README.md) — scoped organisation and project
  knowledge.
- [Project catalogue](fieldkit.json) — the machine-readable public allow-list.
- [Project maps](context/README.md) — where to start in each codebase.

FieldKit is MIT licensed. Child projects retain their own licences and
contribution rules.

