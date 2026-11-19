// Palmira Bay — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// The game moves between four screens: start, play, paused and game over.
// ?seed=N fixes the city. ?shot=chase|walk|mission|night (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import * as THREE from '../vendor/three.min.js';
import { CLOCK_START, STEP } from './config.js';
import { createRandom } from './random.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RADIO, createInput } from './input.js';
import { createSky } from './sky.js';
import { createCity } from './city.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createWorld } from './world.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa8d0e8, 320, 850);

const sky = createSky(scene);
const city = createCity(scene, seed);
const traffic = createTraffic(scene, seed, (x, z, r) => city.collideCircle(x, z, r));
const police = createPolice(scene, (x, z, r) => city.collideCircle(x, z, r));
const missions = createMissions(scene);
const audio = createAudio();
const hud = createHud();
const world = createWorld({ scene, city, police, missions, audio, hud });
const renderer = createRenderer(canvas);

// Shared game state the shots module stages and the loop reads.
const G = {
  clockMinutes: CLOCK_START,
  world, missions, police, hud, sky, city, traffic, audio,
};

const input = createInput();

function refreshHud() {
  const player = world.player;
  hud.setMoney(player.money);
  hud.setCoins(player.coins);
  hud.setHp(player.hp);
  hud.setClock(G.clockMinutes);
  hud.setRadio(audio.stationName);
  hud.setWanted(police.wanted);
  if (missions.allDone) {
    hud.setJob('KING OF PALMIRA', 'All jobs done — Palmira Bay is yours', null);
  } else {
    const t = missions.target();
    const dist = Math.hypot(player.x - t.x, player.z - t.z);
    hud.setJob(`JOB ${missions.current.id} — ${missions.current.title}`, missions.brief(), dist);
  }
  const speedKmh = player.inCar ? Math.abs(player.inCar.state.speed) * 3.6 : 0;
  const vehicle = player.inCar ? player.inCar.name : 'ON FOOT';
  const weapon = player.hasPistol ? `🔫 PISTOL ${player.ammo} rds` : 'FISTS — finish Job 1 for a pistol';
  hud.setSpeed(speedKmh, vehicle, weapon);
  hud.drawMinimap({
    colliders: city.colliders,
    coins: world.coins,
    target: missions.allDone ? null : missions.target(),
    police: police.cruisers.map((c) => ({ x: c.state.x, z: c.state.z })),
    playerX: player.x,
    playerZ: player.z,
    heading: player.heading,
  });
}

function runShot(name) {
  hud.hideStart(); // shots are the game itself, never the title screen
  hud.showPause(false);
  hud.showOver(false);
  const staged = stageShot(name, G);
  refreshHud();
  city.setNightLights(sky.mode === 'night');
  let painted = 0;
  function paint() {
    renderer.place(...staged.cam);
    renderer.render(scene);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = 'start';
  let accumulator = 0;
  let last = performance.now();
  let hadSave = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.load(); // no-op when there is no save yet
    hud.hideStart();
    hud.showPause(false);
    screen = 'play';
    audio.unlock();
    announce('Playing. Steal a car for Rosa — job 1.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      hud.toast(muted ? 'Sound muted' : 'Sound on');
    }
    if (actions & ACTION_RADIO) {
      hud.setRadio(audio.nextStation());
    }
    if (screen === 'start') {
      if (actions & ACTION_CONFIRM) startGame();
      // Idle camera: slow orbit over the plaza behind the start screen.
      const t = now / 1000;
      renderer.place(Math.sin(t * 0.05) * 90, 42, Math.cos(t * 0.05) * 90, 0, 4, 0);
      renderer.render(scene);
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === 'play') {
        screen = 'paused';
        hud.showPause(true);
        announce('Paused.');
      } else if (screen === 'paused') {
        screen = 'play';
        hud.showPause(false);
        announce('Playing.');
      }
    }
    if (screen === 'paused' || world.shopOpen) {
      renderer.follow(world.player.x, world.player.z, world.player.heading, !!world.player.inCar, 0.016, false);
      renderer.render(scene);
      return;
    }
    if (screen === 'over') {
      if (actions & ACTION_CONFIRM) {
        world.respawn();
        screen = 'play';
      }
      renderer.render(scene);
      return;
    }
    // Play: fixed steps, catching up (capped) when a frame ran long, so the
    // simulation keeps real time on a 60 Hz display and degrades gracefully
    // on a slow one. One-shot actions go to the first step only, so a single
    // press can never steal a car and exit it in the same frame.
    let steps = 0;
    while (accumulator >= STEP && steps < 10) {
      world.update(STEP, input, steps === 0 ? actions : 0);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 10) accumulator = 0;
    const simDt = steps * STEP;
    G.clockMinutes = (G.clockMinutes + simDt) % 1440;
    sky.setTime(G.clockMinutes);
    sky.update(simDt, world.player.x, world.player.z);
    city.setNightLights(sky.mode === 'night');
    traffic.update(simDt, world.player.x, world.player.z, world.player.inCar ? Math.abs(world.player.inCar.state.speed) : 0);
    police.update(simDt, world.player, !!world.player.inCar, world.player.inCar ? Math.abs(world.player.inCar.state.speed) : 0);
    if (world.player.dead) {
      screen = 'over';
    }
    refreshHud();
    renderer.follow(world.player.x, world.player.z, world.player.heading, !!world.player.inCar, simDt || STEP, false);
    renderer.render(scene);
  }

  // Start screen copy (with a continue line when a save exists).
  try {
    const raw = window.localStorage.getItem('palmira-bay.save.v1');
    if (raw) {
      const data = JSON.parse(raw);
      hadSave = true;
      document.getElementById('start-sub').textContent =
        `Continue — $${data.money ?? 120} banked, Job ${(data.mission ?? 0) + 1} of 5. Press Enter or click to play.`;
    }
  } catch { /* no save */ }
  hud.showStart();
  announce('Palmira Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

// Debug hook for local verification (mission/coin/shop probes in Playwright).
window.__palmira = {
  world, missions, police, traffic, city, sky, audio, hud, G,
  version: 'record5',
};

if (shot) runShot(shot);
else runGame();
