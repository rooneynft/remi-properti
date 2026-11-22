// take-screenshots.mjs — renders the four staged scenes of Remi Properti in a
// headless Chromium and saves them as JPEGs in screenshots/ (1280x720, <256 KiB).
// Serves game/ on a local port first, then screenshots each ?shot= scene from
// shots.json. Run from the repository root: `node scripts/take-screenshots.mjs`.
import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = fileURLToPath(new URL('..', import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const port = 8931;

const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
  cwd: here,
  stdio: 'ignore',
});

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/index.html`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('game server did not come up');
}

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('page console error:', msg.text());
  });
  page.on('pageerror', (err) => console.log('page error:', String(err)));
  for (const shot of shots) {
    await page.goto(`http://127.0.0.1:${port}/index.html${shot.query}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const out = join(here, 'screenshots', shot.name);
    await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
    const size = statSync(out).size;
    console.log(`${shot.name}: ${size} bytes${size > 262144 ? '  <-- OVER 256 KiB!' : ''}`);
  }
  await browser.close();
} finally {
  server.kill();
}
