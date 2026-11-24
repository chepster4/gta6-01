// player.js — Dario on foot: WASD movement, run, third-person camera,
// enter/exit cars, and the low-poly character mesh.
import * as THREE from 'three';
import { clamp, angleLerp } from './utils.js';
import { hitsCollider } from './world.js';
import { nearestCar, enterCar, exitCar } from './vehicles.js';

export function makePlayerMesh() {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xffb020 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2b3a55 });
  const shoes = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), shirt);
  torso.position.y = 1.18;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skin);
  head.position.y = 1.8;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.44), new THREE.MeshLambertMaterial({ color: 0x19e3ff }));
  cap.position.y = 2.02;
  g.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.28), pants);
  legL.position.set(-0.17, 0.4, 0);
  legL.name = 'legL';
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.17;
  legR.name = 'legR';
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), shirt);
  armL.position.set(-0.42, 1.2, 0);
  armL.name = 'armL';
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  armR.name = 'armR';
  g.add(armR);
  // simple pistol in the right hand
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.42, 0.92, 0.2);
  gun.name = 'gun';
  g.add(gun);
  return g;
}

export function initPlayer(G) {
  const mesh = makePlayerMesh();
  mesh.position.set(G.startPos.x, 0, G.startPos.z);
  G.scene.add(mesh);
  G.player.mesh = mesh;
  G.player.heading = Math.PI;
  G.player.walkPhase = 0;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  if (!p.onFoot) return;
  const input = G.input;
  const f = (input.keys['KeyW'] || input.keys['ArrowUp'] ? 1 : 0) - (input.keys['KeyS'] || input.keys['ArrowDown'] ? 1 : 0);
  const s = (input.keys['KeyD'] || input.keys['ArrowRight'] ? 1 : 0) - (input.keys['KeyA'] || input.keys['ArrowLeft'] ? 1 : 0);
  const run = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
  const speed = run ? 9.5 : 5.2;
  // movement is relative to the camera yaw
  const camYaw = G.cameraYaw;
  const mx = Math.sin(camYaw) * f + Math.cos(camYaw) * s;
  const mz = Math.cos(camYaw) * f - Math.sin(camYaw) * s;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    const nx = p.mesh.position.x + (mx / len) * speed * dt;
    const nz = p.mesh.position.z + (mz / len) * speed * dt;
    if (!hitsCollider(G.world.colliders, nx, p.mesh.position.z, 0.5)) p.mesh.position.x = nx;
    if (!hitsCollider(G.world.colliders, p.mesh.position.x, nz, 0.5)) p.mesh.position.z = nz;
    p.mesh.position.x = clamp(p.mesh.position.x, -452, 452);
    p.mesh.position.z = clamp(p.mesh.position.z, -452, 452);
    const targetHeading = Math.atan2(mx, mz);
    p.heading = angleLerp(p.heading, targetHeading, dt * 12);
    p.walkPhase += dt * speed * 1.6;
    const swing = Math.sin(p.walkPhase) * 0.55;
    const legL = p.mesh.getObjectByName('legL');
    const legR = p.mesh.getObjectByName('legR');
    const armL = p.mesh.getObjectByName('armL');
    const armR = p.mesh.getObjectByName('armR');
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
    if (armL) armL.rotation.x = -swing * 0.8;
    if (armR) armR.rotation.x = swing * 0.8;
  }
  p.mesh.rotation.y = p.heading;
  // aim: face the camera direction while shooting
  if (input.mouseDown && G.weapons.current) {
    p.heading = angleLerp(p.heading, camYaw, dt * 18);
    p.mesh.rotation.y = p.heading;
  }
}

export function tryEnterExitCar(G) {
  const p = G.player;
  if (p.onFoot) {
    const car = nearestCar(G, p.mesh.position, 7);
    if (car) enterCar(G, car);
    else G.hud.toast('No car nearby — walk closer to one.');
  } else {
    exitCar(G);
  }
}

// Third-person camera: follows the player or the car, mouse drag orbits.
export function updateCamera(G, dt) {
  const p = G.player;
  const target = p.onFoot ? p.mesh.position : (p.car ? p.car.mesh.position : p.mesh.position);
  const focus = new THREE.Vector3(target.x, target.y + 1.6, target.z);
  const dist = p.onFoot ? 9.5 : 13.5;
  const height = p.onFoot ? 4.2 : 5.2;
  const speed = p.car ? Math.abs(p.car.speed) : 0;
  const extraDist = speed * 0.12;
  const cx = focus.x - Math.sin(G.cameraYaw) * (dist + extraDist);
  const cz = focus.z - Math.cos(G.cameraYaw) * (dist + extraDist);
  const desired = new THREE.Vector3(cx, focus.y + height, cz);
  G.camera.position.lerp(desired, 1 - Math.exp(-dt * 7));
  G.camera.lookAt(focus.x, focus.y + 0.6, focus.z);
}
