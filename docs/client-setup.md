# Using FieldKit with coding agents

For the copyable workshop commands, start with
[`workshop-quick-start.md`](workshop-quick-start.md).

Open the FieldKit root as the workspace so the parent context and child
projects are both visible. Keep expectations conservative: clients evolve and
do not discover every instruction or skill in exactly the same way.

| Client | Portable starting point |
|---|---|
| Codex | Open FieldKit; it reads `AGENTS.md` and discovers repository skills from `.agents/skills/`. |
| Cursor | Open FieldKit; root `AGENTS.md` persists, while skills should be explicitly referenced or attached. |
| GitHub Copilot | Open FieldKit; supported agents use `.github/copilot-instructions.md` and discover `.agents/skills/`. |
| Claude Code | Start in FieldKit; `CLAUDE.md` persists and points to the canonical `.agents/skills/` paths. |
| Claude Cowork | Select FieldKit as the local project folder and add the folder instruction from the quick start. |

The dependable cross-client behaviour is plain files plus an explicit request:

> Work in `projects/specklepy`. Read the applicable instructions and follow
> `.agents/skills/orient-me/SKILL.md`. Do not make changes yet.

For a model-data question, use the portable bootstrap prompt:

> Read `AGENTS.md` and follow
> `.agents/skills/ask-speckle/SKILL.md`. Start read-only, inspect the
> actual model/version and available dataset before choosing SQL, an SDK,
> connector source or Automate. Apply no project or regulatory rule unless an
> applicable practice pack or governing source has been supplied.

For building or delegating, replace that path with
`.agents/skills/build-with-speckle/SKILL.md` or
`.agents/skills/delegate-with-speckle/SKILL.md`. These are independent choices, not a
required sequence.

`CLAUDE.md` and `.github/copilot-instructions.md` are short client-native
pointers to the same shared instructions. Cowork does not have a repository
instruction convention FieldKit can rely on, so use the bootstrap prompt
explicitly. These entry points intentionally do not duplicate the skill.

## Global, shared and personal

- **Global client instructions** live in client-specific user configuration.
  They follow you beyond FieldKit and are outside this repository.
- **Shared FieldKit skills** live in `skills/` and are committed for everyone.
- **Project skills or instructions** belong in the child project and travel
  with that codebase.
- **Personal material** can be drafted in `personal/`, which is uncommitted.
  To make it automatically discoverable, install it using the current
  documentation for your chosen client. Otherwise reference its path directly.

Organisation or project practice belongs in a separately versioned repository
under `practice-packs/`. Make the applicable pack available to the client, then
reference its `PACK.md` and named skill explicitly. Do not assume a client has
discovered a private pack, and do not apply one merely because it is present.

Do not duplicate a shared skill into every client folder unless the client
requires it; copies drift. Prefer one readable source and explicit invocation.

