// Screenshot runner (fresh): serves game/ on :8901, opens each staged
// shot at 1280x720, waits for window.__shotReady, saves JPEGs into
// screenshots/ and fails on console errors or oversize files.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdirSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8901;
const SHOTS = [
  { name: '1-heli.jpg', query: '?shot=heli&seed=1' },
  { name: '2-roadblock.jpg', query: '?shot=roadblock&seed=1' },
  { name: '3-race.jpg', query: '?shot=race&seed=1' },
  { name: '4-wheel.jpg', query: '?shot=wheel&seed=1' },
];

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1500));
let errors = [];
try {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  mkdirSync(join(here, 'screenshots'), { recursive: true });
  for (const s of SHOTS) {
    await page.goto(`http://127.0.0.1:${PORT}/${s.query}`, { waitUntil: 'load', timeout: 60000 });
    try {
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
    } catch { errors.push(`${s.name}: __shotReady never became true`); }
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(here, 'screenshots', s.name), type: 'jpeg', quality: 82 });
    const sz = statSync(join(here, 'screenshots', s.name)).size;
    console.log(`${s.name}: ${sz} bytes ${sz <= 262144 ? 'OK' : 'TOO BIG'}`);
    if (sz > 262144) errors.push(`${s.name} over 256 KiB`);
  }
  await browser.close();
} finally {
  server.kill();
}
console.log('console errors:', errors.length ? errors : 'none (0)');
console.log('files:', readdirSync(join(here, 'screenshots')).join(', '));
if (errors.length) { console.error('SHOT RUN FAILED'); process.exit(1); }
console.log('SHOT RUN OK');
