from app.core.cowboy_zones import (
    CowboyZone,
    cowboy_agent_color,
    zone_for_tool,
    zone_label_ko,
)


def test_zone_for_read_tools() -> None:
    assert zone_for_tool("Read") == CowboyZone.ARCHIVE
    assert zone_for_tool("Grep") == CowboyZone.ARCHIVE


def test_zone_for_dev_and_server() -> None:
    assert zone_for_tool("Edit") == CowboyZone.DEV
    assert zone_for_tool("Bash") == CowboyZone.SERVER


def test_zone_for_user_and_research() -> None:
    assert zone_for_tool("AskUserQuestion") == CowboyZone.USER_DESK
    assert zone_for_tool("mcp__browser_navigate") == CowboyZone.RESEARCH


def test_zone_labels_ko() -> None:
    assert zone_label_ko(CowboyZone.SERVER) == "서버실"


def test_cowboy_agent_colors() -> None:
    assert cowboy_agent_color("explore") == "#22C55E"
    assert cowboy_agent_color("plan") == "#A855F7"


# --- Codex / Cursor tool names land in the same rooms as Claude's -----------

import pytest  # noqa: E402


@pytest.mark.parametrize(
    ("tool", "zone"),
    [
        # Codex
        ("shell", CowboyZone.SERVER),
        ("exec_command", CowboyZone.SERVER),
        ("local_shell", CowboyZone.SERVER),
        ("apply_patch", CowboyZone.DEV),
        ("read_file", CowboyZone.ARCHIVE),
        ("list_dir", CowboyZone.ARCHIVE),
        ("grep_files", CowboyZone.ARCHIVE),
        ("web_search", CowboyZone.RESEARCH),
        ("update_plan", CowboyZone.MEETING),
        # Cursor
        ("StrReplace", CowboyZone.DEV),
        ("Delete", CowboyZone.DEV),
        ("Shell", CowboyZone.SERVER),
        ("SemanticSearch", CowboyZone.ARCHIVE),
        ("ReadLints", CowboyZone.ARCHIVE),
    ],
)
def test_other_agents_tools_map_to_rooms(tool: str, zone: CowboyZone) -> None:
    assert zone_for_tool(tool) == zone
