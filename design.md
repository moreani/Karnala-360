# Karnala — camera viewfinder

The panorama is the surface, and it now owns the whole hero. Chrome is deliberately minimal: a compact brand and live camera readout at the top, a single fullscreen button, a retiring introduction, the in-photograph markers, and a scroll cue. No dock, no orientation rail, no notebook panel sits on top of the photograph.

Six presets still mean six angles within one photograph, never six invented locations. The explicit scene control lives below the hero as six cards cropped from the real image; selecting one aims the camera and returns to the top. Markers inside the panorama offer the same move with `Next view →`.

Palette and typography tokens live in `src/index.css`. Reduced motion stops an in-flight orientation transition at its target and disables the marker pulse. There is no custom cursor, ambient loop, invented map, or new historical claim. Dialogs use contrasting charcoal surfaces and light text. Historical interpretation is labelled as having no attached source.

The page scrolls normally: wheel events over the hero move the page, and Ctrl/⌘ + wheel zooms the lens. Touch drag belongs to the panorama engine; pinch zooms; arrow keys rotate and `+`/`-` zoom once the surface has focus.
