# Project-Scoped Rules and Coding Conventions

## Code Formatting and Readability
- **Limit Horizontal Line Length**: Avoid long horizontal lines of code. If a function call, constructor, array, or object has multiple arguments or properties, break them onto separate lines.
- **Single Property Per Line**: For multiline function calls, array declarations, or object literals, place each argument/property on its own line for maximum readability and clean git diffs.
  - *Example*:
    ```javascript
    const gradient = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.1,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );
    ```
