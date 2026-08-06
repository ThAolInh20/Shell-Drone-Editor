# Release Notes - v2.2.2

## Features
- Added keyboard shortcuts (Ctrl + Arrow keys) to quickly translate, rotate, and scale selection in viewport space.
- Added a keyboard shortcut (Ctrl + G) to cycle sequentially through Gizmo modes (Translate -> Rotate -> Scale).
- Added diagonal scale handles in the viewport for uniform scaling on all axes.
- Added a configuration file (editor.js) allowing step size customization for Gizmo translation, rotation, and scaling.

## Bug Fixes
- Fixed a ghosting display issue where selected drones left shadows or visual artifacts of their old positions after being rotated, scaled, or during undo/redo actions.
- Prevented the standard axes (X, Y, Z) from highlighting yellow when hovering over or interacting with the diagonal scale handles.

## Updates
- Removed the separate Undo/Redo buttons from the Gizmo Panel since they are standard keyboard actions.
- Reorganized project directory structure and updated application configurations for better stability.
- Updated project documentation with relative file path conventions and structure guidelines.

## Chores
- Cleaned up language translation files to remove emojis and clean up hardcoded UI texts.
