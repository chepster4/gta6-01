// Side activities: SOLMAR ARMS gun shop, safehouse, 12 hidden gold
// coins and the garage. Positions are fixed so missions and screenshots
// can stage against them deterministically.
const THREE = window.THREE;
import { COINS, SHOP } from './config.js';

function neonTexture(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.font = 'bold 64px Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = fg; g.shadowBlur = 24;
  g.fillStyle = fg; g.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export class World {
  constructor(scene, G) {
    this.scene = scene; this.G = G;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.shopPos = { x: 120, z: -40 };
    this.safePos = { x: 168, z: -196 };
    this.garagePos = { x: -140, z: 84 };
    this.coins = [];
    this._shop();
    this._safehouse();
    this._garage();
    this._coins();
  }
  _sign(text, fg, w, h, x, y, z, ry = 0) {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: neonTexture(text, fg, '#0c0c14'), transparent: true })
    );
    s.position.set(x, y, z); s.rotation.y = ry;
    this.group.add(s);
    return s;
  }
  _shop() {
    const { x, z } = this.shopPos;
    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), new THREE.MeshLambertMaterial({ color: 0x2a2a33 }));
    kiosk.position.set(x, 2.5, z); this.group.add(kiosk);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 9), new THREE.MeshLambertMaterial({ color: 0xd84a4a }));
    roof.position.set(x, 5.3, z); this.group.add(roof);
    this._sign('SOLMAR ARMS', '#ffcc33', 11, 2.6, x, 7.2, z - 4.2, Math.PI);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    door.position.set(x, 1.8, z - 4.05); door.rotation.y = Math.PI; this.group.add(door);
    this.G.city.colliders.push({ x, z, hx: 5.5, hz: 4.5 });
  }
  _safehouse() {
    const { x, z } = this.safePos;
    const house = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 11), new THREE.MeshLambertMaterial({ color: 0xd8c8a8 }));
    house.position.set(x, 3.5, z); this.group.add(house);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 3.5, 4), new THREE.MeshLambertMaterial({ color: 0x8a3a2a }));
    roof.position.set(x, 8.7, z); roof.rotation.y = Math.PI / 4; this.group.add(roof);
    this._sign('SAFEHOUSE', '#33ff88', 10, 2.4, x, 6.4, z - 5.8, Math.PI);
    // Green zone ring on the ground.
    const ring = new THREE.Mesh(new THREE.RingGeometry(11, 13, 32), new THREE.MeshBasicMaterial({ color: 0x33ff88, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.06, z); this.group.add(ring);
    this.G.city.colliders.push({ x, z, hx: 7.5, hz: 6 });
  }
  _garage() {
    const { x, z } = this.garagePos;
    const b = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 14), new THREE.MeshLambertMaterial({ color: 0x4a4a58 }));
    b.position.set(x, 4, z); this.group.add(b);
    const door = new THREE.Mesh(new THREE.BoxGeometry(12, 5.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x8a8a92 }));
    door.position.set(x, 2.75, z - 7.1); this.group.add(door);
    this._sign('GARAGE — UPGRADE', '#33aaff', 13, 2.6, x, 9.4, z - 7.3, Math.PI);
    this.G.city.colliders.push({ x, z, hx: 10.5, hz: 7.5 });
  }
  _coins() {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffcc22, emissive: 0xaa7700, emissiveIntensity: 0.6 });
    for (const [x, z] of COINS) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 16), mat);
      coin.rotation.x = Math.PI / 2;
      coin.position.set(x, 1.4, z);
      this.group.add(coin);
      this.coins.push({ mesh: coin, x, z, taken: false });
    }
  }
  update(dt, player) {
    // Coins spin + pickup.
    for (const c of this.coins) {
      if (c.taken) continue;
      c.mesh.rotation.y += dt * 2.2;
      c.mesh.position.y = 1.4 + Math.sin(performance.now() * 0.002 + c.x) * 0.25;
      const dx = player.pos.x - c.x, dz = player.pos.z - c.z;
      if (dx * dx + dz * dz < 4.5) {
        c.taken = true;
        c.mesh.visible = false;
        player.money += 25;
        player.coins = (player.coins || 0) + 1;
        this.G.audio.pickup();
        this.G.hud.flash(`+ $25  —  Gold coin ${player.coins}/12`);
      }
    }
    // Safehouse: regen + wanted cooldown.
    const dx = player.pos.x - this.safePos.x, dz = player.pos.z - this.safePos.z;
    if (dx * dx + dz * dz < 13 * 13) {
      player.hp = Math.min(100, player.hp + 4 * dt);
      this._safeTimer = (this._safeTimer || 0) + dt;
      if (this._safeTimer > 4 && player.wanted > 0) {
        player.wanted -= 1;
        this._safeTimer = 0;
        this.G.hud.flash('Wanted level dropped — safehouse');
      }
    } else this._safeTimer = 0;
  }
  nearShop(p) { const dx = p.x - this.shopPos.x, dz = p.z - this.shopPos.z; return dx * dx + dz * dz < 100; }
  nearGarage(p) { const dx = p.x - this.garagePos.x, dz = p.z - this.garagePos.z; return dx * dx + dz * dz < 220; }
  nearSafehouse(p) { const dx = p.x - this.safePos.x, dz = p.z - this.safePos.z; return dx * dx + dz * dz < 169; }
}
