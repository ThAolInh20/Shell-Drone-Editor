---
name: ai-checkpoint-memory
description: 'Persist and resume long-running tasks with checkpoints. Use when users ask to save progress, resume unfinished work, avoid restarting completed tasks, or maintain task state across chat turns.'
argument-hint: 'Checkpoint request with id or task name (for example: save id=firework-v2 or resume id=firework-v2)'
user-invocable: true
disable-model-invocation: false
---

# AI Checkpoint Memory

Create and manage persistent task checkpoints so work can continue safely across turns or sessions.

## When to Use
- User asks to save current progress before stopping.
- User asks to resume a specific task id.
- Task is multi-step and should not be restarted from scratch.
- User wants a deterministic status record with clear progress or final result.

## Storage Convention
- Directory: storage/ai-output/
- File naming: task-<id>.json

## Required State Model
Use this JSON structure:

{
  "task_id": "string",
  "prompt": "string",
  "status": "in_progress | completed",
  "progress": "string or null",
  "result": "string or null",
  "updated_at": "ISO datetime"
}

Rules:
- If status is in_progress:
  - progress must be present and detailed.
  - result must be null.
- If status is completed:
  - result must contain the full final output.
  - progress must be null.

See detailed contract in [checkpoint-schema](./references/checkpoint-schema.md).

`task_id` is the canonical id key. The user can provide it directly as an id or from a task name mapped to an id.

## Procedure
1. Resolve id and pre-check existing state.
- Require user-provided id or task name on each save/load request.
- If task name is provided, convert it to a stable id before IO.
- Load state by id when resume is requested.
- If status is completed, return saved result immediately.
- If status is in_progress, continue from saved progress.

2. New task initialization.
- Use the provided id.
- Save first checkpoint with status=in_progress.
- Record prompt and a clear progress summary.

3. Ongoing execution loop.
- Save only when the user explicitly calls the checkpoint skill.
- When save is called, overwrite the existing checkpoint for that id.
- Keep progress specific enough to continue without re-discovery.

4. Completion.
- Save final checkpoint with status=completed.
- Include full final output in result.
- Set progress to null.

5. Resume handling.
- On resume request, load_state.
- Branch by status:
  - completed: return result.
  - in_progress: continue from progress and keep checkpointing.

## Decision Logic
- Existing state found: return or continue from it based on status.
- Save request for existing id: overwrite with the new payload.
- Missing state on save: create new checkpoint with provided id.
- Missing state on resume: inform user and request a valid id.
- Ambiguous id or task name: ask a short clarifying question before writing.

## Quality Checks
Before each save:
- status/result/progress combination is valid.
- updated_at is current ISO datetime.
- task_id and prompt are non-empty.

Before stopping:
- If unfinished work exists, latest checkpoint must be in_progress with actionable progress text.

Before finalizing:
- completed state must contain complete result, not a summary placeholder.

## Hard Rules
- Use id as the primary lookup key for all checkpoint operations.
- Save only when the user explicitly invokes checkpoint save.
- Overwrite existing state for the same id on every save invocation.
- Prefer resume over reprocessing when state exists.

## Example Prompts
- Save checkpoint id=firework-v2 status=in_progress progress="đã thêm smoke system".
- Resume id=firework-v2.
- Save checkpoint id=firework-v2 status=completed result="đã hoàn thành tuning khói".
- Resume task name "smoke tuning".
