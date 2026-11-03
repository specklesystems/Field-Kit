# Shared FieldKit skills

A skill here is a reusable **way of working**: instructions for how an agent
approaches a kind of work, not a persona, job title or organisation-specific
definition of correctness. Each skill has `kind: way-of-working` and
`scope: general` in its `SKILL.md` so that distinction remains human-readable
even when a client ignores custom metadata.

FieldKit starts with three independent actions:

- `ask-speckle` — answer a bounded data, model-version or connector question
  with evidence and explicit confidence.
- `build-with-speckle` — create a bounded analysis, script or integration
  artefact with safe data handling and observable tests.
- `delegate-with-speckle` — use Speckle Automate for delegation available
  today, while distinguishing supervised/local and preview agent workflows.

They are verbs, not identities or a required progression. Four supporting
skills can be used with any action:

- `orient-me` — understand a repository before changing it.
- `shape-a-task` — convert an outcome into a thin, testable task.
- `choose-a-route` — select the lightest safe implementation route.
- `verify-work` — test the result and report evidence honestly.

Clients differ in automatic skill discovery. The portable fallback is simply:

> Read and follow `skills/orient-me/SKILL.md` for this task.

Keep shared skills generic, public-safe and useful to more than one project.
Personal material belongs in `personal/` and project-specific rules belong in
the child repository. Organisation, project, contract or jurisdiction rules
belong in a separately owned [`practice-pack`](../practice-packs/README.md).

