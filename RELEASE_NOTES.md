# Release Notes - v3.1.2

## Features
- Added support for multiple time windows on timed firework effects, allowing effects like strobe or crackle to activate across multiple separate intervals.
- Separated firework modifiers into Instant Triggered Effects and Duration-Based Timed Effects for cleaner editing.
- Added new firework shapes including Egg and Latitude Ring burst geometries.
- Added Sphere Rings staggered wave dynamics and gentle floating slow-burst star motion.
- Added realistic 3D volumetric night clouds that enhance atmospheric depth without washing out dark skies.
- Added interactive percentage-based active effects timeline editor to fine-tune effect start and end windows.
- Expanded firework star lifetime multipliers up to 5x for extended willow and cascading displays.
- Added settings snapshot restore and per-category reset controls to easily restore default editor preferences.
- Added burst height calibration settings and expanded multi-language interface translations.

## Bug Fixes
- Fixed an issue where timed effects were behaving like continuous toggle modifiers instead of respecting their timeline start and end windows.
- Fixed active burst smoke emission to ensure consistent smoke volume across all timeline events.
- Fixed no-trail effect handling so particle trails are only hidden within the specified timeline interval.
- Fixed active effect chip labels and state toggles in the property inspector.

## Updates
- Increased the maximum firework shell size limit for larger and more dramatic aerial bursts.
- Enhanced tadpole burst fireworks with brighter incandescent cores and more dynamic swarming paths.
- Enhanced launch comet trails with smoother light dissipation and richer color blending.
- Refined star ignition curves and thermal cooling for authentic pyrotechnic color transitions.

## Chores
- Updated test suites with full coverage for multi-window timed effects, particle timing factories, and inspector controls.
