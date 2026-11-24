// garage.js — Maya's garage (car upgrades) and Dockside Arms (weapons,
// ammo, armor). Purchases cost cash and apply immediately; upgrades
// persist in the save and scale the player's car.
import { UPGRADES, SHOP, GARAGE_POS, SHOP_POS, WEAPONS } from './config.js';
import { dist2D } from './utils.js';

export function initGarage(G) {
  G.upgrades = { engine: 0, armor: 0, nitro: 0, tires: 0 };
  G.garage = {
    nearGarage() { return dist2D(G.player.mesh.position.x, G.player.mesh.position.z, GARAGE_POS.x, GARAGE_POS.z) < 26; },
    nearShop() { return dist2D(G.player.mesh.position.x, G.player.mesh.position.z, SHOP_POS.x, SHOP_POS.z) < 26; },
    buyUpgrade(id) {
      const u = UPGRADES.find((x) => x.id === id);
      if (!u) return false;
      const lvl = G.upgrades[id] || 0;
      const price = u.price * (lvl + 1);
      if (lvl >= u.max || G.player.money < price) return false;
      G.player.money -= price;
      G.upgrades[id] = lvl + 1;
      if (id === 'armor' && G.player.car) {
        G.player.car.maxHealth += 60;
        G.player.car.health += 60;
      }
      G.audio.pickup();
      G.hud.toast(`🛠 ${u.name} → Lv ${lvl + 1}. Maya winks: “She’ll fly now.”`);
      G.hud.refresh();
      return true;
    },
    buyShop(id) {
      const item = SHOP.find((x) => x.id === id);
      if (!item || G.player.money < item.price) return false;
      G.player.money -= item.price;
      if (item.id === 'vest') {
        G.player.health = 100;
        G.hud.toast('🛡 Body armor fitted. Health full.');
      } else if (item.ammo) {
        G.weapons.ammo[item.weapon] += item.ammo;
        G.hud.toast(`📦 +${item.ammo} ammo for the ${WEAPONS[item.weapon].name}.`);
      } else {
        if (!G.weapons.owned.includes(item.id)) G.weapons.owned.push(item.id);
        G.weapons.ammo[item.id] += WEAPONS[item.id].ammo === Infinity ? 0 : WEAPONS[item.id].mag;
        G.weapons.select(item.id);
        G.hud.toast(`🔫 ${WEAPONS[item.id].name} bought and equipped!`);
      }
      G.audio.pickup();
      G.hud.refresh();
      return true;
    },
  };
}
