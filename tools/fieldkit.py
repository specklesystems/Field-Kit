#!/usr/bin/env python3
"""List and check out FieldKit's allow-listed public Speckle projects."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "fieldkit.json"
PROJECTS = ROOT / "projects"


def catalogue() -> Dict[str, Dict[str, str]]:
    with CATALOGUE.open(encoding="utf-8") as source:
        return json.load(source)["projects"]


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
    projects = catalogue()
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list", help="show the public project catalogue")
    get = sub.add_parser("checkout", help="clone one or more child repositories")
    get.add_argument("names", nargs="*", choices=projects)
    get.add_argument("--core", action="store_true", help="check out every catalogue project")
    args = parser.parse_args()

    if args.command == "list":
        show(projects)
        return 0
    names = list(projects) if args.core else args.names
    if not names:
        get.error("name at least one project, or use --core")
    PROJECTS.mkdir(exist_ok=True)
    return 0 if all(checkout(name, projects[name]) for name in names) else 1


if __name__ == "__main__":
    raise SystemExit(main())

