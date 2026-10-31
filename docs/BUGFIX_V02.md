# HaiCuu v0.2.0 bug fixes

The owner reported torn hair/face/clothing edges, facial color patches, world movement glitches and missed interactions after the first production release. The earlier automated journeys covered loading/layout, but did not prove that animated interior pixels stayed intact. Those checks are now added.

- A continuous illustrated skin deforms on a shared mesh, keeping the hair, face, neck and clothing joined. Native calm facial artwork stays intact. Head, secondary hair/hat motion and pupil tracking combine without independent cutout edges. Canvas rendering provides connected motion and eye tracking if WebGL is unavailable; context loss cannot stop the world loop.
- `COLOR ON/OFF` chooses corrected colors or the original lighter illustration palette for the complete character. It does not apply a brightness filter to the world. `FX ON/OFF` controls extra sparkles, aura and the automatic bouncing Bible; basic gesture/flower feedback remains. Both preferences persist as booleans. Version is visible as v0.2.0.
- Vertical gestures scroll; horizontal canopy gestures pull petals; horizontal grass gestures paint flowers. Character drag/hold keeps its own gesture. Bible cancellation releases safely. Mouse and touch guide the head and eyes, including while dragging the Bible.
- Camera springs are bounded to the painted world. The large flower now visibly tilts, bounces and smiles on poke; small flowers bounce too. The scroll button is a stable touch target. Runtime image caches retain at most two looks and load six continuous textures per look, with no eager decoding of all legacy part images.
- Original source concepts, the 93 authoring layer/expression assets, Blender/GLB source and 42 model-rendered strips remain. The native surface is pixel-identical to its registered approved master. Rebuild surfaces with library `node tools/concepts/chatgpt/export-surfaces.mjs ../pixelhaicuu` after layer/strip export; this preserves animation-strip metadata.

Verification: page `npm test`; 21 library behavior/asset tests; the four-viewport seven-look journey; Bible/music/browser/world journeys; all original library harnesses; `tools/skin-regression-test.mjs` tests 126 extreme motion/color/expression renders, protected interior alpha, pupil displacement, persistent controls, canopy scrolling, flower feedback, whole-world coverage and no-WebGL fallback. Browser checks use Chromium emulation, not physical Safari.

Current evidence: page `qa/bugs-before/`, `qa/bugs-after/`, and `qa/kujo/`. Color comparison: `qa/bugs-after/color-comparison.png`. Local skin harness: library `tools/sprite-demo/skin-review.html`. Local color harness: `tools/sprite-demo/color-review.html`.

This checkpoint is a feature-branch candidate. Production remains the prior f569d24 release until the candidate's release record is added. Main merges remain unapproved. Official haikus and MP3s remain pending per the owner.
