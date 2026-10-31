# Production evidence for f569d24

Live origin: https://haicuu.gsix.online. Deployment and checks: `deployment.json`; all character asset bytes: `asset-integrity.json`; full browser story: `results.json`; world gestures: `world-gestures.json`. Text outputs and HTTP response headers are retained alongside viewport screenshots.

The existing `tools/kujo-test.mjs` and `tools/world-gesture-test.mjs` assertions were run with the production base URL and this output directory. Deliberate missing-art interception tests the fallback; normal journeys have no failed assets. Source build and release history: `docs/PRODUCTION_RELEASE.md`. The earlier `qa/kujo/` remains the local pre-release evidence.
