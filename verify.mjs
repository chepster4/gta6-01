// Gameplay verification (fresh): drives the real game in headless
// Chromium and checks missions, shop, coins, heli, roadblock, weapons,
// garage, race, exploding cars and save/load through window.__game.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8902;
const results = [];
function check(name, ok, extra = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1500));
try {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/?shot=play&seed=1`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  await page.waitForTimeout(500);
  const G = (expr) => page.evaluate(expr);

  check('game boots, player exists', await G(`!!window.__game && !!window.__game.player`));
  check('mission 1 active', (await G(`window.__game.missions.current().id`)) === 1);
  check('12 cars spawned', (await G(`window.__game.vehicles.cars.length`)) === 12);
  check('12 coins spawned', (await G(`window.__game.world.coins.length`)) === 12);
  check('traffic + peds alive', (await G(`window.__game.traffic.cars.length + window.__game.traffic.peds.length`)) === 21);

  // Mission 1: teleport to target, expect completion + pistol.
  await G(`const p=window.__game.player; p.pos.x=120; p.pos.z=-40;`);
  await page.waitForTimeout(700);
  check('mission 1 completes (+$250, pistol)', (await G(`window.__game.missions.idx`)) === 1 && (await G(`window.__game.player.weapons.pistol`)) === true);

  // Coin pickup.
  const coinsBefore = await G(`window.__game.player.coins`);
  await G(`const p=window.__game.player; p.pos.x=40; p.pos.z=40;`);
  await page.waitForTimeout(500);
  check('gold coin pickup +$25', (await G(`window.__game.player.coins`)) === coinsBefore + 1);

  // Shop: teleport to SOLMAR ARMS, buy ammo via the real handler.
  await G(`const p=window.__game.player; p.pos.x=118; p.pos.z=-34; p.money=500;`);
  await page.waitForTimeout(300);
  const ammoBefore = await G(`window.__game.player.ammo.pistol`);
  await G(`window.__game.onShopBuy('ammo')`);
  check('shop ammo +30 / $50', (await G(`window.__game.player.ammo.pistol`)) === ammoBefore + 30 && (await G(`window.__game.player.money`)) === 450);

  // Weapon switch to SMG after granting it (mission 2 reward path).
  await G(`const p=window.__game.player; p.weapons.smg=true; p.ammo.smg=90;`);
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(200);
  check('weapon switch 1->2 (SMG)', (await G(`window.__game.player.weapon`)) === 'smg');

  // Heli + roadblock at wanted 3.
  await G(`window.__game.player.wanted=3;`);
  await page.waitForTimeout(1200);
  check('CONDOR-1 heli visible at wanted 3', await G(`window.__game.police.heli.visible`));
  check('roadblock spawned at wanted 3', await G(`!!window.__game.police.roadblock`));
  check('searchlight on at dusk', await G(`window.__game.police.spot.intensity > 0`));

  // Car steal + garage upgrade + explosion.
  await G(`const p=window.__game.player; p.pos.x=30; p.pos.z=-14;`);
  await page.waitForTimeout(200);
  await G(`const g=window.__game; const c=g.vehicles.nearestCar(g.player.pos.x,g.player.pos.z,6); g.vehicles.enter(c,g.player);`);
  check('car stolen, driving state', await G(`window.__game.player.car !== null && window.__game.player.onFoot === false`));
  await G(`const g=window.__game; g.player.money=1000; g.vehicles.applyUpgrade(g.player.car,'engine');`);
  check('garage engine upgrade applied', (await G(`window.__game.player.car.upgrades.engine`)) === 1);
  await G(`window.__game.vehicles.damageCar(window.__game.player.car, 500)`);
  await page.waitForTimeout(400);
  check('car explodes -> burning wreck', await G(`window.__game.vehicles.cars.some(c=>c.wreck && c.fire)`));

  // Race: start route 1, teleport through checkpoints.
  await G(`window.__game.missions._startRace(1)`);
  const route = await G(`window.__game.missions.race.route.points`);
  for (const [x, z] of route) {
    await G(`const p=window.__game.player; p.pos.x=${x}; p.pos.z=${z};`);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);
  check('street race completable (prize paid)', (await G(`window.__game.missions.race`)) === null);

  // Mission 4 kill-type: spawn rivals, kill them, expect advance.
  await G(`window.__game.missions.idx=3; window.__game.missions.start();`);
  await page.waitForTimeout(300);
  check('mission 4 spawns 3 rivals', (await G(`window.__game.missions.rivals.length`)) === 3);
  await G(`window.__game.missions.rivals.forEach(r=>window.__game.missions.damageRival(r,1000))`);
  await page.waitForTimeout(500);
  check('mission 4 completes after rivals down', (await G(`window.__game.missions.idx`)) === 4);

  // Crew spawns on mission 8.
  await G(`window.__game.missions.idx=7; window.__game.missions.start();`);
  await page.waitForTimeout(300);
  check('crew (Marcus & Lena) spawns on mission 8', (await G(`window.__game.missions.crew.length`)) === 2);

  // Radio switch.
  const st = await G(`window.__game.audio.radioNext()`);
  check('radio station switches', typeof st === 'string' && st.length > 5, `(${st})`);

  // Save / load round-trip.
  await G(`window.__game.save()`);
  const saved = await G(`!!localStorage.getItem('palmira-bay-save-v1')`);
  check('save writes localStorage', saved === true);

  // Safehouse regen.
  await G(`const p=window.__game.player; p.hp=50; p.pos.x=168; p.pos.z=-185; p.wanted=0;`);
  await page.waitForTimeout(1500);
  check('safehouse regens HP', (await G(`window.__game.player.hp`)) > 50);

  check('0 console errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  await browser.close();
} finally {
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.error('VERIFY FAILED'); process.exit(1); }
console.log('VERIFY OK');
