// PALMIRA BAY — entry point. Builds the world, owns the player, the
// game loop, combat, interactions (car / shop / garage / radio /
// weapon wheel), wanted decay and save/load.
const THREE = window.THREE;
import { CFG, WEAPONS, WEAPON_ORDER, SHOP, GARAGE_UPGRADES } from './config.js';
import { RNG } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Sky } from './sky.js';
import { City } from './city.js';
import { World } from './world.js';
import { VehicleSys } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Render } from './render.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1337);
const shot = params.get('shot');

const G = {
  rng: new RNG(seed),
  scene: new THREE.Scene(),
  player: null,
  started: false,
  paused: false,
  over: false,
  shopOpen: false,
  garageOpen: false,
  _heliWatch: false,
  wantedTimer: 0,
  shootCd: 0,
  tracers: [],
};
window.__game = G;

function makePlayerMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 10), new THREE.MeshLambertMaterial({ color: 0x2a6ad8 }));
  body.position.y = 0.95; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), new THREE.MeshLambertMaterial({ color: 0xd8a888 }));
  head.position.y = 2.05; g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.18, 12), new THREE.MeshLambertMaterial({ color: 0xd8b52e }));
  cap.position.y = 2.3; g.add(cap);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.9), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  gun.position.set(0.45, 1.3, -0.5);
  gun.name = 'gun';
  g.add(gun);
  return g;
}

function freshPlayer() {
  return {
    pos: new THREE.Vector3(28, 0, 60),
    angle: Math.PI * 0.8,
    hp: 100, money: 150, wanted: 0, respect: 0,
    weapon: 'pistol',
    weapons: { pistol: true, smg: false, shotgun: false, rifle: false },
    ammo: { pistol: 48, smg: 0, shotgun: 0, rifle: 0 },
    coins: 0, onFoot: true, car: null, mesh: makePlayerMesh(),
  };
}

G.player = freshPlayer();
G.scene.add(G.player.mesh);

// ---- Systems (order matters: city before world/vehicles) ----
G.input = new Input();
G.audio = new AudioSys();
G.sky = new Sky(G.scene);
G.city = new City(G.scene, G.rng);
G.world = new World(G.scene, G);
G.vehicles = new VehicleSys(G.scene, G);
G.traffic = new Traffic(G.scene, G);
G.police = new Police(G.scene, G);
G.missions = new Missions(G.scene, G);
G.hud = new HUD(G);
G.render = new Render(G);

// ---- Save / load ----
G.save = function () {
  try {
    const p = G.player;
    const data = {
      money: p.money, respect: p.respect, coins: p.coins,
      weapons: p.weapons, ammo: p.ammo, weapon: p.weapon,
      missionIdx: G.missions.idx, missionDone: [...G.missions.done],
      coinsTaken: G.world.coins.map((c) => c.taken),
      pos: [p.pos.x, p.pos.z],
      upgrades: G.vehicles.cars.map((c) => c.upgrades),
    };
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(data));
  } catch { /* storage unavailable — game still runs */ }
};
G.load = function () {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    const p = G.player;
    p.money = d.money ?? 150; p.respect = d.respect ?? 0; p.coins = d.coins ?? 0;
    p.weapons = d.weapons || p.weapons; p.ammo = d.ammo || p.ammo; p.weapon = d.weapon || 'pistol';
    G.missions.idx = d.missionIdx ?? 0;
    G.missions.done = new Set(d.missionDone || []);
    (d.coinsTaken || []).forEach((taken, i) => {
      if (taken && G.world.coins[i]) { G.world.coins[i].taken = true; G.world.coins[i].mesh.visible = false; }
    });
    if (d.pos) { p.pos.x = d.pos[0]; p.pos.z = d.pos[1]; }
    (d.upgrades || []).forEach((u, i) => { if (G.vehicles.cars[i]) G.vehicles.cars[i].upgrades = u; });
    return true;
  } catch { return false; }
};
G.hasSave = function () {
  try { return !!localStorage.getItem(CFG.SAVE_KEY); } catch { return false; }
};

// ---- Flow ----
G.startGame = function (useSave) {
  G.audio.ensure();
  G.audio.radioStart();
  if (useSave) G.load();
  G.started = true;
  G.hud.hideStart();
  G.missions.start();
  G.hud.flash('Welcome to Palmira Bay — follow the gold beam');
};
G.onPlayerDown = function () {
  if (G.over) return;
  G.over = true;
  G.audio.engine(false);
  G.hud.showGameOver();
};
G.respawn = function () {
  const p = G.player;
  p.hp = 100;
  p.money = Math.floor(p.money * 0.9);
  p.wanted = 0;
  p.pos.set(168, 0, -180);
  p.angle = Math.PI;
  if (p.car) { G.vehicles.exit(p); }
  G.over = false;
  G.hud.hideGameOver();
  G.hud.flash('Respawned at the safehouse — $10% hospital bill');
};
G.onShopBuy = function (kind) {
  const p = G.player;
  if (kind === 'ammo') {
    if (p.money < SHOP.ammoPrice) return G.hud.flash('Not enough cash!');
    p.money -= SHOP.ammoPrice;
    p.ammo[p.weapon] = (p.ammo[p.weapon] || 0) + SHOP.ammoAmount;
    G.audio.cash();
    G.hud.flash(`Ammo +${SHOP.ammoAmount} for ${WEAPONS[p.weapon].name}`);
  } else if (kind === 'medkit') {
    if (p.money < SHOP.medkitPrice) return G.hud.flash('Not enough cash!');
    p.money -= SHOP.medkitPrice;
    p.hp = 100;
    G.audio.pickup();
    G.hud.flash('Healed to full');
  } else {
    const price = WEAPONS[kind].price;
    if (p.weapons[kind]) return G.hud.flash(`You already own the ${WEAPONS[kind].name}`);
    if (p.money < price) return G.hud.flash('Not enough cash!');
    p.money -= price;
    p.weapons[kind] = true;
    p.ammo[kind] = kind === 'smg' ? 90 : kind === 'shotgun' ? 24 : 40;
    G.audio.cash();
    G.hud.flash(`${WEAPONS[kind].name} bought! Press ${WEAPON_ORDER.indexOf(kind) + 1} to equip`);
  }
  G.save();
};
G.onGarageBuy = function (id) {
  const p = G.player;
  const up = GARAGE_UPGRADES.find((u) => u.id === id);
  if (!p.car) return G.hud.flash('Drive a car into the garage first!');
  if (p.money < up.price) return G.hud.flash('Not enough cash!');
  p.money -= up.price;
  G.vehicles.applyUpgrade(p.car, id);
  G.audio.cash();
  G.hud.flash(`${up.name} installed!`);
  G.save();
};

// ---- Combat ----
function shoot() {
  const p = G.player;
  if (!p.onFoot || G.shootCd > 0) return;
  const w = WEAPONS[p.weapon];
  if ((p.ammo[p.weapon] || 0) <= 0) {
    G.hud.flash('Out of ammo — buy more at SOLMAR ARMS');
    G.shootCd = 0.3;
    return;
  }
  p.ammo[p.weapon] -= 1;
  G.shootCd = w.rate;
  G.audio.shoot(p.weapon);
  const pellets = w.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const target =
      G.missions.nearestRival(p.pos.x, p.pos.z, p.angle, w.range) ||
      G.police.nearestCop(p.pos.x, p.pos.z, p.angle, w.range) ||
      G.traffic.nearestPed(p.pos.x, p.pos.z, p.angle, w.range);
    if (!target) continue;
    if (target.kind === 'rival') {
      G.missions.damageRival(target.ref, w.dmg);
      if (target.ref.hp <= 0) { p.respect += 10; }
    } else if (target.kind === 'cop') {
      G.police.damageCop(target.ref, w.dmg);
      p.wanted = Math.min(5, p.wanted + 1);
    } else {
      target.hp -= w.dmg;
      target.flee = 3;
      p.wanted = Math.min(5, p.wanted + 1);
    }
    drawTracer(p, target);
  }
  // Muzzle flash: brief scale pulse on the gun.
  const gun = p.mesh.getObjectByName('gun');
  if (gun) gun.scale.set(1.4, 1.4, 1.4);
  setTimeout(() => { if (gun) gun.scale.set(1, 1, 1); }, 60);
}
function drawTracer(p, target) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p.pos.x, 1.4, p.pos.z),
    new THREE.Vector3(target.x, 1.4, target.z),
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffee88 }));
  G.scene.add(line);
  G.tracers.push({ line, ttl: 0.09 });
}

// ---- Interactions ----
function interact() {
  const p = G.player;
  if (G.shopOpen) { G.shopOpen = false; G.hud.showShop(false); return; }
  if (G.garageOpen) { G.garageOpen = false; G.hud.showGarage(false); return; }
  if (!p.onFoot) { interactCar(p); return; }
  if (G.world.nearShop(p.pos)) { G.shopOpen = true; G.hud.showShop(true); G.audio.pickup(); return; }
  const car = G.vehicles.nearestCar(p.pos.x, p.pos.z, 4);
  if (car) { G.vehicles.enter(car, p); return; }
  if (G.world.nearGarage(p.pos)) { G.hud.flash('Drive a car here to open the garage'); return; }
}
function interactCar(p) {
  // E while driving: open the garage when parked inside its zone,
  // otherwise step out of the car.
  if (G.world.nearGarage(p.pos) && Math.abs(p.car.speed) < 0.5) {
    G.garageOpen = true; G.hud.showGarage(true); return;
  }
  G.vehicles.exit(p);
}
function switchWeapon(i) {
  const p = G.player;
  const key = WEAPON_ORDER[i];
  if (!key || !p.weapons[key]) {
    if (key) G.hud.flash(`${WEAPONS[key].name} not owned yet — missions & shop unlock it`);
    return;
  }
  p.weapon = key;
  G.hud.flash(`${WEAPONS[key].name} equipped`);
}

// ---- Main loop ----
const clock = new THREE.Clock();
let saveTimer = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());
  const p = G.player;
  const input = G.input;
  if (G.started && !G.paused && !G.over) {
    // Weapon wheel (hold Q, or forced on by screenshot staging).
    const wheelOpen = input.down('KeyQ') || G._wheelStaged;
    G.hud.showWheel(wheelOpen);
    if (wheelOpen) {
      if (input.hit('Digit1')) switchWeapon(0);
      if (input.hit('Digit2')) switchWeapon(1);
      if (input.hit('Digit3')) switchWeapon(2);
      if (input.hit('Digit4')) switchWeapon(3);
    } else {
      if (input.hit('Digit1')) switchWeapon(0);
      if (input.hit('Digit2')) switchWeapon(1);
      if (input.hit('Digit3')) switchWeapon(2);
      if (input.hit('Digit4')) switchWeapon(3);
    }
    if (input.hit('KeyE')) interact();
    if (input.hit('KeyR')) G.hud.flash(`♪ Radio: ${G.audio.radioNext()}`);
    if (input.hit('KeyP')) { G.paused = !G.paused; G.hud.setPaused(G.paused); }
    if (input.hit('Escape')) {
      if (G.shopOpen) { G.shopOpen = false; G.hud.showShop(false); }
      if (G.garageOpen) { G.garageOpen = false; G.hud.showGarage(false); }
    }
    // On-foot movement.
    if (p.onFoot && !G.shopOpen && !G.garageOpen) {
      const ax = input.axis();
      const run = input.down('ShiftLeft') || input.down('ShiftRight');
      const speed = run ? CFG.PLAYER_RUN : CFG.PLAYER_SPEED;
      if (ax.x || ax.z) {
        const len = Math.hypot(ax.x, ax.z) || 1;
        // Camera-relative: W = away from camera (forward = -angle dir).
        const fx = -Math.sin(p.angle), fz = -Math.cos(p.angle);
        const rx = Math.cos(p.angle), rz = -Math.sin(p.angle);
        const mx = (fx * -ax.z + rx * ax.x) / len;
        const mz = (fz * -ax.z + rz * ax.x) / len;
        const nx = p.pos.x + mx * speed * dt;
        const nz = p.pos.z + mz * speed * dt;
        const hit = G.city.collide(nx, nz, 0.6);
        p.pos.x = hit.x; p.pos.z = hit.z;
        p.angle = Math.atan2(mx, mz) + Math.PI;
        p.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.012)) * 0.08;
      }
      // Shooting.
      G.shootCd -= dt;
      const w = WEAPONS[p.weapon];
      if ((w.auto && input.mouseDown) || input.mousePressed) shoot();
      // Face the camera forward when idle-shooting: keep last move angle.
    }
    if (p.car) {
      // E while driving is handled by interact() above (garage / exit).
    }
    G.vehicles.update(dt, p, input);
    G.traffic.update(dt, p);
    G.police.update(dt, p);
    G.missions.update(dt, p);
    G.world.update(dt, p);
    G.sky.update(dt);
    // Wanted decay: slow while the heli watches.
    G.wantedTimer += dt;
    const decayEvery = G._heliWatch ? 30 : 18;
    if (G.wantedTimer > decayEvery && p.wanted > 0) {
      p.wanted -= 1;
      G.wantedTimer = 0;
    }
    // Tracers fade.
    for (let i = G.tracers.length - 1; i >= 0; i--) {
      const t = G.tracers[i];
      t.ttl -= dt;
      if (t.ttl <= 0) { G.scene.remove(t.line); G.tracers.splice(i, 1); }
    }
    // Autosave every 20 s.
    saveTimer += dt;
    if (saveTimer > 20) { saveTimer = 0; G.save(); }
    // Player mesh sync.
    p.mesh.position.set(p.pos.x, p.onFoot ? p.mesh.position.y : 0, p.pos.z);
    if (p.onFoot) { p.mesh.visible = true; p.mesh.rotation.y = p.angle; }
    else p.mesh.visible = false;
    G.render.update(dt, p);
    G.hud.update(dt, G);
  } else {
    // Idle backdrop behind start / pause / game-over screens.
    G.sky.update(dt);
    G.render.update(dt, p);
    if (!G.started) {
      G.render.camera.position.set(60, 42, 120);
      G.render.camera.lookAt(40, 20, 60);
    }
  }
  G.render.render(G.scene);
  G.input.endFrame();
}

G.hud.showContinue(G.hasSave());
G.sky.setMode('dusk');
G.render.applyMode('dusk');
tick();

// Auto-start for screenshot staging (?shot=...), except the start screen.
if (shot && shot !== 'start') {
  G.startGame(false);
  applyShot(G, shot);
} else if (shot === 'start') {
  window.__shotReady = true;
}
window.__shotReady = window.__shotReady || false;
