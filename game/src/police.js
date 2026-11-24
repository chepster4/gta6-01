// police.js — the Solmara Bay Police Department (SBPD): wanted stars,
// dispatch, cop-car pursuit with PIT behaviour, roadblocks at wanted >= 3,
// and the CONDOR-2 helicopter with a night searchlight.
import * as THREE from 'three';
import { clamp, lerp, mulberry32, randRange } from './utils.js';
import { createCar } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

export function initWanted(G) {
  G.wanted = {
    level: 0,
    heat: 0,          // 0..100, decays when unseen
    timer: 0,
    add(n, reason) {
      const before = this.level;
      this.level = clamp(this.level + n, 0, 5);
      this.heat = 100;
      if (this.level > before) {
        G.hud.toast(`★ WANTED LEVEL ${this.level} — ${reason || 'SBPD dispatched'}`);
        G.audio.siren(this.level >= 1);
      }
      G.hud.refresh();
    },
    decay(dt) {
      if (this.level === 0) return;
      // "Hidden" means no cop close by and no heli overhead — a cop two
      // blocks away does not keep the heat up. This is what makes losing
      // the cops possible: break 120m of distance and the stars fall.
      const pp = G.player.car ? G.player.car.mesh.position : G.player.mesh.position;
      const nearCop = G.police.cops.some((c) => Math.hypot(c.mesh.position.x - pp.x, c.mesh.position.z - pp.z) < 120);
      const hidden = !nearCop && !G.police.heli;
      this.heat -= dt * (hidden ? 9 : 1.5);
      if (this.heat <= 0) {
        this.level = Math.max(0, this.level - 1);
        this.heat = this.level > 0 ? 60 : 0;
        if (this.level === 0) { G.hud.toast('You lost the cops. Lay low.'); G.audio.siren(false); }
        G.hud.refresh();
      }
    },
  };
  G.police = { cops: [], heli: null, roadblocks: [], spawnTimer: 0, roadblockTimer: 0 };
}

export function makeHeliMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 5.2), bodyMat);
  body.position.y = 0;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 2.0), new THREE.MeshLambertMaterial({ color: 0x9fd8ff }));
  cabin.position.set(0, 0.2, 1.6);
  g.add(cabin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.2), bodyMat);
  tail.position.set(0, 0.3, -4.2);
  g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.12, 0.55), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 1.15;
  rotor.name = 'rotor';
  g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  tailRotor.position.set(0.45, 0.4, -6.0);
  tailRotor.name = 'tailRotor';
  g.add(tailRotor);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.3, 5.25), new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  stripe.position.y = -0.4;
  g.add(stripe);
  // searchlight: visible cone + spotlight
  const coneGeo = new THREE.ConeGeometry(4.5, 26, 20, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = -13.5;
  cone.name = 'beam';
  g.add(cone);
  const spot = new THREE.SpotLight(0xfff2b0, 0, 70, 0.32, 0.5, 1.2);
  spot.position.set(0, -0.8, 0);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -30, 0);
  g.add(spotTarget);
  spot.target = spotTarget;
  g.add(spot);
  g.userData.spot = spot;
  g.userData.cone = cone;
  return g;
}

export function spawnCop(G, near) {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  // Dispatch from a distance (90-150m out on the road grid) so the player
  // can actually break line of sight and lose the cops — spawning on top
  // of the player made "lose the heat" unwinnable.
  const ang = rng() * Math.PI * 2;
  const dist = randRange(rng, 90, 150);
  const p = nearestRoadPoint(near.x + Math.cos(ang) * dist, near.z + Math.sin(ang) * dist);
  const car = createCar(G, { x: p.x, z: p.z, isCop: true, driver: 'cop', maxSpeed: 40, rng });
  car.name = 'SBPD Interceptor';
  G.police.cops.push(car);
  return car;
}

export function spawnHeli(G) {
  if (G.police.heli) return G.police.heli;
  const mesh = makeHeliMesh();
  const pp = G.player.mesh.position;
  mesh.position.set(pp.x, 42, pp.z); // starts above the player, then moves to its hover point
  G.scene.add(mesh);
  const heli = { mesh, rotorSpin: 0, bobPhase: 0 };
  G.police.heli = heli;
  G.hud.toast('🚁 CONDOR-2 air unit on station — the searchlight is on you!');
  G.audio.heli(true);
  return heli;
}

export function removeHeli(G) {
  if (!G.police.heli) return;
  G.scene.remove(G.police.heli.mesh);
  G.police.heli = null;
  G.audio.heli(false);
}

function makeRoadblock(G, at, heading) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const stripe = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = -1; i <= 1; i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.4, 4.4), mat);
    car.position.set(i * 5.4, 0.7, 0);
    group.add(car);
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 4.42), stripe);
    s.position.set(i * 5.4, 0.9, 0);
    group.add(s);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xff4040 }));
    bar.position.set(i * 5.4, 1.5, 0);
    group.add(bar);
  }
  for (let i = -2; i <= 2; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), new THREE.MeshLambertMaterial({ color: 0xff6a00 }));
    cone.position.set(i * 3.4, 0.55, 3.4);
    group.add(cone);
  }
  group.position.set(at.x, 0, at.z);
  group.rotation.y = heading;
  G.scene.add(group);
  const rb = { group, x: at.x, z: at.z, ttl: 45 };
  G.police.roadblocks.push(rb);
  return rb;
}

export function forceRoadblock(G, at, heading) {
  const spot = nearestRoadPoint(at.x, at.z);
  const rb = makeRoadblock(G, spot, heading);
  return rb;
}

export function updatePolice(G, dt) {
  const w = G.wanted.level;
  const pol = G.police;
  const pp = G.player.car ? G.player.car.mesh.position : G.player.mesh.position;
  const pSpeed = G.player.car ? Math.abs(G.player.car.speed) : 0;

  // --- dispatch: cop count scales with wanted level ---
  const wantCops = w === 0 ? 0 : w === 1 ? 1 : w === 2 ? 2 : w === 3 ? 3 : w === 4 ? 4 : 5;
  pol.spawnTimer -= dt;
  if (pol.cops.length < wantCops && pol.spawnTimer <= 0) {
    spawnCop(G, pp);
    pol.spawnTimer = 2.5;
  }
  if (w === 0 && pol.cops.length > 0) {
    // cops give up and drive off
    for (const c of pol.cops) { c.driver = 'traffic'; c.isCop = false; }
    pol.cops = [];
  }

  // --- cop pursuit ---
  for (const cop of [...pol.cops]) {
    if (cop.exploded) { pol.cops.splice(pol.cops.indexOf(cop), 1); continue; }
    // staged cops (screenshot roadblock) hold position, lightbar flashing
    const bar0 = cop.mesh.getObjectByName('lightbar');
    if (bar0) bar0.material.color.setHex(Math.floor(G.time * 6) % 2 === 0 ? 0xff2020 : 0x2040ff);
    if (cop.staged) continue;
    const dx = pp.x - cop.mesh.position.x;
    const dz = pp.z - cop.mesh.position.z;
    const d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = want - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.heading += clamp(diff, -2.2 * dt, 2.2 * dt);
    const targetSpeed = d > 60 ? 38 : d > 12 ? 30 : 18;
    cop.speed = lerp(cop.speed, targetSpeed, dt * 0.8);
    cop.mesh.position.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.mesh.position.z += Math.cos(cop.heading) * cop.speed * dt;
    cop.mesh.rotation.y = cop.heading;
    // PIT / ram: bump the player car and damage it
    if (d < 4.5 && G.player.car && !G.player.car.exploded) {
      G.vehicles.damageCar(G.player.car, 6 * dt);
      G.player.car.speed *= (1 - 0.4 * dt);
    }
    // lightbar flash
    for (const wh of cop.mesh.userData.wheels) wh.rotation.x += cop.speed * dt * 2.4;
    if (d > 260) { // too far: despawn
      G.scene.remove(cop.mesh);
      pol.cops.splice(pol.cops.indexOf(cop), 1);
    }
  }

  // --- helicopter at wanted >= 3 ---
  if (w >= 3 && !pol.heli) spawnHeli(G);
  if (w < 3 && pol.heli) removeHeli(G);
  if (pol.heli) {
    const h = pol.heli;
    h.rotorSpin += dt * 22;
    h.bobPhase += dt;
    const rotor = h.mesh.getObjectByName('rotor');
    if (rotor) rotor.rotation.y = h.rotorSpin;
    const tailRotor = h.mesh.getObjectByName('tailRotor');
    if (tailRotor) tailRotor.rotation.x = h.rotorSpin * 1.7;
    // Hover: normally above and slightly ahead of the player; in the
    // heli screenshot staging it sits lower and closer ahead so the
    // camera (behind the car) sees the heli body and its searchlight beam.
    const ahead = G.shot === 'heli' ? 16 : 6;
    const height = G.shot === 'heli' ? 11 : 40;
    const tx = pp.x + Math.sin(G.player.heading || 0) * ahead;
    const tz = pp.z + Math.cos(G.player.heading || 0) * ahead;
    h.mesh.position.x = lerp(h.mesh.position.x, tx, dt * 0.9);
    h.mesh.position.z = lerp(h.mesh.position.z, tz, dt * 0.9);
    h.mesh.position.y = height + Math.sin(h.bobPhase * 1.4) * 2.5;
    h.mesh.rotation.y = Math.atan2(pp.x - h.mesh.position.x, pp.z - h.mesh.position.z);
    // searchlight: bright at night, dimmer by day, always tracks the player
    const night = G.dayNight.nightFactor;
    const spot = h.mesh.userData.spot;
    spot.intensity = lerp(60, 900, night);
    h.mesh.userData.cone.material.opacity = lerp(0.05, 0.22, night);
    spot.target.position.set(pp.x - h.mesh.position.x, -40, pp.z - h.mesh.position.z);
    // heli keeps the heat up while it watches you
    G.wanted.heat = Math.max(G.wanted.heat, 55);
  }

  // --- roadblocks at wanted >= 3, ahead on the player's road ---
  pol.roadblockTimer -= dt;
  if (w >= 3 && pol.roadblockTimer <= 0 && pol.roadblocks.length < 2) {
    const ahead = pSpeed > 4 && G.player.car
      ? { x: pp.x + Math.sin(G.player.car.heading) * 70, z: pp.z + Math.cos(G.player.car.heading) * 70 }
      : { x: pp.x + 55, z: pp.z };
    const spot = nearestRoadPoint(ahead.x, ahead.z);
    makeRoadblock(G, spot, G.player.car ? G.player.car.heading : 0);
    G.hud.toast('🚧 ROADBLOCK ahead! SBPD has the road sealed.');
    pol.roadblockTimer = 26;
  }
  for (const rb of [...pol.roadblocks]) {
    rb.ttl -= dt;
    if (rb.ttl <= 0) { G.scene.remove(rb.group); pol.roadblocks.splice(pol.roadblocks.indexOf(rb), 1); continue; }
    // ramming the roadblock damages the player car hard
    if (G.player.car && !G.player.car.exploded) {
      const d = Math.hypot(G.player.car.mesh.position.x - rb.x, G.player.car.mesh.position.z - rb.z);
      if (d < 6 && Math.abs(G.player.car.speed) > 6) {
        G.vehicles.damageCar(G.player.car, 45);
        G.player.car.speed *= -0.3;
        G.hud.toast('You smashed through a roadblock!');
      }
    }
  }
}
