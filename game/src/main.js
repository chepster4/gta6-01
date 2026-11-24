// main.js — SOLMARA bootstrap: renderer, lights, day/night cycle, input,
// the game loop, menus, game-over and the debug hooks the verifier uses.
import * as THREE from 'three';
import { WORLD, DISTRICTS, RACES, GARAGE_POS, SHOP_POS, SAFEHOUSE_POS, START_POS } from './config.js';
import { mulberry32, clamp, randRange } from './utils.js';
import { buildWorld } from './world.js';
import { initPlayer, updatePlayer, updateCamera, tryEnterExitCar } from './player.js';
import { createCar, drivePlayerCar, updateTraffic, spawnTraffic, damageCar, enterCar } from './vehicles.js';
import { initWanted, updatePolice, spawnCop, spawnHeli, forceRoadblock } from './police.js';
import { initCombat, updateCombat, shoot, openWheel, closeWheel, refreshWheel, spawnEnemy, damageEnemy } from './combat.js';
import { initCrew, updateCrew } from './crew.js';
import { initPedestrians, updatePedestrians } from './pedestrians.js';
import { initMissions } from './missions.js';
import { initRaces, startRace, updateRaces, nearestRaceStart } from './races.js';
import { initGarage } from './garage.js';
import { initHud } from './hud.js';
import { initAudio } from './audio.js';
import { initRadio } from './radio.js';
import { initEffects } from './effects.js';
import { initSave } from './save.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8f7);
scene.fog = new THREE.Fog(0x9fc8e8, 320, 1500);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3200);
camera.position.set(START_POS.x, 8, START_POS.z - 12);

const sun = new THREE.DirectionalLight(0xfff2d0, 1.4);
sun.position.set(200, 300, 100);
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xbdd8ff, 0x5a4a35, 0.9);
scene.add(hemi);
// player-car headlights: one spotlight that follows the player's car and
// lights the road ahead (strong at night, off by day).
const headlight = new THREE.SpotLight(0xfff2b0, 0, 60, 0.46, 0.55, 1.0);
const headlightTarget = new THREE.Object3D();
scene.add(headlightTarget);
headlight.target = headlightTarget;
scene.add(headlight);

// ---- the shared game context every module reads ----
const G = {
  scene, camera, renderer,
  time: 0,
  cameraYaw: Math.PI,
  startPos: START_POS,
  config: { DISTRICTS, RACES },
  cars: [],
  enemies: [],
  input: { keys: {}, mouseDown: false, mouseX: 0, mouseY: 0 },
  player: {
    mesh: null, heading: Math.PI, onFoot: true, car: null,
    health: 100, money: 250, respect: 0, nitroFuel: 1, walkPhase: 0,
  },
  paused: false,
  started: false,
  over: false,
  shot: null,
  shotSettleUntil: 0,
};
G.vehicles = {
  createCar: (opts) => createCar(G, opts),
  damageCar: (car, amt) => damageCar(G, car, amt),
  enterCar: (car) => enterCar(G, car),
};
G.combat = {
  spawnEnemy: (x, z, o) => spawnEnemy(G, x, z, o),
  openWheel: () => openWheel(G),
  damageEnemy: (e, dmg) => damageEnemy(G, e, dmg),
};
window.__solmara = G;

// ---- day / night ----
G.dayNight = {
  time: 0.32, // 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
  nightFactor: 0,
  update(dt) {
    this.time = (this.time + dt / 480) % 1;
    const ang = (this.time - 0.25) * Math.PI * 2;
    const el = Math.sin(ang);
    this.nightFactor = clamp(-el * 1.6 + 0.22, 0, 1);
    const az = Math.cos(ang);
    sun.position.set(az * 320, Math.max(20, el * 320), 140);
    sun.intensity = 0.35 + 0.95 * Math.max(0, el);
    sun.color.setHSL(0.09 + 0.03 * Math.max(0, el), 0.55, 0.55 + 0.2 * Math.max(0, el));
    hemi.intensity = 0.5 + 0.5 * Math.max(0, el);
    const day = new THREE.Color(0x7ec8f7);
    const dusk = new THREE.Color(0xff8a4d);
    const night = new THREE.Color(0x0a1024);
    let bg;
    if (el > 0.25) bg = day;
    else if (el > -0.12) bg = dusk.clone().lerp(day, (el + 0.12) / 0.37);
    else bg = night.clone().lerp(dusk, clamp((el + 0.35) / 0.23, 0, 1));
    scene.background.copy(bg);
    scene.fog.color.copy(bg);
  },
};

// ---- build the world and all systems ----
G.world = buildWorld(scene);
initEffects(G);
initAudio(G);
initRadio(G);
initHud(G);
initPlayer(G);
initWanted(G);
G.police.spawnCop = (near) => spawnCop(G, near);
G.police.spawnHeli = () => spawnHeli(G);
G.police.forceRoadblock = (at, heading) => forceRoadblock(G, at, heading);
initCombat(G);
initCrew(G);
initPedestrians(G);
initMissions(G);
initRaces(G);
initGarage(G);
initSave(G);

// parked cars around the island + traffic
const parkRng = mulberry32(4242);
const parkedSpots = [
  [-92, 40, 0], [-92, -60, Math.PI], [0, 120, Math.PI / 2], [92, -140, 0],
  [184, 60, Math.PI], [-184, -40, Math.PI / 2], [276, 140, 0], [-276, 220, Math.PI],
  [0, -276, Math.PI / 2], [368, -60, Math.PI], [-368, 140, 0], [92, 300, Math.PI / 2],
];
for (const [x, z, h] of parkedSpots) createCar(G, { x, z, heading: h, rng: parkRng });
spawnTraffic(G, 12);

// ---- input ----
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON')) return;
  G.input.keys[e.code] = true;
  if (!G.started) return;
  if (e.code === 'KeyE' && !e.repeat) tryEnterExitCar(G);
  if (e.code === 'KeyQ' && !e.repeat) openWheel(G);
  if (e.code === 'KeyR' && !e.repeat) G.radio.next();
  if (e.code === 'KeyG' && !e.repeat) {
    if (G.garage.nearGarage()) G.hud.openGarage();
    else if (G.garage.nearShop()) G.hud.openShop();
    else {
      const race = nearestRaceStart(G, G.player.mesh.position);
      if (race && G.player.car) startRace(G, race.id);
      else G.hud.toast('Garage, shop or race start not nearby. Look for the markers on the minimap.');
    }
  }
  if (e.code === 'KeyM' && !e.repeat) {
    if (G.save.write(1)) G.hud.toast('💾 Game saved.');
  }
  if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) togglePause();
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    const ids = ['pistol', 'smg', 'shotgun', 'rifle'];
    if (ids[n - 1]) { G.weapons.select(ids[n - 1]); refreshWheel(G); }
  }
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  G.input.keys[e.code] = false;
  if (e.code === 'KeyQ') closeWheel(G);
});
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  G.input.mouseDown = true;
  if (G.started && G.player.onFoot && !G.weapons.wheelOpen && !G.paused) shoot(G);
  G.audio.unlock();
});
window.addEventListener('mouseup', (e) => { dragging = false; G.input.mouseDown = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX; lastY = e.clientY;
  G.cameraYaw += dx * 0.005;
});
canvas.addEventListener('click', () => { G.audio.unlock(); });
document.querySelectorAll('.wheelSlot').forEach((slot) => {
  slot.addEventListener('click', () => {
    if (G.weapons.select(slot.dataset.w)) { refreshWheel(G); G.audio.click(); }
  });
});

// ---- menus ----
function togglePause() {
  if (!G.started || G.over) return;
  G.paused = !G.paused;
  if (G.paused) G.hud.openPause();
  else G.hud.closePause();
}
document.getElementById('btnStart').addEventListener('click', () => startGame(false));
document.getElementById('btnContinue').addEventListener('click', () => startGame(true));
document.getElementById('btnResume').addEventListener('click', () => togglePause());
document.getElementById('btnSave').addEventListener('click', () => { if (G.save.write(1)) G.hud.toast('💾 Game saved.'); });
document.getElementById('btnQuit').addEventListener('click', () => location.reload());
document.getElementById('btnGarageClose').addEventListener('click', () => G.hud.closeGarage());
document.getElementById('btnShopClose').addEventListener('click', () => G.hud.closeShop());

function startGame(continueSave) {
  G.audio.unlock();
  G.radio.start();
  document.getElementById('menu').classList.add('hidden');
  G.hud.show();
  G.started = true;
  if (continueSave) {
    const data = G.save.read(1);
    if (data && G.save.apply(data)) {
      G.hud.toast('💾 Save loaded — welcome back to Solmara.');
      G.missions.start(G.missions.index);
    } else {
      G.hud.toast('No save found — starting a fresh story.');
      G.missions.start(0);
    }
  } else {
    G.missions.start(0);
  }
  G.hud.refresh();
}

G.main = {
  gameOver(reason) {
    if (G.over) return;
    G.over = true;
    G.hud.banner('💀 WASTED', reason + ' — the island takes its cut ($100 hospital bill).');
    G.audio.explosion();
    setTimeout(() => {
      G.player.health = 100;
      G.player.money = Math.max(0, G.player.money - 100);
      G.player.mesh.position.set(SAFEHOUSE_POS.x, 0, SAFEHOUSE_POS.z);
      if (G.player.car) { G.player.car = null; }
      G.player.onFoot = true;
      G.player.mesh.visible = true;
      G.wanted.level = 0;
      G.wanted.heat = 0;
      for (const c of [...G.police.cops]) { G.scene.remove(c.mesh); }
      G.police.cops = [];
      if (G.police.heli) { G.scene.remove(G.police.heli.mesh); G.police.heli = null; }
      G.over = false;
      G.hud.refresh();
      G.hud.toast('You wake up at the safehouse. The Kings are still out there.');
    }, 2600);
  },
};

// ---- shot mode (screenshots): auto-start, no menu ----
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
if (shotName) {
  document.getElementById('menu').classList.add('hidden');
  G.started = true;
  G.audio.unlock();
  applyShot(G, shotName);
}

// ---- debug hooks for the verifier (window.__solmara is G) ----
G.debug = {
  startMission(i) { G.missions.start(i); },
  teleport(x, z) {
    if (G.player.car) { G.player.car.mesh.position.set(x, 0, z); }
    G.player.mesh.position.set(x, 0, z);
  },
  giveCash(n) { G.player.money += n; },
  // damage every live enemy (exercises the kill-stage counting path)
  damageEnemies(n) { for (const e of [...G.enemies]) if (!e.dead) G.combat.damageEnemy(e, n); },
  // burn the mission's target cars (exercises the destroy-stage path)
  burnMissionTargets() {
    const t = G.missions.stageData.targets || [];
    for (const c of t) if (!c.exploded) G.vehicles.damageCar(c, 500);
  },
  skipStage() { G.missions.completeStage(); },
  // aim the player at the nearest live enemy (for the live-fire test)
  aimAtNearestEnemy() {
    let best = null, bd = 1e9;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.mesh.position.x - G.player.mesh.position.x, e.mesh.position.z - G.player.mesh.position.z);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    G.player.heading = Math.atan2(best.mesh.position.x - G.player.mesh.position.x, best.mesh.position.z - G.player.mesh.position.z);
    G.cameraYaw = G.player.heading;
    return { health: best.health, dist: bd };
  },
  state() {
    const def = G.missions.current();
    const st = def ? def.stages[G.missions.stage] : null;
    return {
      started: G.started, missionIndex: G.missions.index, stage: G.missions.stage,
      stageType: st ? st.type : null, stageText: st ? st.text : null,
      stageData: { kills: G.missions.stageData.kills, interact: G.missions.stageData.interact, surviveT: G.missions.stageData.surviveT },
      completed: [...G.missions.completed], wanted: G.wanted.level,
      money: G.player.money, respect: G.player.respect, health: G.player.health,
      cars: G.cars.length, traffic: G.cars.filter((c) => c.traffic).length,
      cops: G.police.cops.length, heli: !!G.police.heli,
      pedestrians: G.pedestrians ? G.pedestrians.length : 0,
      enemies: G.enemies.filter((e) => !e.dead).length,
      enemyHealth: G.enemies.filter((e) => !e.dead).map((e) => e.health),
      weapons: [...G.weapons.owned], weapon: G.weapons.current,
      raceActive: !!G.races.active,
      raceGate: G.races.active ? { idx: G.races.active.idx, total: G.races.active.gates.length, gate: { x: G.races.active.gates[G.races.active.idx].x, z: G.races.active.gates[G.races.active.idx].z } } : null,
      upgrades: { ...G.upgrades },
      onFoot: G.player.onFoot, inCar: !!G.player.car,
      radio: G.radio.station.name,
    };
  },
};

// ---- main loop ----
const clock = new THREE.Clock();
let minimapTick = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  G.time += dt;
  if (!G.paused) {
    G.dayNight.update(dt);
    if (G.started && !G.over) {
      updatePlayer(G, dt);
      if (G.player.car) drivePlayerCar(G, dt);
      // staged shots keep the car rolling at a fixed cruise speed
      if (G.shotCruiseSpeed && G.player.car && !G.player.car.exploded) G.player.car.speed = G.shotCruiseSpeed;
      updateTraffic(G, dt);
      updatePolice(G, dt);
      updateCombat(G, dt);
      updateCrew(G, dt);
      updatePedestrians(G, dt);
      G.missions.update(dt);
      updateRaces(G, dt);
      G.wanted.decay(dt);
      // passive health regen out of combat
      if (G.player.health < 100 && G.wanted.level === 0) G.player.health = Math.min(100, G.player.health + dt * 1.5);
    }
    updateCamera(G, dt);
    G.effects.update(dt);
    // headlight follows the player's car
    if (G.player.car && !G.player.car.exploded) {
      const cp = G.player.car.mesh.position;
      headlight.position.set(cp.x, 1.4, cp.z);
      headlightTarget.position.set(cp.x + Math.sin(G.player.car.heading) * 30, 0.5, cp.z + Math.cos(G.player.car.heading) * 30);
      headlight.intensity = 420 * G.dayNight.nightFactor;
    } else {
      headlight.intensity = 0;
    }
    // beacon pulse
    if (G.missions.beacon.visible) {
      G.missions.beacon.rotation.y += dt * 0.8;
      G.missions.ring.scale.setScalar(1 + Math.sin(G.time * 4) * 0.12);
    }
    minimapTick++;
    if (G.started && minimapTick % 2 === 0) {
      G.hud.drawMinimap();
      G.hud.refresh();
    }
  }
  renderer.render(scene, camera);
}
loop();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
