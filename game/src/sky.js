// Sky: gradient dome + sun/moon discs + drifting clouds + night stars.
// Three times of day (day / dusk / night) that recolor fog, lights and
// the dome together.
const THREE = window.THREE;

const MODES = {
  day:  { top: 0x3d7ac8, mid: 0x8ec8ee, bot: 0xcfe8f5, sun: 0xfff2c0, fog: 0x9fc6e8, hemi: 0.9, sunI: 1.15, amb: 0.55 },
  dusk: { top: 0x2a2350, mid: 0xd86a4a, bot: 0xf5a55c, sun: 0xff8833, fog: 0xc97a5a, hemi: 0.6, sunI: 0.7,  amb: 0.4 },
  night:{ top: 0x050914, mid: 0x0e1a33, bot: 0x1c2a44, sun: 0xdde6ff, fog: 0x0a1226, hemi: 0.28, sunI: 0.12, amb: 0.22 },
};

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.mode = 'dusk';
    this.group = new THREE.Group();
    // Gradient dome: big sphere, BackSide, vertex colors blended by height.
    const geo = new THREE.SphereGeometry(900, 24, 16);
    const colors = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 900;
      colors.push(1, 1, 1);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    this.dome = new THREE.Mesh(geo, this.domeMat);
    this.group.add(this.dome);
    // Sun / moon disc.
    this.sun = new THREE.Mesh(
      new THREE.CircleGeometry(34, 32),
      new THREE.MeshBasicMaterial({ color: 0xff8833, fog: false, transparent: true, opacity: 0.95 })
    );
    this.sun.position.set(-420, 300, -620);
    this.sun.lookAt(0, 0, 0);
    this.group.add(this.sun);
    this.moon = new THREE.Mesh(
      new THREE.CircleGeometry(20, 32),
      new THREE.MeshBasicMaterial({ color: 0xdde6ff, fog: false, transparent: true, opacity: 0.9 })
    );
    this.moon.position.set(380, 380, -560);
    this.moon.lookAt(0, 0, 0);
    this.moon.visible = false;
    this.group.add(this.moon);
    // Stars (night only).
    const starGeo = new THREE.BufferGeometry();
    const sp = [];
    for (let i = 0; i < 420; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.08;
      const r = 880;
      sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, fog: false, transparent: true, opacity: 0 }));
    this.group.add(this.stars);
    // Drifting clouds: flattened white blobs.
    this.clouds = [];
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(14 + Math.random() * 16, 8, 6), cloudMat);
        s.position.set(j * 18 - n * 9, Math.random() * 4, Math.random() * 10 - 5);
        s.scale.y = 0.35;
        c.add(s);
      }
      c.position.set(Math.random() * 1200 - 600, 180 + Math.random() * 90, Math.random() * 1200 - 600);
      c.userData.speed = 1.5 + Math.random() * 2;
      this.clouds.push(c);
      this.group.add(c);
    }
    scene.add(this.group);
    this.setMode('dusk');
  }
  _lerpColor(hexA, hexB, t, out) {
    const a = new THREE.Color(hexA), b = new THREE.Color(hexB);
    out.copy(a).lerp(b, t);
    return out;
  }
  setMode(mode) {
    this.mode = mode;
    const m = MODES[mode];
    const pos = this.dome.geometry.attributes.position;
    const col = this.dome.geometry.attributes.color;
    const top = new THREE.Color(m.top), mid = new THREE.Color(m.mid), bot = new THREE.Color(m.bot);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 900; // -1..1
      if (y > 0.12) tmp.copy(mid).lerp(top, Math.min(1, (y - 0.12) / 0.6));
      else if (y < -0.05) tmp.copy(mid).lerp(bot, Math.min(1, (-0.05 - y) / 0.5));
      else tmp.copy(mid);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
    this.sun.material.color.setHex(m.sun);
    this.sun.visible = mode !== 'night';
    this.moon.visible = mode === 'night';
    this.stars.material.opacity = mode === 'night' ? 0.95 : 0;
    this.scene.fog = new THREE.Fog(m.fog, 220, 900);
    this.scene.background = new THREE.Color(m.fog);
    return m;
  }
  update(dt) {
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 650) c.position.x = -650;
    }
    this.group.position.x = 0; // dome follows nothing; city is centered at origin
  }
}
