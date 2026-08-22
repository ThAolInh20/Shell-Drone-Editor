---
name: ds-lang-sync
description: Use this skill when the user asks to synchronize translation files or propagate additions, removals, and changes of translation keys between en.js, vi.js, zh.js, and ja.js.
---

# Synchronize Translation Files (lang-sync)

When the user asks you to synchronize, update, or propagate translation changes from one language file (e.g., `en.js` or `vi.js`) to other languages (`zh.js` or `ja.js`), follow these instructions.

## Critical Rules
1. **NO EMOJIS OR ICONS**: Do not use any icons or emojis in the translated keys or any generated text. Keep everything strictly professional and text-only.
2. **MAINTAIN TRANSLATION QUALITY**: Translate the changes accurately into the target file's language (Vietnamese, Chinese, Japanese, or English), ensuring proper tone, phrasing, and formatting alignment.
3. **PRESERVE STRUCTURE & FORMATTING**: Maintain the exact JS object structure, key nesting, and spacing/indentation of the original translation files. Use single property per line formatting for objects.

## Workflow Steps

### 1. Identify Source and Targets
- Identify the source file (e.g., `src/config/lang/en.js`) that contains the latest/correct version of the keys.
- Identify all target localized files that need to be updated (e.g., `vi.js`, `zh.js`, `ja.js`).

### 2. Analyze Differences and Changes
- Read the content of the source file.
- Inspect the git diff of the source file (using `git diff <source_file>`) to see exactly what keys have been added, removed, or modified.
- Read each target localized file to understand its current content and structure.

### 3. Translate and Adapt
- Translate the modified or added keys from the source file into the respective languages of the target files.
- Ensure technical terms match the existing terminology reference in the targets.

### 4. Apply Changes
- For each target file, locate the correct position for the translated updates.
- Use the appropriate replacement tool (`replace_file_content` or `multi_replace_file_content`) to apply the changes.

### 5. Verify
- Run `npm test` to verify that the language file structure changes did not introduce syntax errors.
- Run `git diff` to verify that the edits are correct, clean, and contain no syntax/formatting errors.
