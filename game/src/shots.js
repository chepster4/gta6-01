// Screenshot staging: ?shot=heli | roadblock | race | wheel | night |
// start | play. Each shot stages the world so ONE frame shows the new
// feature clearly (heli + searchlight, roadblock, race checkpoints,
// weapon wheel). Sets window.__shotReady when the frame is settled.
const THREE = window.THREE;

export function applyShot(G, shot) {
  const p = G.player;
  const place = (x, z, angle) => {
    p.pos.x = x; p.pos.z = z; p.angle = angle;
    if (p.car) { G.vehicles.exit(p); }
    G.render.shotMode = true;
    G.city.showAllPalms();
  };
  const settle = () => {
    // Keep the centre of the frame clear: no mission banner, no flash.
    G.hud.bannerEl.style.display = 'none';
    G.hud._bannerTimer = 0;
    G.hud.flashEl.textContent = '';
    G.hud._flashTimer = 0;
    setTimeout(() => { window.__shotReady = true; }, 1200);
    G.render.shotMode = true;
  };
  const override = (px, py, pz, lx, ly, lz) => {
    G.render.shotOverride = { pos: new THREE.Vector3(px, py, pz), look: new THREE.Vector3(lx, ly, lz) };
  };
  if (shot === 'heli') {
    G.sky.setMode('night'); G.render.applyMode('night');
    p.wanted = 4;
    place(0, -40, Math.PI * 0.15);
    G.police.update(0.5, p);
    // Park the heli low and close so it fills the upper frame, then
    // point the camera up at it.
    G.police.heliPos.x = 2; G.police.heliPos.z = -40; G.police.heliPos.y = 34;
    G.police.heli.position.set(2, 34, -40);
    override(-2, 6, -12, 2, 32, -40);
    G.city.hidePalmsNear(p.pos.x, p.pos.z, 30);
    settle();
  } else if (shot === 'roadblock') {
    G.sky.setMode('dusk'); G.render.applyMode('dusk');
    p.wanted = 3;
    place(0, 60, Math.PI);
    G.police.update(0.5, p);
    // Roadblock spawns 24 m ahead of the player (z = 84): frame it
    // head-on from just behind the player.
    override(3, 6, 52, 0, 2, 84);
    G.city.hidePalmsNear(p.pos.x, p.pos.z, 30);
    settle();
  } else if (shot === 'race') {
    G.sky.setMode('day'); G.render.applyMode('day');
    p.wanted = 0;
    const car = G.vehicles.cars[0];
    car.x = 0; car.z = -200; car.angle = Math.PI / 2; car.mesh.position.set(0, 0, -200); car.mesh.rotation.y = car.angle;
    G.vehicles.enter(car, p);
    G.missions._startRace(1);
    override(14, 11, -166, 0, 2, -200);
    settle();
  } else if (shot === 'wheel') {
    G.sky.setMode('dusk'); G.render.applyMode('dusk');
    p.wanted = 2;
    p.weapons = { pistol: true, smg: true, shotgun: true, rifle: true };
    p.ammo = { pistol: 60, smg: 120, shotgun: 24, rifle: 40 };
    place(120, -20, Math.PI * 0.9);
    G._wheelStaged = true;
    G.hud.showWheel(true);
    override(108, 10, 2, 120, 2, -20);
    settle();
  } else if (shot === 'night') {
    G.sky.setMode('night'); G.render.applyMode('night');
    p.wanted = 2;
    place(28, 60, Math.PI * 0.8);
    G.city.hidePalmsNear(p.pos.x, p.pos.z, 30);
    settle();
  } else if (shot === 'start') {
    // Leave the start screen up; the game world idles behind it.
    window.__shotReady = true;
  } else {
    // play: default dusk gameplay at the plaza.
    G.sky.setMode('dusk'); G.render.applyMode('dusk');
    place(28, 60, Math.PI * 0.8);
    settle();
  }
  if (shot && shot !== 'start') G.hud.hideStart();
}
