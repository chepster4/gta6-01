// Gameplay verification for Palmira Bay: drives the real game through the
// real keyboard path (Enter to start, E to steal, F to fight) and the debug
// hook for teleporting between test spots. Prints PASS/FAIL per check.
// Usage: node verify.mjs [port]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8903);
const server = spawn('node', ['serve.ts', '--port', String(port)], { cwd: here, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__palmira, null, { timeout: 30000 });
await page.waitForTimeout(500);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const state = () => page.evaluate(() => {
  const P = window.__palmira;
  return {
    money: P.world.player.money, hp: P.world.player.hp, coins: P.world.player.coins,
    ammo: P.world.player.ammo, hasPistol: P.world.player.hasPistol,
    inCar: !!P.world.player.inCar, mission: P.missions.index, phase: P.missions.phase,
    thugsLeft: P.missions.thugsLeft, wanted: P.police.wanted,
    briefcase: P.world.briefcase.visible,
    x: P.world.player.x, z: P.world.player.z,
  };
});
const setPlayer = (x, z, heading) => page.evaluate(([x, z, h]) => {
  const P = window.__palmira;
  P.world.player.x = x; P.world.player.z = z; P.world.player.heading = h;
  P.world.syncPlayerMesh();
}, [x, z, heading]);

// Start the game.
await page.keyboard.press('Enter');
await page.waitForTimeout(400);

// Job 1: walk to the Dune Buggy at (-24, 40) and press E to steal it.
await setPlayer(-24, 43, Math.PI);
await page.keyboard.press('KeyE');
await page.waitForTimeout(600);
let s = await state();
check('job1 steal car -> in car', s.inCar, `inCar=${s.inCar}`);
check('job1 completes, +$250, pistol given', s.mission === 1 && s.money === 370 && s.hasPistol,
  `mission=${s.mission} money=${s.money} pistol=${s.hasPistol} ammo=${s.ammo}`);
check('stealing adds wanted', s.wanted >= 1, `wanted=${s.wanted}`);

// Drive forward until the car has clearly moved (or 15 s pass): SwiftShader
// renders slowly, so this polls instead of assuming a fixed frame rate.
const before = await state();
await page.keyboard.down('KeyW');
let moved = 0;
for (let i = 0; i < 30 && moved <= 10; i += 1) {
  await page.waitForTimeout(500);
  s = await state();
  moved = Math.hypot(s.x - before.x, s.z - before.z);
}
await page.keyboard.up('KeyW');
check('driving moves the car', moved > 10, `moved=${moved.toFixed(1)}m`);

// Exit the car, wait until the exit has actually run, then walk to a coin
// at (-206,-206) and collect it.
await page.keyboard.press('KeyE');
for (let i = 0; i < 10; i += 1) {
  s = await state();
  if (!s.inCar) break;
  await page.waitForTimeout(500);
}
await setPlayer(-206, -206, 0);
for (let i = 0; i < 10; i += 1) {
  s = await state();
  if (s.coins === 1) break;
  await page.waitForTimeout(500);
}
s = await state();
check('coin collected +$25', s.coins === 1 && s.money === 395, `coins=${s.coins} money=${s.money}`);

// Shop: walk to the SOLMAR ARMS kiosk, press E, buy ammo.
await setPlayer(52, -12, 0);
await page.keyboard.press('KeyE');
let shopOpen = false;
for (let i = 0; i < 10 && !shopOpen; i += 1) {
  await page.waitForTimeout(500);
  shopOpen = await page.evaluate(() => window.__palmira.hud.shopVisible());
}
check('shop opens near kiosk', shopOpen);
await page.click('#buy-ammo');
await page.waitForTimeout(300);
s = await state();
check('buy ammo +30 for $50', s.ammo === 90 && s.money === 345, `ammo=${s.ammo} money=${s.money}`);
await page.click('#close-shop');
await page.waitForTimeout(200);

// Safehouse: hurt the player, set wanted 3, stand in the safehouse.
await page.evaluate(() => {
  const P = window.__palmira;
  P.world.player.hp = 50;
  P.police.setWanted(3);
});
await setPlayer(168, -196, 0);
let healed = false; let cooled = false;
for (let i = 0; i < 60 && !(healed && cooled); i += 1) {
  await page.waitForTimeout(500);
  s = await state();
  healed = s.hp > 55;
  cooled = s.wanted < 3;
}
s = await state();
check('safehouse heals HP', s.hp > 55, `hp=${s.hp.toFixed(1)}`);
check('safehouse lowers wanted', s.wanted < 3, `wanted=${s.wanted}`);

// Job 4: jump to it, then shoot the thugs one by one — each attempt re-aims
// at the nearest living thug from live state, so chaser movement cannot
// make a shot silently miss its target.
await page.evaluate(() => {
  const P = window.__palmira;
  P.missions.jumpTo(3);
  P.world.spawnThugs();
  for (const t of P.world.thugs) { t.hp = 1; }
});
await page.waitForTimeout(300);
for (let attempt = 0; attempt < 6; attempt += 1) {
  s = await state();
  if (s.thugsLeft === 0) break;
  const aimed = await page.evaluate(() => {
    const P = window.__palmira;
    const alive = P.world.thugs.filter((t) => !t.dead);
    if (alive.length === 0) return false;
    let best = alive[0]; let bestD = Infinity;
    for (const t of alive) {
      const d = Math.hypot(t.x - P.world.player.x, t.z - P.world.player.z);
      if (d < bestD) { bestD = d; best = t; }
    }
    P.world.player.x = best.x - 4; P.world.player.z = best.z;
    P.world.player.heading = Math.atan2(best.x - P.world.player.x, best.z - P.world.player.z);
    P.world.syncPlayerMesh();
    return true;
  });
  if (!aimed) break;
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(600);
  s = await state();
  console.log(`  shot ${attempt + 1}: thugsLeft=${s.thugsLeft} ammo=${s.ammo}`);
}
s = await state();
check('all 3 thugs down, briefcase appears', s.thugsLeft === 0 && s.briefcase,
  `thugsLeft=${s.thugsLeft} briefcase=${s.briefcase}`);
await setPlayer(192, 102, 0);
for (let i = 0; i < 10; i += 1) {
  s = await state();
  if (s.mission === 4) break;
  await page.waitForTimeout(500);
}
s = await state();
check('job4 completes, +$500', s.mission === 4 && s.money === 845,
  `mission=${s.mission} money=${s.money}`);

// Job 5 target exists and the game is still error-free.
check('no console errors during play', errors.length === 0, errors.join(' | ').slice(0, 300));

const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? 'VERIFY OK' : `VERIFY FAILED: ${failed.length} check(s)`);
await browser.close();
server.kill();
process.exit(failed.length === 0 ? 0 : 1);
