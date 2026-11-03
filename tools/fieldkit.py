#!/usr/bin/env python3
"""Set up, inspect and check out FieldKit's allow-listed public projects."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "fieldkit.json"
PROJECTS = ROOT / "projects"
WORKSHOP_PROJECTS = ("bundle-spec", "python-sdk", "docs", "automate-python")


def catalogue() -> Tuple[Dict[str, Dict[str, str]], Dict[str, List[str]]]:
    with CATALOGUE.open(encoding="utf-8") as source:
        data = json.load(source)
    projects = data["projects"]
    groups = data.get("groups", {})
    collisions = set(projects).intersection(groups)
    if collisions:
        raise ValueError(f"project/group name collisions: {sorted(collisions)}")
    for group, members in groups.items():
        if not members:
            raise ValueError(f"group {group!r} is empty")
        if len(members) != len(set(members)):
            raise ValueError(f"group {group!r} contains duplicate projects")
        unknown = set(members) - set(projects)
        if unknown:
            raise ValueError(f"group {group!r} contains unknown projects: {sorted(unknown)}")
    return projects, groups


def show(projects: Dict[str, Dict[str, str]]) -> None:
    width = max(map(len, projects))
    for name, project in projects.items():
        state = "checked out" if (PROJECTS / project["directory"] / ".git").exists() else "available"
        print(f"{name:<{width}}  {state:<11}  {project['purpose']}")


def checkout(name: str, project: Dict[str, str], projects_dir: Path = PROJECTS) -> bool:
    """Clone one missing project without updating or modifying existing paths."""
    target = projects_dir / project["directory"]
    if (target / ".git").exists():
        try:
            display_target = target.relative_to(ROOT)
        except ValueError:
            display_target = target
        print(f"✓ {name}: already checked out at {display_target}")
        return True
    if target.exists():
        print(f"✗ {name}: {target} exists but is not a Git checkout", file=sys.stderr)
        return False
    print(f"→ {name}: cloning {project['url']}")
    result = subprocess.run(["git", "clone", project["url"], str(target)], check=False)
    return result.returncode == 0


def _tool_status(command: str, minimum: str | None = None) -> tuple[bool, str]:
    executable = shutil.which(command)
    if not executable:
        return False, "not found"
    result = subprocess.run([executable, "--version"], capture_output=True, text=True, check=False)
    detail = (result.stdout or result.stderr).strip().splitlines()
    version = detail[0] if detail else "available"
    return result.returncode == 0, f"{version}{f' (need {minimum})' if minimum else ''}"


def _has_local_token(root: Path) -> bool:
    if os.environ.get("SPECKLE_TOKEN"):
        return True
    local = root / "mise.local.toml"
    if not local.exists():
        return False
    try:
        # Report presence only. Never parse, print or return the secret value.
        return "SPECKLE_TOKEN" in local.read_text(encoding="utf-8")
    except OSError:
        return False


def doctor(
    projects: Dict[str, Dict[str, str]],
    root: Path = ROOT,
    projects_dir: Path = PROJECTS,
) -> bool:
    """Report local readiness without changing files or contacting a server."""
    checks: list[tuple[str, bool, str, bool]] = []
    git_ok, git_detail = _tool_status("git")
    checks.append(("Git", git_ok, git_detail, True))
    python_ok = sys.version_info >= (3, 8)
    checks.append(("Python", python_ok, f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro} (need 3.8+)", True))
    node_ok, node_detail = _tool_status("node", "20+")
    checks.append(("Node", node_ok, node_detail, False))
    mise_ok, mise_detail = _tool_status("mise")
    checks.append(("mise", mise_ok, mise_detail, False))

    for name in WORKSHOP_PROJECTS:
        target = projects_dir / projects[name]["directory"]
        ready = (target / ".git").exists()
        detail = str(target.relative_to(root)) if ready else "not checked out"
        checks.append((name, ready, detail, True))

    mcp = projects_dir / "fieldkit-admin-mcp"
    mcp_checkout = (mcp / ".git").exists()
    mcp_built = (mcp / "dist" / "index.js").exists()
    mcp_dependencies = (mcp / "node_modules").is_dir()
    token_configured = _has_local_token(root)
    checks.extend(
        [
            ("FieldKit MCP checkout", mcp_checkout, "present" if mcp_checkout else "optional: not present", False),
            ("FieldKit MCP dependencies", mcp_dependencies, "present" if mcp_dependencies else "not installed", False),
            ("FieldKit MCP build", mcp_built, "dist/index.js present" if mcp_built else "not built", False),
            ("Speckle token", token_configured, "configured (value hidden)" if token_configured else "not configured", False),
        ]
    )

    required_ok = True
    for label, ok, detail, required in checks:
        marker = "✓" if ok else "✗" if required else "·"
        suffix = "" if required else " [optional]"
        print(f"{marker} {label}{suffix}: {detail}")
        if required and not ok:
            required_ok = False
    print("\nDoctor is read-only. Optional checks become necessary only for routes that use them.")
    return required_ok


def setup(
    projects: Dict[str, Dict[str, str]],
    root: Path = ROOT,
    projects_dir: Path = PROJECTS,
) -> bool:
    """Install only missing analysis foundations, then run the read-only doctor."""
    projects_dir.mkdir(exist_ok=True)
    checked_out = all(
        checkout(name, projects[name], projects_dir) for name in WORKSHOP_PROJECTS
    )
    return checked_out and doctor(projects, root=root, projects_dir=projects_dir)


def main() -> int:
    projects, groups = catalogue()
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list", help="show the public project catalogue")
    resolve = sub.add_parser("resolve", help="show the projects in a catalogue group")
    resolve.add_argument("group", choices=groups)
    get = sub.add_parser("checkout", help="clone one or more child repositories")
    get.add_argument("names", nargs="*", metavar="PROJECT")
    get.add_argument("--group", choices=groups, help="check out a named project group")
    get.add_argument("--core", action="store_true", help="check out the stable core group")
    sub.add_parser(
        "setup",
        help="check out the Bundle, SDK, docs and Automate workshop foundations, then run doctor",
    )
    sub.add_parser("doctor", help="report local readiness without changing anything")
    args = parser.parse_args()

    if args.command == "list":
        show(projects)
        return 0
    if args.command == "resolve":
        print("\n".join(groups[args.group]))
        return 0
    if args.command == "doctor":
        return 0 if doctor(projects) else 1
    if args.command == "setup":
        return 0 if setup(projects) else 1
    unknown = set(args.names) - set(projects)
    if unknown:
        get.error(f"unknown projects: {', '.join(sorted(unknown))}")
    if args.core and args.group:
        get.error("use either --core or --group, not both")
    if args.names and (args.core or args.group):
        get.error("use project names or a group, not both")
    names = groups["core"] if args.core else groups[args.group] if args.group else args.names
    if not names:
        get.error("name at least one project, use --group, or use --core")
    PROJECTS.mkdir(exist_ok=True)
    return 0 if all(checkout(name, projects[name]) for name in names) else 1


if __name__ == "__main__":
    raise SystemExit(main())

