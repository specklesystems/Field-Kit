---
name: build-with-speckle
description: Create or adapt a bounded Speckle analysis, script or integration artefact with the owning public source, safe local data handling and observable tests.
kind: way-of-working
scope: general
---

# Build with Speckle

Use this when the intended action is to **BUILD** a useful artefact. BUILD is
independent of ASK and DELEGATE: begin from the outcome and evidence supplied
for this task. Do not manufacture missing domain rules, classifications or
units merely to keep coding.

## Define the build contract

State the user outcome, input, transformation, tangible output, acceptance
example, permitted data and writes, and explicit boundary. Choose the child
repository that owns the change. Read its local instructions and current docs
before coding.

For a standalone analysis, create the safe starter with:

```sh
python3 .agents/skills/build-with-speckle/scripts/new_analysis.py <short-name>
```

The starter refuses to overwrite an existing analysis and ignores local
`data/` and `outputs/`. Never commit customer extracts, tokens or private URLs.

## Make the smallest useful artefact

- Prefer a plain read-only query or script over a notebook when it is enough.
- Use a notebook when narrative exploration, intermediate inspection or charts
  genuinely help.
- Keep source logic separate from generated output.
- Use synthetic or expressly approved small fixtures.
- Inspect actual SDK, Bundle or connector interfaces; do not invent methods or
  property paths.
- Test observable behaviour, including missing and malformed inputs.
- Keep changes inside the owning child repository or named analysis folder.

For model-data evidence, use the schema in
`../ask-speckle/references/evidence-contract.md`. For consequential domain
logic, require an applicable practice pack or governing source.

BUILD ends with a reviewable artefact: its README states inputs, output,
assumptions and reproduction steps; tests exercise the acceptance example;
unknowns and untested cases are explicit. Use `../verify-work/SKILL.md` before
calling it complete.

## Stop before expansion

Local implementation does not authorize deployment, production attachment,
new credentials, package publication or writes to customer data. Do not turn a
bounded build into a service or delegated workflow unless the user asks.
