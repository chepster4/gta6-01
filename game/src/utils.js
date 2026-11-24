// utils.js — seeded randomness and small math helpers for SOLMARA.
// Every random choice in the world build goes through mulberry32 so a fixed
// seed reproduces the exact same island, which keeps screenshots stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function randRange(rng, lo, hi) { return lo + rng() * (hi - lo); }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function dist2D(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
export function angleTo(ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); }
export function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
export function fmtMoney(n) { return '$' + Math.floor(n).toLocaleString('en-US'); }
export function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s - m * 60;
  return m + ':' + (sec < 10 ? '0' : '') + sec.toFixed(1);
}
