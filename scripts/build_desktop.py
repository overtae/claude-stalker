"""Build the double-click desktop app for the current OS.

    make desktop
    # = uv run --project backend --with pyinstaller --with pystray --with pillow \
    #       --with ./hooks python scripts/build_desktop.py

macOS   → dist/desktop/ClaudeStalker-<ver>-macos-<arch>.dmg
Windows → dist/desktop/ClaudeStalker-Setup-<ver>.exe (needs Inno Setup) + a .zip

PyInstaller can't cross-compile: build each OS on that OS (see
.github/workflows/desktop.yml, which builds both).
"""

from __future__ import annotations

import argparse
import os
import platform
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
PACKAGING = BACKEND / "packaging"
WORK = ROOT / "build" / "desktop"
OUT = ROOT / "dist" / "desktop"
APP_NAME = "Claude Stalker"
HOOK_NAME = "claude-stalker-hook"
BUNDLE_ID = "io.github.overtae.claude-stalker"
IS_MAC = sys.platform == "darwin"
IS_WINDOWS = sys.platform == "win32"
SEP = os.pathsep  # PyInstaller --add-data separator

sys.path.insert(0, str(PACKAGING))
from stalker_icon import draw_icon  # noqa: E402


def step(msg: str) -> None:
    print(f"\n▸ {msg}", flush=True)


def version() -> str:
    data = tomllib.loads((BACKEND / "pyproject.toml").read_text(encoding="utf-8"))
    return str(data["project"]["version"])


def build_frontend(skip: bool) -> None:
    static = BACKEND / "app" / "static"
    if not skip:
        step("building frontend (static export)")
        subprocess.run(["bun", "run", "build"], cwd=ROOT / "frontend", check=True, shell=IS_WINDOWS)
    shutil.rmtree(static, ignore_errors=True)
    shutil.copytree(ROOT / "frontend" / "out", static)
    bundled = BACKEND / "app" / "_bundled"
    bundled.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "hooks" / "manage_hooks.py", bundled / "manage_hooks.py")


def make_icons() -> Path:
    """Write the platform icon file and return its path."""
    step("drawing icons")
    WORK.mkdir(parents=True, exist_ok=True)
    if IS_WINDOWS:
        ico = WORK / "icon.ico"
        draw_icon(256).save(ico, sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
        return ico
    iconset = WORK / "icon.iconset"
    shutil.rmtree(iconset, ignore_errors=True)
    iconset.mkdir()
    for base in (16, 32, 128, 256, 512):
        draw_icon(base).save(iconset / f"icon_{base}x{base}.png")
        draw_icon(base * 2).save(iconset / f"icon_{base}x{base}@2x.png")
    icns = WORK / "icon.icns"
    subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(icns)], check=True)
    return icns


def pyinstaller(args: list[str]) -> None:
    import PyInstaller.__main__

    PyInstaller.__main__.run(
        [*args, "--noconfirm", "--clean", "--workpath", str(WORK / "pyi"), "--log-level", "WARN"]
    )


def build_hook() -> Path:
    step("building the console hook")
    dist = WORK / "hookdist"
    pyinstaller(
        [
            str(PACKAGING / "stalker_hook.py"),
            "--name", HOOK_NAME,
            "--onedir",
            "--console",
            "--distpath", str(dist),
            "--specpath", str(WORK),
            "--collect-submodules", "claude_office_hooks",
            "--hidden-import", "defusedxml",
        ]
    )  # fmt: skip
    return dist / HOOK_NAME


def build_app(icon: Path) -> Path:
    step("building the app")
    dist = WORK / "appdist"
    tray_backend = "pystray._darwin" if IS_MAC else "pystray._win32"
    pyinstaller(
        [
            str(PACKAGING / "stalker_desktop.py"),
            "--name", APP_NAME,
            "--onedir",
            "--windowed",
            "--icon", str(icon),
            "--osx-bundle-identifier", BUNDLE_ID,
            "--distpath", str(dist),
            "--specpath", str(WORK),
            "--paths", str(BACKEND),
            "--paths", str(PACKAGING),
            "--add-data", f"{BACKEND / 'app' / 'static'}{SEP}app/static",
            "--add-data", f"{BACKEND / 'app' / '_bundled'}{SEP}app/_bundled",
            "--collect-submodules", "app",
            # macOS runs the hook from the app binary itself
            "--collect-submodules", "claude_office_hooks",
            "--hidden-import", "defusedxml",
            "--collect-submodules", "uvicorn",
            "--collect-submodules", "websockets",
            "--hidden-import", "aiosqlite",
            "--hidden-import", "sqlalchemy.dialects.sqlite.aiosqlite",
            "--hidden-import", tray_backend,
        ]
    )  # fmt: skip
    return dist / (f"{APP_NAME}.app" if IS_MAC else APP_NAME)


def package_mac(app: Path, ver: str) -> Path:
    step("assembling the .app")
    plist = app / "Contents" / "Info.plist"
    # menu-bar app: no Dock icon
    subprocess.run(["plutil", "-replace", "LSUIElement", "-bool", "YES", str(plist)], check=True)
    subprocess.run(
        ["plutil", "-replace", "CFBundleShortVersionString", "-string", ver, str(plist)], check=True
    )
    # editing Info.plist invalidates PyInstaller's ad-hoc signature; re-sign
    subprocess.run(["codesign", "--force", "--deep", "--sign", "-", str(app)], check=True)

    step("creating the .dmg")
    staging = WORK / "dmg"
    shutil.rmtree(staging, ignore_errors=True)
    staging.mkdir()
    shutil.copytree(app, staging / app.name, symlinks=True)
    (staging / "Applications").symlink_to("/Applications")
    (staging / "처음 열 때 읽어주세요.txt").write_text(FIRST_OPEN_MAC, encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    dmg = OUT / f"ClaudeStalker-{ver}-macos-{platform.machine()}.dmg"
    dmg.unlink(missing_ok=True)
    subprocess.run(
        ["hdiutil", "create", "-volname", APP_NAME, "-srcfolder", str(staging),
         "-ov", "-format", "UDZO", str(dmg)],
        check=True,
    )  # fmt: skip
    return dmg


#: The app isn't notarized (no Apple Developer ID), so Gatekeeper blocks the
#: first open of a downloaded copy. This rides along in the .dmg.
FIRST_OPEN_MAC = """Claude Stalker 설치 / Install

1. Claude Stalker 앱을 Applications 폴더로 끌어다 놓으세요.
2. 처음 열면 "Apple에서 악성 코드가 없는지 확인할 수 없습니다"가 뜰 수 있어요.
   개발자 서명(유료)이 없는 앱이라 그래요. [완료]를 누른 뒤:
   시스템 설정 > 개인정보 보호 및 보안 > 아래쪽 "그래도 열기" 를 누르세요. (한 번만)
   또는 터미널에서:
     xattr -dr com.apple.quarantine "/Applications/Claude Stalker.app"
3. 메뉴바의 주황색 건물 아이콘이 Claude Stalker예요. 처음 실행 후 Claude Code를 한 번 재시작하세요.

---
1. Drag Claude Stalker into Applications.
2. If macOS says it can't check the app for malware (it isn't notarized), click Done, then
   System Settings > Privacy & Security > "Open Anyway" (once), or run the xattr line above.
3. Look for the orange building in the menu bar. Restart Claude Code once after the first launch.
"""


def find_iscc() -> str | None:
    found = shutil.which("iscc")
    if found:
        return found
    default = Path(os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"))
    candidate = default / "Inno Setup 6" / "ISCC.exe"
    return str(candidate) if candidate.is_file() else None


def package_windows(app: Path, hook: Path, icon: Path, ver: str) -> list[Path]:
    step("assembling the app folder")
    shutil.copytree(hook, app / "hook", dirs_exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    archive = shutil.make_archive(
        str(OUT / f"ClaudeStalker-{ver}-windows"), "zip", app.parent, app.name
    )
    outputs = [Path(archive)]

    iscc = find_iscc()
    if iscc is None:
        print("  · Inno Setup not found — skipping the installer (zip only)")
        return outputs
    step("building the installer")
    subprocess.run(
        [iscc, f"/DAppVersion={ver}", f"/DSourceDir={app}", f"/DOutputDir={OUT}",
         f"/DIconFile={icon}", str(PACKAGING / "windows" / "installer.iss")],
        check=True,
    )  # fmt: skip
    outputs.append(OUT / f"ClaudeStalker-Setup-{ver}.exe")
    return outputs


def _utf8_console() -> None:
    """Windows consoles default to cp1252, which can't print ▸/✓ (or Korean)."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8", errors="replace")


def main() -> None:
    _utf8_console()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-frontend", action="store_true", help="reuse frontend/out")
    args = parser.parse_args()
    if not (IS_MAC or IS_WINDOWS):
        raise SystemExit("desktop builds target macOS and Windows")

    ver = version()
    build_frontend(args.skip_frontend)
    icon = make_icons()
    app = build_app(icon)
    # Windows: a windowed exe gets no stdin, so the hook is its own console exe.
    outputs = [package_mac(app, ver)] if IS_MAC else package_windows(app, build_hook(), icon, ver)
    print("\n✓ " + "\n✓ ".join(str(p) for p in outputs))


if __name__ == "__main__":
    main()
