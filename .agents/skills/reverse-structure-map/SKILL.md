---
name: reverse-structure-map
description: 'Reconstruct a codebase\'s logical architecture from imports, call flow, and data flow instead of folder layout. Use when mapping messy projects, documenting real module boundaries, or generating STRUCTURE.md from source analysis.'
argument-hint: 'Which folder should be analyzed (default: src)?'
user-invocable: true
disable-model-invocation: false
---

# Reverse Structure Map

## Outcome
Produce a `STRUCTURE.md` that reflects the real logical architecture of a codebase by tracing dependencies, execution flow, and public interfaces.

## When To Use
- Folder structure is misleading, inconsistent, or historical.
- You need architecture documentation that matches runtime behavior.
- You are onboarding and want controller-to-system flow, not file tree cosmetics.

## Inputs
- Target source root (default: `src`).
- Optional scope constraints (for example: ignore test files, generated code, or vendor folders).

## Rules
- Do not trust physical folder grouping as architecture.
- Group files by behavior and interaction patterns.
- Detect hidden modules from call patterns and shared state usage.
- Identify entry points (controllers, handlers, app boots, CLI starts).
- Trace execution across files using imports, calls, and dispatch paths.
- Highlight anti-patterns and structural chaos areas.
- Extract public interfaces only: exported functions and class methods relevant to business logic.
- Ignore low-value internals (tiny helpers, trivial getters/setters, boilerplate).
- Keep each function or method description to one short sentence.

## Procedure
1. Inventory target files.
2. Parse imports/requires and build a dependency map.
3. Extract exported functions/classes and business-facing methods.
4. Infer each file's primary responsibility from call sites and usage context.
5. Identify entry points by locating startup files, handlers, or orchestration roots.
6. Trace main execution flows from entry points through systems/entities/services.
7. Cluster files into logical modules by interaction density and shared purpose.
8. Detect structural issues: circular dependencies, god files, duplicated orchestration, hidden coupling.
9. Generate `STRUCTURE.md` in the required format.
10. Validate output against quality checks before finalizing.

## Decision Points
- If multiple candidate entry points exist, keep all and classify by runtime context (UI boot, input handler, scheduled flow, CLI, etc.).
- If a file appears cross-cutting, place it in cross-module dependencies instead of forcing a module assignment.
- If folder and behavior disagree, prioritize runtime behavior.
- If symbols are exported but not part of business logic, exclude them from interface summaries.

## Required Output Format

```markdown
# STRUCTURE.md

## 1. Logical Modules
### [Module Name]
- **`filename.js`**: (Brief 1-sentence description of the file's role)
  - `functionName(args)`: (Concise description of what it does)
  - `ClassName.method()`: (Concise description of what it does)

## 2. Entry Points
(API handlers, controllers, CLI, etc.)

## 3. Relationship Graph
(file -> file calls)

## 4. Execution Flows
(main business flows)

## 5. Cross-Module Dependencies
(shared logic and coupling)

## 6. Problems & Anti-patterns
(structure issues)
```

## Quality Checks
- Every section `1` through `6` exists.
- Each file appears in the most behaviorally accurate module.
- Entry points are explicit and justified by call flow.
- Relationship graph includes the highest-impact links.
- Execution flows are end-to-end and start from real entry points.
- Cross-module dependencies identify shared logic and coupling risk.
- Problems section names concrete anti-patterns and affected files.
- Function and method summaries are concise and business-focused.

## Suggested Prompt Invocations
- `/reverse-structure-map src`
- `/reverse-structure-map src/systems`
- `Use reverse-structure-map to generate STRUCTURE.md for this project.`
