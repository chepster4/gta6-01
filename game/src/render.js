// The renderer: a WebGL renderer with shadows off (SwiftShader-friendly),
// a chase camera that follows behind the player or the car, and a snap mode
// for screenshots so framing never depends on how many frames have run.
import * as THREE from '../vendor/three.min.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 6, -12);

  const camPos = new THREE.Vector3(0, 6, -12);
  const camLook = new THREE.Vector3(0, 1, 0);
  let snapped = false;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    renderer,
    camera,
    /** Follow the player: behind and above, looking slightly ahead. */
    follow(x, z, heading, inCar, dt, snap) {
      const back = inCar ? 13 : 9.5;
      const height = inCar ? 5.5 : 4.6;
      const tx = x - Math.sin(heading) * back;
      const tz = z - Math.cos(heading) * back;
      const lx = x + Math.sin(heading) * 6;
      const lz = z + Math.cos(heading) * 6;
      if (snap || !snapped) {
        camPos.set(tx, height, tz);
        camLook.set(lx, 1.2, lz);
        snapped = true;
      } else {
        const k = 1 - Math.exp(-dt * 5);
        camPos.x += (tx - camPos.x) * k;
        camPos.y += (height - camPos.y) * k;
        camPos.z += (tz - camPos.z) * k;
        camLook.x += (lx - camLook.x) * k;
        camLook.y += (1.2 - camLook.y) * k;
        camLook.z += (lz - camLook.z) * k;
      }
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    },
    /** Put the camera exactly at a staged spot (screenshot mode). */
    place(px, py, pz, lx, ly, lz) {
      camPos.set(px, py, pz);
      camLook.set(lx, ly, lz);
      snapped = true;
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    },
    render(scene) {
      renderer.render(scene, camera);
    },
  };
}
