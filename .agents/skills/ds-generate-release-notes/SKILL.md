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

## 4. Format the Release Notes
Structure the output using Markdown IN ENGLISH. Use exactly this structure:

```markdown
# Release Notes - [New Version Tag]

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

## 5. Save the File
Use the appropriate file writing tool to save the release notes.
- Completely OVERWRITE the existing `RELEASE_NOTES.md` file so that it ONLY contains the release notes for the new version. Do NOT append or insert content. The file should only reflect the latest tag.

## 6. Auto-Create Git Tag
After the release notes are successfully saved, automatically create and push the new git tag using the terminal:
- Run `git tag <new_version>`
- Run `git push origin <new_version>` (or `git push --tags`)
