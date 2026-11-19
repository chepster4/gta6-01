// Take Palmira Bay's four screenshots with Playwright (headless Chromium,
// SwiftShader WebGL). Serves game/ from record5, loads each ?shot= scene,
// waits for window.__shotReady, captures 1280x720 JPEG and reports console
// errors. Usage: node shot.mjs [port]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8901);
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

const server = spawn('node', ['serve.ts', '--port', String(port)], {
  cwd: here,
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve) => {
  server.stdout.on('data', () => resolve());
  setTimeout(resolve, 4000);
});

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const results = [];
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(`http://127.0.0.1:${port}/${shot.query}`, { waitUntil: 'load', timeout: 60000 });
    try {
      await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 60000 });
    } catch {
      errors.push('TIMEOUT waiting for __shotReady');
    }
    await page.waitForTimeout(400);
    const path = join(here, 'screenshots', shot.name);
    await page.screenshot({ path, type: 'jpeg', quality: 88 });
    results.push({ name: shot.name, errors });
    console.log(`${shot.name}: ${errors.length} console error(s)${errors.length ? ' — ' + errors.join(' | ') : ''}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
const bad = results.filter((r) => r.errors.length > 0);
if (bad.length > 0) {
  console.error(`FAILED: ${bad.length} shot(s) with console errors`);
  process.exit(1);
}
console.log('OK: 4 screenshots, 0 console errors');
