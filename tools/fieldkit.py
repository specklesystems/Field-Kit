#!/usr/bin/env python3
"""List and check out FieldKit's allow-listed public Speckle projects."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "fieldkit.json"
PROJECTS = ROOT / "projects"


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


def checkout(name: str, project: Dict[str, str]) -> bool:
    target = PROJECTS / project["directory"]
    if (target / ".git").exists():
        print(f"✓ {name}: already checked out at {target.relative_to(ROOT)}")
        return True
    if target.exists():
        print(f"✗ {name}: {target} exists but is not a Git checkout", file=sys.stderr)
        return False
    print(f"→ {name}: cloning {project['url']}")
    result = subprocess.run(["git", "clone", project["url"], str(target)], check=False)
    return result.returncode == 0


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
    args = parser.parse_args()

    if args.command == "list":
        show(projects)
        return 0
    if args.command == "resolve":
        print("\n".join(groups[args.group]))
        return 0
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

