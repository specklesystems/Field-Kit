#!/usr/bin/env python3
"""Create a safe, reviewable FieldKit analysis scaffold."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

FIELDKIT_ROOT = Path(__file__).resolve().parents[4]


def create_analysis(name: str, analyses_dir: Path | None = None) -> Path:
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        raise ValueError("name must use lowercase letters, numbers and single hyphens")
    root = analyses_dir or FIELDKIT_ROOT / "analyses"
    target = root / name
    if target.exists():
        raise FileExistsError(f"refusing to overwrite existing analysis: {target}")

    for directory in ("queries", "scripts", "notebooks", "tests", "data", "outputs"):
        (target / directory).mkdir(parents=True, exist_ok=True)

    (target / ".gitignore").write_text("data/\noutputs/\n.ipynb_checkpoints/\n", encoding="utf-8")
    (target / "README.md").write_text(
        f"# {name}\n\n"
        "## Question and decision\n\n"
        "Describe the bounded question and who will use the answer.\n\n"
        "## Source evidence\n\n"
        "- Speckle project: `[project ID; keep private URLs out of Git]`\n"
        "- Model: `[model ID]`\n"
        "- Exact version: `[version ID and timestamp]`\n"
        "- Dataset format/schema: `[Bundle, legacy or SDK route]`\n"
        "- Source application: `[when relevant]`\n\n"
        "## Rule, units and assumptions\n\n"
        "State the supplied threshold or scoped rule source, units, conversions, "
        "selection method, exclusions and stop conditions.\n\n"
        "## Reproduce\n\n"
        "List the minimum commands needed to run the read-only analysis and tests.\n\n"
        "## Known cases\n\n"
        "Record approved or synthetic pass, fail, missing and ambiguous examples.\n\n"
        "## Result and limitations\n\n"
        "Summarise the evidence, unresolved cases and checks not performed.\n",
        encoding="utf-8",
    )
    (target / "tests" / "README.md").write_text(
        "# Known cases\n\nUse synthetic or expressly approved small fixtures. Include pass, fail, missing and ambiguous cases.\n",
        encoding="utf-8",
    )
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("name", help="lowercase analysis name, for example corridor-widths")
    args = parser.parse_args()
    try:
        target = create_analysis(args.name)
    except (ValueError, FileExistsError) as error:
        parser.error(str(error))
    print(f"Created {target.relative_to(FIELDKIT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
