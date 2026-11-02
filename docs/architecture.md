# Architecture: a portable parent harness

FieldKit uses a nested checkout layout without making a monorepo.

The parent repository owns common context. `projects/` contains independent
public repositories and is ignored by the parent. This lets an agent see the
shared map and the relevant code in one workspace while preserving every
project's own history and contribution process.

The trade-off is that Git commands are local to the directory in which they
run. Novices should make repository identity visible rather than memorising
it: `git rev-parse --show-toplevel`, `git status`, and `git remote -v` before
committing or pushing.

FieldKit deliberately avoids Atlas's synchronisation, credential, issue
tracker and private multi-repository machinery. A small workshop harness should
remain understandable by reading its files.

## Context precedence

Safety and the participant's explicit request come first. Within that boundary,
specific local instructions are usually more useful than broad ones:

1. the participant's current request;
2. instructions in the active child repository;
3. FieldKit's root `AGENTS.md`;
4. a relevant shared or explicitly referenced personal skill.

If instructions conflict materially, stop and explain the conflict rather than
silently choosing.

