// crew.js — Dario's crew: Maya "Wrench" Okafor (mechanic) and Leo "Ghost"
// Ferreira (lookout). They follow you on crew missions and their abilities
// change the game: Maya repairs your car, Leo cools your wanted level.
import * as THREE from 'three';
import { clamp } from './utils.js';

function makeCrewMesh(shirtColor, skinColor) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.76, 0.33), new THREE.MeshLambertMaterial({ color: shirtColor }));
  torso.position.y = 1.16;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), new THREE.MeshLambertMaterial({ color: skinColor }));
  head.position.y = 1.78;
  g.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x22242c });
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.78, 0.27), legMat);
    leg.position.set(sx, 0.39, 0);
    leg.name = sx < 0 ? 'legL' : 'legR';
    g.add(leg);
  }
  return g;
}

export function initCrew(G) {
  const maya = { name: 'Maya “Wrench” Okafor', role: 'Mechanic — repairs your car in the field', active: false, mesh: makeCrewMesh(0x19e3ff, 0x8a5a3b), followDist: 3.5, repairTimer: 0 };
  const leo = { name: 'Leo “Ghost” Ferreira', role: 'Lookout — wanted level cools down faster', active: false, mesh: makeCrewMesh(0x7dff9b, 0xd9a066), followDist: 5, cooldownBoost: true };
  for (const c of [maya, leo]) {
    c.mesh.visible = false;
    c.mesh.position.set(G.startPos.x + 4, 0, G.startPos.z + 4);
    G.scene.add(c.mesh);
  }
  G.crew = {
    maya, leo,
    activateCrew: (who) => activateCrew(G, who),
  };
}

export function activateCrew(G, who) {
  const c = G.crew[who];
  if (!c || c.active) return;
  c.active = true;
  c.mesh.visible = true;
  c.mesh.position.copy(G.player.mesh.position).add(new THREE.Vector3(3, 0, 3));
  G.hud.toast(`🤝 ${c.name} joined the crew — ${c.role}`);
}

export function updateCrew(G, dt) {
  for (const key of ['maya', 'leo']) {
    const c = G.crew[key];
    if (!c.active) continue;
    const p = G.player.mesh.position;
    const cp = c.mesh.position;
    const d = Math.hypot(p.x - cp.x, p.z - cp.z);
    if (d > c.followDist) {
      const vx = (p.x - cp.x) / d, vz = (p.z - cp.z) / d;
      const speed = Math.min(11, 4 + d * 0.9);
      cp.x += vx * speed * dt;
      cp.z += vz * speed * dt;
      c.mesh.rotation.y = Math.atan2(vx, vz);
      c.walkPhase = (c.walkPhase || 0) + dt * speed * 1.6;
      const swing = Math.sin(c.walkPhase) * 0.5;
      const legL = c.mesh.getObjectByName('legL');
      const legR = c.mesh.getObjectByName('legR');
      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
    }
    // Maya repairs the player's car when nearby
    if (key === 'maya' && G.player.car && !G.player.car.exploded) {
      c.repairTimer -= dt;
      if (c.repairTimer <= 0 && G.player.car.health < G.player.car.maxHealth) {
        G.player.car.health = Math.min(G.player.car.maxHealth, G.player.car.health + 6);
        c.repairTimer = 2;
        if (G.player.car.burning && G.player.car.health > 45) G.player.car.burning = false;
      }
    }
  }
  // Leo's ability: wanted heat decays twice as fast
  if (G.crew.leo.active && G.wanted.level > 0) {
    G.wanted.heat -= 4.5 * dt;
  }
}
