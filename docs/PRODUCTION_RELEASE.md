# HaiCuu production release — 2026-10-31

The owner explicitly requested deployment after approving the illustrated looks and feature-branch delivery.

- Live URL: https://haicuu.gsix.online
- Vercel team: `mistachatty-cmyks-projects` (`team_3eLVreepZFk2aANRcmLkMUBC`)
- Project: `haicuu-kujo` (`prj_8bSA9oxzGuASNNZCZO7hy5s4NxGU`)
- Deployment: `dpl_GqHKrrXWaYwWGu7zFZpADfvDfSxi`, production, READY
- Source: page `chatgpt/kujo-page`, commit `f569d2474080189c6220647f23d337166e55a873`
- Deployment URL: https://haicuu-kujo-dwdzb4kms-mistachatty-cmyks-projects.vercel.app
- Previous production deployment: `dpl_G3jNEne4nGE25MM6UZNmiy2T1bLw`, commit `2cb037b368072b5bcc2a1b63b6b17cbf276a3ef7` (retained as a rollback reference)

Neither repository's main branch was merged. Later documentation/evidence commits are checkpoints; the deployed source remains pinned to `f569d24`.

## Verification

`npm test` passed immediately before deployment. The custom domain returns HTTP 200 and serves exactly the locally tested HTML (SHA-256 `9716829d98525073c73dbe846b268a1a146bdd08b953041e20fe677d891ef288`). All 144 character asset files, including manifests, illustrated layers and model-rendered strips, match local bytes. Response headers retain `Cache-Control: no-store`, the self-only font policy, and `nosniff`. The build ships no source maps or browser offline code caches.

Live Chromium journeys passed at 430×860, 1280×720, 320×568 and 844×390 for all seven looks: layout clearance, drag/hold/cancel, touch, music/look mapping, Bible URL/focus, footer, safe missing-art fallback, reduced motion, planting, petal pulling and llama petting. Normal journeys recorded no browser errors, failed assets or external requests. These are browser emulations, not physical Safari testing.

The recent five-minute Vercel error-log query returned no matching logs. No continuous log drain is configured. This static page has no application backend.

Page evidence: `qa/production-f569d24/` contains the deployment record, live browser results/screenshots, asset-integrity report and HTTP headers. The same browser assertions were run against the production origin with only the base URL and evidence directory changed.

Official haikus and MP3s remain pending per the owner. The future Lok Pixel Character Designer, clothing painting and Bible/world collisions remain planned. Main merges still require explicit approval.
