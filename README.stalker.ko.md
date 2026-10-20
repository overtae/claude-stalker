# Claude Stalker

**Claude Code**가 터미널에서 하는 일을 **아이소 사무실**로 실시간 보여 주는 도구입니다.  
Threads [@cowboy76](https://www.threads.com/@cowboy76/post/DeqgY7wiJYa) 컨셉(방별 활동, 엘리베이터 서브에이전트, 멀티층)을 따르며, 엔진은 [paulrobello/claude-office](https://github.com/paulrobello/claude-office) (MIT) 포크입니다.

## 비주얼 컨셉 선택

브라우저에서 열기:

```bash
open docs/concept/index.html
```

**기본 UI = Stalker 전용 (레거시 claude-office UI 숨김)**

- 바닥·벽·가구는 이미지 에셋 없이 코드로 그립니다: [`stalkerFurnitureDraw.ts`](frontend/src/systems/stalkerFurnitureDraw.ts), [`stalkerOfficeDraw.ts`](frontend/src/systems/stalkerOfficeDraw.ts), 색은 [`stalkerPalette.ts`](frontend/src/constants/stalkerPalette.ts)
- 레이아웃: [`stalkerFloorLayout.ts`](frontend/src/constants/stalkerFloorLayout.ts) (바닥·벽·방별 prop)
- 화면: 3단 레이아웃 [`StalkerShell`](frontend/src/components/stalker/StalkerShell.tsx) (좌 층·세션 / 중 아이소 캔버스 / 우 활동·로그) + [`StalkerGameCanvas`](frontend/src/components/stalker/StalkerGameCanvas.tsx)
- 아이소 그리드: [`stalkerIsoCoords.ts`](frontend/src/systems/stalkerIsoCoords.ts) + [`stalkerFloorLayout.ts`](frontend/src/constants/stalkerFloorLayout.ts)
- 설정 언어: **English / 한국어** (`Settings` → Language)
- 예전 픽셀 오피스·3단 사이드바 복구:
  - `NEXT_PUBLIC_STALKER_LEGACY_SHELL=true`
  - `NEXT_PUBLIC_STALKER_LEGACY_OFFICE=true`
- Kenney 보조 에셋: [`frontend/public/assets/free-iso/`](frontend/public/assets/free-iso/) · `bash scripts/fetch-free-iso-assets.sh`

## 빠른 시작

```bash
make install-all
make dev-tmux
```

- UI: http://localhost:3000  
- 백엔드가 `~/.claude/projects/**/*.jsonl` 을 폴링합니다. **hooks 없이**도 동작합니다.  
- 더 빠른 이벤트 전달이 필요하면 `make hooks-install` (선택).

### Cursor IDE

Cursor agent transcript (`~/.cursor/projects/.../agent-transcripts/*.jsonl`)는 기본적으로 허용됩니다.  
다른 경로만 쓰는 경우:

```bash
export STALKER_CURSOR_TRANSCRIPT_ROOTS="$HOME/.cursor,/custom/transcripts"
```

## cowboy76 기능 체크리스트

| 기능 | 상태 |
|------|------|
| JSONL 실시간 동기화 | 백엔드 폴러 |
| 자료실 / 개발실 / 서버실 / 검색 / 회의 / 내 책상 | `cowboy_zones` + Buggy 레이아웃 |
| 서버실 랙 LED 펄스 | Bash 등 시 `serverRackPulse` |
| Explore·Plan 서브에이전트 색 | 초록 / 보라 (마커) |
| 도구 실패 말풍선 | 💦 + Stalker HTML 말풍선 |
| 멀티층 빌딩 | Shell Floors UI (3F 고정, upstream Building은 레거시) |
| 엘리베이터 출퇴근 | 엘리베이터 zone + 에이전트 phase 스냅 |

## 공유하기 (`uvx` 한 줄 실행)

화면 + 백엔드 + Claude Code 훅 설치기를 wheel 파일 **하나**로 묶습니다.

```bash
make dist        # → dist/claude_stalker-<버전>-py3-none-any.whl
```

받는 사람은 [uv](https://docs.astral.sh/uv/)만 있으면 됩니다.

```bash
uvx --from ./claude_stalker-0.25.0-py3-none-any.whl claude-stalker
# GitHub Release에 올렸다면 파일 대신 URL을 넣어도 됩니다
```

처음 실행하면:

1. `~/.claude/claude-office-config.env` 생성 (기존 API 키는 그대로 유지)
2. `claude-office-hook` 설치 (`uv tool install`) + `~/.claude/settings.json`에 훅 등록 → **Claude Code를 한 번 재시작**
3. `http://127.0.0.1:8000`에서 서버를 띄우고 브라우저를 엽니다 (이미 켜져 있으면 브라우저만 엽니다)

DB는 `~/.claude-stalker/visualizer.db`에 저장됩니다.

| 옵션 | 설명 |
|---|---|
| `--port 8123` | 다른 포트 사용 (훅 설정의 주소도 같이 바뀜) |
| `--no-browser` | 브라우저 자동 열기 끄기 |
| `--skip-hooks` | 훅 설치·등록 건너뛰기 |
| `--reinstall-hooks` | 이 빌드에 들어있는 훅으로 다시 설치 |

## 원저작

이 프로젝트는 Claude Office Visualizer를 포크했습니다. 원작 저작권은 해당 저장소 및 MIT 라이선스를 따릅니다.

자세한 설치·환경 변수·Docker는 [README.md](README.md) (영문 upstream 문서)를 참고하세요.
