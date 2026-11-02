---
name: choose-a-route
description: Choose the lightest safe way to build a Speckle workflow before selecting tools.
---

# Choose a route

Use this when the route is unclear, or when work will be shared, repeated,
automated, write data, or support a consequential decision. Skip it for a
small, read-only experiment with one informed user.

## Frame the work

Answer five questions in plain language:

1. **Outcome:** what answer, decision or process should this enable?
2. **Audience:** who uses the result, and who will rely on it being correct?
3. **Cadence:** once, on demand, repeatedly, on each model version, or always
   available?
4. **Boundary:** what data is read, what is written, and what other systems are
   involved?
5. **Consequence:** what happens when it is wrong or unavailable, and who owns
   it after the first version works?

## Select the lightest safe route

Routes are choices, not a maturity ladder. Start at the top and stop at the
first route that safely fits.

| Route | Choose it when | Typical starting point |
|---|---|---|
| **Ask** | The need is a bounded question and a direct answer is sufficient | Speckle AI or an explicit query |
| **Explore** | You need to inspect data, compare versions or test an assumption | Notebook or disposable read-only script |
| **Repeat** | The operation is understood and should run on demand | Small script with inputs, outputs and a repeatable check |
| **Run on change** | The same check or transformation should respond to a new model version | A public Automate starter in `projects/` |
| **Maintain** | An integration, service or data workflow needs an owner and a stable interface | Python or .NET SDK with tests, logging and error handling |
| **Productise** | Multiple users need a supported interface, operational dashboard or dependable workflow | A deliberately designed application and operating model |

A report or dashboard does not choose the architecture for you. A one-off
report may come from Explore; a refreshed dashboard may require Repeat or
Maintain; an operational dashboard with access control and support may be a
Productise route.

## Add structure as reliance grows

Stop and involve the appropriate software, data, security or platform owner
before the workflow becomes operational when any of these are true:

- other people depend on the output;
- it runs without the original author present;
- it writes to Speckle or another production system;
- it affects formal validation, reporting, delivery or client communication;
- it needs managed identity, permissions or secrets;
- failure would block work or cause consequential rework;
- it needs deployment, monitoring, auditability or ongoing support.

Escalation is not failure. A prototype may have done its job by proving value
and revealing edge cases. Preserve that learning: inputs, outputs, assumptions,
tests, known failures and the reason a more durable route is now needed.

## Return

State the chosen route, why lighter routes are insufficient, why heavier routes
are unnecessary, the relevant public FieldKit project, the minimum verification
needed, and the ownership question that remains. Do not implement until the
participant accepts the route or explicitly asks you to proceed.
