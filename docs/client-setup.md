# Using FieldKit with coding agents

Open the FieldKit root as the workspace so the parent context and child
projects are both visible. Keep expectations conservative: clients evolve and
do not discover every instruction or skill in exactly the same way.

| Client | Portable starting point |
|---|---|
| Codex | Open FieldKit, ask it to read `AGENTS.md`, and name a `SKILL.md` when needed. |
| Cursor | Open FieldKit as the project; explicitly reference `AGENTS.md` or a skill if it is not picked up. |
| GitHub Copilot | Work in the FieldKit workspace and explicitly attach or reference the relevant instruction and skill files. |
| Claude Code | Start in FieldKit; ask it to read `AGENTS.md` and the relevant child instructions. |
| Claude Cowork | Give it the FieldKit folder and explicitly point it to the active project and skill. |

The dependable cross-client behaviour is plain files plus an explicit request:

> Work in `projects/specklepy`. Read the applicable instructions and follow
> `skills/orient-me/SKILL.md`. Do not make changes yet.

## Global, shared and personal

- **Global client instructions** live in client-specific user configuration.
  They follow you beyond FieldKit and are outside this repository.
- **Shared FieldKit skills** live in `skills/` and are committed for everyone.
- **Project skills or instructions** belong in the child project and travel
  with that codebase.
- **Personal material** can be drafted in `personal/`, which is uncommitted.
  To make it automatically discoverable, install it using the current
  documentation for your chosen client. Otherwise reference its path directly.

Do not duplicate a shared skill into every client folder unless the client
requires it; copies drift. Prefer one readable source and explicit invocation.

