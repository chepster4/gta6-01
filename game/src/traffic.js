// Traffic and pedestrians: the city feels alive. Traffic cars cruise the road
// grid, turning at intersections; pedestrians stroll the sidewalks and scatter
// when a car comes close. All movement is seeded so shots stay repeatable.
import * as THREE from '../vendor/three.min.js';
import { BLOCK, HALF } from './config.js';
import { createRandom, pick } from './random.js';
import { createCarMesh, syncCarMesh } from './vehicles.js';

const TRAFFIC_COLORS = [0x8a8a8a, 0x5a6a8a, 0x8a5a5a, 0x4a6a4a, 0x9a9a9a, 0x6a4a6a, 0xb0a060];
const SHIRT_COLORS = [0x2e8bc8, 0xd04040, 0xe8b800, 0x2e8b6a, 0xd040a0, 0xe8e8e8, 0x8a5ac8, 0xe07840];

function roadLine(index) {
  return -HALF + index * BLOCK;
}

/** A traffic car: drives along one road line, turns at random intersections. */
function createTrafficCar(scene, random, collide) {
  const horizontal = random() < 0.5;
  const line = roadLine(1 + Math.floor(random() * 7));
  const along = -260 + random() * 520;
  const mesh = createCarMesh(pick(random, TRAFFIC_COLORS));
  scene.add(mesh);
  const car = {
    mesh,
    horizontal,
    line,
    along,
    dir: random() < 0.5 ? 1 : -1,
    speed: 8 + random() * 6,
    collide,
    turnCooldown: 0,
  };
  return car;
}

function stepTrafficCar(car, dt) {
  car.turnCooldown -= dt;
  car.along += car.dir * car.speed * dt;
  if (car.along > 272 || car.along < -272) {
    car.dir *= -1;
    car.along = Math.max(-272, Math.min(272, car.along));
  }
  // At an intersection, sometimes turn onto the crossing road: the road the car
  // was driving along becomes its new line, and its old line becomes the new
  // along-axis (starting at the intersection point).
  const gridPos = Math.round((car.along + HALF) / BLOCK) * BLOCK - HALF;
  const atIntersection = Math.abs(car.along - gridPos) < 1.2;
  if (atIntersection && car.turnCooldown <= 0 && Math.random() < 0.02) {
    const oldLine = car.line;
    car.line = gridPos;
    car.along = oldLine;
    car.horizontal = !car.horizontal;
    car.dir = Math.random() < 0.5 ? 1 : -1;
    car.turnCooldown = 4;
  }
  const x = car.horizontal ? car.along : car.line;
  const z = car.horizontal ? car.line : car.along;
  car.mesh.position.set(x, 0, z);
  const heading = car.horizontal ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  car.mesh.rotation.y = heading;
}

/** A pedestrian: a small boxy walker strolling a sidewalk. */
function createPedestrian(scene, random) {
  const group = new THREE.Group();
  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: pick(random, SHIRT_COLORS) }),
  );
  shirt.position.y = 1.05;
  group.add(shirt);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshLambertMaterial({ color: 0xd8a880 }),
  );
  head.position.y = 1.75;
  group.add(head);
  for (const lx of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.6, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x2a2a34 }),
    );
    leg.position.set(lx, 0.3, 0);
    group.add(leg);
  }
  scene.add(group);
  return {
    mesh: group,
    x: -200 + random() * 400,
    z: -200 + random() * 400,
    heading: random() * Math.PI * 2,
    speed: 1.2 + random() * 1.2,
    legPhase: random() * 6,
  };
}

export function createTraffic(scene, seed, collide) {
  const random = createRandom(seed + 77);
  const cars = [];
  for (let i = 0; i < 10; i += 1) cars.push(createTrafficCar(scene, random, collide));
  const peds = [];
  for (let i = 0; i < 26; i += 1) peds.push(createPedestrian(scene, random));

  return {
    cars,
    peds,
    update(dt, playerX, playerZ, playerSpeed) {
      for (const car of cars) stepTrafficCar(car, dt);
      for (const ped of peds) {
        // Scatter from a fast car nearby.
        const dx = ped.x - playerX; const dz = ped.z - playerZ;
        const d2 = dx * dx + dz * dz;
        if (d2 < 36 && playerSpeed > 6) {
          ped.heading = Math.atan2(dx, dz);
          ped.speed = 5;
        } else {
          ped.speed = 1.4;
        }
        ped.x += Math.sin(ped.heading) * ped.speed * dt;
        ped.z += Math.cos(ped.heading) * ped.speed * dt;
        if (ped.x > 274 || ped.x < -274 || ped.z > 274 || ped.z < -274) ped.heading += Math.PI;
        // Wander a little at random.
        if (Math.random() < 0.002) ped.heading += (Math.random() - 0.5) * 1.5;
        ped.legPhase += dt * ped.speed * 2;
        ped.mesh.position.set(ped.x, Math.abs(Math.sin(ped.legPhase)) * 0.06, ped.z);
        ped.mesh.rotation.y = ped.heading;
      }
    },
  };
}

// Re-exported for tests: a traffic car mesh sync helper.
export { syncCarMesh };
