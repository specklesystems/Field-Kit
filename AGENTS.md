# FieldKit agent instructions

FieldKit is a public, participant-facing harness for working with public
Speckle code. Treat its users as capable domain experts who may be new to code.

## Before changing anything

- Read the root README and the active child repository's own instructions.
- Confirm the active Git root with `git rev-parse --show-toplevel`.
- Explain unfamiliar terms in plain language; do not hide consequential work
  behind jargon.
- Inspect first. For non-trivial work, propose a short plan and a visible
  success check before implementation.
- Use `skills/choose-a-route/SKILL.md` when the implementation route is unclear
  or the result will be shared, repeated, automated, write data, or support a
  consequential decision. Small read-only experiments can take the fast path.

## While working

- Keep changes inside the repository and scope the participant named.
- Prefer the smallest useful change and preserve existing work.
- Use public Speckle sources only. Never infer access to private repositories,
  APIs, credentials, customer data or internal infrastructure.
- Never commit secrets, `.env` files, private URLs, participant data or
  restricted model files.
- Distinguish what is available today from previews or aspirations.
- Do not let a prototype silently become a dependency. When other people rely
  on it, make ownership, testing, failure handling and support explicit.
- Follow a child repository's local build, test, formatting and contribution
  instructions when working there.

## Before saying complete

- Inspect the diff and run checks proportionate to the change.
- Report what was verified, what was not, and any assumptions that remain.
- Check the active Git root and remote again before any commit or push.
- Do not commit, push, publish, open a pull request or change external state
  unless the participant explicitly asks.

Skills in `skills/` are reusable procedures. Read the relevant `SKILL.md` in
full when a participant names it or the task clearly matches it. The
`personal/` folder is private staging, not a promise of automatic discovery.

## Ways of working and practice packs

- A skill with `kind: way-of-working` controls how work is approached. It does
  not define organisation, project, contractual or jurisdictional truth.
- A practice pack under `practice-packs/` defines scoped domain practice. Read
  its `PACK.md` before using any skill inside it.
- Apply a practice pack only when its declared scope matches the current task.
  If multiple packs might apply, their authority is unclear, or their rules
  conflict, stop and surface the ambiguity rather than choosing silently.
- Law, safety and non-negotiable repository constraints are absolute bounds.
  Within them, binding project or contract requirements take priority over
  organisation conventions; explicit participant requests apply only within
  those bounds. General ways of working fill gaps but never override scoped
  practice.

