// effects.js — cheap transient effects: tracers, muzzle flashes, hit
// sparks, explosions (flash + smoke + debris), fire puffs and blood puffs.
// Everything is pooled meshes that fade out; nothing allocates per frame.
import * as THREE from 'three';

export function initEffects(G) {
  const scene = G.scene;
  const pool = [];
  const bursts = [];

  function getMesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    scene.add(m);
    return m;
  }
  const tracerGeo = new THREE.BoxGeometry(0.12, 0.12, 1);
  const sparkGeo = new THREE.SphereGeometry(0.5, 6, 5);
  const puffGeo = new THREE.SphereGeometry(1, 8, 6);

  G.effects = {
    tracer(from, to, color = 0xffe9a3) {
      const m = getMesh(tracerGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const len = from.distanceTo(to);
      m.position.copy(mid);
      m.scale.set(1, 1, Math.max(0.5, len));
      m.lookAt(to);
      m.visible = true;
      bursts.push({ mesh: m, ttl: 0.09, max: 0.09 });
    },
    muzzle(origin, dir) {
      const m = getMesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 1 }));
      m.position.copy(origin).add(dir.clone().multiplyScalar(1.2));
      m.scale.setScalar(1.6);
      m.visible = true;
      bursts.push({ mesh: m, ttl: 0.07, max: 0.07 });
    },
    hitSpark(pos) {
      const m = getMesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xff8030, transparent: true, opacity: 1 }));
      m.position.copy(pos);
      m.scale.setScalar(1.1);
      m.visible = true;
      bursts.push({ mesh: m, ttl: 0.25, max: 0.25 });
    },
    bloodPuff(pos) {
      const m = getMesh(puffGeo, new THREE.MeshBasicMaterial({ color: 0x8a1020, transparent: true, opacity: 0.85 }));
      m.position.copy(pos).add(new THREE.Vector3(0, 1, 0));
      m.scale.setScalar(1.4);
      m.visible = true;
      bursts.push({ mesh: m, ttl: 0.5, max: 0.5 });
    },
    firePuff(pos) {
      const m = getMesh(puffGeo, new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.8 }));
      m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.2, (Math.random() - 0.5) * 2));
      m.scale.setScalar(1 + Math.random());
      m.visible = true;
      bursts.push({ mesh: m, ttl: 0.4, max: 0.4, rise: true });
    },
    explosion(pos) {
      // flash sphere + smoke column + debris sparks
      const flash = getMesh(new THREE.SphereGeometry(3.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffc44d, transparent: true, opacity: 0.95 }));
      flash.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0));
      flash.visible = true;
      bursts.push({ mesh: flash, ttl: 0.35, max: 0.35, grow: true });
      for (let i = 0; i < 6; i++) {
        const s = getMesh(puffGeo, new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.75 }));
        s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4));
        s.scale.setScalar(1.5 + Math.random() * 1.5);
        s.visible = true;
        bursts.push({ mesh: s, ttl: 1.4, max: 1.4, rise: true });
      }
      for (let i = 0; i < 5; i++) {
        const sp = getMesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xff9030, transparent: true, opacity: 1 }));
        sp.position.copy(pos).add(new THREE.Vector3(0, 1, 0));
        sp.visible = true;
        bursts.push({ mesh: sp, ttl: 0.5, max: 0.5, vel: new THREE.Vector3((Math.random() - 0.5) * 14, 6 + Math.random() * 8, (Math.random() - 0.5) * 14) });
      }
      // ground scorch
      const scorch = getMesh(new THREE.CircleGeometry(3.4, 16), new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.7 }));
      scorch.rotation.x = -Math.PI / 2;
      scorch.position.copy(pos).add(new THREE.Vector3(0, 0.15, 0));
      scorch.visible = true;
      bursts.push({ mesh: scorch, ttl: 20, max: 20, fadeLate: true });
    },
    update(dt) {
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.ttl -= dt;
        if (b.ttl <= 0) {
          scene.remove(b.mesh);
          b.mesh.geometry.dispose();
          b.mesh.material.dispose();
          bursts.splice(i, 1);
          continue;
        }
        const k = b.ttl / b.max;
        if (b.mesh.material.transparent) b.mesh.material.opacity = b.fadeLate ? (k < 0.2 ? k * 3.5 : 0.7) : k * 0.95;
        if (b.grow) b.mesh.scale.setScalar(1 + (1 - k) * 3);
        if (b.rise) b.mesh.position.y += dt * 2.2;
        if (b.vel) {
          b.mesh.position.addScaledVector(b.vel, dt);
          b.vel.y -= 22 * dt;
        }
      }
    },
  };
}
