> Part of a multi-repo project. Full handoff: https://github.com/mistachatty-cmyk/lokspixellibrary-/blob/main/docs/HANDOFF.md (docs/repos/ there covers all repos).

# pixelhaicuu (the live page)

https://github.com/mistachatty-cmyk/pixelhaicuu · live: https://haicuu.gsix.online · last production commit `2cb037b` ("Song sheet with Pixel Q Music, add-track tool, music browser test").
Branches: `main`, `classic-prototype` (frozen snapshot of the old tiny-Kujo page; do not delete).

## What it is
A single-page canvas pixel world. No framework. Plain ES modules bundled by esbuild into one minified inline script inside `dist/index.html`.
Kujo-sama sits under a sakura tree. Intro: "LLAMASTÉ" card, petals sucked into the tree (`world.inhale`), bloom, title drops, camera glides down, Kujo arrives, a Bible spawns and bounces around.

## Vercel
| Item | Value |
|---|---|
| Project | `haicuu-kujo` (id `prj_8bSA9oxzGuASNNZCZO7hy5s4NxGU`), team `mistachatty-cmyks-projects` (`team_3eLVreepZFk2aANRcmLkMUBC`) |
| Domain | `haicuu.gsix.online` (DNS under gsix.online) |
| Framework | Other. Build `npm run build`, output `dist` |
| How it was deployed | Vercel MCP `create_deployment` with a `gitSource` of the GitHub repo. A push does not necessarily auto-deploy; check Vercel > Git before assuming. |
| Another project, not ours | `haicuu-experieince-portal` (an older portal; leave alone) |

## Files
| Path | What |
|---|---|
| `src/index.template.html` | Page markup, all CSS, HUD. Contains the placeholder `/*INLINE_JS*/` that the build replaces. Element ids: `stage` (canvas), `hello`, `haiku`, `brand`, `scrollbtn`, `hud` (`prev`, `look`, `next`, `auto`, `play`, `songs`, `mute`, `bibtn`), `tracks` (`tlist`, `tprev`, `tnext`, `tx`), `bible` (reader), `skip` |
| `src/main.js` (339 lines) | Wires the library to the DOM: engine setup (`createStage(canvas,{targetH:230,targetW:118})`, `SakuraWorld`, `Kujo`, `Particles`, `BeatEngine`, `Synth`), pointer handling (`attachPointer`: tap, hold, drag, wheel, keys), look switching (`switchLook`), auto mode, song sheet, Bible hooks, frame loop, haiku loop, `intro()`/`arrive()`/skip |
| `src/reader.js` (215 lines) | `BibleReader`: overlay with a verse card (24 featured verses), book/chapter browser, tap to highlight (stored in localStorage `hx.hl`). KJV JSON loaded one book at a time from `public/bible/kjv/<book>.json`, index in `public/bible/index.json` |
| `src/haikus.js` | Placeholder haiku. Replace with Kujo's own words |
| `public/tracks.json` | MP3 list (currently empty `[]`). Fields: id, title, artist, src, bpm, offset, variant (classic, pinkmask, maroon, bucket, llama), theme (day, dusk, night) |
| `public/music/README.md` | How to add songs |
| `lib/` | Vendored copy of `lokspixellibrary-/src`. Refresh with `npm run sync` (copies from `../lokspixellibrary-`). Keep committed so Vercel builds without the library repo |
| `tools/build.mjs` | esbuild: bundle, minify, IIFE, `sourcemap:false`, `drop:['console','debugger']`, inline into template, copy `public/` (minus READMEs) |
| `tools/verify-dist.mjs` | Fails the build if `dist/` has `.map/.ts/.tsx/.jsx`, service worker or manifest files, `sourceMappingURL`, `navigator.serviceWorker`, `console.log/debug/trace`, or local paths |
| `tools/serve.mjs` | Local static server on 5173 |
| `tools/browser-test.mjs`, `bible-test.mjs`, `music-test.mjs` | Playwright smoke tests that take screenshots into `shots/` |
| `tools/add-track.mjs` | `node tools/add-track.mjs song.mp3 "TITLE" pinkmask dusk` copies the MP3, estimates BPM and offset (needs ffmpeg), appends to `tracks.json` |
| `vercel.json` | Headers: `Cache-Control: no-store`, nosniff, no-referrer, Permissions-Policy, CSP (`default-src 'self'`, inline scripts allowed, Google Fonts for Press Start 2P, `frame-ancestors` allows `*.gsix.online` and `dj-shoey-arcade.vercel.app`) |

## Commands
```
npm install
npm run dev     # build + serve http://localhost:5173
npm test        # build + verify-dist  (must pass before any deploy)
npm run sync    # refresh lib/ from ../lokspixellibrary-
```

## Behaviour that matters when swapping the character art
- `Kujo` (library `characters/kujo.js`) owns springs (nod, sway, bounce, focus), expression timers and reactions. The rig only draws. A new art system must keep: `kujo.hit(wx,wy)` hit box, `kujo.poke()`, `kujo.setHold(bool)`, `kujo.def` (name/id for the HUD), `kujo.x`, `kujo.y` (particles spawn from them), `kujo.expr`/`exprT`, and variant switching through `switchLook(dir,id)`.
- Looks: `VARIANTS`, `VARIANT_ORDER` (pinkdreads/classic, pinkmask, maroon, bucket, llama). `NAMES` in main.js maps display names with accents.
- Songs can bring a look and theme (day/dusk/night).
- Tapping Kujo switches look. Tapping other things triggers `world.tap` hit names: sun, title, alpaca, flower, ground.
- The stage is ~230 px tall with an integer scale. Sprites at 256 px cells are higher resolution than the world's chunky pixels, so draw them on a second canvas layered above the stage (see `../SPRITE_INTEGRATION.md`).

## Known gaps / queued (see ../HANDOFF.md for the full list)
Tree placement and petals, tap-to-plant flowers, cardinal and per-scene events, footer credit, Bible download link, self-hosted font, haiku text, real tracks.
