// races.js — three street-race routes with checkpoint gates, a live timer,
// position tracking and cash + respect prizes. Races start from the
// neon start gantry in each district and can also be run from missions.
import * as THREE from 'three';
import { RACES } from './config.js';
import { fmtTime } from './utils.js';

export function initRaces(G) {
  G.races = {
    active: null, best: {}, markers: [],
    startRace: (raceId, fromMission) => startRace(G, raceId, fromMission),
  };
  // start gantries: floating chequered arches at each route's first checkpoint
  for (const r of RACES) {
    const [x, z] = r.checkpoints[0];
    const gantry = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffd23e });
    for (const sx of [-5, 5]) {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.8), mat);
      pole.position.set(sx, 3.5, 0);
      gantry.add(pole);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(11, 1.1, 0.8), new THREE.MeshLambertMaterial({ color: 0x141414 }));
    bar.position.y = 6.8;
    gantry.add(bar);
    gantry.position.set(x, 0, z);
    G.scene.add(gantry);
  }
}

function makeGate(G, x, z) {
  const geo = new THREE.CylinderGeometry(5, 5, 0.4, 24);
  const mat = new THREE.MeshBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.55 });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, 0.3, z);
  G.scene.add(m);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 1.2, z);
  G.scene.add(ring);
  return { disc: m, ring, x, z };
}

export function startRace(G, raceId, fromMission = false) {
  const def = RACES.find((r) => r.id === raceId);
  if (!def) return false;
  if (G.races.active) return false;
  if (!G.player.car) {
    G.hud.toast('You need a car to race — steal one first (E).');
    return false;
  }
  clearRaceMarkers(G);
  const gates = def.checkpoints.map(([x, z]) => makeGate(G, x, z));
  G.races.active = { def, gates, idx: 0, time: 0, fromMission, finished: false };
  G.hud.banner(def.name.toUpperCase(), 'Hit every gate in order — beat ' + fmtTime(def.par) + ' for the full prize!');
  G.hud.showRaceTimer(true);
  document.getElementById('racepos').classList.remove('hidden');
  document.getElementById('racepos').textContent = 'GATE 1 / ' + def.checkpoints.length;
  G.missions.raceObjective(def);
  return true;
}

export function updateRaces(G, dt) {
  const r = G.races.active;
  if (!r || r.finished) return;
  r.time += dt;
  const carPos = G.player.car ? G.player.car.mesh.position : G.player.mesh.position;
  const gate = r.gates[r.idx];
  const d = Math.hypot(carPos.x - gate.x, carPos.z - gate.z);
  if (d < 7) {
    G.scene.remove(gate.disc);
    G.scene.remove(gate.ring);
    G.audio.checkpoint();
    r.idx++;
    if (r.idx >= r.gates.length) return finishRace(G, r);
    document.getElementById('racepos').textContent = 'GATE ' + (r.idx + 1) + ' / ' + r.gates.length;
    G.hud.toast('Gate ' + r.idx + ' — ' + (r.gates.length - r.idx) + ' to go!');
  }
  // live timer + distance to next gate
  const timerEl = document.getElementById('racetimer');
  timerEl.textContent = fmtTime(r.time) + '  ·  ' + Math.round(d) + 'm';
}

function finishRace(G, r) {
  r.finished = true;
  G.races.active = null;
  G.hud.showRaceTimer(false);
  document.getElementById('racepos').classList.add('hidden');
  const underPar = r.time <= r.def.par;
  const prize = underPar ? r.def.prize : Math.round(r.def.prize * 0.4);
  G.player.money += prize;
  G.player.respect += underPar ? 60 : 25;
  const prev = G.races.best[r.def.id];
  if (!prev || r.time < prev) G.races.best[r.def.id] = r.time;
  G.hud.banner('🏁 ' + r.def.name.toUpperCase() + ' — ' + fmtTime(r.time), underPar ? `Under par! +$${prize} · +60 respect` : `Finished. +$${prize} · +25 respect (par ${fmtTime(r.def.par)})`);
  G.audio.raceWin();
  G.hud.refresh();
  if (r.fromMission && G.missions.onRaceFinished) G.missions.onRaceFinished(r.def.id, r.time, underPar);
  clearRaceMarkers(G);
}

export function clearRaceMarkers(G) {
  for (const g of G.races.markers) { G.scene.remove(g); }
  G.races.markers = [];
  if (G.races.active) {
    for (const gate of G.races.active.gates) { G.scene.remove(gate.disc); G.scene.remove(gate.ring); }
    G.races.active = null;
  }
  G.hud.showRaceTimer(false);
  document.getElementById('racepos').classList.add('hidden');
}

// Nearest race start to the player (for the "start race" prompt).
export function nearestRaceStart(G, pos) {
  let best = null, bd = 26;
  for (const r of RACES) {
    const [x, z] = r.checkpoints[0];
    const d = Math.hypot(pos.x - x, pos.z - z);
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}
