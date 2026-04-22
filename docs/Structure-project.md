---
name: reverse-structure-map
description: Analyze messy codebase and reconstruct logical structure based on file relationships and execution flow
---

<objective>
Reconstruct the REAL structure of the codebase by analyzing:
- File dependencies
- Function calls
- Data flow

Ignore physical folder structure if misleading.

Output a STRUCTURE.md that reflects logical architecture, not file layout.
</objective>

<rules>
- DO NOT trust folder structure
- GROUP files by behavior and interaction
- DETECT hidden modules from call patterns
- IDENTIFY entry points (controllers, handlers, etc.)
- TRACE execution flows across files
- HIGHLIGHT anti-patterns and chaos areas
- EXTRACT public interfaces (exported functions and class methods)
- FOCUS ONLY on core business logic functions; ignore internal helpers or basic getters/setters
- KEEP function descriptions concise (1 short sentence max)
</rules>

<output_format>

# STRUCTURE.md

## 1. Logical Modules
### [Module Name]
- **`filename.js`**: (Brief 1-sentence description of the file's role)
  - `functionName(args)`: (Concise description of what it does)
  - `ClassName.method()`: (Concise description of what it does)

## 2. Entry Points
(API handlers, controllers, CLI, etc.)

## 3. Relationship Graph
(file → file calls)

## 4. Execution Flows
(main business flows)

## 5. Cross-Module Dependencies
(shared logic and coupling)

## 6. Problems & Anti-patterns
(structure issues)

</output_format>

<process>
1. Scan all files in src
2. Detect imports / requires, extract exported functions/methods, and infer their primary responsibilities
3. Build dependency graph
4. Cluster files into logical modules
5. Identify entry points
6. Trace main flows
7. Detect circular dependencies / bad patterns
8. Generate STRUCTURE.md
</process>