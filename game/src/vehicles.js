// Vehicles: 12 stealable cars, driving, upgrades, damage and burning
// wrecks. Cars are simple box-built sedans/sports cars with spinning
// wheels; driving is arcade (accelerate / brake / steer / nitro).
const THREE = window.THREE;
import { CFG } from './config.js';

const CAR_COLORS = [0xd83a2a, 0x2a6ad8, 0xe0b52e, 0x2ad86a, 0x8a2ad8, 0xd8d8d8, 0x222228, 0xd86a2a, 0x2ad8c2, 0xa82a5a, 0x4a7a3a, 0xc2c22a];

export class VehicleSys {
  constructor(scene, G) {
    this.scene = scene; this.G = G;
    this.cars = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this._spawnCars();
  }
  _buildCarMesh(color, sport) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, sport ? 4.6 : 4.2), bodyMat);
    body.position.y = 0.65; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.1), new THREE.MeshLambertMaterial({ color: 0x1a2530 }));
    cabin.position.set(0, 1.35, sport ? 0.1 : -0.15); g.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheels = [];
    for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.42, wz);
      g.add(w); wheels.push(w);
    }
    // Headlights.
    const hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    for (const sx of [-0.65, 0.65]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), hl);
      h.position.set(sx, 0.7, sport ? -2.32 : -2.12);
      g.add(h);
    }
    return { group: g, wheels };
  }
  _spawnCars() {
    const rng = this.G.rng;
    const spots = [
      [30, -14], [-30, 14], [86, -14], [-86, 42], [142, 14], [-142, -14],
      [30, 98], [-30, -98], [198, -14], [-198, 70], [86, 154], [-86, -154],
    ];
    spots.forEach(([x, z], i) => {
      const sport = i % 3 === 0;
      const { group, wheels } = this._buildCarMesh(CAR_COLORS[i], sport);
      group.position.set(x, 0, z);
      group.rotation.y = rng.float(0, Math.PI * 2);
      this.group.add(group);
      this.cars.push({
        id: i, mesh: group, wheels, x, z, angle: group.rotation.y,
        speed: 0, hp: 100, maxHp: 100, sport, stolen: false, wreck: false,
        upgrades: { engine: 0, armor: 0, nitro: 0 }, burning: 0, fire: null,
      });
    });
  }
  nearestCar(px, pz, maxD = 4) {
    let best = null, bd = maxD * maxD;
    for (const c of this.cars) {
      if (c.wreck) continue;
      const dx = c.x - px, dz = c.z - pz;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  enter(car, player) {
    car.stolen = true;
    player.car = car;
    player.onFoot = false;
    this.G.audio.engine(true, 0);
    this.G.hud.flash('Car stolen — drive with W A S D, Shift = nitro (if fitted)');
    if (player.wanted < 1) player.wanted = 1;
  }
  exit(player) {
    const car = player.car;
    if (!car) return;
    player.car = null;
    player.onFoot = true;
    player.pos.x = car.x + Math.sin(car.angle) * 3;
    player.pos.z = car.z + Math.cos(car.angle) * 3;
    car.speed = 0;
    this.G.audio.engine(false);
  }
  topSpeed(car) {
    const base = car.sport ? 34 : 26;
    return base * (1 + 0.25 * car.upgrades.engine);
  }
  update(dt, player, input) {
    for (const car of this.cars) {
      if (car.wreck) {
        if (car.fire) {
          car.fire.rotation.y += dt * 3;
          car.fire.scale.y = 1 + Math.sin(performance.now() * 0.01) * 0.15;
        }
        continue;
      }
      if (player.car === car) {
        const fwd = input.down('KeyW') || input.down('ArrowUp') ? 1 : input.down('KeyS') || input.down('ArrowDown') ? -0.6 : 0;
        const steer = (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
        const nitro = input.down('ShiftLeft') && car.upgrades.nitro > 0;
        const accel = nitro ? 26 : 15;
        car.speed += fwd * accel * dt;
        car.speed *= Math.pow(0.4, dt); // drag
        car.speed = Math.max(-10, Math.min(this.topSpeed(car) * (nitro ? 1.45 : 1), car.speed));
        if (Math.abs(car.speed) > 0.5) car.angle += steer * 1.9 * dt * Math.sign(car.speed);
        const nx = car.x - Math.sin(car.angle) * car.speed * dt;
        const nz = car.z - Math.cos(car.angle) * car.speed * dt;
        const hit = this.G.city.collide(nx, nz, 1.6);
        if (Math.abs(hit.x - nx) > 0.01 || Math.abs(hit.z - nz) > 0.01) {
          car.speed *= 0.4;
          this._damage(car, 2 * dt * Math.abs(car.speed));
        }
        car.x = hit.x; car.z = hit.z;
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.angle;
        for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
        player.pos.x = car.x; player.pos.z = car.z;
        player.angle = car.angle;
        this.G.audio.engine(true, Math.abs(car.speed));
        if (nitro) this.G.hud.flash('NITRO!', 0.4);
      }
    }
  }
  _damage(car, amount) {
    if (car.wreck) return;
    car.hp -= amount;
    if (car.hp <= 0) this.explode(car);
  }
  damageCar(car, amount) { this._damage(car, amount); }
  explode(car) {
    car.wreck = true;
    car.hp = 0;
    car.speed = 0;
    // Fire cone + smoke column on the wreck.
    const fire = new THREE.Group();
    const flame = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.4, 8), new THREE.MeshBasicMaterial({ color: 0xff7722, transparent: true, opacity: 0.9 }));
    flame.position.y = 1.8; fire.add(flame);
    const smoke = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 5, 8), new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.65 }));
    smoke.position.y = 4.4; fire.add(smoke);
    fire.position.set(car.x, 0, car.z);
    this.scene.add(fire);
    car.fire = fire;
    // Char the body.
    car.mesh.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); });
    this.G.audio.explosion();
    if (this.G.player && this.G.player.car === car) {
      this.G.player.car = null;
      this.G.player.onFoot = true;
      this.G.player.hp -= 25;
      this.G.audio.engine(false);
    }
    this.G.hud.flash('Car exploded — burning wreck!');
  }
  applyUpgrade(car, id) {
    if (id === 'engine') car.upgrades.engine += 1;
    if (id === 'armor') { car.upgrades.armor += 1; car.maxHp += 60; car.hp = Math.min(car.maxHp, car.hp + 60); }
    if (id === 'nitro') car.upgrades.nitro += 1;
  }
}
