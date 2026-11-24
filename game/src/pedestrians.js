// pedestrians.js — ambient foot traffic: Solmara residents strolling the
// sidewalks, turning at intersections, and fleeing when a car or a gunshot
// gets too close. They make the island feel lived-in between missions.
import * as THREE from 'three';
import { mulberry32, randRange, pick, clamp } from './utils.js';
import { hitsCollider } from './world.js';

const SHIRTS = [0xe8e8e8, 0xff8c42, 0x37b268, 0xff5da2, 0x9fd8ff, 0xffe9a3, 0xc9f2c7, 0xb18cff];

function makeWalkerMesh(color) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), new THREE.MeshLambertMaterial({ color }));
  torso.position.y = 1.1;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
  head.position.y = 1.66;
  g.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2b2b33 });
  for (const sx of [-0.15, 0.15]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.24), legMat);
    leg.position.set(sx, 0.36, 0);
    leg.name = sx < 0 ? 'legL' : 'legR';
    g.add(leg);
  }
  return g;
}

export function initPedestrians(G) {
  const rng = mulberry32(90210);
  G.pedestrians = [];
  for (let i = 0; i < 14; i++) {
    const mesh = makeWalkerMesh(pick(rng, SHIRTS));
    // start on a sidewalk next to a road
    const line = Math.floor(randRange(rng, -4, 5)) * 92;
    const along = randRange(rng, -380, 380);
    const x = rng() < 0.5 ? line + 11 : along;
    const z = rng() < 0.5 ? along : line + 11;
    mesh.position.set(clamp(x, -440, 440), 0, clamp(z, -440, 440));
    G.scene.add(mesh);
    G.pedestrians.push({
      mesh,
      heading: rng() * Math.PI * 2,
      speed: randRange(rng, 1.4, 2.6),
      walkPhase: rng() * 6,
      fleeTimer: 0,
      turnTimer: randRange(rng, 4, 10),
    });
  }
}

export function updatePedestrians(G, dt) {
  const pp = G.player.mesh.position;
  const pSpeed = G.player.car ? Math.abs(G.player.car.speed) : 0;
  for (const w of G.pedestrians) {
    const wp = w.mesh.position;
    const dPlayer = Math.hypot(pp.x - wp.x, pp.z - wp.z);
    // flee: player (or a fast car) close by, or a recent gunshot
    if ((dPlayer < 9 && (pSpeed > 6 || G.player.onFoot)) || (dPlayer < 14 && G.combat.shotsRecently > 0)) {
      w.fleeTimer = 2;
    }
    let speed = w.speed;
    if (w.fleeTimer > 0) {
      w.fleeTimer -= dt;
      speed = 5.5;
      // run directly away from the player
      w.heading = Math.atan2(wp.x - pp.x, wp.z - pp.z);
    } else {
      w.turnTimer -= dt;
      if (w.turnTimer <= 0) {
        w.turnTimer = randRange(Math.random, 4, 10);
        w.heading += (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 2);
      }
    }
    const nx = wp.x + Math.sin(w.heading) * speed * dt;
    const nz = wp.z + Math.cos(w.heading) * speed * dt;
    if (hitsCollider(G.world.colliders, nx, nz, 0.5) || Math.abs(nx) > 445 || Math.abs(nz) > 445) {
      w.heading += Math.PI / 2;
    } else {
      wp.x = nx;
      wp.z = nz;
    }
    w.mesh.rotation.y = w.heading;
    w.walkPhase += dt * speed * 2.2;
    const swing = Math.sin(w.walkPhase) * 0.5;
    const legL = w.mesh.getObjectByName('legL');
    const legR = w.mesh.getObjectByName('legR');
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
  }
}
