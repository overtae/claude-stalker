# Claude Stalker

A cozy isometric office that shows what **Claude Code** is doing — live.
Claude walks between rooms as it works (reading files in the archive, editing
code in the dev room, running shell commands in the server room…), subagents
arrive by elevator and sit at their own desks, and every project gets its own
floor.

## Quick start

You need [uv](https://docs.astral.sh/uv/) and [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
uvx claude-stalker
```

The first run:

1. writes `~/.claude/claude-office-config.env` (an existing API key is never replaced),
2. installs the `claude-office-hook` tool and registers it in `~/.claude/settings.json`
   — **restart Claude Code once** so it picks the hooks up,
3. serves the office on `http://127.0.0.1:8000` and opens your browser.

Run it again any time; if it's already running it just opens the browser.
Data lives in `~/.claude-stalker/`.

| Option | |
|---|---|
| `--port 8123` | use another port (the hook config follows it) |
| `--no-browser` | don't open a browser |
| `--skip-hooks` | don't install or register hooks |
| `--reinstall-hooks` | reinstall the hook tool bundled in this release |

Everything stays on your machine: the server only listens on `127.0.0.1`.

## 한국어 요약

```bash
uvx claude-stalker
```

처음 실행하면 Claude Code 훅을 설치하고 브라우저에서 사무실을 엽니다.
훅 설치 후 **Claude Code를 한 번 재시작**하세요. 데이터는 `~/.claude-stalker/`에 저장됩니다.

## Credits

Built on [claude-office](https://github.com/paulrobello/claude-office) by Paul Robello (MIT).
Third-party licenses: `THIRD_PARTY_NOTICES.md`. Source: <https://github.com/overtae/claude-stalker>

Unofficial community project — not affiliated with or endorsed by Anthropic.
"Claude" and "Claude Code" are trademarks of Anthropic, PBC.
