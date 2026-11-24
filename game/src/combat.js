// combat.js — combat: four weapons on a wheel, shooting with raycasts,
// tracers and muzzle flashes, enemy enforcers, and player health.
import * as THREE from 'three';
import { clamp, mulberry32, randRange } from './utils.js';
import { WEAPONS } from './config.js';

export function initCombat(G) {
  G.weapons = {
    owned: ['pistol'],
    current: 'pistol',
    ammo: { pistol: Infinity, smg: 0, shotgun: 0, rifle: 0 },
    cooldown: 0,
    wheelOpen: false,
    select(id) {
      if (!this.owned.includes(id)) return false;
      this.current = id;
      G.hud.refresh();
      return true;
    },
    addAmmo(id, n) { this.ammo[id] = (this.ammo[id] || 0) + n; },
  };
  G.enemies = [];
  G.bullets = [];
  G.combat.shotsRecently = 0; // seconds since the last shot: pedestrians flee
}

export function spawnEnemy(G, x, z, opts = {}) {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: opts.color ?? 0x8a2be2 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), shirt);
  torso.position.y = 1.18;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
  head.position.y = 1.8;
  group.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
  for (const sx of [-0.17, 0.17]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.28), legMat);
    leg.position.set(sx, 0.4, 0);
    group.add(leg);
  }
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.42, 0.95, 0.2);
  group.add(gun);
  group.position.set(x, 0, z);
  G.scene.add(group);
  const enemy = {
    mesh: group, health: opts.health ?? 100, speed: opts.speed ?? 3.4,
    shootTimer: randRange(rng, 1, 2.5), isCop: !!opts.isCop,
    kind: opts.kind || 'king', dead: false,
  };
  G.enemies.push(enemy);
  return enemy;
}

export function shoot(G) {
  const w = G.weapons;
  const def = WEAPONS[w.current];
  if (w.cooldown > 0) return;
  if (w.ammo[w.current] <= 0) { G.hud.toast('Out of ammo — visit Dockside Arms (G near the shop).'); G.audio.click(); return; }
  w.cooldown = def.rate;
  if (def.ammo !== Infinity) w.ammo[w.current] -= 1;
  G.combat.shotsRecently = 2.5; // pedestrians nearby will flee
  const p = G.player;
  const origin = p.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  const dir = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
  const pellets = def.pellets || 1;
  let hitAny = false;
  for (let i = 0; i < pellets; i++) {
    const d = dir.clone();
    d.x += (Math.random() - 0.5) * def.spread * 2;
    d.z += (Math.random() - 0.5) * def.spread * 2;
    d.normalize();
    const end = origin.clone().add(d.clone().multiplyScalar(def.range));
    // hit test vs enemies
    for (const e of G.enemies) {
      if (e.dead) continue;
      const ep = e.mesh.position;
      const toE = new THREE.Vector3(ep.x - origin.x, 0, ep.z - origin.z);
      const along = toE.dot(d);
      if (along > 0 && along < def.range) {
        const perp = Math.abs(toE.x * d.z - toE.z * d.x);
        if (perp < 1.4) {
          damageEnemy(G, e, def.damage);
          end.copy(ep).add(new THREE.Vector3(0, 1.2, 0));
          hitAny = true;
          break;
        }
      }
    }
    // hit test vs cop cars / traffic (damage cars)
    if (!hitAny) {
      for (const car of G.cars) {
        if (car.exploded) continue;
        const cp = car.mesh.position;
        const toC = new THREE.Vector3(cp.x - origin.x, 0, cp.z - origin.z);
        const along = toC.dot(d);
        if (along > 0 && along < def.range) {
          const perp = Math.abs(toC.x * d.z - toC.z * d.x);
          if (perp < 2.2) {
            G.vehicles.damageCar(car, def.damage * 0.6);
            end.copy(cp).add(new THREE.Vector3(0, 1, 0));
            break;
          }
        }
      }
    }
    G.effects.tracer(origin, end);
  }
  G.effects.muzzle(origin, dir);
  G.audio.shot(w.current);
  if (w.current !== 'pistol' && G.wanted.level < 2 && Math.random() < 0.5) G.wanted.add(1, 'shots fired');
  G.hud.refresh();
}

export function damageEnemy(G, e, dmg) {
  e.health -= dmg;
  G.effects.hitSpark(e.mesh.position.clone().add(new THREE.Vector3(0, 1.3, 0)));
  if (e.health <= 0 && !e.dead) {
    e.dead = true;
    G.scene.remove(e.mesh);
    G.effects.bloodPuff(e.mesh.position);
    G.player.money += 45;
    G.player.respect += 6;
    G.hud.toast('King enforcer down. +$45 · +6 respect');
    G.hud.refresh();
    if (G.missions.onEnemyKilled) G.missions.onEnemyKilled(e);
  }
}

export function updateCombat(G, dt) {
  const w = G.weapons;
  w.cooldown = Math.max(0, w.cooldown - dt);
  G.combat.shotsRecently = Math.max(0, G.combat.shotsRecently - dt);
  const p = G.player;
  // auto-fire while holding mouse for automatic weapons
  if (G.input.mouseDown && p.onFoot && WEAPONS[w.current].auto) shoot(G);
  // enemies: chase the player and shoot
  for (const e of [...G.enemies]) {
    if (e.dead) continue;
    const ep = e.mesh.position;
    const dx = p.mesh.position.x - ep.x;
    const dz = p.mesh.position.z - ep.z;
    const d = Math.hypot(dx, dz);
    if (d > 90) continue;
    if (d > 2.2) {
      const vx = dx / d, vz = dz / d;
      ep.x += vx * e.speed * dt;
      ep.z += vz * e.speed * dt;
      e.mesh.rotation.y = Math.atan2(vx, vz);
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < 42) {
      e.shootTimer = randRange(Math.random, 1.2, 2.4);
      const from = ep.clone().add(new THREE.Vector3(0, 1.4, 0));
      const to = p.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      G.effects.tracer(from, to, 0xff5040);
      G.audio.enemyShot();
      if (Math.random() < 0.42) {
        p.health -= 7;
        G.hud.refresh();
        if (p.health <= 0) G.main.gameOver('gunned down by the Coral Kings');
      }
    }
  }
  // bullets / tracers fade
  G.effects.update(dt);
}

// Weapon wheel overlay (hold Q, click a slot or press 1-4).
export function openWheel(G) {
  G.weapons.wheelOpen = true;
  document.getElementById('wheel').classList.remove('hidden');
  refreshWheel(G);
}
export function closeWheel(G) {
  G.weapons.wheelOpen = false;
  document.getElementById('wheel').classList.add('hidden');
}
export function refreshWheel(G) {
  for (const slot of document.querySelectorAll('.wheelSlot')) {
    const id = slot.dataset.w;
    const owned = G.weapons.owned.includes(id);
    slot.classList.toggle('locked', !owned);
    slot.classList.toggle('sel', G.weapons.current === id);
    const ammoEl = slot.querySelector('.wa');
    if (ammoEl) ammoEl.textContent = 'AMMO ' + (G.weapons.ammo[id] === Infinity ? '∞' : G.weapons.ammo[id]);
  }
}
