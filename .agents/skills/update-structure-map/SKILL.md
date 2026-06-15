---
name: update-structure-map
description: 'Automatically rescan src and overwrite STRUCTURE.md using the exact rules and output format in docs/Structure-project.md. Use when you need real-time architecture map updates, module interface diffs, relationship graph updates, and anti-pattern tracking.'
argument-hint: 'Optional scope: src subfolder (default: src)'
user-invocable: true
disable-model-invocation: false
---

# Update Structure Map

## Outcome
Rescan current source code and overwrite `STRUCTURE.md` at project root so architecture documentation matches the latest implementation state.

## Inputs
- Primary rules source: `docs/Structure-project.md`
- Update policy source: `docs/Up-structure-project.md`
- Scan target: `src/` (or optional sub-scope)

## Mandatory Rules
- Strictly follow `<rules>`, `<output_format>`, and `<process>` from `docs/Structure-project.md`.
- Detect latest changes in `src/`: added files, removed files, changed imports/exports, changed class/function logic.
- Do not invent custom output layout.
- Always overwrite root `STRUCTURE.md` with the new analysis.
- Emphasize updates in:
  - module interfaces
  - relationship graph
  - cross-module dependencies and anti-patterns

## Procedure
1. Read `docs/Structure-project.md` for canonical rules and output format.
2. Read `docs/Up-structure-project.md` for update policy and reporting requirements.
3. Scan all relevant files under `src/` and extract:
   - imports/requires
   - exports/public class methods
   - business-flow call paths
4. Rebuild dependency and relationship graph from current code state.
5. Re-cluster files into logical modules by behavior and interactions (not by folders).
6. Recompute entry points and execution flows.
7. Re-evaluate cross-module coupling and anti-patterns.
8. Overwrite `STRUCTURE.md` in project root using exact required markdown structure.
9. Provide a short summary of notable architecture changes found in this refresh.

## Decision Points
- If `STRUCTURE.md` does not exist, create it at project root and continue.
- If ambiguity exists in module assignment, prefer runtime interaction over physical path.
- If a file is shared across many modules, classify it as cross-module dependency.
- If no meaningful architecture change is found, still overwrite `STRUCTURE.md` and report "No significant architecture changes detected".

## Completion Checks
- `STRUCTURE.md` exists at project root and was overwritten in this run.
- Output includes all required sections from canonical format.
- Entry points and execution flows are derived from current source, not prior documentation.
- Relationship graph reflects latest imports/calls.
- Summary explicitly reports notable changes (new file links, removed links, changed interfaces, new risks).

## Expected Deliverables
1. Updated `STRUCTURE.md` in project root.
2. Compact change summary after update (for example: newly added modules, new dependency edges, newly observed anti-patterns).

## Example Prompts
- `/update-structure-map`
- `/update-structure-map src/systems`
- `Run update-structure-map and refresh STRUCTURE.md from current src.`
