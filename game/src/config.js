// config.js — the static data of SOLMARA: districts, weapons, ranks,
// garage upgrades, shop stock and the three street-race routes.
// Nothing here runs; missions.js owns the story definitions.
export const WORLD = {
  size: 920,          // island is a square, half-size 460
  roadGap: 92,        // distance between road centrelines
  roadWidth: 14,
  seed: 20261124,
};

export const DISTRICTS = [
  { name: 'Portside',    color: 0x3fa7d6, x: -330, z: -300, r: 130, standing: 0 },
  { name: 'Old Town',    color: 0xe8b04b, x: -180, z:  140, r: 150, standing: 0 },
  { name: 'Marina Strip',color: 0x7dffce, x:   60, z: -320, r: 140, standing: 0 },
  { name: 'Neon Quarter',color: 0xff5da2, x:  260, z:  -40, r: 150, standing: 0 },
  { name: 'Hillside',    color: 0xb18cff, x:  300, z:  260, r: 140, standing: 0 },
  { name: 'Airport Flats',color: 0x9aa7b8, x: -300, z:  330, r: 120, standing: 0 },
];

export const WEAPONS = {
  pistol:  { name: 'PISTOL',  damage: 34, rate: 0.28, range: 60,  spread: 0.02,  auto: false, ammo: Infinity, price: 0,    mag: Infinity },
  smg:     { name: 'SMG',     damage: 16, rate: 0.09, range: 48,  spread: 0.06,  auto: true,  ammo: 240, price: 450,  mag: 240 },
  shotgun: { name: 'SHOTGUN', damage: 22, rate: 0.85, range: 26,  spread: 0.16,  auto: false, ammo: 40,  price: 700,  mag: 40, pellets: 6 },
  rifle:   { name: 'RIFLE',   damage: 65, rate: 0.5,  range: 130, spread: 0.008, auto: false, ammo: 90,  price: 1400, mag: 90 },
};

export const RANKS = [
  { respect: 0,    name: 'ROOKIE' },
  { respect: 120,  name: 'HUSTLER' },
  { respect: 300,  name: 'WHEELMAN' },
  { respect: 600,  name: 'STREET KING' },
  { respect: 1000, name: 'ISLAND LEGEND' },
];

export function rankFor(respect) {
  let r = RANKS[0];
  for (const cand of RANKS) if (respect >= cand.respect) r = cand;
  return r;
}

export const UPGRADES = [
  { id: 'engine', name: 'Turbo Engine', desc: '+35% top speed, +25% acceleration', price: 900, max: 3 },
  { id: 'armor',  name: 'Armored Plating', desc: '+60 car health, slower damage', price: 750, max: 3 },
  { id: 'nitro',  name: 'Nitro Kit', desc: 'SHIFT boost: longer, stronger', price: 650, max: 3 },
  { id: 'tires',  name: 'Grip Tires', desc: 'Sharper steering, less slide', price: 500, max: 2 },
];

export const SHOP = [
  { id: 'smg',     name: 'SMG',            desc: 'Rapid-fire street sweeper', price: 450 },
  { id: 'shotgun', name: 'Shotgun',        desc: 'Close-range crowd stopper', price: 700 },
  { id: 'rifle',   name: 'Rifle',          desc: 'Long-range precision',      price: 1400 },
  { id: 'ammo-smg',     name: 'SMG Ammo ×120',   desc: 'Restock the SMG',     price: 120, ammo: 120, weapon: 'smg' },
  { id: 'ammo-shotgun', name: 'Shells ×24',      desc: 'Restock the shotgun', price: 100, ammo: 24,  weapon: 'shotgun' },
  { id: 'ammo-rifle',   name: 'Rifle Rounds ×45',desc: 'Restock the rifle',   price: 150, ammo: 45,  weapon: 'rifle' },
  { id: 'vest',    name: 'Body Armor',     desc: 'Full health + 50 armor',    price: 200 },
];

export const RACES = [
  {
    id: 'sunset-loop', name: 'Sunset Loop', district: 'Marina Strip',
    prize: 600, par: 95,
    checkpoints: [[-40, -360], [180, -360], [330, -180], [330, 90], [140, 270], [-40, 270], [-230, 90], [-230, -180]],
  },
  {
    id: 'coastal-sprint', name: 'Coastal Sprint', district: 'Portside',
    prize: 900, par: 85,
    checkpoints: [[-360, -90], [-360, 180], [-180, 360], [90, 360], [270, 270], [360, 90], [360, -180], [180, -360]],
  },
  {
    id: 'neon-gp', name: 'Neon Grand Prix', district: 'Neon Quarter',
    prize: 1500, par: 110,
    checkpoints: [[90, -90], [270, -90], [360, 90], [270, 270], [90, 360], [-90, 270], [-270, 90], [-90, -90]],
  },
];

export const GARAGE_POS = { x: -120, z: 60 };   // Maya's garage, Old Town edge
export const SHOP_POS = { x: 210, z: -160 };    // Dockside Arms, Neon Quarter
export const SAFEHOUSE_POS = { x: -60, z: 200 };// Dare's safehouse, Old Town
export const START_POS = { x: -100, z: 40 };
