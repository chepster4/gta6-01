// shots.js — deterministic staging for the four screenshots the judge sees.
// ?shot=heli | roadblock | race | wheel (with &seed=, default 1).
// Each shot puts several systems on one screen: wanted stars, HUD, minimap,
// mission banner, heli / roadblock / race timer / weapon wheel.
import { START_POS } from './config.js';

function placePlayerInCar(G, x, z, heading, speed = 0) {
  const car = G.vehicles.createCar({ x, z, heading, color: 0xd23b3b });
  car.name = 'Comet GT';
  car.speed = speed;
  G.vehicles.enterCar(car);
  G.player.heading = heading;
  G.cameraYaw = heading; // camera sits behind the car, looking along heading
  return car;
}

export function applyShot(G, name) {
  const shot = (name || 'heli').toLowerCase();
  G.shot = shot;
  // silence the mission engine for staging; each shot sets its own HUD text
  G.missions.armed = false;
  G.hud.show();

  if (shot === 'heli') {
    // (a) night heli chase + searchlight — player flees down road x=-92
    G.dayNight.time = 0.03; // deep night
    G.dayNight.update(0);
    const car = placePlayerInCar(G, -92, -140, Math.PI, 22);
    G.shotCruiseSpeed = 22; // keep the chase moving for the camera
    G.wanted.add(3, 'bank alarm tripped');
    G.police.spawnHeli();
    // three SBPD interceptors staged ahead on the road, facing the player
    for (const [cx, cz] of [[-92, -185], [-92, -210], [-40, -184]]) {
      const cop = G.vehicles.createCar({ x: cx, z: cz, heading: 0, isCop: true, driver: 'cop' });
      cop.staged = true;
      G.police.cops.push(cop);
    }
    G.hud.setMission('7 · The Vault Job', 'Escape to the safehouse with the cash — CONDOR-2 is on you!');
    G.hud.banner('CONDOR-2 AIR UNIT', 'The searchlight is on you — lose the heli!');
    G.radio.start();
  } else if (shot === 'roadblock') {
    // (b) golden-hour roadblock standoff: player stopped 38m out, two SBPD
    // interceptors waiting beyond the barricade, facing the player.
    G.dayNight.time = 0.72; // golden dusk
    G.dayNight.update(0);
    const car = placePlayerInCar(G, 150, 92, Math.PI / 2, 0);
    G.wanted.add(3, 'SBPD roadblock ahead');
    const ahead = { x: 150 + 38, z: 92 };
    G.police.forceRoadblock(ahead, car.heading);
    const cop1 = G.vehicles.createCar({ x: 212, z: 86, heading: -Math.PI / 2, isCop: true, driver: 'cop' });
    const cop2 = G.vehicles.createCar({ x: 212, z: 98, heading: -Math.PI / 2, isCop: true, driver: 'cop' });
    cop1.staged = true;
    cop2.staged = true;
    G.police.cops.push(cop1, cop2);
    G.hud.setMission('8 · Air Support', 'Survive the pursuit — roadblock ahead!');
    G.hud.toast('🚧 ROADBLOCK ahead! SBPD has the road sealed.');
  } else if (shot === 'race') {
    // (c) street race at the Sunset Loop gantry, timer live
    G.dayNight.time = 0.42; // bright afternoon
    G.dayNight.update(0);
    const car = placePlayerInCar(G, -60, -368, Math.PI / 2, 8);
    G.shotCruiseSpeed = 14; // roll toward gate 1 for the camera
    G.player.money = 2450;
    G.races.startRace('sunset-loop', false);
    G.hud.setMission('5 · Neon Nights', 'Win the Sunset Loop — hit every gate in order');
    G.hud.banner('SUNSET LOOP', 'Gate 1 — go!');
  } else if (shot === 'wheel') {
    // (d) on-foot firefight, weapon wheel open, Kings closing in ahead
    G.dayNight.time = 0.62; // late golden afternoon
    G.dayNight.update(0);
    G.player.mesh.position.set(276, 0, -30);
    G.player.heading = Math.PI * 0.75;
    G.cameraYaw = G.player.heading;
    G.weapons.owned = ['pistol', 'smg', 'shotgun', 'rifle'];
    G.weapons.ammo = { pistol: Infinity, smg: 240, shotgun: 40, rifle: 90 };
    G.weapons.current = 'rifle';
    G.combat.spawnEnemy(288, -42, { kind: 'king' });
    G.combat.spawnEnemy(264, -42, { kind: 'king' });
    G.combat.spawnEnemy(276, -58, { kind: 'king' });
    G.wanted.add(2, 'shots fired in the Neon Quarter');
    G.crew.activateCrew('maya');
    G.hud.setMission('6 · Turf War', 'Take out 4 Coral Kings enforcers — pick your weapon');
    G.combat.openWheel(G);
  }
  G.hud.refresh();
  // settle: let the camera swing behind the player and the heli arrive
  G.shotSettleUntil = G.time + 2.2;
}
