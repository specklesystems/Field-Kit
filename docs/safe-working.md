# Safe working and publication

## Data boundary

- Use public repositories and models you have permission to process.
- Never put API tokens, passwords, `.env` contents, private endpoints,
  participant details, customer data or restricted models in prompts or Git.
- Treat generated code as untrusted until it has been inspected and tested.
- Stop if a task unexpectedly asks for credentials or access beyond the
  participant's stated scope.

## Before committing or publishing

Run these checks in **both** FieldKit and the active child repository:

```sh
git rev-parse --show-toplevel
git status --short
git diff --check
git remote -v
```

Then inspect the complete diff and search changed files for tokens, private
URLs, local filesystem paths, customer names, model data and generated output.
Confirm that the destination repository is public-safe and that its licence
and contribution rules permit the change.

Nested project contents should never appear in FieldKit's staged files. If
they do, stop and resolve the repository boundary before committing.

An agent should not push, publish, open a pull request or send data elsewhere
without an explicit request.

