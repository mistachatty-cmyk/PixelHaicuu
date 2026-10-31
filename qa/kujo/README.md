# Kujo verification evidence

The canonical screenshots are `<viewport>-<look>.png` for `phone` (430×860), `desktop` (1280×720), `compact` (320×568), and `landscape` (844×390), across all seven looks. `*-om.png`, `*-reader.png`, `*-music.png`, `phone-reduced.png`, `phone-touch-om.png` and `fallback-studio.png` cover the interaction stories. `results.json` is the machine-readable final browser result.

Files ending `-before-fit.png` or `-check.png` are earlier diagnosis captures, retained as history. They are not the final layout target.

`browser-test.log`, `bible-test.log` and `music-test.log` are the existing journey outputs. `build-verification.log` is the production build/security/asset contract result. `library-tests.log` records the rig, world and pointer unit checks. `build-snapshot.json` binds the result to the built HTML and shipping manifests with SHA-256 hashes.

These are Chromium emulations and CDP touch-input checks, not physical Safari performance evidence. No production site was changed for these screenshots.
