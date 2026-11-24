// missions.js — the story of SOLMARA: 12 staged missions that take Dario
// from a wheelman with a borrowed car to the legend who takes the island
// back from the Coral Kings. Each mission is stages; each stage is one
// objective with a beacon, HUD text and a distance readout.
import * as THREE from 'three';
import { GARAGE_POS, SHOP_POS, SAFEHOUSE_POS } from './config.js';
import { dist2D } from './utils.js';

export const MISSION_DEFS = [
  {
    id: 'first-light', title: '1 · First Light', intro: 'Maya is waiting at her garage. Get there, take a car, bring it home.',
    reward: 150, respect: 20,
    stages: [
      { type: 'goto', x: GARAGE_POS.x, z: GARAGE_POS.z, r: 12, text: 'Meet Maya at her garage (Old Town)' },
      { type: 'enterCar', text: 'Take a car — any car. It is Solmara, after all.' },
      { type: 'driveTo', x: SAFEHOUSE_POS.x, z: SAFEHOUSE_POS.z, r: 12, text: 'Drive to your safehouse' },
    ],
  },
  {
    id: 'hot-wheels', title: '2 · Hot Wheels', intro: 'The SBPD is watching. Steal a ride in traffic and shake the heat.',
    reward: 250, respect: 30,
    stages: [
      { type: 'enterCar', traffic: true, text: 'Jack a car from traffic (E near a moving car)' },
      { type: 'loseHeat', text: 'Lose the cops — stay out of sight until the stars clear' },
    ],
  },
  {
    id: 'the-drop', title: '3 · The Drop', intro: 'A package in Portside, a buyer in the Neon Quarter. 120 seconds. No excuses.',
    reward: 300, respect: 30, timed: 120,
    stages: [
      { type: 'pickup', x: -330, z: -300, r: 10, text: 'Pick up the package at Portside docks' },
      { type: 'driveTo', x: 260, z: -40, r: 12, text: 'Deliver to the Neon Quarter buyer — fast!' },
    ],
  },
  {
    id: 'ghost-machine', title: '4 · Ghost in the Machine', intro: 'Leo can crack the Kings’ terminal at the Marina — if you keep the street clear while he works.',
    reward: 350, respect: 40,
    stages: [
      { type: 'goto', x: 60, z: -320, r: 12, text: 'Reach the Marina terminal with Leo' },
      { type: 'interact', x: 60, z: -320, r: 10, seconds: 8, text: 'Hold the terminal while Leo cracks it (8s)' },
      { type: 'driveTo', x: SAFEHOUSE_POS.x, z: SAFEHOUSE_POS.z, r: 12, text: 'Get back to the safehouse — wanted +2' },
    ],
  },
  {
    id: 'neon-nights', title: '5 · Neon Nights', intro: 'The Sunset Loop. Win it, and the Quarter learns your name.',
    reward: 200, respect: 50,
    stages: [
      { type: 'goto', x: -40, z: -360, r: 14, text: 'Reach the Sunset Loop start gantry' },
      { type: 'race', raceId: 'sunset-loop', text: 'Win the Sunset Loop race' },
    ],
  },
  {
    id: 'turf-war', title: '6 · Turf War', intro: 'The Kings hold Old Town. Four enforcers. Take the district back.',
    reward: 400, respect: 60, district: 'Old Town',
    stages: [
      { type: 'goto', x: -180, z: 140, r: 16, text: 'Go to Old Town square' },
      { type: 'kill', count: 4, spawn: [[-190, 130], [-170, 150], [-185, 155], [-165, 135]], text: 'Take out 4 Coral Kings enforcers' },
    ],
  },
  {
    id: 'vault-job', title: '7 · The Vault Job', intro: 'The Marina bank vault. Crack it, grab the cash, outrun a 3-star response.',
    reward: 800, respect: 80,
    stages: [
      { type: 'goto', x: 260, z: -40, r: 14, text: 'Reach the Marina bank' },
      { type: 'interact', x: 260, z: -40, r: 10, seconds: 10, text: 'Crack the vault (10s) — the alarm will trip' },
      { type: 'driveTo', x: SAFEHOUSE_POS.x, z: SAFEHOUSE_POS.z, r: 12, text: 'Escape to the safehouse with the cash' },
    ],
  },
  {
    id: 'air-support', title: '8 · Air Support', intro: 'CONDOR-2 is in the sky and the roads are sealed. Survive 60 seconds of hell.',
    reward: 500, respect: 70,
    stages: [
      { type: 'survive', seconds: 60, wanted: 3, text: 'Survive the CONDOR-2 pursuit — 60 seconds' },
    ],
  },
  {
    id: 'harbor-heist', title: '9 · Harbor Heist', intro: 'A Kings shipment sits at Portside. Load it, drive it to Maya’s garage.',
    reward: 700, respect: 80,
    stages: [
      { type: 'goto', x: -360, z: -280, r: 14, text: 'Reach the Portside shipment' },
      { type: 'interact', x: -360, z: -280, r: 10, seconds: 6, text: 'Load the shipment (6s)' },
      { type: 'driveTo', x: GARAGE_POS.x, z: GARAGE_POS.z, r: 12, text: 'Deliver the shipment to Maya’s garage' },
    ],
  },
  {
    id: 'kings-ransom', title: '10 · King’s Ransom', intro: 'The Coastal Sprint. Win it and Vane himself will know your name — and fear it.',
    reward: 300, respect: 90,
    stages: [
      { type: 'goto', x: -360, z: -90, r: 14, text: 'Reach the Coastal Sprint start' },
      { type: 'race', raceId: 'coastal-sprint', text: 'Win the Coastal Sprint' },
    ],
  },
  {
    id: 'burning-bridges', title: '11 · Burning Bridges', intro: 'Three Kings cars cruise the Quarter. Burn them all. Leave wrecks, not warnings.',
    reward: 900, respect: 100,
    stages: [
      { type: 'goto', x: 260, z: -40, r: 16, text: 'Go to the Neon Quarter' },
      { type: 'destroy', count: 3, text: 'Destroy 3 Coral Kings cars — shoot them or ram them till they burn' },
    ],
  },
  {
    id: 'the-coronation', title: '12 · The Coronation', intro: 'Vane Kessler waits at his Hillside mansion with everything he has left. End it.',
    reward: 2000, respect: 200,
    stages: [
      { type: 'goto', x: 300, z: 260, r: 20, text: 'Storm the Hillside mansion' },
      { type: 'kill', count: 6, boss: true, spawn: [[285, 245], [315, 245], [290, 275], [310, 275], [300, 240], [300, 280]], text: 'Defeat Vane’s guards — then Vane himself' },
      { type: 'interact', x: 300, z: 260, r: 12, seconds: 5, text: 'Plant the Tidebreaker flag (5s)' },
    ],
  },
];

export function initMissions(G) {
  const beaconGeo = new THREE.CylinderGeometry(2.2, 2.2, 34, 16, 1, true);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.visible = false;
  G.scene.add(beacon);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.4, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffb020 }));
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  G.scene.add(ring);

  G.missions = {
    index: 0,
    completed: [],
    stage: 0,
    stageData: {},
    timer: 0,
    armed: false, // only true while a mission is actively running
    beacon, ring,
    current() { return MISSION_DEFS[this.index] || null; },
    start(i) {
      if (this._nextTimer) { clearTimeout(this._nextTimer); this._nextTimer = null; }
      this.index = i;
      this.stage = 0;
      this.stageData = {};
      this.timer = 0;
      this.armed = true;
      const def = this.current();
      if (!def) { this.armed = false; return; }
      G.hud.banner(def.title.toUpperCase(), def.intro);
      G.hud.setMission(def.title, def.stages[0].text);
      this.setupStage();
      G.audio.missionStart();
    },
    setupStage() {
      const def = this.current();
      if (!def) return;
      const st = def.stages[this.stage];
      if (!st) return;
      this.stageData = { kills: 0, interact: 0, destroyed: 0, raceDone: false, timer: def.timed || 0 };
      if (st.type === 'kill' && st.spawn) {
        for (const [x, z] of st.spawn) G.combat.spawnEnemy(x, z, { kind: 'king' });
        if (st.boss) {
          const boss = G.combat.spawnEnemy(300, 250, { kind: 'vane', health: 320, speed: 3.0, color: 0xff2020 });
          boss.isBoss = true;
        }
      }
      if (st.type === 'destroy') {
        this.stageData.targets = [];
        const spots = [[230, -70], [290, -10], [260, 30]];
        for (const [x, z] of spots) {
          const car = G.vehicles.createCar({ x, z, color: 0x8a2be2, driver: 'king' });
          car.name = 'Kings Cruiser';
          this.stageData.targets.push(car);
        }
        G.hud.toast('Purple Kings cars marked — burn them!');
      }
      if (st.type === 'survive' && st.wanted) G.wanted.level = Math.max(G.wanted.level, st.wanted);
      this.moveBeacon();
    },
    moveBeacon() {
      const def = this.current();
      if (!def) return;
      const st = def.stages[this.stage];
      if (!st || (st.x === undefined && st.type !== 'race' && st.type !== 'survive')) {
        this.beacon.visible = false;
        this.ring.visible = false;
        return;
      }
      if (st.x !== undefined) {
        this.beacon.visible = true;
        this.ring.visible = true;
        this.beacon.position.set(st.x, 17, st.z);
        this.ring.position.set(st.x, 0.4, st.z);
      }
    },
    setStageText() {
      const def = this.current();
      if (!def) return;
      const st = def.stages[this.stage];
      G.hud.setMission(def.title, st ? st.text : '');
    },
    completeStage() {
      const def = this.current();
      this.stage++;
      if (this.stage >= def.stages.length) return this.completeMission();
      G.audio.checkpoint();
      this.setStageText();
      this.setupStage();
    },
    completeMission() {
      const def = this.current();
      this.completed.push(def.id);
      G.player.money += def.reward;
      G.player.respect += def.respect;
      if (def.district) {
        const d = G.config.DISTRICTS.find((x) => x.name === def.district);
        if (d) d.standing = 1;
      }
      if (def.id === 'ghost-machine') G.crew.activateCrew('leo');
      if (def.id === 'first-light') G.crew.activateCrew('maya');
      if (def.id === 'kings-ransom') {
        if (!G.weapons.owned.includes('rifle')) {
          G.weapons.owned.push('rifle');
          G.weapons.ammo.rifle += 60;
          G.hud.toast('🔓 RIFLE unlocked! Buy ammo at Dockside Arms.');
        }
      }
      G.hud.banner('✅ MISSION COMPLETE — ' + def.title.toUpperCase(), `+$${def.reward} · +${def.respect} respect`);
      G.audio.missionComplete();
      G.hud.refresh();
      G.save.autosave();
      this.armed = false;
      if (this.index + 1 < MISSION_DEFS.length) {
        this.index++;
        this.stage = 0;
        const next = this.current();
        G.hud.setMission(next.title, 'New mission available — head to the beacon. Press M to save.');
        this.beacon.visible = false;
        this.ring.visible = false;
        // auto-start the next mission after a breather
        this._nextTimer = setTimeout(() => { if (G.started && !G.over) G.missions.start(G.missions.index); }, 4000);
      } else {
        G.hud.banner('👑 SOLMARA IS YOURS', 'All 12 missions complete. You are the Island Legend. Free roam — races, garage, shops remain open.');
        G.hud.setMission('STORY COMPLETE', 'Free roam: races, garage, shops, wanted chaos.');
        this.beacon.visible = false;
        this.ring.visible = false;
      }
    },
    raceObjective(def) {
      G.hud.setMission(this.current() ? this.current().title : def.name, 'Race: ' + def.name + ' — hit every gate');
    },
    onEnemyKilled(e) {
      const def = this.current();
      if (!def) return;
      const st = def.stages[this.stage];
      if (!st || st.type !== 'kill') return;
      this.stageData.kills++;
      const need = st.count + (st.boss ? 1 : 0);
      G.hud.setMission(def.title, st.text + ` (${this.stageData.kills}/${need})`);
      if (this.stageData.kills >= need) this.completeStage();
    },
    onRaceFinished(raceId, time, underPar) {
      const def = this.current();
      if (!def) return;
      const st = def.stages[this.stage];
      if (st && st.type === 'race' && st.raceId === raceId) this.completeStage();
    },
    update(dt) {
      if (!this.armed) return;
      const def = this.current();
      if (!def) return;
      const st = def.stages[this.stage];
      if (!st) return;
      const p = G.player.mesh.position;
      const cp = G.player.car ? G.player.car.mesh.position : p;
      this.timer += dt;
      // mission countdown (The Drop)
      if (def.timed && this.stageData.timer !== undefined) {
        this.stageData.timer -= dt;
        if (this.stageData.timer <= 0) {
          G.hud.toast('⏱ Too slow! The buyer walked — restart the delivery.');
          this.stage = 0;
          this.setupStage();
          this.setStageText();
          return;
        }
      }
      switch (st.type) {
        case 'goto':
        case 'driveTo':
        case 'pickup': {
          const d = dist2D(cp.x, cp.z, st.x, st.z);
          G.hud.setMissionDist(Math.round(d) + 'm');
          if (d < st.r) {
            if (st.type === 'pickup') G.hud.toast('📦 Package secured.');
            this.completeStage();
          }
          break;
        }
        case 'enterCar': {
          if (!G.player.onFoot) {
            if (st.traffic && !G.player.car.wasTraffic) break; // Hot Wheels needs a traffic jack
            this.completeStage();
          }
          break;
        }
        case 'loseHeat': {
          G.hud.setMissionDist('Wanted: ' + '★'.repeat(G.wanted.level));
          if (G.wanted.level === 0) this.completeStage();
          break;
        }
        case 'interact': {
          const d = dist2D(cp.x, cp.z, st.x, st.z);
          G.hud.setMissionDist(Math.round(d) + 'm');
          if (d < st.r) {
            this.stageData.interact += dt;
            G.hud.setMission(def.title, st.text + ` — ${Math.ceil(st.seconds - this.stageData.interact)}s`);
            if (this.stageData.interact >= st.seconds) {
              if (def.id === 'vault-job') G.wanted.add(3, 'bank alarm tripped');
              if (def.id === 'ghost-machine') G.wanted.add(2, 'terminal traced');
              this.completeStage();
            }
          } else {
            this.stageData.interact = 0;
          }
          break;
        }
        case 'survive': {
          const left = Math.ceil(st.seconds - this.stageData.surviveT);
          this.stageData.surviveT = (this.stageData.surviveT || 0) + dt;
          G.hud.setMission(def.title, st.text + ` — ${Math.max(0, Math.ceil(st.seconds - this.stageData.surviveT))}s left`);
          if (this.stageData.surviveT >= st.seconds) this.completeStage();
          break;
        }
        case 'race': {
          if (!G.races.active && !this.stageData.raceStarted) {
            // wait at the gantry: auto-start when the player arrives in a car
            const [gx, gz] = G.config.RACES.find((r) => r.id === st.raceId).checkpoints[0];
            const d = dist2D(cp.x, cp.z, gx, gz);
            G.hud.setMissionDist(Math.round(d) + 'm to the start');
            if (d < 14 && G.player.car) {
              this.stageData.raceStarted = true;
              G.races.startRace(st.raceId, true);
            }
          }
          break;
        }
        case 'destroy': {
          const alive = this.stageData.targets.filter((c) => !c.exploded).length;
          G.hud.setMission(def.title, st.text + ` (${this.stageData.count - alive}/${this.stageData.count})`);
          if (alive === 0) this.completeStage();
          break;
        }
        case 'kill': {
          // kills are counted by onEnemyKilled
          break;
        }
      }
    },
  };
}
