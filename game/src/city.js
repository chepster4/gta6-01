// Palmira Bay itself: the 560x560 grid city. Ground and roads, procedural
// buildings with lit-window textures, storefront bands and awnings, roof
// clutter (water towers, antennas, red beacons), the Solmar Tower landmark,
// the east docks with warehouses, containers and a gantry crane, palms, the
// plaza fountain, the PALMIRA BAY arch, street lamps, the SOLMAR ARMS kiosk
// and the safehouse. Exports the building colliders the player and cars use.
import * as THREE from '../vendor/three.min.js';
import { BLOCK, HALF, ROAD, SAFEHOUSE, SHOP } from './config.js';
import { createRandom, intBetween, pick } from './random.js';

const BLOCK_COUNT = 8; // 8 x 8 blocks of 70 m

function blockCentre(index) {
  return -HALF + (index + 0.5) * BLOCK;
}

/** True when (x, z) is on a road band (roads run on every 70 m grid line). */
export function isRoad(x, z) {
  const fx = ((x + HALF) % BLOCK + BLOCK) % BLOCK;
  const fz = ((z + HALF) % BLOCK + BLOCK) % BLOCK;
  return fx < ROAD / 2 || fx > BLOCK - ROAD / 2 || fz < ROAD / 2 || fz > BLOCK - ROAD / 2;
}

/** A canvas texture of windows for one building face, some windows lit. */
function windowTexture(random, base, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  const cols = 6; const rows = 12;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = random() < litRatio;
      ctx.fillStyle = lit ? '#ffd880' : '#1c2733';
      ctx.fillRect(6 + c * 20, 8 + r * 20, 13, 12);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A text sign texture (neon-style lettering on a dark board). */
function signTexture(text, fg, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCity(scene, seed) {
  const random = createRandom(seed);
  const colliders = [];
  const palmGroups = [];
  const lampMats = [];
  const group = new THREE.Group();
  scene.add(group);

  function addCollider(x, z, hw, hd) {
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  }

  // --- Ground: grass base, road strips, sidewalks, plaza, docks apron. ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x4a8a3c }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2b30 });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb8b0a0 });
  for (let k = 0; k <= BLOCK_COUNT; k += 1) {
    const line = -HALF + k * BLOCK;
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, 560), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(line, 0.02, 0);
    group.add(roadV);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(560, ROAD), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.02, line);
    group.add(roadH);
    // Centre dashes on the two main avenues.
    if (k === 4) {
      for (let d = -266; d < 266; d += 18) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 7), new THREE.MeshBasicMaterial({ color: 0xe8c840 }));
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(line, 0.04, d);
        group.add(dash);
      }
    }
    // Sidewalks flanking each road.
    for (const off of [-ROAD / 2 - 2, ROAD / 2 + 2]) {
      const swV = new THREE.Mesh(new THREE.PlaneGeometry(4, 560), walkMat);
      swV.rotation.x = -Math.PI / 2;
      swV.position.set(line + off, 0.03, 0);
      group.add(swV);
      const swH = new THREE.Mesh(new THREE.PlaneGeometry(560, 4), walkMat);
      swH.rotation.x = -Math.PI / 2;
      swH.position.set(0, 0.03, line + off);
      group.add(swH);
    }
  }

  // Plaza: pale blue stone in the four centre blocks, with a fountain.
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(126, 126),
    new THREE.MeshLambertMaterial({ color: 0x9fc8e8 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.03, 0);
  group.add(plaza);

  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 12, 1.2, 24),
    new THREE.MeshLambertMaterial({ color: 0xcfd8dc }),
  );
  basin.position.set(-30, 0.6, -20);
  group.add(basin);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(10, 24),
    new THREE.MeshLambertMaterial({ color: 0x4db2e8, transparent: true, opacity: 0.85 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-30, 1.25, -20);
  group.add(water);
  const jet = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 7, 10),
    new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.55 }),
  );
  jet.position.set(-30, 4.5, -20);
  group.add(jet);
  addCollider(-30, -20, 12, 12);

  // --- Buildings. ---
  const bases = ['#c8b8a0', '#a8b8c8', '#c8a898', '#98a8a0', '#d0c0b0', '#b0a8c0', '#c0b890'];
  const roofColors = [0x5a5148, 0x6a5a4a, 0x4a5a62, 0x7a6a58];
  const wallTextures = bases.map((b) => windowTexture(random, b, 0.35));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5148 });
  const storeColors = [0xd04040, 0x2e8bc8, 0x2e8b6a, 0xe07840, 0xd040a0, 0x8a5ac8];
  let tallest = null;

  const plazaBlocks = (gx, gz) => gx >= 3 && gx <= 4 && gz >= 3 && gz <= 4;
  const towerBlock = (gx, gz) => gx === 5 && gz === 5;
  // The whole east docks side (warehouses, apron, container yard, crane)
  // stays clear of random buildings so the yard is actually reachable.
  const docksBlocks = (gx, gz) => gx >= 6 && gz >= 4 && gz <= 6;
  const safehouseBlock = (gx, gz) => gx === 6 && gz === 1 - 3; // (168,-196) block gx=6,gz=1
  for (let gx = 0; gx < BLOCK_COUNT; gx += 1) {
    for (let gz = 0; gz < BLOCK_COUNT; gz += 1) {
      if (plazaBlocks(gx, gz) || towerBlock(gx, gz) || docksBlocks(gx, gz)) continue;
      if (gx === 6 && gz === 1) continue; // safehouse plot
      const cx = blockCentre(gx);
      const cz = blockCentre(gz);
      const twin = random() < 0.45;
      const spots = twin ? [[-13, -13], [13, 13]] : [[0, 0]];
      for (const [ox, oz] of spots) {
        const w = twin ? 22 : 30 + random() * 16;
        const d = twin ? 22 : 30 + random() * 16;
        const h = 12 + Math.floor(random() * random() * 46);
        const tex = pick(random, wallTextures);
        const mat = new THREE.MeshLambertMaterial({ map: tex });
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(cx + ox, h / 2, cz + oz);
        group.add(building);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 1, 1.2, d + 1),
          new THREE.MeshLambertMaterial({ color: pick(random, roofColors) }),
        );
        roof.position.set(cx + ox, h + 0.6, cz + oz);
        group.add(roof);
        addCollider(cx + ox, cz + oz, w / 2 + 0.5, d / 2 + 0.5);
        // Storefront band + awning on the road-facing side.
        const store = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 4, 1),
          new THREE.MeshLambertMaterial({ color: pick(random, storeColors) }),
        );
        store.position.set(cx + ox, 2, cz + oz - d / 2 - 0.4);
        group.add(store);
        const awning = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.8, 0.4, 4),
          new THREE.MeshLambertMaterial({ color: 0xf0e8d8 }),
        );
        awning.position.set(cx + ox, 4.6, cz + oz - d / 2 - 2.4);
        awning.rotation.x = 0.25;
        group.add(awning);
        // Roof clutter: water tower on tall buildings, antenna + red beacon on the tallest.
        if (h > 34) {
          const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(2.4, 2.4, 4, 10),
            new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
          );
          tank.position.set(cx + ox - w / 4, h + 3.4, cz + oz - d / 4);
          group.add(tank);
        }
        if (!tallest || h > tallest.h) tallest = { x: cx + ox, z: cz + oz, h, w, d };
      }
    }
  }
  // Antenna + blinking beacon on the tallest tower.
  if (tallest) {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 12, 6),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    antenna.position.set(tallest.x, tallest.h + 7, tallest.z);
    group.add(antenna);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), beaconMat);
    beacon.position.set(tallest.x, tallest.h + 13.4, tallest.z);
    group.add(beacon);
    beacon.userData.blink = true;
    group.userData.beacon = beacon;
  }

  // --- Solmar Tower: three tiers, a spire, crown lights and a neon SOLMAR sign. ---
  const towerX = 85; const towerZ = 131;
  const towerTex = windowTexture(random, '#7a90b0', 0.5);
  const towerMat = new THREE.MeshLambertMaterial({ map: towerTex });
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(34, 34, 34), towerMat);
  tier1.position.set(towerX, 17, towerZ);
  group.add(tier1);
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(24, 26, 24), towerMat);
  tier2.position.set(towerX, 47, towerZ);
  group.add(tier2);
  const tier3 = new THREE.Mesh(new THREE.BoxGeometry(15, 20, 15), towerMat);
  tier3.position.set(towerX, 70, towerZ);
  group.add(tier3);
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.6, 22, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }),
  );
  spire.position.set(towerX, 91, towerZ);
  group.add(spire);
  for (let i = 0; i < 8; i += 1) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffe080 }),
    );
    const a = (i / 8) * Math.PI * 2;
    light.position.set(towerX + Math.cos(a) * 8.4, 80.5, towerZ + Math.sin(a) * 8.4);
    group.add(light);
  }
  const solmarSign = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 7.5),
    new THREE.MeshBasicMaterial({ map: signTexture('SOLMAR', '#ff5a7a', '#141020') }),
  );
  solmarSign.position.set(towerX, 30, towerZ - 17.4);
  solmarSign.rotation.y = Math.PI;
  group.add(solmarSign);
  addCollider(towerX, towerZ, 18, 18);

  // --- East docks: concrete apron, two corrugated warehouses, container stacks, gantry crane. ---
  const docksX = 224; const docksZ = 96;
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(96, 120),
    new THREE.MeshLambertMaterial({ color: 0x8a8a86 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(docksX, 0.04, docksZ);
  group.add(apron);
  const warehouseMat = new THREE.MeshLambertMaterial({ color: 0x9a8a6a });
  for (const [wx, wz] of [[196, 52], [196, 140]]) {
    const wh = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 34), warehouseMat);
    wh.position.set(wx, 7, wz);
    group.add(wh);
    const whRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(17, 17, 30, 12, 1, false, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x7a6a52 }),
    );
    whRoof.rotation.z = Math.PI / 2;
    whRoof.rotation.y = Math.PI / 2;
    whRoof.position.set(wx, 14, wz);
    whRoof.scale.set(1, 1, 1);
    group.add(whRoof);
    addCollider(wx, wz, 16, 18);
  }
  const containerColors = [0xc8321e, 0x2456c8, 0x2e8b6a, 0xe8b800, 0xd040a0, 0x40c8d0, 0xe07840, 0x8a5ac8];
  const containerSpots = [
    [232, 84, 2], [240, 100, 1], [232, 116, 3], [248, 84, 1],
    [256, 108, 2], [224, 132, 1], [248, 132, 2], [216, 84, 1],
  ];
  for (let i = 0; i < containerSpots.length; i += 1) {
    const [cx, cz, stack] = containerSpots[i];
    for (let s = 0; s < stack; s += 1) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(12, 2.8, 3),
        new THREE.MeshLambertMaterial({ color: containerColors[(i + s) % containerColors.length] }),
      );
      box.position.set(cx, 1.4 + s * 2.8, cz);
      box.rotation.y = (i % 2) * 0.06;
      group.add(box);
    }
    addCollider(cx, cz, 6.5, 2);
  }
  // Gantry crane: four legs, a beam, cables and a hook over the yard.
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xe8b800 });
  for (const [lx, lz] of [[208, 72], [208, 120], [232, 72], [232, 120]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 2), craneMat);
    leg.position.set(lx, 13, lz);
    group.add(leg);
    addCollider(lx, lz, 1.5, 1.5);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(28, 2.4, 4), craneMat);
  beam.position.set(220, 27, 96);
  group.add(beam);
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 14, 4),
    new THREE.MeshLambertMaterial({ color: 0x222222 }),
  );
  cable.position.set(228, 19, 96);
  group.add(cable);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 2.4), craneMat);
  hook.position.set(228, 11.5, 96);
  group.add(hook);

  // --- Palms along the sidewalks. ---
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e8b3a });
  function makePalm(x, z) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 7), trunkMat);
    trunk.position.y = 3.5;
    palm.add(trunk);
    for (let i = 0; i < 6; i += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5.5, 4), frondMat);
      const a = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 2.2, 7.6, Math.sin(a) * 2.2);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      palm.add(frond);
    }
    palm.position.set(x, 0, z);
    palm.userData.crown = palm.children.slice(1);
    group.add(palm);
    palmGroups.push(palm);
    return palm;
  }
  for (let k = -3; k <= 3; k += 1) {
    makePalm(-38 + k * 24, -38);
    makePalm(-38 + k * 24, 38);
    makePalm(-38, -38 + k * 24);
    makePalm(38, -38 + k * 24);
  }
  for (const [px, pz] of [[-122, -52], [122, 52], [-52, 192], [192, -122], [-192, -52], [52, -192]]) {
    makePalm(px, pz);
  }

  // --- PALMIRA BAY arch over the north avenue into the plaza. ---
  const archMat = new THREE.MeshLambertMaterial({ color: 0x3a3a44 });
  for (const px of [-9, 9]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 12, 2.4), archMat);
    pillar.position.set(px, 6, -70);
    group.add(pillar);
  }
  const archSign = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 5),
    new THREE.MeshBasicMaterial({ map: signTexture('PALMIRA BAY', '#ffffff', '#22222c') }),
  );
  archSign.position.set(0, 12.5, -70);
  group.add(archSign);

  // --- Street lamps (glow at night). ---
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (let k = -3; k <= 3; k += 1) {
    for (const [lx, lz] of [[-70 + k * 70, -10], [10, -70 + k * 70]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 6.5, 6), lampPoleMat);
      pole.position.set(lx, 3.25, lz);
      group.add(pole);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), bulbMat);
      bulb.position.set(lx, 6.8, lz);
      group.add(bulb);
      lampMats.push(bulbMat);
    }
  }

  // --- SOLMAR ARMS kiosk (plaza east) with a neon sign. ---
  const kiosk = new THREE.Mesh(
    new THREE.BoxGeometry(8, 5, 6),
    new THREE.MeshLambertMaterial({ color: 0x2a2a34 }),
  );
  kiosk.position.set(SHOP.pos.x, 2.5, SHOP.pos.z);
  group.add(kiosk);
  const armsSign = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 2.2),
    new THREE.MeshBasicMaterial({ map: signTexture('SOLMAR ARMS', '#ff5a7a', '#101018') }),
  );
  armsSign.position.set(SHOP.pos.x, 6, SHOP.pos.z - 3.1);
  armsSign.rotation.y = Math.PI;
  group.add(armsSign);
  addCollider(SHOP.pos.x, SHOP.pos.z, 4.5, 3.5);

  // --- Safehouse (north-east) with a green neon sign. ---
  const house = new THREE.Mesh(
    new THREE.BoxGeometry(12, 7, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8d8b0 }),
  );
  house.position.set(SAFEHOUSE.x, 3.5, SAFEHOUSE.z);
  group.add(house);
  const houseRoof = new THREE.Mesh(
    new THREE.ConeGeometry(9.5, 4, 4),
    new THREE.MeshLambertMaterial({ color: 0x8a4a3a }),
  );
  houseRoof.position.set(SAFEHOUSE.x, 9, SAFEHOUSE.z);
  houseRoof.rotation.y = Math.PI / 4;
  group.add(houseRoof);
  const safeSign = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.4),
    new THREE.MeshBasicMaterial({ map: signTexture('SAFEHOUSE', '#7aff8a', '#0a1a0a') }),
  );
  safeSign.position.set(SAFEHOUSE.x, 5.4, SAFEHOUSE.z - 5.1);
  safeSign.rotation.y = Math.PI;
  group.add(safeSign);
  addCollider(SAFEHOUSE.x, SAFEHOUSE.z, 6.5, 5.5);

  // Resolve a circle (player or car) against every building collider.
  function collideCircle(x, z, r) {
    for (const c of colliders) {
      const nx = Math.max(c.minX, Math.min(x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - nx; const dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * r;
        z = nz + (dz / d) * r;
      } else if (d2 <= 0.0001) {
        // Centre inside the box: push out along the smallest penetration axis.
        const px = Math.min(x - c.minX, c.maxX - x);
        const pz = Math.min(z - c.minZ, c.maxZ - z);
        if (px < pz) x = (x - c.minX < c.maxX - x) ? c.minX - r : c.maxX + r;
        else z = (z - c.minZ < c.maxZ - z) ? c.minZ - r : c.maxZ + r;
      }
    }
    return { x, z };
  }

  return {
    colliders,
    collideCircle,
    /** Hide palm crowns near (x, z) so they never cover the camera in a shot. */
    hidePalmsNear(x, z, radius) {
      for (const palm of palmGroups) {
        const dx = palm.position.x - x; const dz = palm.position.z - z;
        const near = dx * dx + dz * dz < radius * radius;
        for (const frond of palm.userData.crown) frond.visible = !near;
      }
    },
    showAllPalms() {
      for (const palm of palmGroups) for (const frond of palm.userData.crown) frond.visible = true;
    },
    setNightLights(night) {
      for (const m of lampMats) m.color.set(night ? 0xffe9a8 : 0x8a7a5a);
    },
  };
}
