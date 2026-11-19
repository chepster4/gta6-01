// Cars: a boxy mesh built from a body, a cabin, headlights and tail lights,
// plus arcade driving physics (accelerate, steer, brake, handbrake drift)
// and a simple enter/exit model shared by street cars, traffic and police.
import * as THREE from '../vendor/three.min.js';
import { CAR } from './config.js';

const WHEEL = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);

export function createCarMesh(color, opts = {}) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: opts.cabinColor ?? 0x18202a }),
  );
  cabin.position.set(0, 1.3, opts.cabinZ ?? -0.2);
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const wheel = new THREE.Mesh(WHEEL, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), headMat);
    head.position.set(hx, 0.72, 2.22);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  for (const hx of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), tailMat);
    tail.position.set(hx, 0.72, -2.22);
    group.add(tail);
  }
  if (opts.police) {
    const barMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), barMat);
    bar.position.set(0, 1.72, -0.2);
    group.add(bar);
    group.userData.lightbar = bar;
    group.userData.lightbarMat = barMat;
  }
  if (opts.taxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffe040 }),
    );
    sign.position.set(0, 1.75, -0.2);
    group.add(sign);
  }
  group.userData.bodyMat = bodyMat;
  return group;
}

/** Arcade car state: position, heading, speed; stepped by drive(). */
export function createCarState(x, z, heading) {
  return { x, z, heading, speed: 0 };
}

/**
 * Advance one car one fixed step. `throttle` -1..1, `steer` -1..1.
 * Returns nothing; mutates the state. `collide` resolves the new position.
 */
export function driveCar(car, throttle, steer, handbrake, dt, collide) {
  const grip = handbrake ? CAR.grip * 0.35 : CAR.grip;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    car.speed += (car.speed > 0.5 ? -CAR.brake : -CAR.accel * 0.6) * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 9 * dt;
    if (Math.abs(car.speed) < 0.3) car.speed = 0;
  }
  if (handbrake) car.speed -= Math.sign(car.speed) * 16 * dt;
  car.speed = Math.max(-CAR.reverseSpeed, Math.min(CAR.maxSpeed, car.speed));
  const turn = steer * CAR.steer * dt * Math.min(1, Math.abs(car.speed) / 8) * Math.sign(car.speed || 1);
  car.heading += turn * (handbrake ? 1.5 : 1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = collide(nx, nz, 2.1);
  // A wall hit kills most of the speed.
  if (Math.abs(fixed.x - nx) > 0.01 || Math.abs(fixed.z - nz) > 0.01) car.speed *= 0.4;
  car.x = fixed.x; car.z = fixed.z;
  // Clamp to the city edge.
  car.x = Math.max(-276, Math.min(276, car.x));
  car.z = Math.max(-276, Math.min(276, car.z));
}

/** Sync a mesh to a car state (heading 0 = facing +z). */
export function syncCarMesh(mesh, car) {
  mesh.position.set(car.x, 0, car.z);
  mesh.rotation.y = car.heading;
}
