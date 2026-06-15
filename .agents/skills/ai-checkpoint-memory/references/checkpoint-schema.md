# Checkpoint Schema Reference

`task_id` is the canonical id key used for lookup and file mapping.

## save_state

Input:

{
  "task_id": "string",
  "prompt": "string",
  "status": "in_progress | completed",
  "progress": "string or null",
  "result": "string or null",
  "updated_at": "ISO datetime"
}

Validation rules:
- in_progress:
  - progress required
  - result must be null
- completed:
  - result required
  - progress must be null

Write behavior:
- Every save_state call overwrites existing state for the same task_id.
- Save occurs only when user explicitly invokes checkpoint save.

## load_state

Input:

{
  "task_id": "string"
}

Output:

{
  "task_id": "string",
  "prompt": "string",
  "status": "in_progress | completed",
  "progress": "string or null",
  "result": "string or null",
  "updated_at": "ISO datetime"
}

## Resume Behavior
- If status is in_progress: continue from progress.
- If status is completed: return result directly.
- If task_id is missing: request id or task name before any IO.

## Optional Step Tracking

{
  "steps": [
    {"name": "create model", "done": true},
    {"name": "create controller", "done": true},
    {"name": "create routes", "done": false}
  ]
}
