// The five chained jobs of Palmira Bay: steal a car for Rosa, run a package
// to the docks, outrun a 3-star pursuit to the safehouse, break up the Viper
// deal at the container yard, and take the crown at Solmar Tower. Each job
// has a glowing beacon marker, a HUD brief with a live distance, and a cash
// reward; job 1 also hands over the pistol.
import * as THREE from '../vendor/three.min.js';
import { MISSIONS } from './config.js';

export function createMissions(scene) {
  // Beacon: a glowing column plus a spinning diamond over the target.
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xffd040, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 60, 12, 1, true), beaconMat);
  scene.add(beacon);
  const diamondMat = new THREE.MeshBasicMaterial({ color: 0xffd040 });
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), diamondMat);
  scene.add(diamond);

  let index = 0; // current job (0-based)
  let phase = 'go'; // go | thugs | briefcase | done
  let thugsLeft = 0;
  let completed = 0;

  function target() {
    return MISSIONS[index].target;
  }

  function placeBeacon() {
    const t = target();
    beacon.position.set(t.x, 30, t.z);
    diamond.position.set(t.x, 9, t.z);
    beacon.visible = true;
    diamond.visible = true;
  }
  placeBeacon();

  return {
    get index() { return index; },
    get current() { return MISSIONS[index] ?? null; },
    get phase() { return phase; },
    get completed() { return completed; },
    get allDone() { return index >= MISSIONS.length; },
    target,
    beaconPos() {
      const t = target();
      return { x: t.x, z: t.z };
    },
    update(dt, playerX, playerZ, inCar) {
      diamond.rotation.y += dt * 2;
      diamond.position.y = 9 + Math.sin(performance.now() / 400) * 0.8;
      if (this.allDone) {
        beacon.visible = false;
        diamond.visible = false;
        return null;
      }
      const job = MISSIONS[index];
      const t = job.target;
      const dist = Math.hypot(playerX - t.x, playerZ - t.z);
      if (job.id === 1) {
        if (inCar) return { complete: true, job };
      } else if (job.id === 2 || job.id === 3 || job.id === 5) {
        if (dist < 9) return { complete: true, job };
      } else if (job.id === 4) {
        if (phase === 'thugs' && thugsLeft <= 0) {
          phase = 'briefcase';
          return { briefcase: true, job };
        }
        if (phase === 'briefcase' && dist < 6) return { complete: true, job };
      }
      return null;
    },
    /** Job 4 starts its thug phase (the world spawns the three rivals). */
    startThugs() {
      phase = 'thugs';
      thugsLeft = 3;
    },
    thugDown() {
      thugsLeft = Math.max(0, thugsLeft - 1);
    },
    get thugsLeft() { return thugsLeft; },
    /** Advance to the next job; returns the finished job's reward info. */
    advance() {
      const job = MISSIONS[index];
      completed += 1;
      index += 1;
      phase = 'go';
      thugsLeft = 0;
      if (index < MISSIONS.length) placeBeacon();
      else {
        beacon.visible = false;
        diamond.visible = false;
      }
      return job;
    },
    /** For shots/tests: jump straight to a job, with its wanted level set. */
    jumpTo(n) {
      index = Math.max(0, Math.min(MISSIONS.length - 1, n));
      phase = 'go';
      thugsLeft = 0;
      placeBeacon();
      if (MISSIONS[index].id === 4) this.startThugs();
      return MISSIONS[index];
    },
    brief() {
      if (this.allDone) return 'ALL JOBS DONE — you are the King of Palmira!';
      const job = MISSIONS[index];
      if (job.id === 4 && phase === 'thugs') return 'Drop all three Viper thugs';
      if (job.id === 4 && phase === 'briefcase') return 'Grab the briefcase';
      return job.brief;
    },
  };
}
