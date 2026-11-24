// save.js — save slots in localStorage: cash, respect, mission progress,
// owned weapons + ammo, upgrades, race bests, player position and car.
// Autosaves after every mission; M or the pause menu saves manually.
const KEY = 'solmara-save-v1';

export function initSave(G) {
  G.save = {
    write(slot = 1) {
      const data = {
        v: 1,
        money: G.player.money,
        respect: G.player.respect,
        health: G.player.health,
        missionIndex: G.missions.index,
        completed: G.missions.completed,
        owned: G.weapons.owned,
        ammo: G.weapons.ammo,
        currentWeapon: G.weapons.current,
        upgrades: G.upgrades,
        best: G.races.best,
        districts: G.config.DISTRICTS.map((d) => d.standing),
        pos: { x: G.player.mesh.position.x, z: G.player.mesh.position.z },
        dayTime: G.dayNight.time,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(KEY + '-' + slot, JSON.stringify(data));
        return true;
      } catch (e) { return false; }
    },
    read(slot = 1) {
      try {
        const raw = localStorage.getItem(KEY + '-' + slot);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    has() { return !!this.read(1); },
    autosave() { this.write(1); },
    apply(data) {
      if (!data) return false;
      G.player.money = data.money ?? 250;
      G.player.respect = data.respect ?? 0;
      G.player.health = data.health ?? 100;
      G.missions.completed = data.completed || [];
      G.missions.index = data.missionIndex ?? 0;
      G.weapons.owned = data.owned || ['pistol'];
      G.weapons.ammo = Object.assign({ pistol: Infinity, smg: 0, shotgun: 0, rifle: 0 }, data.ammo || {});
      G.weapons.current = data.currentWeapon || 'pistol';
      G.upgrades = Object.assign({ engine: 0, armor: 0, nitro: 0, tires: 0 }, data.upgrades || {});
      G.races.best = data.best || {};
      if (Array.isArray(data.districts)) data.districts.forEach((s, i) => { if (G.config.DISTRICTS[i]) G.config.DISTRICTS[i].standing = s; });
      if (data.pos) G.player.mesh.position.set(data.pos.x, 0, data.pos.z);
      if (typeof data.dayTime === 'number') G.dayNight.time = data.dayTime;
      return true;
    },
  };
}
