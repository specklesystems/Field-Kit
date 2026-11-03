# Workshop quick start — type exactly this

These commands clone FieldKit and place the Bundle specification, Python SDK,
documentation and Python Automate starter inside its `projects/` folder. The setup scripts download
repository contents only through `git clone`; they do not download and execute
remote setup code, pull existing repositories or overwrite existing paths.

You need Git and one coding agent. Python is optional for this first setup.

## Windows PowerShell

```powershell
Set-Location "$HOME\Documents"
git clone https://github.com/specklesystems/Field-Kit.git
Set-Location ".\Field-Kit"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\setup.ps1"
```

If FieldKit is already present, skip the `git clone` line and change the first
path to the folder containing it.

## Windows Command Prompt

```bat
cd /d "%USERPROFILE%\Documents"
git clone https://github.com/specklesystems/Field-Kit.git
cd /d "%USERPROFILE%\Documents\Field-Kit"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\setup.ps1"
```

## macOS or Linux — bash/zsh

```sh
cd "$HOME/Documents"
git clone https://github.com/specklesystems/Field-Kit.git
cd "Field-Kit"
sh tools/setup.sh
```

Quoted paths are intentional: the commands still work when a parent folder
contains spaces.

## The skills are already distributed

Do not copy the skill folders by hand. They arrive with FieldKit in
`.agents/skills/`; manual copies drift out of date.

| Agent | What persists | What to do |
|---|---|---|
| Codex | `AGENTS.md` plus automatic repository-skill discovery from `.agents/skills/` | Open the FieldKit root. Name `$ask-speckle`, `$build-with-speckle` or `$delegate-with-speckle` when you want to force one. |
| GitHub Copilot | `.github/copilot-instructions.md`; supported Copilot agents discover `.agents/skills/` | Open the FieldKit root and name the skill if automatic routing misses it. |
| Claude Code | `CLAUDE.md` is persistent project context | Start in the FieldKit root and explicitly reference the canonical `.agents/skills/<name>/SKILL.md`. `/memory` shows loaded project instructions. |
| Cursor | Root `AGENTS.md` is persistent project guidance | Open the FieldKit root; explicitly reference the canonical skill path or attach it with `@Files`. |
| Claude Cowork | Folder/project instructions and selected local folder | Create or open a project from the FieldKit folder, add the folder instruction below, then name the skill in the task. |

Cowork folder instruction:

> Read `AGENTS.md` before working. The canonical reusable skills are under
> `.agents/skills/`. Use only the ASK, BUILD or DELEGATE skill relevant to my
> request, and read that `SKILL.md` before acting.

## Check the setup before real work

Paste this into the agent:

> Do not change anything. Confirm that you can see `AGENTS.md`,
> `.agents/skills/ask-speckle/SKILL.md`,
> `.agents/skills/build-with-speckle/SKILL.md`,
> `.agents/skills/delegate-with-speckle/SKILL.md`, and the repositories under
> `projects/`. Report any missing path and stop.

This verifies file access. It cannot prove that a model will follow every
instruction, so keep consequential permissions and changes human-reviewed.

## Start an action

If you want a complete starter challenge rather than writing your own prompt,
choose from [`45-minute-challenges.md`](45-minute-challenges.md).

ASK:

> Read `AGENTS.md` and `.agents/skills/ask-speckle/SKILL.md`. Start read-only.
> I want an evidenced answer to: `[question or Speckle URL]`.

BUILD:

> Read `AGENTS.md` and `.agents/skills/build-with-speckle/SKILL.md`. I want to
> build `[bounded outcome]`. Inspect first; do not deploy or publish anything.

DELEGATE:

> Read `AGENTS.md` and `.agents/skills/delegate-with-speckle/SKILL.md`. I want
> `[defined task]` performed on my behalf. Explain the trigger, permissions,
> failures and ownership before implementing. Prefer Speckle Automate for a
> defined version-triggered workflow available today.
