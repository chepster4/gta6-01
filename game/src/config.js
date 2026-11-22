// PALMIRA BAY — Streets of the Sun. Config: world constants, weapons,
// missions, races, ranks, shop and garage data. All numbers tuned for a
// 560x560 procedural city that reads well in 1280x720 screenshots.
export const CFG = {
  WORLD: 560,
  HALF: 280,
  BLOCK: 56,          // city block pitch
  ROAD: 14,           // road width
  BUILD_MIN_H: 10,
  BUILD_MAX_H: 46,
  PLAYER_SPEED: 11,
  PLAYER_RUN: 17,
  PLAYER_HP: 100,
  CAR_COUNT: 12,
  COIN_COUNT: 12,
  WANTED_MAX: 5,
  SAVE_KEY: 'palmira-bay-save-v1',
};

export const WEAPONS = {
  pistol:  { name: 'Pistol',  dmg: 26, rate: 0.28, range: 55,  spread: 0.012, auto: false, price: 0,   color: 0x222226 },
  smg:     { name: 'SMG',     dmg: 13, rate: 0.085, range: 48, spread: 0.045, auto: true,  price: 400, color: 0x3a3a40 },
  shotgun: { name: 'Shotgun', dmg: 11, rate: 0.85, range: 26,  spread: 0.09,  auto: false, price: 600, color: 0x5a2a1a, pellets: 6 },
  rifle:   { name: 'Rifle',   dmg: 42, rate: 0.14, range: 120, spread: 0.006, auto: true,  price: 900, color: 0x1a2a1a },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'rifle'];

export const RANKS = [
  { name: 'STREET',  respect: 0 },
  { name: 'HUSTLER', respect: 200 },
  { name: 'RUNNER',  respect: 500 },
  { name: 'KINGPIN', respect: 1000 },
  { name: 'LEGEND',  respect: 2000 },
];

// 10 chained story missions. type: goto | pickup | kill | race | escape
export const MISSIONS = [
  { id: 1,  title: 'First Job',        type: 'goto',   target: [120, -40],  reward: 250,  respect: 100, brief: 'Meet Rico at the plaza. He has work — and a pistol with your name on it.' },
  { id: 2,  title: 'Dockside Pickup',  type: 'pickup', target: [228, 150],  reward: 350,  respect: 100, brief: 'Grab the package from the East Docks container yard. Don\'t ask what\'s inside.' },
  { id: 3,  title: 'Safehouse Run',    type: 'goto',   target: [168, -196], reward: 300,  respect: 100, brief: 'The heat is on. Lose the cops and get to the safehouse on the north-east edge.' },
  { id: 4,  title: 'Container Yard',   type: 'kill',   target: [196, 108],  reward: 450,  respect: 120, brief: 'Three of Sal\'s boys are guarding the yard. Clear them out.' },
  { id: 5,  title: 'Solmar Tower',     type: 'goto',   target: [85, 131],   reward: 500,  respect: 120, brief: 'Meet the fixer at the foot of Solmar Tower. The big jobs start here.' },
  { id: 6,  title: 'The Big Heist',    type: 'heist',  target: [-140, 60],  reward: 900,  respect: 180, brief: 'Steal a fast car, hit the Bay Bank, grab the cash and outrun CONDOR-1. Wanted 3 guaranteed.' },
  { id: 7,  title: 'Bayfront Grand Prix', type: 'race', target: [0, -200],   reward: 600,  respect: 150, brief: 'Street race along the bayfront. Beat the clock — first place pays.' },
  { id: 8,  title: 'Turf War',         type: 'kill',   target: [-180, -140], reward: 700,  respect: 180, brief: 'Sal\'s crew is pushing into your turf. Take the block back with Marcus and Lena.' },
  { id: 9,  title: 'Midnight Run',     type: 'race',   target: [200, -180], reward: 800,  respect: 180, brief: 'Night delivery across the city. Fast, quiet, no cops — good luck with that.' },
  { id: 10, title: 'King of Palmira',   type: 'kill',   target: [85, 131],   reward: 1500, respect: 400, brief: 'Sal himself, at Solmar Tower, with his whole crew. End this and the city is yours.' },
];

export const RACES = [
  { id: 1, name: 'Bayfront Sprint',  reward: 400, par: 75,  points: [[0, -200], [120, -200], [200, -120], [200, 40], [120, 120], [0, 120], [-120, 40], [-120, -120]] },
  { id: 2, name: 'Dockside Loop',    reward: 600, par: 95,  points: [[200, -180], [228, 60], [180, 180], [60, 200], [-60, 180], [-140, 60], [-120, -140], [40, -200]] },
  { id: 3, name: 'Solmar Circuit',   reward: 800, par: 110, points: [[85, 60], [170, 60], [200, 140], [120, 200], [0, 200], [-120, 140], [-160, 0], [-60, -60], [40, -40]] },
];

export const COINS = [
  [40, 40], [-90, 130], [150, -70], [-200, 30], [230, -150], [-40, -210],
  [90, 190], [-160, 190], [20, -120], [250, 90], [-240, -90], [130, 10],
];

export const SHOP = { ammoPrice: 50, ammoAmount: 30, medkitPrice: 75 };
export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine Tune',  price: 300, desc: '+25% top speed' },
  { id: 'armor',  name: 'Armor Plating', price: 300, desc: '+60 car HP' },
  { id: 'nitro',  name: 'Nitro Kit',    price: 200, desc: 'Shift = nitro boost' },
];

export const RADIO_STATIONS = [
  { name: 'SOLMAR FM 98.1 — Sunset Synth', bpm: 96,  wave: 'sawtooth', notes: [0, 3, 5, 7, 10, 12, 10, 7] },
  { name: 'BAY LATIN 104.5 — Salsa Nights', bpm: 132, wave: 'triangle', notes: [0, 4, 7, 9, 12, 9, 7, 4] },
  { name: 'PALMIRA TALK 88.0 — City Beat', bpm: 70,  wave: 'square',   notes: [0, 5, 7, 12, 7, 5, 3, 0] },
];

export const CREW = [
  { name: 'Marcus', color: 0x2244aa, hp: 120 },
  { name: 'Lena',   color: 0xaa2288, hp: 120 },
];

export function rankFor(respect) {
  let r = RANKS[0];
  for (const cand of RANKS) if (respect >= cand.respect) r = cand;
  return r;
}
