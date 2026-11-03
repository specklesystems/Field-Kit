# Nine 45-minute FieldKit challenges

These are deliberately small starts, not miniature product briefs. Pick one
pillar and one challenge. ASK, BUILD and DELEGATE are independent actions.

Use only public repositories and model data you are permitted to process. Do
not paste tokens or private URLs into chat or commit downloaded model data.
At minute 10, choose the live-data branch or the fixture branch. Both are valid
finishes. Reserve the final five minutes for tests, evidence and a short README.

The ideas are informed by recurring Speckle experiments—change intelligence,
bundle exploration, model partitioning and Automate checks—but contain no
private code and are not production-ready designs.

## ASK — produce an evidenced answer

### 1. What is actually in this model?

```text
Read AGENTS.md and .agents/skills/ask-speckle/SKILL.md. You have 45 minutes.
Start read-only. Given this approved Speckle model or version URL: [URL], resolve
the exact project, model and version and check which dataset format is available.

Produce a compact inventory: counts by discovered object type/category and
level, the ten most common property paths, and counts of missing or ambiguous
classification and level values. Inspect real paths and units; do not assume
Revit names. Limit displayed samples to 20 objects and use aggregate queries
for counts. Never print a token or write to Speckle.

Definition of done — live branch: an evidence table plus the query or method,
exact version ID, dataset format, assumptions and unsupported cases.
Definition of done — fixture branch: if access, credentials, dataset support or
model size blocks live work by minute 10, run the same inventory against an
approved small fixture and state exactly what prevented the live answer.
```

### 2. What changed between these versions?

```text
Read AGENTS.md and .agents/skills/ask-speckle/SKILL.md. You have 45 minutes.
Start read-only. Compare these two approved versions of the same model:
[VERSION A URL] and [VERSION B URL]. Resolve both exact version IDs and dataset
formats before querying.

Determine whether stable identifiers can defensibly match objects. If they
can, report added, removed and changed counts by discovered category, then show
no more than ten verified examples with the property paths that changed. If
conversion or application IDs are incompatible, do not fake object matching:
report the limitation and compare only defensible schema, category and property
coverage changes. Never write to Speckle.

Definition of done — live branch: a concise change briefing, matching method,
samples, query/script and explicit confidence.
Definition of done — fixture branch: a tested comparison over two small
synthetic snapshots with added, removed, changed and unmatchable cases.
```

### 3. Does this connector support that?

```text
Read AGENTS.md, .agents/skills/ask-speckle/SKILL.md and its connector-capability
reference. You have 45 minutes. Investigate one narrowly specified claim:

Host application: [APPLICATION + VERSION]
Connector/repository: [CONNECTOR + VERSION OR COMMIT]
Direction: [SEND, RECEIVE OR BOTH]
Object/property: [ONE SPECIFIC THING]
Expected behaviour: [CLAIM]

Use this evidence order: checked-out public docs, the named connector's owning
conversion path, then its tests/fixtures. Do not search unrelated repositories.
Return Confirmed, Partially confirmed, Inferred, Unsupported or Unknown for
each direction, with exact file links and the smallest runtime check still
needed. A firm Unknown with evidence is a successful result.
```

## BUILD — leave a bounded, reviewable artefact

### 1. Make a model-health snapshot

```text
Read AGENTS.md and .agents/skills/build-with-speckle/SKILL.md. You have 45
minutes. Build a read-only Python analysis named model-health-snapshot using
the FieldKit analysis scaffold.

Input is either [APPROVED SPECKLE URL] or a small synthetic fixture selected by
minute 10. Produce one CSV evidence table and one Markdown summary containing
counts by discovered category plus exactly one participant-chosen completeness
check: [PROPERTY OR CLASSIFICATION]. Preserve missing and ambiguous statuses;
do not turn this into a dashboard, web app or compliance verdict.

Definition of done — live branch: repeatable read-only query/script, bounded
samples, CSV, Markdown summary and a test for the completeness calculation.
Definition of done — fixture branch: the same artefacts from known pass, fail,
missing and ambiguous rows. Do not deploy or commit model extracts.
```

### 2. Preview a model partition

```text
Read AGENTS.md and .agents/skills/build-with-speckle/SKILL.md. You have 45
minutes. Build a read-only partition preview—not an operation that moves data.

Given [APPROVED MODEL URL OR FIXTURE], discover whether level and category/type
are usable grouping properties. Create a deterministic script that outputs a
JSON manifest of proposed model/submodel containers, source object counts and
an unassigned/ambiguous bucket. Do not create, rename or reorganise anything in
Speckle. Use one grouping dimension first; add a second only if the first is
tested before minute 30.

Definition of done — live branch: manifest, source version, grouping paths,
counts, exclusions and one repeatability test.
Definition of done — fixture branch: the same manifest from a synthetic set
covering missing values and name collisions. The learning outcome is how to
design and review structure before any write.
```

### 3. Build a tiny bundle explorer

```text
Read AGENTS.md and .agents/skills/build-with-speckle/SKILL.md. You have 45
minutes. Work only with the checked-out public Bundle specification and its
DuckDB-readable Parquet query fixture. Do not add OAuth, a web UI, legacy object
support or live model download.

Build a small command-line tool that accepts one local bundle directory and
prints: schema version, available tables, object/node counts, collection names
when available, and up to ten sampled property paths with types. Validate the
input and explain unsupported or missing tables instead of crashing.

Definition of done — primary branch: the tool runs against the public query
fixture and has one success and one malformed-input test.
Definition of done — reduced branch: inspect one fixture table/view and print
its schema plus ten rows, with a README naming the intentionally deferred work.
```

## DELEGATE — define work performed on your behalf

Speckle Automate is the available-today route used here. These challenges end
with local code and tests; they do not register, deploy or attach a function.

### 1. Check one required property on every version

```text
Read AGENTS.md and .agents/skills/delegate-with-speckle/SKILL.md. You have 45
minutes. Work in projects/speckle_automate_python_example. Do not deploy.

Create the smallest local Automate candidate that checks objects selected by
[DISCOVERED TYPE/CLASSIFICATION PATH] for one participant-supplied required
property: [PROPERTY PATH]. Keep the pure calculation separate from the Automate
wrapper. Return distinct pass, missing and ambiguous result data; never assume
the path or turn missing into pass.

Definition of done — starter branch: synthetic fixtures and tests for the pure
calculation plus a tested translation into the starter's current result API.
Definition of done — reduced branch: the pure function, typed result rows and
known-answer tests, with a wrapper stub documenting the inspected API version.
No token, live automation, registration or project attachment is required.
```

### 2. Prepare a new-version summary

```text
Read AGENTS.md and .agents/skills/delegate-with-speckle/SKILL.md. You have 45
minutes. Work in projects/speckle_automate_python_example. Do not deploy.

Build a deterministic summary function for a supplied fixture that returns
counts by discovered category and level plus missing/ambiguous counts, then
adapt the current public Automate starter only far enough to construct an
informational result and Markdown text in a mocked/local invocation. Inspect
the starter's actual APIs before coding; do not assume attachment support.

Definition of done — starter branch: known-answer summary tests and a wrapper
test proving the expected Automate result construction locally.
Definition of done — reduced branch: deterministic Markdown summary and tests,
plus a short note showing the exact wrapper seam to implement next. Do not
install a trigger, publish an image or attach the function to a project.
```

### 3. Enforce a supplied model-name pattern

```text
Read AGENTS.md and .agents/skills/delegate-with-speckle/SKILL.md. You have 45
minutes. Work in projects/speckle_automate_python_example. Do not deploy.

The participant supplies this naming rule as data, not universal Speckle
practice: [REGEX OR EXAMPLES]. Build a pure validator for model/version names
that returns valid, invalid and ambiguous outcomes with a helpful reason. Add
known-answer tests including empty, Unicode and boundary-length examples. Then
adapt the current Automate starter only far enough to translate those outcomes
into local result objects for a mocked invocation.

Definition of done — starter branch: validator tests plus verified local result
translation against the checked-out starter API.
Definition of done — reduced branch: validator, tests and a wrapper stub naming
the required Automate inputs. Do not register a function, create an automation
or claim the supplied convention applies outside this exercise.
```
