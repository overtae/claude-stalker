"""Cowboy76-style tool → office zone mapping (Claude Stalker)."""

from __future__ import annotations

from enum import StrEnum

__all__ = [
    "CowboyZone",
    "zone_for_tool",
    "zone_label_ko",
    "cowboy_agent_color",
]


class CowboyZone(StrEnum):
    ARCHIVE = "archive"
    DEV = "dev"
    SERVER = "server"
    RESEARCH = "research"
    MEETING = "meeting"
    USER_DESK = "user_desk"
    BOSS_DESK = "boss_desk"


_ZONE_LABELS_KO: dict[CowboyZone, str] = {
    CowboyZone.ARCHIVE: "자료실",
    CowboyZone.DEV: "개발실",
    CowboyZone.SERVER: "서버실",
    CowboyZone.RESEARCH: "정보검색실",
    CowboyZone.MEETING: "회의실",
    CowboyZone.USER_DESK: "내 책상",
    CowboyZone.BOSS_DESK: "보스 자리",
}

# Claude Code names first, then Cursor (agent transcripts) and Codex (hooks).
_READ_TOOLS = frozenset(
    {
        "Read", "Glob", "Grep", "LS",
        "SemanticSearch", "ReadLints", "FileSearch",
        "read_file", "list_dir", "grep_files", "view_image",
    }
)  # fmt: skip
_DEV_TOOLS = frozenset(
    {"Edit", "Write", "NotebookEdit", "StrReplace", "Delete", "EditNotebook", "apply_patch"}
)
_SERVER_TOOLS = frozenset(
    {
        "Bash", "KillShell", "TaskOutput",
        "Shell",
        "shell", "exec_command", "local_shell", "unified_exec", "write_stdin",
    }
)  # fmt: skip
_RESEARCH_TOOLS = frozenset(
    {
        "WebFetch",
        "WebSearch",
        "mcp__",
        "web_search",
    }
)
_MEETING_TOOLS = frozenset(
    {"EnterPlanMode", "ExitPlanMode", "TodoWrite", "TaskCreate", "update_plan"}
)
_USER_TOOLS = frozenset({"AskUserQuestion"})


def zone_for_tool(tool_name: str | None) -> CowboyZone | None:
    if not tool_name:
        return None
    if tool_name in _READ_TOOLS:
        return CowboyZone.ARCHIVE
    if tool_name in _DEV_TOOLS:
        return CowboyZone.DEV
    if tool_name in _SERVER_TOOLS or tool_name.lower().startswith("git"):
        return CowboyZone.SERVER
    if tool_name in _MEETING_TOOLS:
        return CowboyZone.MEETING
    if tool_name in _USER_TOOLS:
        return CowboyZone.USER_DESK
    if tool_name in _RESEARCH_TOOLS or tool_name.startswith("mcp__"):
        return CowboyZone.RESEARCH
    if tool_name in ("Task", "Agent"):
        return CowboyZone.BOSS_DESK
    return CowboyZone.BOSS_DESK


def zone_label_ko(zone: CowboyZone | None) -> str | None:
    if zone is None:
        return None
    return _ZONE_LABELS_KO.get(zone)


_COWBOY_AGENT_COLORS: dict[str, str] = {
    "explore": "#22C55E",
    "Explore": "#22C55E",
    "plan": "#A855F7",
    "Plan": "#A855F7",
}


def cowboy_agent_color(agent_type: str | None) -> str | None:
    if not agent_type:
        return None
    key = agent_type.strip()
    lowered = key.lower()
    if lowered in _COWBOY_AGENT_COLORS:
        return _COWBOY_AGENT_COLORS[lowered]
    return _COWBOY_AGENT_COLORS.get(key)
