// Palmira Bay — every tuning number and colour in one place.
// The city is a 560x560 grid: blocks of 70 m with 14 m roads between them.
// World coordinates run from -280 to +280 on both axes; the plaza sits at the centre.
import * as THREE from '../vendor/three.min.js';

export const STEP = 1 / 60;
export const CITY = 560;
export const HALF = CITY / 2;
export const BLOCK = 70;
export const ROAD = 14;
export const SAVE_KEY = 'palmira-bay.save.v1';

// Clock: one game minute per real second, starting at 09:00.
export const CLOCK_START = 9 * 60;

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 14,
  radius: 0.9,
  hp: 100,
};

export const CAR = {
  accel: 26,
  brake: 42,
  maxSpeed: 38,
  reverseSpeed: 12,
  steer: 1.9,
  grip: 6,
};

export const WANTED = {
  max: 5,
  decaySeconds: 26,
  // Police cars on the street per wanted level (index = stars).
  cars: [0, 1, 2, 3, 4, 5],
  // Helicopter appears at this many stars.
  heliAt: 3,
};

export const SHOP = {
  pos: { x: 52, z: -18 },
  ammoPrice: 50,
  ammoAmount: 30,
  medkitPrice: 75,
};

export const SAFEHOUSE = { x: 168, z: -196, radius: 13, healPerSec: 4, wantedEverySec: 4 };

export const COIN_VALUE = 25;

// Twelve gold coins, fixed hiding spots — all on road bands, never inside
// a building, so every one of them is actually reachable on foot.
export const COIN_SPOTS = [
  { x: -206, z: -206 }, { x: -136, z: 206 }, { x: -66, z: -206 }, { x: 4, z: 136 },
  { x: 66, z: -206 }, { x: 136, z: 66 }, { x: 206, z: -136 }, { x: -206, z: 66 },
  { x: -66, z: 206 }, { x: 206, z: 136 }, { x: 136, z: -206 }, { x: -136, z: -66 },
];

// The twelve stealable street cars: model name, paint and where they park.
// Every spot sits on a road band (on the plaza for the first two), never
// inside a building, so the player can always walk up and press E.
export const STREET_CARS = [
  { name: 'Dune Buggy', color: 0x2456c8, x: -24, z: 40, heading: 1.57 },
  { name: 'Sunset Coupe', color: 0xc8321e, x: 18, z: -52, heading: -1.57 },
  { name: 'City Taxi', color: 0xe8b800, x: -66, z: 122, heading: 0 },
  { name: 'Bay Cruiser', color: 0x2e8b6a, x: 122, z: -66, heading: 3.14 },
  { name: 'Neon Hatch', color: 0xd040a0, x: -122, z: -136, heading: 1.57 },
  { name: 'Harbor Van', color: 0xe8e8e8, x: 206, z: 52, heading: -1.57 },
  { name: 'Palm Pickup', color: 0x8a5a28, x: -192, z: 206, heading: 0 },
  { name: 'Coral Sedan', color: 0xe07840, x: 52, z: 206, heading: 3.14 },
  { name: 'Midnight GT', color: 0x1a1a2e, x: -52, z: -206, heading: 1.57 },
  { name: 'Lagoon Cabrio', color: 0x40c8d0, x: 206, z: -52, heading: -1.57 },
  { name: 'Dust Runner', color: 0xb8a888, x: -206, z: 122, heading: 0 },
  { name: 'Solar Sport', color: 0xf0d020, x: 122, z: 206, heading: 3.14 },
];

export const MISSIONS = [
  {
    id: 1, title: 'WHEELS FOR ROSA',
    brief: 'Steal a car — walk up to any parked car and press E',
    reward: 250, givesPistol: true,
    target: { x: -24, z: 40, label: 'parked car' },
  },
  {
    id: 2, title: 'SUNSET DELIVERY',
    brief: 'Drive the package to the east docks before dark',
    reward: 300,
    target: { x: 224, z: 96, label: 'east docks' },
  },
  {
    id: 3, title: 'HOT PURSUIT',
    brief: 'WANTED 3 STARS — reach the safehouse (north-east)',
    reward: 400, wanted: 3,
    target: { x: SAFEHOUSE.x, z: SAFEHOUSE.z, label: 'safehouse' },
  },
  {
    id: 4, title: 'DOCKIDE DEAL',
    brief: 'Drop all three Viper thugs, then grab the briefcase',
    reward: 500,
    target: { x: 192, z: 102, label: 'container yard' },
  },
  {
    id: 5, title: 'KING OF PALMIRA',
    brief: 'Drive to Solmar Tower — the PD roadblock is waiting',
    reward: 800, wanted: 3,
    target: { x: 85, z: 131, label: 'Solmar Tower' },
  },
];

export const PALETTE = {
  skyDay: new THREE.Color(0x7ec8f0),
  skyDusk: new THREE.Color(0xe07850),
  skyNight: new THREE.Color(0x0a1026),
  sun: 0xffe9a8,
  moon: 0xdfe8ff,
  road: 0x2b2b30,
  sidewalk: 0xb8b0a0,
  grass: 0x4a8a3c,
  plaza: 0x9fc8e8,
  buildingBase: 0x8a7a68,
  windowLit: 0xffd880,
  windowDark: 0x1c2733,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
