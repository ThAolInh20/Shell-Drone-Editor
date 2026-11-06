# Release Notes - v3.2.2

## Downloads
- Windows Installer (.exe): [Firework.Drone.Show.Studio.Setup.3.2.2.exe](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/v3.2.2/Firework.Drone.Show.Studio.Setup.3.2.2.exe)
- Portable Archive (.zip / .rar): [Firework.Drone.Show.Studio-3.2.2-win.zip](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/v3.2.2/Firework.Drone.Show.Studio-3.2.2-win.zip)
- All Release Assets: [GitHub Releases v3.2.2](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/tag/v3.2.2)

## Features
- Added custom text word firework shape allowing users to type words and burst crisp, readable letter formations in the sky.
- Added dedicated text scale control in Property Inspector to adjust letter sizing independently.
- Added automatic choreography script generation skill to construct music-synchronized shows directly from beat analysis.
- Enabled instant development hot reload for the firework engine to preview physics and shape adjustments in real time.

## Bug Fixes
- Resolved issue where text fireworks collapsed into spherical rings upon bursting.
- Fixed particle speed distribution and drag jitter that caused text outlines to tear during burst expansion.
- Fixed sequence caching issue where newly typed text words did not update during timeline playback.
- Resolved export file stream locking issue to ensure smooth export completion.

## Updates
- Integrated standalone firework engine via GitHub repository with shared composition architecture.
- Added comprehensive multilingual translations for new firework parameters across English, Vietnamese, Chinese, and Japanese.

## Chores
- Updated architecture documentation and project rules enforcing firework-engine as the single source of truth.
