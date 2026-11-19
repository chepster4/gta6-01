// The screenshot scenes behind ?shot=chase|walk|mission|night. Each one stages
// the real game — a real car, real police, real thugs, a real job banner —
// at a fixed spot, with a fixed clock and wanted level, then snaps the camera
// straight to its framing so the picture never depends on how many frames
// SwiftShader managed to run.
import { syncCarMesh } from './vehicles.js';
export function stageShot(name, G) {
  const { world, missions, police, hud, sky, city } = G;
  const player = world.player;
  const setClock = (minutes) => {
    G.clockMinutes = minutes;
    sky.setTime(minutes);
  };

  // Reset the shared bits every shot starts from.
  player.dead = false;
  player.hp = 100;
  player.money = 120;
  player.coins = 0;
  player.hasPistol = true;
  player.ammo = 60;
  world.setInCar(null);
  hud.setMoney(120);
  hud.setCoins(0);
  hud.setHp(100);

  if (name === 'walk') {
    // On foot by the plaza fountain, a red coupe beside the player, job 1 live.
    missions.jumpTo(0);
    setClock(9 * 60 + 30);
    police.setWanted(0);
    player.x = -6; player.z = 8; player.heading = 0.4;
    const car = world.streetCars[1]; // Sunset Coupe
    car.state.x = 2; car.state.z = 20; car.state.heading = 1.2;
    syncCarMesh(car.mesh, car.state);
    city.hidePalmsNear(player.x, player.z, 30);
    world.syncPlayerMesh();
    return { cam: [-10, 5.2, -6, 4, 1.6, 24] };
  }

  if (name === 'mission') {
    // On foot in the container yard at dusk, three Viper thugs closing in.
    missions.jumpTo(3);
    setClock(18 * 60 + 40);
    police.setWanted(2);
    player.x = 170; player.z = 100; player.heading = 0.9;
    world.spawnThugs();
    const spots = [[186, 96], [192, 102], [186, 108]];
    world.thugs.forEach((thug, i) => {
      thug.dead = false;
      thug.hp = 60;
      thug.mesh.visible = true;
      thug.x = spots[i][0];
      thug.z = spots[i][1];
      thug.mesh.position.set(thug.x, 0, thug.z);
    });
    city.showAllPalms();
    world.syncPlayerMesh();
    // Camera on the clear east-west road (z=70), looking into the yard —
    // never inside a block, where a building would swallow the frame.
    return { cam: [160, 9, 70, 192, 2, 102] };
  }

  if (name === 'night') {
    // Driving the City Taxi down the neon avenue at night, job 5 live.
    // The x=0 avenue at z=120 is clear of palms; the tower glows ahead.
    missions.jumpTo(4);
    setClock(21 * 60);
    police.setWanted(3);
    const taxi = world.streetCars[2]; // City Taxi
    taxi.state.x = 0; taxi.state.z = 120; taxi.state.heading = 0;
    taxi.state.speed = 20;
    syncCarMesh(taxi.mesh, taxi.state);
    world.setInCar(taxi);
    police.stageCruisers([{ x: -5, z: 134, heading: Math.PI, speed: 20 }]);
    city.showAllPalms();
    world.syncPlayerMesh();
    return { cam: [0, 5, 96, 0, 1.5, 160] };
  }

  // Default: 'chase' — the cover. Job 3, wanted 3, tearing down the avenue
  // in the Dune Buggy with two cruisers cutting the player off ahead.
  missions.jumpTo(2);
  setClock(10 * 60);
  police.setWanted(3);
  const buggy = world.streetCars[0]; // Dune Buggy
  buggy.state.x = 3; buggy.state.z = 120; buggy.state.heading = 0;
  buggy.state.speed = 22;
  syncCarMesh(buggy.mesh, buggy.state);
  world.setInCar(buggy);
  police.stageCruisers([
    { x: 6, z: 152, heading: Math.PI, speed: 24 },
    { x: -2, z: 170, heading: Math.PI, speed: 22 },
  ]);
  city.hidePalmsNear(3, 120, 34);
  world.syncPlayerMesh();
  return { cam: [3, 6, 96, 3, 1.2, 160] };
}
