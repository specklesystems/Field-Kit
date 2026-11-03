---
name: ask-speckle
description: Answer bounded questions about Speckle data, model versions or connector capabilities with verified sources, explicit confidence and unresolved gaps.
kind: way-of-working
scope: general
---

# Ask Speckle

Use this when the intended action is to **ASK**: obtain an evidenced answer to
a bounded question. ASK is independent of BUILD and DELEGATE. It may finish
with an answer and no code. It connects FieldKit's public sources; it does not
define project, organisation, contractual or regulatory correctness.

## Frame the question

State the outcome, the decision it supports, whether it is one-off or repeated,
and what would make the answer trustworthy. Clarify supplied thresholds rather
than silently replacing them with remembered rules.

If the request asks what the rule *should* be, apply an explicitly scoped
practice pack or ask for the governing source. Do not turn general Speckle
guidance into a compliance opinion.

## Follow the evidence route

1. Resolve the supplied Speckle URL or identify the project, model and version.
2. Start read-only. Confirm access and the exact version being inspected.
3. Check dataset availability before writing a query.
4. Identify the format:
   - **Bundle:** use the checked-out Bundle specification to understand tables,
     paths, relationships and units.
   - **Legacy:** inspect EAV property paths and the packfile schema before SQL.
   - **No dataset:** use the lightest suitable SDK/object-transport route.
5. Inspect real property paths, types, units and sample values. Never invent a
   property name from host-application familiarity.
6. Decide whether the available properties answer the question defensibly.
   - If yes, prefer a small read-only query.
   - If relationships are needed, inspect the Bundle graph.
   - If objects or geometry are needed, use the relevant SDK and document the
     derivation.
   - If conversion semantics are unclear, inspect the originating connector.
7. Check public documentation for supported behaviour and terminology. Use
   source and tests for exact implementation details; label inferences.
8. Produce the evidence contract. Preserve a repeatable query only when one
   was needed to answer the question.

Read [references/data-routes.md](references/data-routes.md) when selecting a
dataset, SDK, connector or Automate path. Read
[references/evidence-contract.md](references/evidence-contract.md) before
reporting results. Read [references/terminology.md](references/terminology.md)
when property names, units or measurement meaning may be ambiguous.

## Stop rather than guess

Stop and surface the missing decision when:

- the target project, model or version is ambiguous;
- the dataset is unavailable or its schema is not understood;
- object selection depends on an absent or inconsistent classification;
- a property name exists but its measurement meaning is unclear;
- units are absent, mixed or contradictory;
- multiple plausible properties disagree;
- the answer requires geometry that the selected dataset does not expose;
- a threshold depends on an unidentified project, contract or regulatory rule;
- access, permissions or source provenance cannot be established.

Use [examples/property-check.md](examples/property-check.md) for a property-led
path and [examples/geometry-escalation.md](examples/geometry-escalation.md) for
a case that must not be forced through SQL.

For connector capability, conversion or round-trip questions, read
[references/connector-capability.md](references/connector-capability.md).

## Return

Report the route chosen, sources inspected, version and dataset format, query
or calculation, evidence, units, assumptions, ambiguous/missing cases and the
smallest repeatable verification. Separate confirmed behaviour from inference.
The ASK is complete when the question is answered to the stated confidence or
the precise missing evidence has been identified.
