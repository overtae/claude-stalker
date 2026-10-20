; Claude Stalker — Windows installer (Inno Setup 6).
; Built by scripts/build_desktop.py:  iscc /DAppVersion=x.y.z /DSourceDir=... /DOutputDir=... installer.iss

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{8C2F4A3E-6B1D-4E7A-9F2C-5A1B3D7E9C40}
AppName=Claude Stalker
AppVersion={#AppVersion}
AppPublisher=overtae
AppPublisherURL=https://github.com/overtae/claude-stalker
DefaultDirName={localappdata}\Programs\Claude Stalker
DefaultGroupName=Claude Stalker
DisableProgramGroupPage=yes
; per-user install: no admin prompt
PrivilegesRequired=lowest
OutputDir={#OutputDir}
OutputBaseFilename=ClaudeStalker-Setup-{#AppVersion}
SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\Claude Stalker.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Claude Stalker"; Filename: "{app}\Claude Stalker.exe"
Name: "{userdesktop}\Claude Stalker"; Filename: "{app}\Claude Stalker.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Claude Stalker.exe"; Description: "{cm:LaunchProgram,Claude Stalker}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; take the hooks out of Claude Code before the files disappear
Filename: "{app}\Claude Stalker.exe"; Parameters: "--uninstall-hooks"; Flags: runhidden waituntilterminated; RunOnceId: "UnhookClaudeCode"
