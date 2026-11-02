# Practice packs

A practice pack tells an agent what **correct means in a specific setting**.
It may encode an organisation's measurement method, a project's information
requirements, a contract rule, a classification convention or a jurisdictional
standard.

That is different from a general skill, which tells an agent how to approach
work. `skills/verify-work`, for example, says to verify a result. A practice
pack says which area definition, rounding rule and exclusions the result must
be verified against.

## Ownership model

Each real pack should be an independent Git repository checked out beneath
this directory:

```text
practice-packs/
└── organisation-building-measurement/   ← its own private or public repo
    ├── PACK.md
    ├── skills/
    ├── references/
    └── tests/
```

FieldKit ignores those child contents, so a private pack cannot accidentally
be committed to the public FieldKit parent. The owning organisation can still
version, review and distribute its pack through its own repository.

Copy `templates/practice-pack/` into a new repository to begin. Do not put
credentials, customer models or confidential source documents into a pack.
Link to controlled sources when redistribution is not permitted.

## Application rules

Read `PACK.md` before using a pack. Apply it only when `applies_to` matches the
task. If applicability, authority or precedence is ambiguous, stop and ask;
do not blend competing rules or choose the most convenient one.

Law, safety and non-negotiable repository constraints remain absolute. Binding
project or contract rules outrank broader organisation conventions. A practice
pack should say what happens when it conflicts with another authority.

