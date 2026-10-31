# Kujo verification evidence

The canonical screenshots are `<viewport>-<look>.png` for `phone` (430×860), `desktop` (1280×720), `compact` (320×568), and `landscape` (844×390), across all seven looks. `*-om.png`, `*-reader.png`, `*-music.png`, `phone-reduced.png`, `phone-touch-om.png` and `fallback-studio.png` cover the interaction stories. `results.json` is the machine-readable final browser result.

Files ending `-before-fit.png` or `-check.png` are earlier diagnosis captures, retained as history. They are not the final layout target.

`browser-test.log`, `bible-test.log` and `music-test.log` are the existing journey outputs. `build-verification.log` is the production build/security/asset contract result. `library-tests.log` records all 15 rig, world, pointer and missed-beat checks. `kujo-test.log` records the full four-viewport story; `world-gesture-test.log` covers planting, canopy pulling and llama petting. `library-harnesses.json` records all three library demos. `build-snapshot.json` binds the result to the built HTML and shipping manifests with SHA-256 hashes.

`looks-contact.png` is the seven-look page comparison; `review.html` displays the same captures. Remote recovery and combined implementation commits are recorded in `docs/CHECKPOINTS.md`.

These are Chromium emulations and CDP touch-input checks, not physical Safari performance evidence. No production site was changed for these screenshots.
