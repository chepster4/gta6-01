// The wanted system: stars 1–5, police cruisers that spawn ahead of the
// player and ram them, and a helicopter with a searchlight at 3+ stars.
// Stars decay when the player stays out of trouble (or hides at the safehouse).
import * as THREE from '../vendor/three.min.js';
import { WANTED } from './config.js';
import { createCarMesh, createCarState, driveCar, syncCarMesh } from './vehicles.js';

const POLICE_COLOR = 0x1a1a1a;

function spawnDistance() {
  return 55 + Math.random() * 30;
}

export function createPolice(scene, collide) {
  const cruisers = [];
  const heliGroup = new THREE.Group();
  // Helicopter: body, tail, rotor and a searchlight cone.
  const heliBody = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x2a2a34 }),
  );
  heliGroup.add(heliBody);
  const heliTail = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 5),
    new THREE.MeshLambertMaterial({ color: 0x2a2a34 }),
  );
  heliTail.position.set(0, 0.3, -5);
  heliGroup.add(heliTail);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.12, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x141414 }),
  );
  rotor.position.y = 1;
  heliGroup.add(rotor);
  const spot = new THREE.SpotLight(0xfff2b0, 300, 90, 0.35, 0.5, 1.2);
  heliGroup.add(spot);
  heliGroup.add(spot.target);
  const spotCone = new THREE.Mesh(
    new THREE.ConeGeometry(6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  spotCone.rotation.x = Math.PI;
  spotCone.position.y = -13;
  heliGroup.add(spotCone);
  heliGroup.visible = false;
  scene.add(heliGroup);
  const heli = { group: heliGroup, rotor, spot, angle: 0, x: 0, z: 0 };

  function spawnCruiser(px, pz, heading) {
    const mesh = createCarMesh(POLICE_COLOR, { police: true, cabinColor: 0xe8e8e8 });
    scene.add(mesh);
    const a = Math.random() * Math.PI * 2;
    const state = createCarState(px + Math.sin(a) * spawnDistance(), pz + Math.cos(a) * spawnDistance(), heading);
    const cruiser = { mesh, state, ramCooldown: 0 };
    cruisers.push(cruiser);
    return cruiser;
  }

  return {
    cruisers,
    heli,
    wanted: 0,
    decayTimer: 0,
    setWanted(stars) {
      this.wanted = Math.max(0, Math.min(WANTED.max, stars));
      this.decayTimer = 0;
    },
    /** Stage cruisers at exact spots (screenshot mode): no randomness. */
    stageCruisers(specs) {
      while (cruisers.length < specs.length) spawnCruiser(0, 0, 0);
      while (cruisers.length > specs.length) {
        const gone = cruisers.pop();
        scene.remove(gone.mesh);
      }
      specs.forEach((s, i) => {
        cruisers[i].state.x = s.x;
        cruisers[i].state.z = s.z;
        cruisers[i].state.heading = s.heading;
        cruisers[i].state.speed = s.speed ?? 18;
        syncCarMesh(cruisers[i].mesh, cruisers[i].state);
      });
    },
    addWanted(stars) {
      this.setWanted(this.wanted + stars);
    },
    update(dt, player, inCar, playerSpeed) {
      const px = player.x; const pz = player.z;
      // Keep the right number of cruisers on the street.
      const want = WANTED.cars[this.wanted] ?? 0;
      while (cruisers.length < want) spawnCruiser(px, pz, player.heading);
      while (cruisers.length > want) {
        const gone = cruisers.pop();
        scene.remove(gone.mesh);
      }
      // Each cruiser steers at the player and rams; a hit hurts and slows.
      for (const cruiser of cruisers) {
        const dx = px - cruiser.state.x;
        const dz = pz - cruiser.state.z;
        const dist = Math.hypot(dx, dz) || 1;
        const targetHeading = Math.atan2(dx, dz);
        let diff = targetHeading - cruiser.state.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, diff * 2));
        const throttle = dist > 6 ? 1 : 0.4;
        driveCar(cruiser.state, throttle, steer, false, dt, collide);
        syncCarMesh(cruiser.mesh, cruiser.state);
        cruiser.ramCooldown -= dt;
        if (dist < 3.4 && cruiser.ramCooldown <= 0) {
          cruiser.ramCooldown = 1.2;
          player.hp = Math.max(0, player.hp - 6);
          cruiser.state.speed *= 0.3;
          if (player.onDamage) player.onDamage(6);
        }
        // Flashing light bar.
        const mat = cruiser.mesh.userData.lightbarMat;
        if (mat) mat.color.set(Math.floor(performance.now() / 300) % 2 === 0 ? 0xff2020 : 0x2040ff);
      }
      // Helicopter circles above at 3+ stars.
      if (this.wanted >= WANTED.heliAt) {
        heliGroup.visible = true;
        heli.angle += dt * 0.5;
        heli.x = px + Math.cos(heli.angle) * 26;
        heli.z = pz + Math.sin(heli.angle) * 26;
        heliGroup.position.set(heli.x, 42, heli.z);
        heliGroup.rotation.y = -heli.angle;
        rotor.rotation.y += dt * 22;
        spot.target.position.set(px - heli.x, -42, pz - heli.z);
        spot.target.updateMatrixWorld();
      } else {
        heliGroup.visible = false;
      }
      // Stars decay slowly when the player is not actively committing crimes.
      if (this.wanted > 0) {
        this.decayTimer += dt;
        if (this.decayTimer >= WANTED.decaySeconds) {
          this.decayTimer = 0;
          this.wanted -= 1;
        }
      }
    },
  };
}
