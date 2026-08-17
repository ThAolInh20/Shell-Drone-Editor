---
name: ds-sync-docs
description: Automatically synchronizes and updates localized documentation files (such as README translations) based on changes made in a specified source document. Use when the user asks to synchronize, update, or propagate changes from one README/documentation file to other language versions.
---

# Synchronize Localized Documentation (ds-sync-docs)

When the user asks you to synchronize or update localized documentation files based on a source document, follow these instructions.

## Critical Rules
1. **NO ICONS OR EMOJIS**: Do not introduce any icons or emojis (like 🚀, 💡, etc.) in the translated or updated documentation text. Keep everything strictly professional and text-only.
2. **MAINTAIN TRANSLATION QUALITY**: Translate the changes accurately into the target file's language (e.g., Vietnamese, Japanese, Chinese, or English), ensuring proper tone, phrasing, and formatting alignment.
3. **PRESERVE STRUCTURE & LINKS**: Keep formatting, lists, tables, code blocks, and links identical (except for paths/titles that need localization, if any).

## Workflow Steps

### 1. Identify Source and Targets
- Identify the source file (e.g., `README-vn.md` or `README.md`) that contains the latest/correct version of the content.
- Identify all target localized files that need to be updated (e.g., other files matching `README*.md`).

### 2. Analyze Differences and Changes
- Read the content of the source file.
- Inspect the git diff of the source file (using `git diff <source_file>`) to see exactly what content has been added, removed, or modified.
- Read each target localized file to understand its current content and structure.

### 3. Translate and Adapt
- Translate the modified or added sections from the source file into the respective languages of the target files.
- Ensure technical terms and feature names match the existing terminology reference in the targets.

### 4. Apply Changes
- For each target file, locate the correct position for the translated updates.
- Use the appropriate replacement tool (`replace_file_content` or `multi_replace_file_content`) to apply the changes.

### 5. Verify
- Run `git status` and `git diff` to verify that the edits are correct, clean, and contain no syntax/markdown formatting errors or accidental emojis.
