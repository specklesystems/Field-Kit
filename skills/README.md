# Shared FieldKit skills

A skill is a reusable procedure: instructions for doing a kind of work, not a
persona and not a job title. Each skill has a `SKILL.md` written in the open
Agent Skills shape so it remains readable with or without special tooling.

FieldKit starts with four small skills:

- `orient-me` — understand a repository before changing it.
- `shape-a-task` — convert an outcome into a thin, testable task.
- `choose-a-route` — select the lightest safe implementation route.
- `verify-work` — test the result and report evidence honestly.

Clients differ in automatic skill discovery. The portable fallback is simply:

> Read and follow `skills/orient-me/SKILL.md` for this task.

Keep shared skills generic, public-safe and useful to more than one project.
Personal material belongs in `personal/` and project-specific rules belong in
the child repository.

