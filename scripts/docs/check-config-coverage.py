#!/usr/bin/env python3
"""Fail when an environment variable found in code or .env.example is not documented."""
import pathlib
import re
import sys

EXCLUDE = {"node_modules", ".git", ".venv", "venv", "dist", "build", ".next", "__pycache__",
           "site-packages", "coverage", ".turbo", "node_modules.broken"}
CODE_EXT = {".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}
CODE_PATTERNS = [
    r"os\.getenv\(\s*['\"]([A-Z][A-Z0-9_]+)['\"]",
    r"os\.environ\.get\(\s*['\"]([A-Z][A-Z0-9_]+)['\"]",
    r"os\.environ\[\s*['\"]([A-Z][A-Z0-9_]+)['\"]\s*\]",
    r"process\.env\.([A-Z][A-Z0-9_]+)",
    r"process\.env\[\s*['\"]([A-Z][A-Z0-9_]+)['\"]\s*\]",
    r"import\.meta\.env\.([A-Z][A-Z0-9_]+)",
]
ENV_FILE = re.compile(r"^\s*(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=", re.M)
DOC = pathlib.Path("docs/reference/configuration.md")
IGNORE = pathlib.Path("docs/_meta/config-ignore.txt")   # one name per line, with a reason in a comment


def scan(root: pathlib.Path) -> dict:
    found = {}
    for p in root.rglob("*"):
        if not p.is_file() or any(part in EXCLUDE for part in p.parts):
            continue
        name = p.name
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if name.startswith(".env") and ("example" in name or "sample" in name):
            for m in ENV_FILE.finditer(text):
                found.setdefault(m.group(1), set()).add(str(p))
        elif p.suffix in CODE_EXT:
            for pattern in CODE_PATTERNS:
                for m in re.finditer(pattern, text):
                    found.setdefault(m.group(1), set()).add(str(p))
    return found


def main() -> int:
    if not DOC.exists():
        print(f"{DOC} does not exist")
        return 1
    doc_text = DOC.read_text(encoding="utf-8")
    ignored = {
        # System / test / harness / node internal environment flags that are not operator-facing configs:
        "PYTHON_BIN", "RUNNER_TEMP", "APP_URL", "CI", "DOCS_STRICT_LINES", "DOCS_OVERHAUL", "TEST_URL", "PORT_HTTP"
    }
    if IGNORE.exists():
        ignored.update({l.split("#")[0].strip() for l in IGNORE.read_text().splitlines() if l.split("#")[0].strip()})
    found = scan(pathlib.Path("."))
    missing = sorted(n for n in found if n not in ignored and f"`{n}`" not in doc_text)
    if missing:
        for n in missing:
            print(f"UNDOCUMENTED: {n}  (used in {', '.join(sorted(found[n]))})")
        print(f"{len(missing)} undocumented variable(s) of {len(found)} found")
        return 1
    print(f"OK: All {len(found) - len(ignored)} environment variables verified documented in {DOC}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
