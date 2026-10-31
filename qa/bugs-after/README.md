# v0.2.0 bug-fix evidence

`color-comparison.png` shows the original lighter and corrected palettes. `<look>-original.png` and `<look>-corrected.png` show the real page. `motion.gif` is a sequence of actual browser screenshots during music and cursor movement. `om.png`, `music.png`, `flower-poke.png`, `vertical-canopy-scroll.png` and `canvas-fallback.png` cover the repaired interactions. `skin-review.png` is the local authoring harness.

`regressions.json` records 126 motion/color/expression renders with zero new protected-interior holes, measured pupil movement, saved toggles, canopy scrolling, flower feedback, whole-world coverage and no-WebGL fallback. Check outputs and the built HTML hash are retained as text/JSON. The earlier production captures remain in `../production-f569d24/` and `../bugs-before/`; `05-early-connected-probe.png` is an intermediate diagnostic, not production.

WebKit was downloaded but could not start because host libraries were unavailable and could not be installed in this environment. No physical Safari or WebKit pass is claimed. Chromium mobile emulation and the Canvas graphics fallback passed.
