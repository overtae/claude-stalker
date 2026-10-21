import stat
import sys
from pathlib import Path

import pytest

from app.config import Settings
from app.launch_token import load_or_create_token, read_token


def test_token_is_reused_across_launches(tmp_path: Path) -> None:
    path = tmp_path / "launch-token"

    first = load_or_create_token(path)
    second = load_or_create_token(path)

    assert first == second
    assert read_token(path) == first


def test_malformed_token_file_is_replaced(tmp_path: Path) -> None:
    path = tmp_path / "launch-token"
    path.write_text("not-a-token")

    token = load_or_create_token(path)

    assert token != "not-a-token"
    assert read_token(path) == token


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX permissions")
def test_token_file_is_private_to_the_user(tmp_path: Path) -> None:
    path = tmp_path / "nested" / "launch-token"

    load_or_create_token(path)

    assert stat.S_IMODE(path.stat().st_mode) == 0o600


def test_settings_use_the_persisted_token(tmp_path: Path) -> None:
    path = tmp_path / "launch-token"

    first = Settings(STALKER_LAUNCH_TOKEN_FILE=str(path)).effective_api_key
    restarted = Settings(STALKER_LAUNCH_TOKEN_FILE=str(path)).effective_api_key

    assert first == restarted == read_token(path)


def test_explicit_key_still_wins_over_the_launch_token(tmp_path: Path) -> None:
    settings = Settings(
        STALKER_LAUNCH_TOKEN_FILE=str(tmp_path / "launch-token"),
        CLAUDE_OFFICE_API_KEY="explicit",
    )

    assert settings.effective_api_key == "explicit"


def test_running_instance_url_carries_the_stored_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.launcher import server

    path = tmp_path / "launch-token"
    monkeypatch.setattr(server, "LAUNCH_TOKEN_FILE", path)
    assert server.running_launch_url(8000) == "http://127.0.0.1:8000"

    token = load_or_create_token(path)

    assert server.running_launch_url(8000) == f"http://127.0.0.1:8000/?token={token}"
