import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
const port = 4397;
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (existsSync(localChrome) ? localChrome : undefined), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.disableWebGL = true; window.webglCalls = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (/^webgl/.test(type)) { window.webglCalls++; if (window.disableWebGL && window.webglCalls > 1) return null; }
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto(`http://127.0.0.1:${port}`);
  await page.getByRole('alert').waitFor();
  await page.evaluate(() => { window.disableWebGL = false; });
  await page.getByRole('button', {name:'Retry',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('canvas') && !document.querySelector('.tour-status'));
  assert.equal(await page.locator('.psv-container').count(),1,'one engine surface after WebGL retry');
  assert.equal(await page.locator('.tour-selection').count(),0,'no control dock over the panorama');
  assert.equal(await page.locator('.orientation-chapters').count(),0,'no orientation rail over the panorama');

  await page.evaluate(() => { window.testCanvas = document.querySelector('canvas'); });
  const before = await page.locator('canvas').screenshot();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 220, y: 300 }] });
  for (const x of [200, 180, 160, 140, 100]) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 350 }] });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await page.locator('canvas').screenshot();
  assert.notDeepEqual(before, after, 'touch dragging changes the panorama');
  console.log('Touch drag passed');

  // Page cards are the orientation control now.
  await page.getByRole('button', {name:'View Valley & Far Hill in the panorama', exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.tour-status')&&Math.abs(document.querySelector('.tour-surface').photoSphereViewer.getPosition().yaw-Math.PI)<.01);
  await page.waitForFunction(()=>window.scrollY<2,undefined,{timeout:5000});
  assert.equal(await page.evaluate(()=>window.testCanvas === document.querySelector('canvas')), true, 'scene changes reuse the renderer');
  console.log('Orientation card returns to the hero and reuses the renderer');

  // Ctrl/⌘ + wheel zooms; a plain wheel scrolls the page.
  await page.mouse.move(200,300);
  const zoomStart = await page.evaluate(()=>document.querySelector('.tour-surface').photoSphereViewer.getZoomLevel());
  await page.keyboard.down('Control'); await page.mouse.wheel(0,300); await page.keyboard.up('Control');
  await page.waitForFunction(value=>document.querySelector('.tour-surface').photoSphereViewer.getZoomLevel()<value-1, zoomStart);
  const zoomed = await page.evaluate(()=>document.querySelector('.tour-surface').photoSphereViewer.getZoomLevel());
  await page.mouse.wheel(0,400); await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.scrollY)>0, true, 'plain wheel scrolls the page');
  assert.equal(await page.evaluate(()=>document.querySelector('.tour-surface').photoSphereViewer.getZoomLevel()), zoomed, 'plain wheel leaves the lens alone');
  await page.evaluate(()=>window.scrollTo(0,0));
  console.log('Ctrl+wheel zoom and plain-wheel page scroll passed');

  await page.getByRole('button', {name:'View The Rock Face in the panorama', exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.tour-status')&&Math.abs(document.querySelector('.tour-surface').photoSphereViewer.getPosition().yaw-Math.PI/180*25)<.02);
  await page.locator('.tour-surface').focus();
  const yawBefore = await page.evaluate(()=>document.querySelector('.tour-surface').photoSphereViewer.getPosition().yaw);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(value=>Math.abs(document.querySelector('.tour-surface').photoSphereViewer.getPosition().yaw-value)>.04, yawBefore);

  await page.evaluate(()=>document.querySelector('.tour-surface').photoSphereViewer.rotate({yaw:-45*Math.PI/180,pitch:10*Math.PI/180}));
  await page.waitForTimeout(400);
  await page.locator('.tour-marker--info').click();
  await page.getByRole('dialog').waitFor();
  assert.match(await page.getByRole('dialog').innerText(), /Karnala Fort/);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
  console.log('Keyboard rotation and information dialog passed');

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('.tour-shell').dataset.motion==='reduced');
  await page.getByRole('button', {name:'View Cliff Wall in the panorama', exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.tour-status')&&Math.abs(document.querySelector('.tour-surface').photoSphereViewer.getPosition().yaw-Math.PI/2)<.01);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>document.querySelector('.tour-shell').dataset.motion==='full');
  console.log('Reduced motion orientation jump passed');

  for (const width of [320, 375, 414, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 });
    await page.waitForFunction(()=>Math.abs(document.querySelector('.psv-canvas').clientWidth-innerWidth)<=1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no horizontal overflow at ${width}px`);
    await page.screenshot({path:`/tmp/virtual360-gallery-${width}.png`});
  }
  assert.equal(errors.filter(message => !/WebGL/.test(message)).length, 0);

  await page.route('**/panoramas/karnala.webp', route => route.abort());
  await page.reload();
  await page.evaluate(() => { window.disableWebGL = false; });
  await page.getByRole('button', {name:'Retry',exact:true}).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /could not load/);
  console.log('Image failure passed');
  await page.unroute('**/panoramas/karnala.webp');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.tour-status'));
  assert.equal(await page.locator('.psv-container').count(),1);
  assert.equal(errors.filter(message=>!/WebGL/.test(message)).length,0);
  console.log('Browser smoke passed: panorama, touch, page-card orientation, wheel zoom vs page scroll, dialog, responsive widths, failed image and retry.');
} finally {
  await browser?.close();
  preview.kill();
}
