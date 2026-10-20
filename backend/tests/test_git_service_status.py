"""Regression: the first `git status --porcelain` line keeps its full path.

Porcelain lines for unstaged edits start with a space (`` M README.md``).
Stripping the whole command output used to eat that space, so slicing at
column 3 chopped the first character of the first file (``EADME.md``).
"""

import subprocess
from pathlib import Path

from app.services.git_service import GitService


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)


def test_first_unstaged_file_keeps_full_path(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init")
    _git(repo, "config", "user.email", "t@example.com")
    _git(repo, "config", "user.name", "t")
    (repo / "README.md").write_text("one\n")
    _git(repo, "add", "README.md")
    _git(repo, "commit", "-m", "init")
    (repo / "README.md").write_text("two\n")

    service = GitService()
    output = service._run_git(["status", "--porcelain"], repo)
    files = service._parse_status(output)

    assert [f.path for f in files] == ["README.md"]
    assert files[0].status == "M"
    assert files[0].staged is False
