"""The launcher's hook-config writer must behave like hooks/install.sh."""

from pathlib import Path

from app.launcher.hook_setup import ensure_config, read_config

URL = "http://localhost:8000/api/v1/events"


def test_creates_config_with_defaults(tmp_path: Path) -> None:
    path = tmp_path / ".claude" / "claude-office-config.env"

    created = ensure_config(path, URL)

    values = read_config(path)
    assert created is True
    assert values["CLAUDE_OFFICE_API_URL"] == URL
    assert values["CLAUDE_OFFICE_DEBUG"] == "0"
    assert len(values["CLAUDE_OFFICE_API_KEY"]) >= 32
    assert values["CLAUDE_OFFICE_STRIP_PREFIXES"].startswith("-Users-")


def test_never_replaces_existing_key_and_keeps_user_values(tmp_path: Path) -> None:
    path = tmp_path / "claude-office-config.env"
    path.write_text(
        "# mine\n"
        'CLAUDE_OFFICE_API_KEY="keep-me"\n'
        "CLAUDE_OFFICE_DEBUG=1\n"
        'CLAUDE_OFFICE_STRIP_PREFIXES="-Users-x-"\n'
        "MY_CUSTOM=hello\n",
        encoding="utf-8",
    )

    created = ensure_config(path, "http://localhost:8123/api/v1/events")

    values = read_config(path)
    assert created is False
    assert values["CLAUDE_OFFICE_API_KEY"] == "keep-me"
    assert values["CLAUDE_OFFICE_DEBUG"] == "1"
    assert values["CLAUDE_OFFICE_STRIP_PREFIXES"] == "-Users-x-"
    assert values["MY_CUSTOM"] == "hello"
    assert values["CLAUDE_OFFICE_API_URL"] == "http://localhost:8123/api/v1/events"


def test_read_config_ignores_comments_and_quotes(tmp_path: Path) -> None:
    path = tmp_path / "c.env"
    path.write_text("# c\n\nA='1'\nB=\"two\"\nnot a pair\n", encoding="utf-8")

    assert read_config(path) == {"A": "1", "B": "two"}


def test_none_url_keeps_whatever_the_user_had(tmp_path: Path) -> None:
    path = tmp_path / "c.env"
    path.write_text(
        'CLAUDE_OFFICE_API_URL="http://localhost:8000/api/v1/events"\n', encoding="utf-8"
    )

    ensure_config(path, None)

    assert read_config(path)["CLAUDE_OFFICE_API_URL"] == "http://localhost:8000/api/v1/events"


def test_none_url_on_fresh_config_leaves_hooks_on_their_default(tmp_path: Path) -> None:
    path = tmp_path / "c.env"

    ensure_config(path, None)

    assert "CLAUDE_OFFICE_API_URL" not in read_config(path)
