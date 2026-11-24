// world.js — builds the island of Solmara: roads, buildings, beach, water,
// palms, lamps, district signs and the collision boxes the other systems use.
// Layout is seeded (WORLD.seed) so every load builds the same island.
import * as THREE from 'three';
import { WORLD, DISTRICTS } from './config.js';
import { mulberry32, randRange, pick } from './utils.js';

const PALETTE = [0xffd9a0, 0xffb3c1, 0x9fd8ff, 0xc9f2c7, 0xfff3b0, 0xe6ccff, 0xffc9a3, 0xbfe3ff, 0xf2f2f2, 0xff9d76];

function facadeTexture(rng) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d2c4'; g.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 244; y += 22) {
    for (let x = 10; x < 118; x += 20) {
      const lit = rng() < 0.55;
      g.fillStyle = lit ? (rng() < 0.7 ? '#ffe9a3' : '#9fe8ff') : '#2c3442';
      g.fillRect(x, y, 13, 14);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,12,20,0.55)'; g.fillRect(0, 24, 512, 80);
  g.fillStyle = color; g.font = 'bold 52px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text.toUpperCase(), 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(m);
  s.scale.set(72, 18, 1);
  return s;
}

export function buildWorld(scene) {
  const rng = mulberry32(WORLD.seed);
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'solmara-city';
  const roadLines = [];
  for (let i = -4; i <= 4; i++) roadLines.push(i * WORLD.roadGap);

  // --- water + sand + city slab ---
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(5200, 5200),
    new THREE.MeshLambertMaterial({ color: 0x14638f })
  );
  water.rotation.x = -Math.PI / 2; water.position.y = -0.6;
  group.add(water);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshLambertMaterial({ color: 0xcbb27f })
  );
  sand.rotation.x = -Math.PI / 2; sand.position.y = 0;
  sand.receiveShadow = true;
  group.add(sand);
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshLambertMaterial({ color: 0x5d6b52 })
  );
  slab.rotation.x = -Math.PI / 2; slab.position.y = 0.05;
  group.add(slab);

  // --- roads (dark strips + centre dashes + sidewalks) ---
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2e35 });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x8d939e });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c25a });
  for (const p of roadLines) {
    for (const [w, h, x, z] of [
      [WORLD.size, WORLD.roadWidth, 0, p],
      [WORLD.roadWidth, WORLD.size, p, 0],
    ]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.1, z);
      group.add(r);
    }
    for (const [w, h, x, z] of [
      [WORLD.size, 3, 0, p - WORLD.roadWidth / 2 - 2],
      [WORLD.size, 3, 0, p + WORLD.roadWidth / 2 + 2],
      [3, WORLD.size, p - WORLD.roadWidth / 2 - 2, 0],
      [3, WORLD.size, p + WORLD.roadWidth / 2 + 2, 0],
    ]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), walkMat);
      s.rotation.x = -Math.PI / 2; s.position.set(x, 0.09, z);
      group.add(s);
    }
    for (let d = -440; d <= 440; d += 24) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.5), dashMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(d, 0.12, p);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.5), dashMat);
      dash2.rotation.x = -Math.PI / 2; dash2.position.set(p, 0.12, d);
      group.add(dash2);
    }
  }

  // --- buildings, one per block, some blocks left as parks ---
  const facade = facadeTexture(rng);
  const blockCenters = [];
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) blockCenters.push([i * WORLD.roadGap + WORLD.roadGap / 2 - 46, j * WORLD.roadGap + WORLD.roadGap / 2 - 46]);
  // shift block grid so blocks sit between roads
  const blocks = [];
  for (let i = -4; i < 4; i++) for (let j = -4; j < 4; j++) blocks.push([i * WORLD.roadGap + WORLD.roadGap / 2, j * WORLD.roadGap + WORLD.roadGap / 2]);
  const lamps = [];
  for (const [bx, bz] of blocks) {
    const r = rng();
    if (r < 0.12) { // park: palms + grass
      for (let k = 0; k < 5; k++) group.add(makePalm(rng, bx + randRange(rng, -28, 28), bz + randRange(rng, -28, 28)));
      continue;
    }
    const w = randRange(rng, 34, 56), d = randRange(rng, 34, 56);
    const h = randRange(rng, 16, 68);
    const col = pick(rng, PALETTE);
    const mat = new THREE.MeshLambertMaterial({ map: facade, color: col, emissive: 0x222222 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(bx, h / 2 + 0.1, bz);
    group.add(b);
    // roof box
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 2.5, d * 0.5), new THREE.MeshLambertMaterial({ color: 0x3a3f4a }));
    roof.position.set(bx, h + 1.3, bz);
    group.add(roof);
    colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
    if (rng() < 0.5) group.add(makePalm(rng, bx + w / 2 + 6, bz + randRange(rng, -20, 20)));
  }

  // --- Hillside mansion (final mission) ---
  const mansion = new THREE.Mesh(
    new THREE.BoxGeometry(70, 26, 50),
    new THREE.MeshLambertMaterial({ map: facade, color: 0xffe9c9, emissive: 0x332211 })
  );
  mansion.position.set(300, 13.1, 260);
  group.add(mansion);
  colliders.push({ minX: 265, maxX: 335, minZ: 235, maxZ: 285 });

  // --- garage / shop / safehouse shells ---
  const shells = [
    { x: -120, z: 60, c: 0xffb020, label: 'GARAGE' },
    { x: 210, z: -160, c: 0x19e3ff, label: 'ARMS' },
    { x: -60, z: 200, c: 0x7dff9b, label: 'SAFEHOUSE' },
  ];
  for (const s of shells) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 22), new THREE.MeshLambertMaterial({ color: s.c, emissive: 0x111111 }));
    b.position.set(s.x, 5.1, s.z);
    group.add(b);
    const sign = textSprite(s.label, '#ffffff');
    sign.position.set(s.x, 16, s.z);
    group.add(sign);
    colliders.push({ minX: s.x - 15, maxX: s.x + 15, minZ: s.z - 11, maxZ: s.z + 11 });
  }

  // --- district signs ---
  for (const d of DISTRICTS) {
    const sign = textSprite(d.name, '#ffffff');
    sign.position.set(d.x, 27, d.z);
    group.add(sign);
  }

  // --- palms along the beach ring + lamps along roads ---
  for (let k = 0; k < 90; k++) {
    const side = Math.floor(rng() * 4);
    const t = randRange(rng, -440, 440);
    const edge = 445;
    const [x, z] = side === 0 ? [t, -edge] : side === 1 ? [t, edge] : side === 2 ? [-edge, t] : [edge, t];
    group.add(makePalm(rng, x, z));
  }
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x22262e });
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xffe9a3 });
  for (const p of roadLines) {
    for (let d = -360; d <= 360; d += 92) {
      for (const [x, z] of [[d, p + 10], [d + 46, p - 10]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 6), lampMat);
        pole.position.set(x, 4.5, z);
        group.add(pole);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), lampHeadMat);
        head.position.set(x, 9.2, z);
        head.name = 'lampHead';
        group.add(head);
        lamps.push(head);
      }
    }
  }

  // --- crates / props near portside ---
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6b3d });
  for (let k = 0; k < 26; k++) {
    const s = randRange(rng, 2, 4.5);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(randRange(rng, -400, -280), s / 2 + 0.1, randRange(rng, -380, -220));
    crate.rotation.y = rng() * Math.PI;
    group.add(crate);
    colliders.push({ minX: crate.position.x - s / 2, maxX: crate.position.x + s / 2, minZ: crate.position.z - s / 2, maxZ: crate.position.z + s / 2 });
  }

  scene.add(group);
  return { colliders, lamps, roadLines, blockCenters };
}

function makePalm(rng, x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.8, 9, 6),
    new THREE.MeshLambertMaterial({ color: 0x7a5a34 })
  );
  trunk.position.y = 4.5;
  trunk.rotation.z = randRange(rng, -0.12, 0.12);
  g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5.5, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 2.2, 9.4, Math.sin(a) * 2.2);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  return g;
}

// Snap a point to the nearest road centreline (traffic + spawn helpers).
export function nearestRoadPoint(x, z) {
  const g = WORLD.roadGap;
  const rx = Math.round(x / g) * g;
  const rz = Math.round(z / g) * g;
  return Math.abs(x - rx) < Math.abs(z - rz) ? { x: rx, z } : { x, z: rz };
}

export function randomRoadPoint(rng) {
  const g = WORLD.roadGap;
  const line = Math.floor(randRange(rng, -4, 5)) * g;
  const along = randRange(rng, -380, 380);
  return rng() < 0.5 ? { x: line, z: along } : { x: along, z: line };
}

// Point-in-collider test used by walking, driving and AI.
export function hitsCollider(colliders, x, z, pad = 0.6) {
  for (const c of colliders) {
    if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return c;
  }
  return null;
}
