Kujo's MP3 tracks go here. The easy way (needs ffmpeg):

    node tools/add-track.mjs path/to/song.mp3 "SONG TITLE" pinkmask dusk

That copies the file in, estimates its BPM and first-beat offset, and lists it in `public/tracks.json`. It then shows up in the
page's song sheet under "MP3 TRACKS", after the built-in PIXEL Q MUSIC songs. Check the estimated bpm/offset - if the nods feel
off, edit them in tracks.json (or delete bpm/offset and the page listens to the audio instead).

Track fields: id, title, artist, src, bpm, offset (seconds to the first beat), variant (classic | pinkmask | maroon | bucket | llama), theme (day | dusk | night).

Anything in `public/` is publicly downloadable once deployed - only put music here that you are happy to share.
