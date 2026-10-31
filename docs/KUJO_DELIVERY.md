# HaiCuu candidate · Kujo layers and interactions

Branch: `chatgpt/kujo-page`, built on Claude's `kujo-v2` with `handoff-docs` and his latest `claude/page-polish` merged into this feature branch. The owner authorized checkpoint pushes and subsequently requested production deployment. Commit `f569d24` is live; see [PRODUCTION_RELEASE](PRODUCTION_RELEASE.md). Main merges remain unapproved. Remote recovery checkpoints: library `921bcf3`, page `362f5da`.

Claude's latest commits (`7ee092b` in the library, `d07e144` in the page) supply WOFF2 fonts, favicon, Bible link, landscape layout, drag-through petal pulling, llama reactions and calm mode. The merge preserves these alongside the illustrated rig and claimed touch gestures. Shared beat delivery retains his 150ms stale cutoff and emits only the latest audible beat.

## Current behavior

Seven front-facing, cross-legged looks replace the tiny coded rig when art is available. Look loading is atomic, cached in memory, protected against stale asynchronous responses, and falls back to the existing coded character if a manifest/image is unavailable. Existing `bucket` song recipes resolve to Artist.

Pointer movement guides bounded head/eye gaze. Tap switches look, hold invokes om, drag guides the character without scrolling or switching look, and cancel/lost capture clears the interaction. Beat motion combines with gaze; hair and headwear have independent lag. Reduced motion centers the character and freezes decorative world movement. Hidden tabs stop rendering work.

The world retains Claude's cardinal, stars/fireflies, flower planting, catching and grounding features. It adds pull-and-release canopy petals, pettable llama feedback and adaptive ground placement above the HUD, including 320px phones and short landscape. The moving Bible has a separate lightweight foreground canvas so it stays above Kujo and below UI. The footer reads "Powered by Lok Services · Designed by G6 Designs" on one low-opacity line.

The reader's link goes to the owner-supplied `https://gsix.online/lokbounce`. Reader/music sheets trap keyboard focus and restore it after close. The licensed Press Start 2P font is self-hosted; no external font request is required.

## Art and source connection

`public/kujo/atlas.json` lists looks and aliases. Each `<look>/manifest.json` declares the registered 512px RGBA layers, seat/head pivots, expression sets, hit rectangle and motion roles. It also references six lossless four-cell 1024×256 strips rendered from the source 3D rig. There are 93 layer/expression PNGs and 42 strips across seven looks.

The page uses the approved illustrated layer appearance. Blender source and seven skinned GLBs stay in the **Lok Pixel Library**, under `art/kujo/3d/`; no model or authoring code ships in `dist`. The geometric toon renders are additional model-based animation exports, not pixel-identical copies of the illustration. Source/build guide: library `art/kujo/README.md`. Creator plan: library `docs/CHARACTER_CREATOR_PLAN.md`.

Never hand-edit `lib/`: `npm run sync` copies the library's `src/`. Verify with `diff -rq ../lokspixellibrary-/src lib`.

## Verification

- `npm test`: build, shipping checks and the seven-look/layer/lossless-strip contract.
- `tools/kujo-test.mjs`: 430×860, 1280×720, 320×568 and 844×390; all seven looks; gesture ownership; reader URL/focus; song mapping; footer clearance; no missing assets or external font requests; missing-art fallback; reduced motion; Chromium touch-input smoke.
- `tools/browser-test.mjs`, `tools/bible-test.mjs`, `tools/music-test.mjs`: existing journeys updated to understand all seven looks, the legacy Artist alias and local font/image MIME types; failures now exit nonzero.
- QA screenshots and machine-readable results: `qa/kujo/`. Optional Playwright install and Chromium are needed for browser journeys; set `CHROMIUM_PATH` when using an installed browser.

These checks use Chromium emulation, not a physical iPhone/Safari performance certification. `npm test` enforces no source maps, service workers/offline code caches, console calls or workspace paths in the built page. Production security headers retain `Cache-Control: no-store`; CSP now permits fonts from self only.

## Remaining / deliberately deferred

Official Kujo haikus and MP3s were requested; the owner replied "Not now". Existing original placeholder text and Pixel Q procedural music remain. The later character creator/painting product and Bible collisions with world objects are planned work. The owner handles arcade PR #15, repo privacy and any merge/deployment approval.
