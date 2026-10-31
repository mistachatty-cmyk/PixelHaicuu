Drop Kujo's tracks here (mp3/ogg) and list them in `public/tracks.json`:

[
  { "id": "track-one", "title": "TRACK ONE", "src": "music/track-one.mp3", "bpm": 92, "offset": 0.12, "variant": "classic", "theme": "day" }
]

- `bpm` + `offset` (seconds to the first beat) lock the nods to a tight beat grid. Leave them out and the page
  listens to the audio instead (works on any song, a bit looser).
- `variant` (classic | pinkmask | maroon | bucket | llama) picks which Kujo appears when the song starts.
- With an empty list the page plays a built-in procedural demo loop.

Anything in `public/` is publicly downloadable once deployed - only put music here that you are happy to share.
