// The playable world: the player on foot and behind the wheel, the twelve
// stealable street cars, the twelve hidden gold coins, the SOLMAR ARMS shop,
// the safehouse, the three Viper thugs of job 4, fist and pistol combat, and
// the localStorage save. Everything the loop touches each frame lives here.
import * as THREE from '../vendor/three.min.js';
import {
  CAR, COIN_SPOTS, COIN_VALUE, PLAYER, SAFEHOUSE, SAVE_KEY, SHOP, STREET_CARS,
} from './config.js';
import { createCarMesh, createCarState, driveCar, syncCarMesh } from './vehicles.js';
import { ACTION_FIGHT, ACTION_STEAL } from './input.js';

function makePlayerMesh() {
  const group = new THREE.Group();
  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.0, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xd86a20 }),
  );
  shirt.position.y = 1.15;
  group.add(shirt);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xd8a880 }),
  );
  head.position.y = 1.95;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.18, 0.55),
    new THREE.MeshLambertMaterial({ color: 0x222222 }),
  );
  cap.position.y = 2.24;
  group.add(cap);
  const legs = [];
  for (const lx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.7, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2a2a34 }),
    );
    leg.position.set(lx, 0.35, 0);
    group.add(leg);
    legs.push(leg);
  }
  const arms = [];
  for (const ax of [-0.55, 0.55]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.85, 0.22),
      new THREE.MeshLambertMaterial({ color: 0xd86a20 }),
    );
    arm.position.set(ax, 1.15, 0);
    group.add(arm);
    arms.push(arm);
  }
  group.userData.legs = legs;
  group.userData.arms = arms;
  return group;
}

function makeThugMesh() {
  const group = new THREE.Group();
  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.0, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x8a1a2a }),
  );
  shirt.position.y = 1.15;
  group.add(shirt);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xc89878 }),
  );
  head.position.y = 1.95;
  group.add(head);
  for (const lx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.7, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
    );
    leg.position.set(lx, 0.35, 0);
    group.add(leg);
  }
  return group;
}

export function createWorld(ctx) {
  const { scene, city, police, missions, audio, hud } = ctx;
  const collide = (x, z, r) => city.collideCircle(x, z, r);

  // --- Player. ---
  const playerMesh = makePlayerMesh();
  scene.add(playerMesh);
  const player = {
    x: 0, z: 30, heading: Math.PI, hp: PLAYER.hp,
    money: 120, coins: 0, ammo: 0, hasPistol: false,
    inCar: null, walkPhase: 0, dead: false,
    onDamage() {},
  };

  // --- Street cars (the twelve stealable ones). ---
  const streetCars = STREET_CARS.map((spec) => {
    const mesh = createCarMesh(spec.color, { taxi: spec.name === 'City Taxi' });
    scene.add(mesh);
    const state = createCarState(spec.x, spec.z, spec.heading);
    syncCarMesh(mesh, state);
    return { ...spec, mesh, state, stolen: false };
  });

  // --- Gold coins. ---
  const coinGeo = new THREE.TorusGeometry(0.9, 0.32, 8, 16);
  const coinMat = new THREE.MeshLambertMaterial({ color: 0xffd040, emissive: 0x806000 });
  const coins = COIN_SPOTS.map((spot) => {
    const mesh = new THREE.Mesh(coinGeo, coinMat);
    mesh.position.set(spot.x, 1.4, spot.z);
    scene.add(mesh);
    return { ...spot, mesh, taken: false };
  });

  // --- Briefcase (job 4 reward pickup, hidden until the thugs are down). ---
  const briefcase = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x6a4a1a }),
  );
  briefcase.position.set(192, 0.9, 102);
  briefcase.visible = false;
  scene.add(briefcase);

  // --- Thugs (job 4). ---
  const thugs = [];
  function spawnThugs() {
    if (thugs.length > 0) return;
    for (const [tx, tz] of [[186, 96], [192, 102], [186, 108]]) {
      const mesh = makeThugMesh();
      mesh.position.set(tx, 0, tz);
      scene.add(mesh);
      thugs.push({ mesh, x: tx, z: tz, hp: 60, hitCooldown: 0, dead: false });
    }
  }

  // --- Tracer lines for pistol shots (reused pool). ---
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe080 });
  const tracers = [];
  function fireTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, 1.4, from.z),
      new THREE.Vector3(to.x, 1.2, to.z),
    ]);
    const line = new THREE.Line(geo, tracerMat);
    scene.add(line);
    tracers.push({ line, life: 0.12 });
  }

  // --- Save / load. ---
  function save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: player.money,
        coins: coins.filter((c) => c.taken).map((c) => `${c.x},${c.z}`),
        mission: missions.index,
        hp: player.hp,
        ammo: player.ammo,
        hasPistol: player.hasPistol,
      }));
    } catch { /* storage can be off; the save then lasts this visit only */ }
  }
  function load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      player.money = data.money ?? 120;
      player.hp = data.hp ?? 100;
      player.ammo = data.ammo ?? 0;
      player.hasPistol = !!data.hasPistol;
      const taken = new Set(data.coins ?? []);
      for (const coin of coins) {
        if (taken.has(`${coin.x},${coin.z}`)) {
          coin.taken = true;
          coin.mesh.visible = false;
          player.coins += 1;
        }
      }
      if (typeof data.mission === 'number' && data.mission > 0) missions.jumpTo(data.mission);
      return true;
    } catch {
      return false;
    }
  }

  // --- Shop wiring. ---
  let shopOpen = false;
  function openShop() {
    shopOpen = true;
    hud.openShop(player.money);
    audio.unlock();
  }
  function closeShop() {
    shopOpen = false;
    hud.closeShop();
  }
  document.getElementById('buy-ammo').addEventListener('click', () => {
    if (!player.hasPistol) { hud.toast('Finish Job 1 to get a pistol first'); return; }
    if (player.money < SHOP.ammoPrice) { hud.toast('Not enough cash'); return; }
    player.money -= SHOP.ammoPrice;
    player.ammo += SHOP.ammoAmount;
    hud.setMoney(player.money);
    hud.toast(`Ammo +${SHOP.ammoAmount} — $${SHOP.ammoPrice}`);
    save();
  });
  document.getElementById('buy-medkit').addEventListener('click', () => {
    if (player.money < SHOP.medkitPrice) { hud.toast('Not enough cash'); return; }
    player.money -= SHOP.medkitPrice;
    player.hp = PLAYER.hp;
    hud.setMoney(player.money);
    hud.setHp(player.hp);
    hud.toast('Medkit used — HP full');
    save();
  });
  document.getElementById('close-shop').addEventListener('click', closeShop);

  function nearestCar(maxDist) {
    let best = null; let bestD = maxDist;
    for (const car of streetCars) {
      const d = Math.hypot(car.state.x - player.x, car.state.z - player.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function enterCar(car) {
    player.inCar = car;
    car.stolen = true;
    playerMesh.visible = false;
    police.addWanted(1);
    hud.toast(`Stole the ${car.name} — wanted +1 ★`);
    audio.siren();
  }

  function exitCar() {
    const car = player.inCar;
    if (!car) return;
    player.inCar = null;
    player.x = car.state.x + Math.cos(car.state.heading) * 3;
    player.z = car.state.z - Math.sin(car.state.heading) * 3;
    player.heading = car.state.heading;
    playerMesh.visible = true;
    playerMesh.position.set(player.x, 0, player.z);
  }

  function shoot() {
    if (!player.hasPistol || player.ammo <= 0) {
      // Fists: the nearest enemy within arm's reach takes a punch.
      const target = nearestEnemy(2.4);
      if (target) {
        target.hp -= 20;
        audio.punch();
        if (target.hp <= 0) killEnemy(target);
      }
      return;
    }
    player.ammo -= 1;
    audio.shot();
    const target = nearestEnemy(45, 0.45);
    const end = target ? { x: target.x, z: target.z } : {
      x: player.x + Math.sin(player.heading) * 40,
      z: player.z + Math.cos(player.heading) * 40,
    };
    fireTracer(player, end);
    if (target) {
      target.hp -= 34;
      if (target.hp <= 0) killEnemy(target);
      else police.addWanted(1);
    }
  }

  function nearestEnemy(maxDist, cone = 10) {
    let best = null; let bestD = maxDist;
    for (const thug of thugs) {
      if (thug.dead) continue;
      const dx = thug.x - player.x; const dz = thug.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      if (cone < 10) {
        const ang = Math.atan2(dx, dz);
        let diff = ang - player.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > cone) continue;
      }
      bestD = d; best = thug;
    }
    return best;
  }

  function killEnemy(thug) {
    thug.dead = true;
    thug.mesh.visible = false;
    missions.thugDown();
    hud.toast(`Viper thug down — ${missions.thugsLeft} left`);
    if (missions.thugsLeft === 0) {
      briefcase.visible = true;
      hud.toast('All thugs down — grab the briefcase!');
    }
  }

  let saveTimer = 0;
  let safeTimer = 0;

  return {
    player,
    streetCars,
    coins,
    thugs,
    briefcase,
    spawnThugs,
    /** Put the player in (or out of) a car, keeping the on-foot mesh in sync. */
    setInCar(car) {
      player.inCar = car;
      if (car) {
        car.stolen = true;
        playerMesh.visible = false;
        player.x = car.state.x; player.z = car.state.z; player.heading = car.state.heading;
      } else {
        playerMesh.visible = true;
      }
    },
    /** Sync the on-foot mesh to the player state (used after shot staging). */
    syncPlayerMesh() {
      playerMesh.position.set(player.x, 0, player.z);
      playerMesh.rotation.y = player.heading;
      playerMesh.visible = !player.inCar;
    },
    get shopOpen() { return shopOpen; },
    save,
    load,
    enterCarForTest(car) { enterCar(car); },
    update(dt, input, actions = 0) {
      if (player.dead) return;

      // --- Shop: E near the kiosk opens it; the panel pauses the world. ---
      const nearShop = Math.hypot(player.x - SHOP.pos.x, player.z - SHOP.pos.z) < 7;
      if ((actions & ACTION_STEAL) && nearShop && !player.inCar && !shopOpen) {
        openShop();
        return;
      }
      if (shopOpen) return;

      // --- Steal / exit car. ---
      if (actions & ACTION_STEAL) {
        if (player.inCar) {
          exitCar();
        } else {
          const car = nearestCar(4.5);
          if (car) enterCar(car);
        }
      }

      // --- Fight. ---
      if ((actions & ACTION_FIGHT) && !player.inCar) shoot();

      // --- Drive or walk. ---
      if (player.inCar) {
        const car = player.inCar;
        driveCar(car.state, input.throttle(), input.steer(), input.handbrake(), dt, collide);
        syncCarMesh(car.mesh, car.state);
        player.x = car.state.x; player.z = car.state.z; player.heading = car.state.heading;
        audio.setEngine(car.state.speed, true);
      } else {
        const run = input.running();
        const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
        const steer = input.steer();
        player.heading += steer * 2.6 * dt * (input.throttle() < 0 ? -1 : 1);
        const fwd = input.throttle();
        if (fwd !== 0) {
          const nx = player.x + Math.sin(player.heading) * speed * fwd * dt;
          const nz = player.z + Math.cos(player.heading) * speed * fwd * dt;
          const fixed = collide(nx, nz, PLAYER.radius);
          player.x = fixed.x; player.z = fixed.z;
          player.walkPhase += dt * speed * 1.4;
        }
        playerMesh.position.set(player.x, Math.abs(Math.sin(player.walkPhase)) * 0.05, player.z);
        playerMesh.rotation.y = player.heading;
        const legs = playerMesh.userData.legs;
        const arms = playerMesh.userData.arms;
        const swing = fwd !== 0 ? Math.sin(player.walkPhase) * 0.5 : 0;
        legs[0].rotation.x = swing; legs[1].rotation.x = -swing;
        arms[0].rotation.x = -swing; arms[1].rotation.x = swing;
        audio.setEngine(0, false);
      }

      // --- Coins. ---
      for (const coin of coins) {
        if (coin.taken) continue;
        coin.mesh.rotation.y += dt * 2;
        if (Math.hypot(coin.x - player.x, coin.z - player.z) < 2.2) {
          coin.taken = true;
          coin.mesh.visible = false;
          player.coins += 1;
          player.money += COIN_VALUE;
          hud.setCoins(player.coins);
          hud.setMoney(player.money);
          hud.toast(`Gold coin +$${COIN_VALUE}`);
          audio.coin();
        }
      }

      // --- Safehouse: heal and cool down inside the radius. ---
      const safeDist = Math.hypot(player.x - SAFEHOUSE.x, player.z - SAFEHOUSE.z);
      if (safeDist < SAFEHOUSE.radius) {
        player.hp = Math.min(PLAYER.hp, player.hp + SAFEHOUSE.healPerSec * dt);
        hud.setHp(player.hp);
        safeTimer += dt;
        if (safeTimer >= SAFEHOUSE.wantedEverySec && police.wanted > 0) {
          safeTimer = 0;
          police.setWanted(police.wanted - 1);
          hud.toast('Lying low — wanted down');
        }
      } else {
        safeTimer = 0;
      }

      // --- Thugs chase and punch the player. ---
      for (const thug of thugs) {
        if (thug.dead) continue;
        thug.hitCooldown -= dt;
        const dx = player.x - thug.x; const dz = player.z - thug.z;
        const d = Math.hypot(dx, dz) || 1;
        if (d < 30) {
          thug.x += (dx / d) * 4.5 * dt;
          thug.z += (dz / d) * 4.5 * dt;
          thug.mesh.position.set(thug.x, 0, thug.z);
          thug.mesh.rotation.y = Math.atan2(dx, dz);
          if (d < 2 && thug.hitCooldown <= 0) {
            thug.hitCooldown = 1;
            player.hp = Math.max(0, player.hp - 5);
            hud.setHp(player.hp);
            audio.punch();
          }
        }
      }

      // --- Tracers fade. ---
      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        tracers[i].life -= dt;
        if (tracers[i].life <= 0) {
          scene.remove(tracers[i].line);
          tracers.splice(i, 1);
        }
      }

      // --- Missions. ---
      if (missions.current && missions.current.id === 4 && missions.phase === 'go') {
        missions.startThugs();
        spawnThugs();
      }
      const event = missions.update(dt, player.x, player.z, !!player.inCar);
      if (event && event.briefcase) {
        briefcase.visible = true;
      }
      if (event && event.complete) {
        const job = missions.advance();
        player.money += job.reward;
        hud.setMoney(player.money);
        hud.toast(`JOB ${job.id} DONE — +$${job.reward}`);
        audio.jingle();
        if (job.givesPistol) {
          player.hasPistol = true;
          player.ammo += 60;
          hud.toast('Rosa gave you a pistol — 60 rounds');
        }
        if (job.wanted) police.setWanted(job.wanted);
        if (missions.current && missions.current.wanted) police.setWanted(missions.current.wanted);
        save();
      }

      // --- Death. ---
      if (player.hp <= 0) {
        player.dead = true;
        hud.showOver(true, player.money, missions.completed);
      }

      // --- Periodic autosave. ---
      saveTimer += dt;
      if (saveTimer > 10) { saveTimer = 0; save(); }
    },
    /** Respawn after game over: back to the plaza, HP restored, wanted cleared. */
    respawn() {
      player.dead = false;
      player.hp = PLAYER.hp;
      player.x = 0; player.z = 30; player.heading = Math.PI;
      if (player.inCar) {
        player.inCar = null;
        playerMesh.visible = true;
      }
      playerMesh.position.set(player.x, 0, player.z);
      police.setWanted(0);
      hud.setHp(player.hp);
      hud.showOver(false);
      save();
    },
  };
}
