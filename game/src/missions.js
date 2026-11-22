// Story missions 1–10 + crew AI + street races (3 routes, timer,
// checkpoints, cash prize). The mission marker is a golden beacon
// column visible across the city; the HUD arrow points at it.
const THREE = window.THREE;
import { MISSIONS, RACES, CREW } from './config.js';

export class Missions {
  constructor(scene, G) {
    this.scene = scene; this.G = G;
    this.idx = 0;                 // current mission (0-based)
    this.done = new Set();
    this.stage = 0;
    this.stageTimer = 0;
    this.rivals = [];
    this.crew = [];
    this.race = null;
    this.marker = this._makeMarker();
    this.raceRings = [];
    this.picked = false;
    this._placeMarker();
  }
  _makeMarker() {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffcc22, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 30; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffcc22, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; g.add(ring);
    this.scene.add(g);
    return g;
  }
  current() { return MISSIONS[this.idx] || null; }
  _placeMarker() {
    const m = this.current();
    if (!m) { this.marker.visible = false; return; }
    this.marker.visible = true;
    this.marker.position.set(m.target[0], 0, m.target[1]);
  }
  start() {
    const m = this.current();
    if (!m) return;
    this.stage = 0; this.stageTimer = 0; this.picked = false;
    this._clearRivals();
    this._placeMarker();
    this.G.hud.banner(`MISSION ${m.id} — ${m.title}`, m.brief);
    if (m.type === 'kill') this._spawnRivals(m.target, m.id === 10 ? 5 : m.id === 8 ? 4 : 3);
    if (m.id === 3) this.G.player.wanted = Math.max(this.G.player.wanted, 2);
    if (m.id === 6) this.G.hud.flash('Steal a fast car first — then hit the bank!');
    if (m.type === 'race') this._startRace(m.id === 9 ? 2 : 1);
    if ([6, 8, 9, 10].includes(m.id)) this._spawnCrew();
    else this._clearCrew();
  }
  _spawnRivals([tx, tz], n) {
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.6, 8), new THREE.MeshLambertMaterial({ color: 0xc22a2a }));
      body.position.y = 1.0; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd8a888 }));
      head.position.y = 2.1; g.add(head);
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.9), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      gun.position.set(0.4, 1.3, -0.5); g.add(gun);
      const x = tx + (Math.random() - 0.5) * 18, z = tz + (Math.random() - 0.5) * 18;
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.rivals.push({ mesh: g, x, z, hp: 60, shootCd: 0 });
    }
  }
  _clearRivals() {
    for (const r of this.rivals) this.scene.remove(r.mesh);
    this.rivals = [];
  }
  _spawnCrew() {
    this._clearCrew();
    CREW.forEach((c, i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 8), new THREE.MeshLambertMaterial({ color: c.color }));
      body.position.y = 0.95; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd8a888 }));
      head.position.y = 2.0; g.add(head);
      const p = this.G.player.pos;
      g.position.set(p.x + 3 + i * 2, 0, p.z + 3);
      this.scene.add(g);
      this.crew.push({ mesh: g, name: c.name, x: p.x + 3 + i * 2, z: p.z + 3, hp: c.hp, shootCd: 0 });
    });
    this.G.hud.flash('Crew with you: Marcus & Lena — they watch your back');
  }
  _clearCrew() {
    for (const c of this.crew) this.scene.remove(c.mesh);
    this.crew = [];
  }
  _startRace(routeIdx) {
    const route = RACES[routeIdx - 1];
    this.race = { route, cp: 0, time: 0 };
    this._clearRings();
    route.points.forEach(([x, z], i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.5, 0.45, 8, 24),
        new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffcc22 : 0x33ccff })
      );
      ring.position.set(x, 2.2, z);
      ring.rotation.y = Math.PI / 2;
      this.scene.add(ring);
      this.raceRings.push(ring);
    });
    this.G.hud.flash(`RACE: ${route.name} — par ${route.par}s, prize $${route.reward}`);
  }
  _clearRings() {
    for (const r of this.raceRings) this.scene.remove(r);
    this.raceRings = [];
  }
  _complete() {
    const m = this.current();
    if (!m) return;
    const p = this.G.player;
    p.money += m.reward;
    p.respect += m.respect;
    this.done.add(m.id);
    this.G.audio.missionDone();
    this.G.audio.cash();
    this.G.hud.banner('MISSION COMPLETE', `+ $${m.reward}   + ${m.respect} respect`);
    if (m.id === 1) { p.weapons.pistol = true; p.ammo.pistol = 60; this.G.hud.flash('Pistol acquired! Press 1–4 to switch weapons'); }
    if (m.id === 2) { p.weapons.smg = true; p.ammo.smg = 90; this.G.hud.flash('SMG unlocked — buy ammo at SOLMAR ARMS'); }
    if (m.id === 4) { p.weapons.shotgun = true; p.ammo.shotgun = 24; this.G.hud.flash('Shotgun unlocked!'); }
    if (m.id === 6) { p.weapons.rifle = true; p.ammo.rifle = 40; this.G.hud.flash('Rifle unlocked — respect pays'); }
    this._clearRivals();
    this._clearRings();
    this.race = null;
    this.idx += 1;
    if (this.current()) this.start();
    else {
      this.marker.visible = false;
      this._clearCrew();
      this.G.hud.banner('KING OF PALMIRA', 'All 10 missions complete. The city is yours.');
    }
    this.G.save();
  }
  _failRace(reason) {
    this.G.hud.banner('RACE FAILED', reason);
    this.race = null;
    this._clearRings();
    this._placeMarker();
  }
  nearestRival(px, pz, angle, range) {
    let best = null, bd = range * range;
    for (const r of this.rivals) {
      if (r.hp <= 0) continue;
      const dx = r.x - px, dz = r.z - pz;
      const d = dx * dx + dz * dz;
      if (d > bd) continue;
      const facing = Math.atan2(dx, dz);
      let da = Math.abs(facing - angle);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < 0.4) { bd = d; best = { kind: 'rival', ref: r, x: r.x, z: r.z, hp: r.hp }; }
    }
    return best;
  }
  damageRival(r, dmg) {
    r.hp -= dmg;
    if (r.hp <= 0) {
      r.mesh.visible = false;
      r.mesh.position.y = -5;
      this.G.audio.pickup();
    }
  }
  update(dt, player) {
    const m = this.current();
    // Marker pulse.
    this.marker.rotation.y += dt;
    this.marker.children[0].material.opacity = 0.25 + Math.sin(performance.now() * 0.004) * 0.12;
    // Race timer + checkpoints.
    if (this.race) {
      this.race.time += dt;
      const cp = this.race.route.points[this.race.cp];
      if (cp) {
        const dx = player.pos.x - cp[0], dz = player.pos.z - cp[1];
        if (dx * dx + dz * dz < 49) {
          this.race.cp += 1;
          this.G.audio.pickup();
          if (this.race.cp < this.race.route.points.length) {
            this.raceRings[this.race.cp].material.color.setHex(0xffcc22);
            this.G.hud.flash(`Checkpoint ${this.race.cp}/${this.race.route.points.length}`);
          }
        }
      }
      if (this.race.cp >= this.race.route.points.length) {
        const t = this.race.time;
        const bonus = t <= this.race.route.par ? this.race.route.reward : Math.floor(this.race.route.reward / 2);
        player.money += bonus;
        player.respect += 80;
        this.G.hud.banner('RACE WON', `Time ${t.toFixed(1)}s — + $${bonus}  + 80 respect`);
        this.race = null;
        this._clearRings();
        if (m && m.type === 'race') this._complete();
        else this._placeMarker();
        this.G.save();
        return;
      }
      if (this.race.time > this.race.route.par * 1.6) {
        this._failRace(`Too slow — par was ${this.race.route.par}s. Try again!`);
        return;
      }
    }
    if (!m) return;
    const dx = player.pos.x - m.target[0], dz = player.pos.z - m.target[1];
    const dist2 = dx * dx + dz * dz;
    if (m.type === 'goto' && dist2 < 64) this._complete();
    else if (m.type === 'pickup') {
      if (!this.picked && dist2 < 36) {
        this.picked = true;
        this.G.audio.pickup();
        this.G.hud.flash('Package grabbed — bring it back to the plaza (28, 28)');
        this.marker.position.set(28, 0, 28);
      } else if (this.picked) {
        const rx = player.pos.x - 28, rz = player.pos.z - 28;
        if (rx * rx + rz * rz < 64) this._complete();
      }
    } else if (m.type === 'kill') {
      if (this.rivals.length && this.rivals.every((r) => r.hp <= 0)) this._complete();
    } else if (m.type === 'heist') {
      if (this.stage === 0 && dist2 < 64) {
        this.stage = 1; this.stageTimer = 0;
        this.G.hud.flash('Cracking the vault — hold position 3 seconds!');
      } else if (this.stage === 1) {
        this.stageTimer += dt;
        player.wanted = Math.max(player.wanted, 3);
        if (this.stageTimer > 3) {
          this.stage = 2;
          this.G.hud.flash('Cash grabbed! Get to the safehouse — CONDOR-1 is on you!');
          this.marker.position.set(168, 0, -196);
        }
      } else if (this.stage === 2) {
        const sx = player.pos.x - 168, sz = player.pos.z + 196;
        if (sx * sx + sz * sz < 100) this._complete();
      }
    }
    // Rivals fight back.
    for (const r of this.rivals) {
      if (r.hp <= 0) continue;
      const dx2 = player.pos.x - r.x, dz2 = player.pos.z - r.z;
      const d = Math.hypot(dx2, dz2) || 1;
      if (d > 3) { r.x += (dx2 / d) * 4.5 * dt; r.z += (dz2 / d) * 4.5 * dt; }
      r.mesh.position.set(r.x, 0, r.z);
      r.mesh.rotation.y = Math.atan2(dx2, dz2);
      r.shootCd -= dt;
      if (d < 26 && r.shootCd <= 0) {
        r.shootCd = 1.1;
        player.hp -= 4;
        this.G.audio.shoot('pistol');
        if (player.hp <= 0) this.G.onPlayerDown();
      }
    }
    // Crew: follow + shoot nearest rival.
    for (const c of this.crew) {
      const pdx = player.pos.x - c.x, pdz = player.pos.z - c.z;
      const pd = Math.hypot(pdx, pdz) || 1;
      if (pd > 6) { c.x += (pdx / pd) * 9 * dt; c.z += (pdz / pd) * 9 * dt; }
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = Math.atan2(pdx, pdz);
      c.shootCd -= dt;
      const target = this.rivals.find((r) => r.hp > 0 && Math.hypot(r.x - c.x, r.z - c.z) < 30);
      if (target && c.shootCd <= 0) {
        c.shootCd = 0.7;
        this.damageRival(target, 12);
        this.G.audio.shoot('smg');
      }
    }
  }
}
