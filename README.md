# Karnala — interactive 360° panorama

A React panorama viewer built on Photo Sphere Viewer 5.14.1 and its Markers plugin (MIT). One supplied photograph, six camera orientations, a personal observation notebook and shareable camera links.

## Assets

| File | Purpose | Size |
| --- | --- | --- |
| `public/panoramas/karnala.webp` | Full panorama, 6144 × 3072, quality 80 | 2.2 MB |
| `public/panoramas/karnala-preview.webp` | Blurred loading plate, 1200 × 600 | 52 KB |
| `public/views/view-01…06.webp` | Orientation card thumbnails, 720 × 460 | 31–62 KB each |
| `source/karnala-original.jpg` | Untouched 12000 × 6000 source (not shipped) | 38 MB |

The preview plate paints immediately while the full panorama decodes, so the first frame is never a black screen. Regenerate assets with `cwebp`:

```sh
sips -Z 6144 source/karnala-original.jpg --out /tmp/karnala-6144.jpg
cwebp -q 80 -m 6 /tmp/karnala-6144.jpg -o public/panoramas/karnala.webp
sips -Z 1200 source/karnala-original.jpg --out /tmp/karnala-1200.jpg
cwebp -q 62 -m 6 /tmp/karnala-1200.jpg -o public/panoramas/karnala-preview.webp
```

For a multi-location tour, move to Photo Sphere Viewer tiled panoramas so only the visible region downloads.

## Site structure

The page is a landing page, not a fullscreen widget. The 360° viewer is the hero (`100svh` on desktop, `calc(100svh - 62px)` on mobile so the section nav peeks); scrolling continues into:

1. **The panorama** — what the image is, how to move it, source dimensions.
2. **Orientations** — six cards cropped from the real photograph; each one sets the scene and scrolls back to the hero.
3. **Field notebook** — what is stored, where, and how to export it.
4. Footer and a sticky section nav.

The page scrolls normally: wheel events over the hero move the page, and only Ctrl/⌘ + wheel (or any wheel in fullscreen) zooms the lens. The dock slider, pinch and keyboard still zoom without a modifier.

## Saved observations

Use **Save viewpoint** to capture the engine's actual yaw, pitch and zoom with a title and a personal note. The observation index stores up to 100 notes on this device. Revisit restores the camera, and Share viewpoint supplies a URL containing that camera position and note. Sharing is manual; the URL includes the note, so share only what you intend others to read. Storage failures keep the form open; replacing malformed stored data first preserves its original payload under a separate recovery key.

User notes are identified as observations. Supplied historical interpretation is explicitly labeled as having no attached source; it is not presented as verified fact. The note sheet uses native dialog focus containment, Escape and focus return. Shared URLs also work when the hash changes in an already open page.

## Development and verification

Use Node 22.12+ (or a supported newer Node release).

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
npm run test:browser
```

The browser smoke check needs Playwright Chromium (`npx playwright install chromium`) or a local Chrome installation. Set `CHROME_PATH` to use another Chrome executable. It tests the current production build at desktop and mobile widths, view switching, renderer retention, dialog focus, WebGL construction recovery, and image failure/retry.

## Behavior

- **Look** — drag or touch. **Zoom** — scroll, pinch, the dock slider, or the keyboard when the surface has focus.
- **Orientations** — the numbered rail on the right, the view selector, or the in-photograph *Next view* markers. All six are bearings within the same photograph, not separate locations or times of day.
- **Auto-orbit** — opt-in slow rotation. Any drag, scroll, key press or scene change stops it. Unavailable under `prefers-reduced-motion`.
- **Fullscreen** — the ⤢ button in the top bar. The engine's own keyboard shortcuts activate in fullscreen.
- **Introduction** — retires after eight seconds or on first interaction, so it never blocks the photograph.
- **Notebook** — collapsed by default, bottom right on desktop and full-width above the dock on mobile.

The viewer is created once per mount; scene changes reuse the engine. Photo Sphere Viewer owns texture cancellation, projection, resizing, pointer controls, fullscreen state, and GPU disposal. Camera movement updates a throttled React readout and never recreates the engine. Only validated local panorama paths and information/navigation hotspots are accepted. Hotspot content is plain text.

Hotspots render as accessible pill buttons (`Next view →` for navigation, `Info` for interpretation) with a pulse that respects reduced motion. The camera readout shows a 0–360° bearing; the zoom slider reports the real field of view (30–100°) rather than a synthetic percentage.

Legacy renderer and unused UI scaffolds remain in source as recovery material, but they are not mounted. Their existing lint warnings remain visible. No autoplay or pretend audio controls are presented.

## Remaining release work

The production bundle is approximately 270 KB gzipped because it includes Three.js. Aligning the direct `three` dependency with Photo Sphere Viewer's copy would remove the dev-only "Multiple instances of Three.js" warning. Add real distinct panorama locations before describing this as a multi-location tour. Broader device and screen-reader testing is still needed; a browser smoke check is not a complete accessibility certification.

## Managing and recovering your notebook

Open a saved observation to **Edit observation** or **Delete observation**. Editing retains its ID and exact saved camera coordinates, including when the notebook holds 100 notes. Deletion requires confirmation; **Undo delete** restores the most recently deleted note at its former position. Writes finish before visible state changes, so storage failures keep the previous notebook and an actionable message.

**Export notebook** downloads version 1 JSON. **Import notebook** validates the whole file before changing anything: at most 1 MB, 100 observations, unique IDs, bounded camera values and text. **Merge missing observations** keeps existing IDs unchanged. **Replace notebook** requires a checked confirmation and saves the previous raw payload as a recovery backup before replacing it. Capacity errors reject the import rather than dropping notes. Recovery downloads include current raw data and separately preserved backups, including malformed originals; downloads never evaluate note content. Undo is session-local; exported JSON is the portable backup. Clearing browser/site data also removes local recovery backups, so download them first.

**Clear notebook and recovery data** requires confirmation and removes only this application's notebook key and recovery keys. Cancellation changes nothing. Partial browser-storage failures report remaining records and keep usable in-memory notes for export/retry; successful removal clears notes and session undo. Previously downloaded files and shared URLs remain outside this application's control.
