#!/usr/bin/env python3
"""Fail when new docs lack front matter, use an unknown quadrant, or are overdue for review."""
import datetime
import pathlib
import re
import sys

REQUIRED = {"title", "description", "quadrant", "owner", "status", "last_reviewed"}
QUADRANTS = {"tutorial", "how-to", "reference", "explanation", "record", "runbook", "policy"}
SKIP_DIRS = {"_meta", "templates"}
FRONT = re.compile(r"\A---\n(.*?)\n---\n", re.S)


def parse(block: str) -> dict:
    data = {}
    for line in block.splitlines():
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if m:
            data[m.group(1)] = m.group(2).strip().strip("\"'")
    return data


def baseline_paths() -> set:
    manifest = pathlib.Path("docs/_meta/baseline-manifest.txt")
    if not manifest.exists():
        return set()
    return {line[66:].replace("/", "\\").strip() for line in manifest.read_text().splitlines() if len(line) > 66} | \
           {line[66:].replace("\\", "/").strip() for line in manifest.read_text().splitlines() if len(line) > 66}


def main(root: str = "docs") -> int:
    today = datetime.date.today()
    legacy = baseline_paths()
    problems = []
    for path in sorted(pathlib.Path(root).rglob("*.md")):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        rel_posix = path.as_posix()
        rel_win = str(path)
        if rel_posix in legacy or rel_win in legacy:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        match = FRONT.match(text)
        if not match:
            problems.append(f"{path}: missing front matter")
            continue
        fm = parse(match.group(1))
        missing = REQUIRED - fm.keys()
        if missing:
            problems.append(f"{path}: missing keys {sorted(missing)}")
            continue
        if fm["quadrant"] not in QUADRANTS:
            problems.append(f"{path}: unknown quadrant '{fm['quadrant']}'")
        try:
            reviewed = datetime.date.fromisoformat(fm["last_reviewed"])
            every = int(fm.get("review_every_days", "90"))
        except ValueError:
            problems.append(f"{path}: invalid last_reviewed or review_every_days")
            continue
        if (today - reviewed).days > every:
            problems.append(f"{path}: overdue (last_reviewed {reviewed}, every {every} days)")
    for p in problems:
        print(p)
    if problems:
        print(f"{len(problems)} problem(s)")
        return 1
    print(f"OK: All newly created documentation files contain valid front matter and Diataxis quadrant metadata.")
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
