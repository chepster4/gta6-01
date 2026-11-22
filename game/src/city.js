// Procedural Palmira Bay: 560x560 grid city. Roads, blocks of buildings
// with storefronts + awnings, roof props, Solmar Tower landmark, East
// Docks, palms, lamps and a fountain plaza. Exports colliders + helpers.
const THREE = window.THREE;

const PALETTE = [0x8a7f72, 0x9c8f7a, 0x7a8a9c, 0xb09a7a, 0x6a7a6a, 0xa88a8a, 0x8a8a9c, 0x9a7a5a];
const ROOF = [0x5a4a3a, 0x4a5a6a, 0x6a6a5a, 0x3a3a44];
const STORE = [0xd84a4a, 0x3a9ad8, 0x3ad86a, 0xd8a83a, 0x9a4ad8, 0xd86aa8];
const CONTAINER = [0xc23b2e, 0x2e7fc2, 0x3aa84a, 0xe0a52e, 0x7a4ac2, 0x2ea8a0];

function neonTexture(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.font = 'bold 84px Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = fg; g.shadowBlur = 28;
  g.fillStyle = fg; g.fillText(text, 256, 66);
  g.shadowBlur = 0; g.fillStyle = '#ffffff';
  g.font = 'bold 84px Arial, sans-serif';
  g.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

export class City {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = [];
    this.palms = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this._ground();
    this._roads();
    this._buildings();
    this._tower();
    this._docks();
    this._plaza();
    this._palmsAndLamps();
  }
  _box(w, h, d, color, x, y, z, opts = {}) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color, emissive: opts.emissive || 0x000000, emissiveIntensity: opts.ei || 1 })
    );
    m.position.set(x, y, z);
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rx) m.rotation.x = opts.rx;
    this.group.add(m);
    return m;
  }
  _ground() {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 560),
      new THREE.MeshLambertMaterial({ color: 0x3d4a2e })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.05;
    this.group.add(g);
    // Beach strip on the south edge (bayfront).
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 34),
      new THREE.MeshLambertMaterial({ color: 0xd8c08a })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(0, 0.02, 263);
    this.group.add(beach);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 60),
      new THREE.MeshLambertMaterial({ color: 0x2a6a9a })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.0, 310);
    this.group.add(sea);
  }
  _roads() {
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e2e34 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c84a });
    for (let k = -5; k <= 5; k++) {
      const c = k * 56;
      const rv = new THREE.Mesh(new THREE.PlaneGeometry(14, 560), roadMat);
      rv.rotation.x = -Math.PI / 2;
      rv.position.set(c, 0.01, 0);
      this.group.add(rv);
      const rh = new THREE.Mesh(new THREE.PlaneGeometry(560, 14), roadMat);
      rh.rotation.x = -Math.PI / 2;
      rh.position.set(0, 0.01, c);
      this.group.add(rh);
      // Dashed centre line.
      for (let s = -266; s < 266; s += 28) {
        const d1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.7), lineMat);
        d1.rotation.x = -Math.PI / 2;
        d1.position.set(s, 0.03, c);
        this.group.add(d1);
        const d2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 10), lineMat);
        d2.rotation.x = -Math.PI / 2;
        d2.position.set(c, 0.03, s);
        this.group.add(d2);
      }
    }
  }
  _skipBlock(bx, bz) {
    // Solmar Tower plot, docks, safehouse, garage, central plaza.
    if (Math.abs(bx - 84) < 4 && Math.abs(bz - 140) < 4) return true;
    if (bx >= 196 && bz >= 84 && bz <= 196) return true; // docks
    if (Math.abs(bx - 196) < 4 && Math.abs(bz + 196) < 4) return true; // safehouse
    if (Math.abs(bx + 140) < 4 && Math.abs(bz - 84) < 4) return true; // garage
    if (Math.abs(bx - 28) < 4 && Math.abs(bz - 28) < 4) return true; // plaza
    return false;
  }
  _buildings() {
    const rng = this.rng;
    for (let i = -5; i <= 4; i++) {
      for (let j = -5; j <= 4; j++) {
        const bx = 28 + i * 56, bz = 28 + j * 56;
        if (this._skipBlock(bx, bz)) continue;
        const w = rng.float(24, 36), d = rng.float(24, 36);
        const h = rng.float(10, 46);
        const color = rng.pick(PALETTE);
        const b = this._box(w, h, d, color, bx, h / 2, bz);
        this.colliders.push({ x: bx, z: bz, hx: w / 2 + 0.5, hz: d / 2 + 0.5 });
        // Roof cap, varied colour.
        this._box(w + 0.6, 0.8, d + 0.6, rng.pick(ROOF), bx, h + 0.4, bz);
        // Storefront band + awning on the street side.
        const sc = rng.pick(STORE);
        this._box(w * 0.9, 3.2, 0.6, sc, bx, 1.6, bz - d / 2 - 0.1);
        const awn = this._box(w * 0.9, 0.3, 3.4, sc, bx, 3.6, bz - d / 2 - 1.8, { rx: 0.35 });
        awn.material = new THREE.MeshLambertMaterial({ color: sc });
        // Lit windows: small emissive planes on two faces.
        const winMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
        const rows = Math.max(1, Math.floor(h / 7));
        for (let r = 0; r < rows; r++) {
          for (let cI = -1; cI <= 1; cI++) {
            if (rng.chance(0.45)) continue;
            const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), winMat);
            win.position.set(bx + cI * (w / 3.4), 6 + r * 6.5, bz - d / 2 - 0.15);
            win.rotation.y = Math.PI;
            this.group.add(win);
          }
        }
        // Roof props.
        if (h > 30) {
          // Water tower.
          const tx = bx + w * 0.22, tz = bz - d * 0.2;
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4.5, 10), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
          tank.position.set(tx, h + 4.5, tz); this.group.add(tank);
          const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2, 10), new THREE.MeshLambertMaterial({ color: 0x5a3a2a }));
          cone.position.set(tx, h + 7.8, tz); this.group.add(cone);
        }
        if (h > 38) {
          // Antenna + red beacon.
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 12, 6), new THREE.MeshLambertMaterial({ color: 0x888888 }));
          ant.position.set(bx - w * 0.25, h + 6, bz + d * 0.2); this.group.add(ant);
          const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
          beacon.position.set(bx - w * 0.25, h + 12.4, bz + d * 0.2);
          beacon.name = 'beacon';
          this.group.add(beacon);
        }
      }
    }
  }
  _tower() {
    // Solmar Tower: 3 tiers + spire + crown lights + neon SOLMAR.
    const cx = 84, cz = 140;
    const tiers = [[30, 34, 30], [22, 26, 22], [14, 18, 14]];
    let y = 0;
    for (const [w, h, d] of tiers) {
      this._box(w, h, d, 0x9ab0c8, cx, y + h / 2, cz);
      y += h;
    }
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 26, 8), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
    spire.position.set(cx, y + 13, cz); this.group.add(spire);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3344 }));
    tip.position.set(cx, y + 27, cz); this.group.add(tip);
    // Crown lights.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
      l.position.set(cx + Math.cos(a) * 8, y - 1, cz + Math.sin(a) * 8);
      this.group.add(l);
    }
    // Neon sign facing the plaza (south face).
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 6.5),
      new THREE.MeshBasicMaterial({ map: neonTexture('SOLMAR', '#ff5a8a', '#101018'), transparent: true })
    );
    sign.position.set(cx, y - 8, cz - 15.4);
    sign.rotation.y = Math.PI;
    this.group.add(sign);
    this.colliders.push({ x: cx, z: cz, hx: 16, hz: 16 });
  }
  _docks() {
    // East docks: concrete apron, 2 corrugated warehouses, 8 container
    // stacks, gantry crane. Container yard = mission 2 / 4 ground.
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(84, 112), new THREE.MeshLambertMaterial({ color: 0x8a8a86 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(238, 0.04, 140);
    this.group.add(apron);
    // Warehouses.
    for (const [wx, wz] of [[216, 100], [216, 184]]) {
      this._box(30, 12, 26, 0x6a7a8a, wx, 6, wz);
      this._box(31, 1, 27, 0x4a5a6a, wx, 12.5, wz);
      this.colliders.push({ x: wx, z: wz, hx: 15.5, hz: 13.5 });
    }
    // 8 container stacks.
    const spots = [[244, 120], [252, 120], [244, 140], [252, 140], [244, 168], [252, 168], [236, 196], [252, 196]];
    spots.forEach(([x, z], idx) => {
      const n = 1 + (idx % 3);
      const c = CONTAINER[idx % CONTAINER.length];
      for (let s = 0; s < n; s++) {
        this._box(9, 3, 3.4, c, x, 1.5 + s * 3, z, { ry: idx % 2 ? Math.PI / 2 : 0 });
      }
      this.colliders.push({ x, z, hx: 5, hz: 5 });
    });
    // Gantry crane.
    const legMat = new THREE.MeshLambertMaterial({ color: 0xd8a83a });
    for (const [lx, lz] of [[228, 116], [248, 116], [228, 164], [248, 164]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 26, 1.6), legMat);
      leg.position.set(lx, 13, lz); this.group.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(34, 2, 2.4), legMat);
    beam.position.set(238, 26, 140); this.group.add(beam);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 12, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    cable.position.set(238, 20, 140); this.group.add(cable);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    hook.position.set(238, 13.5, 140); this.group.add(hook);
  }
  _plaza() {
    // Central plaza (28,28): fountain + benches.
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x9a8a72 }));
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(28, 0.03, 28);
    this.group.add(slab);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 1.4, 16), new THREE.MeshLambertMaterial({ color: 0x7a8a9a }));
    basin.position.set(28, 0.7, 28); this.group.add(basin);
    const jet = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 10), new THREE.MeshLambertMaterial({ color: 0x9ad8f0, transparent: true, opacity: 0.55 }));
    jet.position.set(28, 3.6, 28); this.group.add(jet);
    this.colliders.push({ x: 28, z: 28, hx: 7, hz: 7 });
  }
  _palmsAndLamps() {
    const rng = this.rng;
    // Palms along the bayfront + scattered on sidewalks.
    for (let i = 0; i < 46; i++) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 7), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
      trunk.position.y = 3.5;
      trunk.rotation.z = rng.float(-0.12, 0.12);
      g.add(trunk);
      const crownMat = new THREE.MeshLambertMaterial({ color: 0x2a8a3a });
      for (let k = 0; k < 6; k++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 5), crownMat);
        const a = (k / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
        leaf.rotation.z = Math.cos(a) * 0.9;
        leaf.rotation.x = -Math.sin(a) * 0.9;
        g.add(leaf);
      }
      let x, z;
      if (i < 16) { x = -240 + i * 32; z = 246; }
      else { x = rng.float(-260, 260); z = rng.float(-260, 260); }
      g.position.set(x, 0, z);
      this.group.add(g);
      this.palms.push(g);
    }
    // Street lamps at intersections.
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (let k = -4; k <= 4; k++) {
      for (const [lx, lz] of [[k * 56 + 9, k * 56 + 9], [k * 56 - 9, -k * 56 - 9]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7, 6), poleMat);
        pole.position.set(lx, 3.5, lz); this.group.add(pole);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), headMat);
        head.position.set(lx, 7.1, lz); this.group.add(head);
      }
    }
  }
  hidePalmsNear(x, z, r) {
    for (const p of this.palms) {
      const dx = p.position.x - x, dz = p.position.z - z;
      p.visible = dx * dx + dz * dz > r * r;
    }
  }
  showAllPalms() { for (const p of this.palms) p.visible = true; }
  // Push a circle (player / car) out of building AABBs.
  collide(px, pz, r) {
    let x = px, z = pz;
    for (const c of this.colliders) {
      const dx = x - c.x, dz = z - c.z;
      const ox = c.hx + r - Math.abs(dx), oz = c.hz + r - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) x = c.x + Math.sign(dx || 1) * (c.hx + r);
        else z = c.z + Math.sign(dz || 1) * (c.hz + r);
      }
    }
    const H = 274;
    x = Math.max(-H, Math.min(H, x));
    z = Math.max(-H, Math.min(H, z));
    return { x, z };
  }
}
