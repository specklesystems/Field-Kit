# Analyses

Use this directory for repeatable investigations that are not product code.
Each analysis should live in its own named folder and explain the question,
source Speckle URL, exact model version, dataset format, assumptions and result.

A useful shape is:

```text
analyses/
  corridor-widths/
    README.md       # question, scope, source versions and conclusion
    queries/        # small read-only SQL queries
    notebooks/      # exploration that genuinely benefits from a notebook
    tests/          # known examples and edge cases
    data/           # local input extracts; do not commit
    outputs/        # generated tables and reports; do not commit by default
```

Prefer a plain query or script when it is enough. Use a notebook for exploratory
work that needs narrative, intermediate inspection or charts. Store the final
evidence as a tidy table with one row per checked item and explicit columns for
project, model, version, object identity, measured value, unit, outcome, source
property or derivation, and ambiguity.

Use [`build-with-speckle`](../.agents/skills/build-with-speckle/SKILL.md) to create an
analysis artefact. Use [`ask-speckle`](../.agents/skills/ask-speckle/SKILL.md) when the
outcome is an evidenced answer rather than a build. Organisation-specific
measurement rules belong in a scoped practice pack, not this shared directory.
