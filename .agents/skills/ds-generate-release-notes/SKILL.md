---
name: ds-generate-release-notes
description: Automatically fetches commits since the last git tag, generates concise release notes, determines the next semantic version, and creates a new git tag. Use when the user asks to generate release notes or create a new release.
---

# Generate Release Notes & Auto-Tag

When the user asks you to generate release notes or create a new release, follow these STRICT rules:

**CRITICAL RULES:**
1. **NO ICONS OR EMOJIS**: Do not use any emojis (like 🚀, 🐛, etc.) anywhere in the output.
2. **ENGLISH ONLY**: The generated release notes MUST be written entirely in English, regardless of the language used in the commit messages or the user's prompt.
3. **MANDATORY SECTIONS**: You must use exactly the main sections defined below. If a section has no relevant commits, you may omit that section.
4. **NON-TECHNICAL DESCRIPTIONS**: All descriptions must be extremely concise, simple, and easy to understand for non-technical users. Avoid coding jargon (such as 'instanced rendering', 'draw calls', 'vertex shader', 'buffer allocation') and instead focus on user-facing benefits (e.g., write 'Improved display performance when spawning many fireworks' instead of 'implemented instanced shell rendering to reduce draw calls').

## 1. Fetch Commits Since Last Tag
- Use the terminal (`run_command` tool) to find the most recent git tag: `git describe --tags --abbrev=0`.
- If no tags exist, get all commits from the beginning: `git log --oneline`.
- Otherwise, get all commits from the last tag to HEAD: `git log <last_tag>..HEAD --oneline`.

## 2. Determine New Version
- Analyze the fetched commits to determine the next version based on Semantic Versioning (SemVer):
  - **Major**: If there are breaking changes.
  - **Minor**: If there are new features (`feat`).
  - **Patch**: If there are only bug fixes (`fix`) and chores/updates.
- Determine the new tag name (e.g., if the previous was `v1.2.0` and there's a new feature, the new tag becomes `v1.3.0`).

## 3. Analyze and Categorize
Categorize the fetched commits into the following standard groups:
- **Features** (`feat`, `add`, new functionalities)
- **Bug Fixes** (`fix`, `bug`, resolved issues)
- **Updates** (`refactor`, `perf`, `update`, optimizations)
- **Chores** (`docs`, `chore`, `test`, maintenance)

## 4. Determine Download Links
Determine the download URLs for `.exe` (Windows Installer) and `.zip`/`.rar` (Portable Archive):
1. **User-Provided Link**: If the user provided a download URL or draft release hash in their message, use that exact base path and file names.
2. **Inspect `dist-electron`**: Check the `dist-electron` directory to detect the build artifact filenames.
3. **Standard Canonical Release URL Structure**: The standard asset naming convention on GitHub Releases is:
   - Base URL: `https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/`
   - Windows Installer (.exe): `[DroneShellEditor Setup <version>.exe](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/DroneShellEditor%20Setup%20<version>.exe)`
   - Portable Archive (.zip / .rar): `[DroneShellEditor-<version>-win.zip](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/DroneShellEditor-<version>-win.zip)`
   - All Release Assets: `[GitHub Releases [New Version Tag]](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/tag/[New Version Tag])`

## 5. Format the Release Notes
Structure the output using Markdown IN ENGLISH. Use exactly this structure:

```markdown
# Release Notes - [New Version Tag]

## Downloads
- Windows Installer (.exe): [DroneShellEditor Setup <version>.exe](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/DroneShellEditor%20Setup%20<version>.exe)
- Portable Archive (.zip / .rar): [DroneShellEditor-<version>-win.zip](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/DroneShellEditor-<version>-win.zip)
- All Release Assets: [GitHub Releases [New Version Tag]](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/tag/[New Version Tag])

## Features
- [Short description of the new feature in English]
- ...

## Bug Fixes
- [Short description of the fix in English]
- ...

## Updates
- [Short description of the update in English]
- ...

## Chores
- [Short description of the chore in English]
- ...
```

## 6. Update package.json Version
- Update the `"version"` field in the project's `package.json` file to match the new version tag (e.g. if the new version is `v2.1.1`, update it to `"2.1.1"` without the `"v"` prefix).

## 7. Save the Release Notes File
Use the appropriate file writing tool to save the release notes.
- Completely OVERWRITE the existing `RELEASE_NOTES.md` file so that it ONLY contains the release notes for the new version. Do NOT append or insert content. The file should only reflect the latest tag.

## 8. Stage, Commit, and Git Tag (When Explicitly Requested)
- Note: Follow the workspace rule on git operations. NEVER commit or push automatically unless the user explicitly commands it in their prompt (e.g., `/ds-commit` or explicit request to commit and tag).
- When explicitly requested:
  - Run `git add package.json RELEASE_NOTES.md`
  - Run `git commit -m "docs: release <new_version>"`
  - Run `git tag <new_version>`
  - Run `git push origin <new_version>` (or `git push --tags`)
