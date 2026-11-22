// Renderer, lights and third-person camera. In shot mode the camera
// snaps straight to its staged position (no lerp) so screenshots are
// deterministic even under SwiftShader.
const THREE = window.THREE;

export class Render {
  constructor(G) {
    this.G = G;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    document.getElementById('game').appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 30, 60);
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a2a1a, 0.7);
    G.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe0b0, 0.9);
    this.sun.position.set(-120, 180, -80);
    G.scene.add(this.sun);
    // Warm fill light that follows the player so night shots stay readable.
    this.fill = new THREE.PointLight(0xffc880, 0.9, 55, 1.6);
    G.scene.add(this.fill);
    this.camPos = new THREE.Vector3(0, 30, 60);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.shotMode = false;
    this.shotOverride = null; // { pos: Vector3, look: Vector3 } — staged shot framing
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  applyMode(mode) {
    const m = { day: [0.9, 1.15], dusk: [0.6, 0.7], night: [0.28, 0.12] }[mode];
    this.hemi.intensity = m[0];
    this.sun.intensity = m[1];
    this.sun.color.setHex(mode === 'night' ? 0x9ab0ff : mode === 'dusk' ? 0xff9a5a : 0xffe0b0);
    this.fill.intensity = mode === 'night' ? 1.4 : mode === 'dusk' ? 0.9 : 0.25;
  }
  update(dt, player) {
    const p = player.pos;
    this.fill.position.set(p.x, 6, p.z);
    this.sun.position.set(p.x - 120, 180, p.z - 80);
    this.sun.target.position.set(p.x, 0, p.z);
    this.sun.target.updateMatrixWorld();
    if (this.shotMode && this.shotOverride) {
      this.camera.position.copy(this.shotOverride.pos);
      this.camera.lookAt(this.shotOverride.look);
      return;
    }
    const dist = player.car ? 26 : 17;
    const height = player.car ? 11 : 9;
    const backX = Math.sin(player.angle) * dist;
    const backZ = Math.cos(player.angle) * dist;
    const tx = p.x + backX, tz = p.z + backZ, ty = height;
    const lx = p.x - Math.sin(player.angle) * 8, lz = p.z - Math.cos(player.angle) * 8;
    if (this.shotMode) {
      this.camPos.set(tx, ty, tz);
      this.camLook.set(lx, 2, lz);
    } else {
      const k = 1 - Math.pow(0.001, dt);
      this.camPos.x += (tx - this.camPos.x) * k;
      this.camPos.y += (ty - this.camPos.y) * k;
      this.camPos.z += (tz - this.camPos.z) * k;
      this.camLook.x += (lx - this.camLook.x) * k;
      this.camLook.y += (2 - this.camLook.y) * k;
      this.camLook.z += (lz - this.camLook.z) * k;
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }
  render(scene) { this.renderer.render(scene, this.camera); }
}
