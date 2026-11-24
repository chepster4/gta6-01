// vehicles.js — cars: factory, arcade driving physics, traffic AI,
// carjacking, damage, fire and explosions (burning wrecks).
import * as THREE from 'three';
import { clamp, lerp, randRange, pick, mulberry32 } from './utils.js';
import { nearestRoadPoint, randomRoadPoint, hitsCollider } from './world.js';

const CAR_COLORS = [0xd23b3b, 0x2b6fd6, 0xe8b04b, 0x37b268, 0x8a5fd6, 0xe8e8e8, 0x22262e, 0xff7ab8, 0x19c2b8, 0xff8c42];
const CAR_NAMES = ['Comet', 'Stallion', 'Banshee', 'Voodoo', 'Sentinel', 'Panto', 'Cheetah', 'Sabre', 'Futo', 'Tampa'];

export function makeCarMesh(color, isCop = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isCop ? 0x1c2733 : color, emissive: isCop ? 0x0a1420 : 0x000000 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), bodyMat);
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.55, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x18202c })
  );
  cabin.position.set(0, 1.18, -0.25);
  g.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0c0d10 });
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }
  if (isCop) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.4), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    bar.position.set(0, 1.55, -0.25);
    bar.name = 'lightbar';
    g.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.2, 4.42), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 0.85;
    g.add(stripe);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.12), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  head.position.set(0, 0.62, 2.22);
  g.add(head);
  // taillights: bright red so cars read at night from behind
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  tail.position.set(0, 0.66, -2.22);
  g.add(tail);
  g.userData.wheels = wheels;
  return g;
}

export function createCar(G, opts) {
  const rng = opts.rng || mulberry32(1234 + G.cars.length * 7919);
  const color = opts.color ?? pick(rng, CAR_COLORS);
  const mesh = makeCarMesh(color, !!opts.isCop);
  mesh.position.set(opts.x, 0, opts.z);
  mesh.rotation.y = opts.heading ?? 0;
  G.scene.add(mesh);
  const car = {
    id: G.cars.length,
    mesh, color,
    name: opts.name || pick(rng, CAR_NAMES),
    isCop: !!opts.isCop,
    isPlayer: false,
    speed: 0,
    heading: opts.heading ?? 0,
    baseMaxSpeed: opts.maxSpeed ?? 34,
    maxSpeed: opts.maxSpeed ?? 34,
    accel: 16,
    health: 100,
    maxHealth: 100,
    burning: false,
    exploded: false,
    wasTraffic: false,
    nitro: 1,
    grip: 1,
    traffic: !!opts.traffic,
    route: null,
    routeIdx: 0,
    driver: opts.driver || null, // 'traffic' | 'cop' | null (parked)
    sirenPhase: rng() * 10,
  };
  G.cars.push(car);
  return car;
}

// --- player driving (arcade) ---
export function drivePlayerCar(G, dt) {
  const car = G.player.car;
  if (!car || car.exploded) return;
  const input = G.input;
  const up = (input.keys['KeyW'] || input.keys['ArrowUp']) ? 1 : 0;
  const down = (input.keys['KeyS'] || input.keys['ArrowDown']) ? 1 : 0;
  const left = (input.keys['KeyA'] || input.keys['ArrowLeft']) ? 1 : 0;
  const right = (input.keys['KeyD'] || input.keys['ArrowRight']) ? 1 : 0;
  const nitro = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
  const engineBonus = 1 + (G.upgrades?.engine || 0) * 0.12;
  const nitroBonus = 1 + (G.upgrades?.nitro || 0) * 0.5;
  const maxF = car.baseMaxSpeed * engineBonus * (nitro && G.player.nitroFuel > 0 ? 1.45 * nitroBonus : 1);
  if (nitro && up && G.player.nitroFuel > 0) G.player.nitroFuel = Math.max(0, G.player.nitroFuel - dt * 0.35);
  else G.player.nitroFuel = Math.min(1, G.player.nitroFuel + dt * 0.08);
  if (up) car.speed += car.accel * dt * (nitro ? 1.3 : 1);
  if (down) car.speed -= car.speed > 0.5 ? 26 * dt : 10 * dt;
  if (!up && !down) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  car.speed = clamp(car.speed, -12, maxF);
  const steer = (left ? 1 : 0) - (right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  const gripFactor = 1 + (G.upgrades?.tires || 0) * 0.25;
  car.heading += steer * 1.9 * gripFactor * dt * clamp(Math.abs(car.speed) / 12, 0, 1) * dir;
  const nx = car.mesh.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.mesh.position.z + Math.cos(car.heading) * car.speed * dt;
  const hit = hitsCollider(G.world.colliders, nx, nz, 1.6);
  if (hit || Math.abs(nx) > 452 || Math.abs(nz) > 452) {
    if (Math.abs(car.speed) > 14) damageCar(G, car, Math.abs(car.speed) * 0.9);
    car.speed *= -0.25;
  } else {
    car.mesh.position.x = nx;
    car.mesh.position.z = nz;
  }
  car.mesh.rotation.y = car.heading;
  car.mesh.rotation.z = -steer * 0.05 * clamp(Math.abs(car.speed) / 20, 0, 1);
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
  if (car.burning) spawnFire(G, car.mesh.position, dt);
  G.audio.engine(car.speed, maxF, nitro);
}

export function damageCar(G, car, amount) {
  if (car.exploded) return;
  const armorFactor = car.isPlayer ? 1 - Math.min(0.45, (G.upgrades?.armor || 0) * 0.15) : 1;
  car.health -= amount * armorFactor;
  if (car.health <= 40 && !car.burning) {
    car.burning = true;
    G.hud.toast((car.isPlayer ? 'Your car' : 'A car') + ' is on fire!');
  }
  if (car.health <= 0) explodeCar(G, car);
}

export function explodeCar(G, car) {
  if (car.exploded) return;
  car.exploded = true;
  car.burning = false;
  G.effects.explosion(car.mesh.position.clone());
  G.audio.explosion();
  G.hud.toast('💥 ' + car.name + ' exploded!');
  if (car.isPlayer) {
    G.player.car = null;
    G.player.onFoot = true;
    G.player.health = Math.max(25, G.player.health - 30);
    G.player.mesh.position.copy(car.mesh.position).add(new THREE.Vector3(3, 0, 3));
    G.player.mesh.visible = true;
    G.wanted.add(1);
  }
  // wreck stays as a burnt shell
  car.mesh.traverse((o) => {
    if (o.isMesh) { o.material = new THREE.MeshLambertMaterial({ color: 0x141414 }); }
  });
  setTimeout(() => { if (car.mesh.parent) G.scene.remove(car.mesh); }, 45000);
}

function spawnFire(G, pos, dt) {
  if (Math.random() < dt * 14) G.effects.firePuff(pos);
}

// --- traffic AI: cars loop along the road grid ---
export function spawnTraffic(G, n) {
  const rng = mulberry32(WORLD_SEED_TRAFFIC);
  for (let i = 0; i < n; i++) {
    const p = randomRoadPoint(rng);
    const car = createCar(G, { x: p.x, z: p.z, traffic: true, driver: 'traffic', rng });
    car.speed = randRange(rng, 8, 14);
    car.route = buildRoute(rng, p);
    car.routeIdx = 0;
    car.heading = Math.atan2(car.route[0].x - p.x, car.route[0].z - p.z);
  }
}
const WORLD_SEED_TRAFFIC = 777;

function buildRoute(rng, from) {
  const pts = [];
  let x = from.x, z = from.z;
  for (let i = 0; i < 6; i++) {
    const p = randomRoadPoint(rng);
    pts.push(p);
    x = p.x; z = p.z;
  }
  return pts;
}

export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (!car.traffic || car.exploded) continue;
    if (!car.route || car.route.length === 0) continue;
    const target = car.route[car.routeIdx];
    const dx = target.x - car.mesh.position.x;
    const dz = target.z - car.mesh.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 6) { car.routeIdx = (car.routeIdx + 1) % car.route.length; continue; }
    const want = Math.atan2(dx, dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += clamp(diff, -1.4 * dt, 1.4 * dt);
    car.speed = lerp(car.speed, 11, dt * 0.5);
    // keep distance from the player car
    if (G.player.car) {
      const pd = Math.hypot(G.player.car.mesh.position.x - car.mesh.position.x, G.player.car.mesh.position.z - car.mesh.position.z);
      if (pd < 7) car.speed = lerp(car.speed, 0, dt * 3);
    }
    car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
    car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.rotation.y = car.heading;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
  }
}

// --- carjacking: take the nearest car (parked or traffic) ---
export function nearestCar(G, pos, maxDist = 7) {
  let best = null, bd = maxDist;
  for (const car of G.cars) {
    if (car.exploded || car.isPlayer) continue;
    const d = Math.hypot(car.mesh.position.x - pos.x, car.mesh.position.z - pos.z);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

export function enterCar(G, car) {
  const wasTraffic = car.driver === 'traffic';
  car.wasTraffic = wasTraffic;
  G.player.car = car;
  car.isPlayer = true;
  car.traffic = false;
  car.driver = 'player';
  G.player.onFoot = false;
  G.player.mesh.visible = false;
  G.player.mesh.position.copy(car.mesh.position);
  G.hud.toast('🚗 ' + car.name + ' — yours now. SHIFT = nitro.');
  if (wasTraffic) G.wanted.add(1, 'carjacking');
  G.audio.carDoor();
}

export function exitCar(G) {
  const car = G.player.car;
  if (!car) return;
  car.isPlayer = false;
  car.speed = 0;
  G.player.car = null;
  G.player.onFoot = true;
  G.player.mesh.visible = true;
  const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading)).multiplyScalar(3);
  G.player.mesh.position.copy(car.mesh.position).add(side);
  G.player.heading = car.heading;
}
