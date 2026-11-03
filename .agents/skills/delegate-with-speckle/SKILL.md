---
name: delegate-with-speckle
description: Define and implement repeatable work that Speckle Automate or an agent performs on a user's behalf, with explicit inputs, permissions, failures and ownership.
kind: way-of-working
scope: general
---

# Delegate with Speckle

Use this when the intended action is to **DELEGATE**: repeatable work should run
on a user's behalf through Speckle Automate or an agent/harness. DELEGATE is
independent of ASK and BUILD. Begin from the task contract supplied here; reuse
prior evidence or code only when it is relevant.

## Available today versus preview

**Speckle Automate is the available-today delegation route.** Use it for a
defined operation that should run when a model version is created and publish
a structured result back to Speckle.

Speckle Agent workflows may offer richer tool use and orchestration, but treat
workshop agent demonstrations as preview unless the specific capability is
confirmed for participant use. FieldKit-based agents can also perform
supervised work locally; that is not the same as a managed production service.

## Define the delegation contract

Before implementing, make these explicit:

- trigger or invocation and exact input shape;
- deterministic action and defined output/result schema;
- an agreed known-answer example;
- tests covering pass, fail, missing, ambiguous and malformed input;
- explicit units, tolerances, exclusions and scoped rule source;
- permissions and allowed writes;
- an owner for false positives, false negatives and runtime failures;
- retry, duplicate-event and partial-failure behaviour.

If a material term is missing, state it and stop rather than inventing it.

## Choose the lightest delegate

1. Choose Automate for a defined version-triggered operation available today.
   Choose a FieldKit agent for supervised local work. Choose a Speckle Agent
   workflow only when that specific capability is available to the participant.
   Explain the status and why the selected route fits.
2. For Automate, choose the public Python, .NET or TypeScript starter matching
   the task and team ownership—not personal novelty.
3. Read the starter or harness instructions, input model, result API and local
   test path before editing.
4. Keep domain logic in an ordinary module independent of the trigger or agent
   wrapper. The wrapper validates inputs, calls it and translates results.
5. Make missing or ambiguous evidence visible in the result. Never
   silently convert it to pass.
6. Test with synthetic fixtures, then test trigger/tool calls, result
   translation, duplicate events, partial failures and malformed inputs.
7. Document required permissions and secrets by name only. Never commit token
   values or model extracts.

## Stop before production

Local implementation and tests do not authorize deployment, function
registration, production project attachment or writes to customer models.
Before any of those, present the exact target, permissions, trigger, failure
behaviour and rollback/disconnect procedure and obtain explicit authorization.
After an authorized connection, verify the resulting function version and
project attachment rather than assuming a partial operation succeeded.

Return the delegation contract, mechanism selected, tests run, uncovered
cases, deployment state and named operational owner.
