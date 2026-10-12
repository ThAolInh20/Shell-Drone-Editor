# Release Notes - v2.4.3

## Features
- Added live video hover previews for sequence firing patterns and firework effects in the property inspector.
- Added customizable launch angle dial and toggle checkbox for fan, sweep, and comet sequence patterns.
- Added natural arch dome trajectory curve with dynamic peak height for all fan and sweep firing patterns.
- Added Cascade comet preset featuring bottom-to-top chromatic color gradients and smooth conical dispersion.
- Added Ghost Flare effect with pre-death flash illumination across multi-stage comet clusters.
- Added single comet beam preset and standardized preset naming conventions.
- Added Spark Comet Multi firework shell preset.
- Added continuous launch barge pier layout with directional lift sparks and boundary drift reversal.
- Added interactive SkyDome environment and advanced smoke visual options.
- Added preset camera position shortcuts and movement controls.
- Added No Burst optical effect option for silent tracer projectiles.

## Updates
- Enhanced inspector settings layout with streamlined controls and visual effect chips.
- Refined moon lighting and nighttime environmental ambiance settings.
- Improved angle dial responsiveness and degree-to-deflection conversion for all firing patterns.
- Added Lake Reflection Resolution setting with localization in English, Vietnamese, Chinese, and Japanese.
- Added graphics quality scaling for CometSystem to adjust cluster projectile density on lower-end devices.
- Synchronized lifecycle methods and event subscriptions across FireworkSystem and CometSystem.

## Bug Fixes
- Fixed Multi Shell multi-stage burst configuration and composition helper preset handling.
- Fixed active comet persistence on timeline seek and clear by implementing synchronous cleanup in CometSystem.

## Performance Optimizations
- Optimized planar reflection passes by excluding static environment layers to eliminate redundant render operations.
- Added lake reflection resolution scaling controls and complete pass bypass when mirror reflection is disabled.
- Optimized particle buffer uploads in FireworkSystem using targeted buffer update ranges.
- Removed unnecessary particle zeroing loops in FireworkSystem to reduce per-frame CPU processing time.
- Cached timer reads in TrailSystem to avoid repeated system calls during particle updates.
- Reused scratch color instances and static color constants in CometSystem to prevent per-particle memory allocations.
- Replaced array reallocation with in-place particle compaction for active comets to eliminate garbage collection pauses.
- Released video elements and hardware decoder resources immediately when effect preview tooltips hide.
