---
name: ds-commit
description: Automatically inspects working tree git diff and untracked files, analyzes changes, stages relevant files, and creates a git commit with a clear, specific, and easily understandable commit message following Conventional Commits.
---

# Git Commit Automation (ds-commit)

Use this skill when the user asks to commit git changes (e.g. "ds-commit", "commit git", "git commit").

## Critical Rules
1. **NO EMOJIS OR ICONS**: Do not use any emojis or icons anywhere in commit messages, git output, or user communication. Keep everything strictly professional and text-only.
2. **CONVENTIONAL COMMITS FORMAT**: Always format the commit title using standard Conventional Commits prefixes:
   - `feat:` for new features or user-facing capabilities.
   - `fix:` for bug fixes.
   - `refactor:` for code restructuring without changing external behavior.
   - `perf:` for performance optimizations.
   - `docs:` for documentation updates.
   - `style:` for formatting or code style adjustments without logic changes.
   - `chore:` for build scripts, dependencies, or maintenance tasks.
3. **SPECIFIC AND EASILY UNDERSTANDABLE**:
   - The commit message must state **precisely what was changed and why** in simple, unambiguous language.
   - Avoid generic messages such as `fix: fix bugs`, `update code`, or `feat: new changes`.
   - If the commit covers multiple components, include a short descriptive title followed by bullet points in the commit body detailing the changes.

## Step-by-Step Workflow

### 1. Inspect Git Status & Diff
- Run `git status -s` to list all modified, added, deleted, and untracked files.
- Run `git diff` to view unstaged line-by-line changes.
- If there are already staged files, run `git diff --cached` (or `git diff --staged`) as well.

### 2. Analyze Changes
- Examine the exact differences across files to understand:
  - What feature, bug fix, or refactor was implemented.
  - Which subsystem or module is affected (e.g., `FireworkSequencer`, `PropertyInspector`, `SmokeSystem`, `i18n`).
  - The direct purpose and rationale behind the edits.

### 3. Stage the Files
- Stage the targeted files using explicit paths:
  ```powershell
  git add <file1> <file2> ...
  ```
- Do not blindly stage temporary scratch files, secret keys, or unwanted generated artifacts.

### 4. Craft Commit Message & Commit
- Construct a commit message following the format:
  ```text
  <type>: <short specific summary in lowercase>

  [Optional body with bullet points if multiple components were updated]
  - [Component/Module]: [Clear explanation of what changed]
  ```
- Execute the commit via terminal:
  ```powershell
  git commit -m "<commit_message>"
  ```
  Or for multiline commits:
  ```powershell
  git commit -m "<title>" -m "<body>"
  ```

### 5. Verify and Report
- Run `git log -n 1 --stat` to verify that the commit was successfully recorded.
- Provide a concise summary to the user containing the commit hash, commit message, and changed files.
