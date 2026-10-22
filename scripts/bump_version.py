#!/usr/bin/env python3
"""Manage the project version from the single root ``VERSION`` file.

Usage:
    bump_version.py [--dry-run] <x.y.z>   # write VERSION, then sync everything
    bump_version.py [--dry-run] --sync    # sync everything from VERSION as-is
    bump_version.py --check               # verify every location matches VERSION (CI)

``VERSION`` is the only file to edit by hand. These package manifests must
hold a literal version for their tooling, so they are rewritten from it:

    pyproject.toml                       (root)
    backend/pyproject.toml
    hooks/pyproject.toml
    frontend/package.json
    opencode-plugin/package.json

Derived automatically, never hand-edited:

    frontend header badge                (next.config.ts ← frontend/package.json)
    backend/app/config.py                (Settings.VERSION, importlib.metadata)
    hooks/src/claude_office_hooks/main.py (__version__, importlib.metadata)
    desktop installers                   (scripts/build_desktop.py ← VERSION)

Security scope: touches only VERSION and the allowlisted files above. Performs
no git or network operations and reads no env/secret files.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from functools import partial
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VERSION_FILE = REPO / "VERSION"
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
_VERSION = r"\d+\.\d+\.\d+"


@dataclass(frozen=True)
class Location:
    """One version-bearing file: its repo-relative path and the single pattern
    that must match exactly once, capturing the version in group 1."""

    rel: str
    pattern: re.Pattern[str]


LOCATIONS: tuple[Location, ...] = (
    Location("pyproject.toml", re.compile(rf'(?m)^version = "({_VERSION})"$')),
    Location("backend/pyproject.toml", re.compile(rf'(?m)^version = "({_VERSION})"$')),
    Location("hooks/pyproject.toml", re.compile(rf'(?m)^version = "({_VERSION})"$')),
    Location("frontend/package.json", re.compile(rf'(?m)^  "version": "({_VERSION})",$')),
    Location("opencode-plugin/package.json", re.compile(rf'(?m)^  "version": "({_VERSION})",$')),
)


def _validate(version: str, source: str) -> str:
    if not SEMVER.match(version):
        sys.exit(f"ERROR: {source} '{version}' is not x.y.z (strict digits only)")
    return version


def read_source_version() -> str:
    """Return the version recorded in VERSION, or sys.exit if missing/invalid."""
    if not VERSION_FILE.is_file():
        sys.exit(f"ERROR: {VERSION_FILE.name} file not found at repo root")
    return _validate(VERSION_FILE.read_text(encoding="utf-8").strip(), "VERSION")


def _read_current(loc: Location) -> str:
    """Return the single captured version for *loc*, or sys.exit on failure."""
    text = (REPO / loc.rel).read_text(encoding="utf-8")
    matches = loc.pattern.findall(text)
    if not matches:
        sys.exit(f"ERROR: version pattern not found in {loc.rel}")
    if len(matches) > 1:
        sys.exit(f"ERROR: version pattern matched {len(matches)} times in {loc.rel}")
    return matches[0]


def _repl(target: str, match: re.Match[str]) -> str:
    """Reconstruct the matched span with the captured version swapped for *target*."""
    return match.group(0).replace(match.group(1), target)


def cmd_check() -> int:
    """Verify every location matches VERSION (CI drift check)."""
    target = read_source_version()
    bad = [(loc.rel, cur) for loc in LOCATIONS if (cur := _read_current(loc)) != target]
    if bad:
        print(f"ERROR: out of sync with VERSION ({target}) — run `make version-sync`:")
        for rel, current in bad:
            print(f"  {rel}: {current}")
        return 1
    print(f"OK: all {len(LOCATIONS)} locations match VERSION ({target})")
    return 0


def cmd_sync(target: str, dry_run: bool) -> int:
    """Rewrite every location not already at *target*. All-or-nothing: every
    replacement is computed and validated in memory before any file is written."""
    plan: list[tuple[Location, str, str]] = []
    for loc in LOCATIONS:
        current = _read_current(loc)
        if current == target:
            continue
        text = (REPO / loc.rel).read_text(encoding="utf-8")
        new_text = loc.pattern.sub(partial(_repl, target), text, count=1)
        new_matches = loc.pattern.findall(new_text)
        if len(new_matches) != 1 or new_matches[0] != target:
            sys.exit(f"ERROR: post-rewrite validation failed for {loc.rel}")
        plan.append((loc, current, new_text))
    if not plan:
        print(f"All locations already at {target}; nothing to do.")
        return 0
    label = "dry-run" if dry_run else "write"
    count = len(plan)
    print(f"Sync -> {target} ({label}, {count} file{'s' if count != 1 else ''}):")
    for loc, current, _ in plan:
        print(f"  {loc.rel}: {current} -> {target}")
    if dry_run:
        return 0
    for loc, _, new_text in plan:
        (REPO / loc.rel).write_text(new_text, encoding="utf-8")
    return 0


def cmd_bump(target: str, dry_run: bool) -> int:
    """Record *target* in VERSION, then sync every location to it."""
    current = read_source_version()
    print(f"VERSION: {current} -> {target}" + (" (dry-run)" if dry_run else ""))
    if not dry_run:
        VERSION_FILE.write_text(f"{target}\n", encoding="utf-8")
    return cmd_sync(target, dry_run)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage the project version from the root VERSION file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="verify locations match VERSION (CI)")
    mode.add_argument("--sync", action="store_true", help="sync locations from VERSION")
    parser.add_argument("--dry-run", action="store_true", help="print changes without writing")
    parser.add_argument("version", nargs="?", help="new version to bump to (strict x.y.z)")
    args = parser.parse_args()

    if args.check:
        if args.version is not None or args.dry_run:
            parser.error("--check takes no version or --dry-run (it reads VERSION)")
        sys.exit(cmd_check())
    if args.sync:
        if args.version is not None:
            parser.error("--sync takes no version (it reads VERSION)")
        sys.exit(cmd_sync(read_source_version(), args.dry_run))
    if args.version is None:
        parser.error("version is required (e.g. 0.26.0), or use --sync / --check")
    sys.exit(cmd_bump(_validate(args.version, "version"), args.dry_run))


if __name__ == "__main__":
    main()
