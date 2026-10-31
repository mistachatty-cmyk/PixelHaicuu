# PixelHaicuu

**Kujo-sama (the Dalai Llama) - The HaiCuu Experience.** An interactive pixel world in the Lok's Flowerland style,
built on the [Lok Pixel Library](https://github.com/mistachatty-cmyk/LoksPixelLibrary-).
*Llamasté Productions, est. 1998. The HaiCuu Experience is Kujo's music event.*

## What it does
- Opens with **LLAMASTÉ**, which slides away and is sucked into the blossom tree as a petal vortex.
- The HaiCuu Experience title (chrome / balloon / ransom-note) drops into the sky, then the camera glides down to Kujo sitting crisscross under the sakura tree.
- Kujo breathes, smiles, and **nods to the music** (demo loop built in; your tracks via `public/tracks.json`).
- **Tap Kujo** to switch looks (Pink Dreads, Pink Mask, Maroon Mask, Bucket Hat, Llamasté). **Hold** to make him focus. ◀ ▶ and AUTO in the HUD too. A song can bring its own look.
- Tap the sun, alpaca, smiley flower, clouds, title letters, blossoms and the grass. Drag / wheel / arrow keys scroll between sky and ground. COMING SOON sign for what is next.

## Run it
```bash
npm install
npm run sync      # copy the library from ../lokspixellibrary- into ./lib (already committed)
npm run dev       # build + serve on http://localhost:5173
npm test          # build + verify (no source maps, no service worker, no console calls, no local paths)
```

## Lok Services drawer: REALITY, PIXEL, LOK
A small "LOK SERVICES" tab sits at the bottom of the page; pull it up (or tap it) for the MP3 player.
- **REALITY**: Cuu Jo's Mixverse, his real tracks from `public/tracks.json`. The main soundtrack.
- **PIXEL**: the built-in Pixel Q Music.
- **LOK**: the shared Lok library (ungated tracks from `https://gsix.online/lok-music-catalog.json`). It is added by inserting the Lok Services cartridge: the card flies into the slot with a burst, shockwave, shake and "+N TRACKS!", then the library loads in. Eject (tap twice) removes it again. The choice is remembered in localStorage (`hx.lok`).
The full jukebox page lives at `/mixverse/` (`src/mixverse.*`, built by `tools/build.mjs`, list in `public/mixverse/manifest.json`).
Audio in `public/music/` is served with CORS so other Lok apps can play it (see `vercel.json`).

## Add music
See `public/music/README.md`. List tracks in `public/tracks.json` with optional `bpm`, `offset`, `variant`, `theme`.

## Layout
- `src/index.template.html` - page, CSS, HUD  |  `src/main.js` - intro, input, HUD, music wiring  |  `src/haikus.js` - placeholder haiku (replace with Kujo's words)
- `lib/` - vendored Lok Pixel Library (so Vercel builds without the library repo)
- `tools/` - `build`, `verify-dist`, `serve`, `sync-lib`, `browser-test` (Playwright screenshots)

## Deploy
Vercel: framework "Other", build `npm run build`, output `dist` (see `vercel.json`: no-store caching + security headers + CSP). No service worker, no source maps. Make the repo private first.
Heads-up: the page uses the Google Fonts "Press Start 2P" stylesheet; self-host the font to remove that request (roadmap).

## Roadmap
See the library's `docs/ROADMAP.md`: scroll sections (music, event info, activism), more looks and songs, Shuey's Arcade tie-ins, the card shop.
