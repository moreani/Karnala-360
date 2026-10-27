# Karnala — interactive 360° panorama

A React panorama viewer built on Photo Sphere Viewer 5.14.1 and its Markers plugin (MIT). One supplied photograph, six camera orientations, and a scrollable site around it.

## Assets

| File | Purpose | Size |
| --- | --- | --- |
| `public/panoramas/karnala.webp` | Full panorama, 6144 × 3072, quality 80 | 2.2 MB |
| `public/panoramas/karnala-preview.webp` | Blurred loading plate, 1200 × 600 | 52 KB |
| `public/views/view-01…06.webp` | Orientation card thumbnails, 720 × 460 | 31–62 KB each |
| `source/karnala-original.jpg` | Untouched 12000 × 6000 source (not shipped) | 38 MB |

The preview plate paints immediately while the full panorama decodes, so the first frame is never a black screen. Regenerate the assets with `cwebp`:

```sh
sips -Z 6144 source/karnala-original.jpg --out /tmp/karnala-6144.jpg
cwebp -q 80 -m 6 /tmp/karnala-6144.jpg -o public/panoramas/karnala.webp
sips -Z 1200 source/karnala-original.jpg --out /tmp/karnala-1200.jpg
cwebp -q 62 -m 6 /tmp/karnala-1200.jpg -o public/panoramas/karnala-preview.webp
```

For a multi-location tour, move to Photo Sphere Viewer tiled panoramas so only the visible region downloads.

## Site structure

The 360° viewer is the hero (`100svh` on desktop, `calc(100svh - 62px)` on mobile so the section nav peeks). The image keeps the screen to itself: brand, live camera readout, fullscreen button, a retiring introduction, the in-photograph markers and a scroll cue. There is no control dock or orientation rail on top of the panorama.

Below the hero:

1. **The panorama** — what the image is, how to move it, source dimensions.
2. **Orientations** — six cards cropped from the real photograph. This is the explicit scene control; each card aims the camera at one bearing and scrolls back to the hero.
3. Footer and a sticky section nav.

The page scrolls normally. Wheel events over the hero move the page; only Ctrl/⌘ + wheel (or any wheel in fullscreen) zooms the lens.

## Controls

| Action | Input |
| --- | --- |
| Look around | Drag with mouse or one finger |
| Zoom | Pinch, Ctrl/⌘ + wheel, `+` / `-` when the surface has focus |
| Rotate | Arrow keys when the surface has focus |
| Next orientation | The `Next view →` marker inside the photograph |
| Choose an orientation | The cards in the Orientations section |
| Fullscreen | The ⤢ button in the top bar, or Escape to leave |

Camera movement updates a throttled React readout and never recreates the engine. Scene changes reuse the same renderer and texture pipeline.

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

The browser smoke check needs Playwright Chromium (`npx playwright install chromium`) or a local Chrome installation. Set `CHROME_PATH` to use another Chrome executable. It tests the production build at mobile and desktop widths: WebGL construction recovery, touch drag, orientation cards, Ctrl + wheel zoom versus plain page scroll, keyboard rotation, the information dialog, reduced motion, overflow at five viewport widths, and image failure/retry.

## Deployment

`vite.config.ts` uses `base: './'`, so the same build works at a domain root, a GitHub Pages project path, or Vercel. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`; the live site is <https://moreani.github.io/Karnala-360/>.

## Remaining release work

The production bundle is approximately 268 KB gzipped because it includes Three.js. Aligning the direct `three` dependency with Photo Sphere Viewer's copy would remove the dev-only "Multiple instances of Three.js" warning. Add real distinct panorama locations before describing this as a multi-location tour. Broader device and screen-reader testing is still needed; a browser smoke check is not a complete accessibility certification.
