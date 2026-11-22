// Ambient life: traffic cars looping the road grid and pedestrians
// walking the sidewalks. Pure ambience — they scatter when shot at.
const THREE = window.THREE;

const PED_COLORS = [0xd84a6a, 0x4a8ad8, 0x6ad84a, 0xd8a83a, 0x8a6ad8, 0x3a3a3a, 0xd8d8d8, 0x2a8a8a];

export class Traffic {
  constructor(scene, G) {
    this.scene = scene; this.G = G;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.cars = [];
    this.peds = [];
    this._spawnCars();
    this._spawnPeds();
  }
  _spawnCars() {
    const rng = this.G.rng;
    const colors = [0x8a2a2a, 0x2a4a8a, 0x8a8a2a, 0x3a3a3a, 0x6a6a6a, 0xd8d8d8];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4), new THREE.MeshLambertMaterial({ color: colors[i] }));
      body.position.y = 0.6; g.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.9), new THREE.MeshLambertMaterial({ color: 0x1a2530 }));
      cab.position.y = 1.2; g.add(cab);
      const road = rng.pick([-224, -168, -112, -56, 0, 56, 112, 168, 224]);
      const horiz = rng.chance(0.5);
      const t = rng.float(-260, 260);
      g.position.set(horiz ? t : road + 3.5, 0, horiz ? road + 3.5 : t);
      g.rotation.y = horiz ? (road >= 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
      this.group.add(g);
      this.cars.push({ mesh: g, road, horiz, t, speed: rng.float(7, 11), dir: rng.sign() });
    }
  }
  _spawnPeds() {
    const rng = this.G.rng;
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 8), new THREE.MeshLambertMaterial({ color: PED_COLORS[i % PED_COLORS.length] }));
      body.position.y = 0.95; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd8a888 }));
      head.position.y = 2.0; g.add(head);
      const x = rng.float(-250, 250), z = rng.float(-250, 250);
      g.position.set(x, 0, z);
      this.group.add(g);
      this.peds.push({ mesh: g, x, z, angle: rng.float(0, Math.PI * 2), speed: rng.float(1.2, 2.4), hp: 50, flee: 0 });
    }
  }
  update(dt, player) {
    for (const c of this.cars) {
      c.t += c.speed * c.dir * dt;
      if (c.t > 272) c.t = -272;
      if (c.t < -272) c.t = 272;
      c.mesh.position.set(c.horiz ? c.t : c.road + 3.5, 0, c.horiz ? c.road + 3.5 : c.t);
      c.mesh.rotation.y = c.horiz ? (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (c.dir > 0 ? Math.PI : 0);
    }
    for (const p of this.peds) {
      if (p.flee > 0) {
        p.flee -= dt;
        p.x += Math.sin(p.angle) * p.speed * 3 * dt;
        p.z += Math.cos(p.angle) * p.speed * 3 * dt;
      } else {
        p.x += Math.sin(p.angle) * p.speed * dt;
        p.z += Math.cos(p.angle) * p.speed * dt;
        if (Math.random() < dt * 0.08) p.angle += (Math.random() - 0.5) * 2.4;
      }
      const hit = this.G.city.collide(p.x, p.z, 0.5);
      p.x = hit.x; p.z = hit.z;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.angle;
      p.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.006 + p.x)) * 0.06;
    }
  }
  // Nearest living pedestrian within range + facing cone — combat target.
  nearestPed(px, pz, angle, range) {
    let best = null, bd = range * range;
    for (const p of this.peds) {
      if (p.hp <= 0) continue;
      const dx = p.x - px, dz = p.z - pz;
      const d = dx * dx + dz * dz;
      if (d > bd) continue;
      const facing = Math.atan2(dx, dz);
      let da = Math.abs(facing - angle);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < 0.35) { bd = d; best = p; }
    }
    return best;
  }
}
