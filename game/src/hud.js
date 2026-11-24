// hud.js — the DOM HUD: wanted stars, cash, respect rank, health, ammo,
// mission tracker, minimap (2D canvas, north-up), banners, toasts,
// and the pause / garage / shop panels.
import { fmtMoney } from './utils.js';
import { DISTRICTS, UPGRADES, SHOP, WEAPONS, rankFor } from './config.js';

export function initHud(G) {
  const $ = (id) => document.getElementById(id);
  let toastTimer = null;
  let bannerTimer = null;

  G.hud = {
    show() { $('hud').classList.remove('hidden'); },
    hide() { $('hud').classList.add('hidden'); },
    refresh() {
      const p = G.player;
      const stars = $('stars');
      stars.textContent = '★'.repeat(G.wanted.level) + '☆'.repeat(5 - G.wanted.level);
      stars.classList.toggle('zero', G.wanted.level === 0);
      $('cash').textContent = fmtMoney(p.money);
      $('respect').textContent = 'RESPECT ' + p.respect + ' · ' + rankFor(p.respect).name;
      $('healthfill').style.width = Math.max(0, p.health) + '%';
      $('healthfill').style.background = p.health > 50 ? 'linear-gradient(90deg,#37e08b,#a5ff6b)' : p.health > 25 ? 'linear-gradient(90deg,#ffb020,#ffd23e)' : 'linear-gradient(90deg,#ff4040,#ff8040)';
      const w = G.weapons.current;
      $('weapon').textContent = WEAPONS[w].name + (G.player.car ? ' · ' + G.player.car.name.toUpperCase() : '');
      $('ammo').textContent = WEAPONS[w].name + ' · ' + (G.weapons.ammo[w] === Infinity ? '∞' : G.weapons.ammo[w]);
      const speedo = $('speedo');
      if (G.player.car) {
        speedo.classList.remove('hidden');
        $('speed').textContent = Math.round(Math.abs(G.player.car.speed) * 2.2);
        $('gear').textContent = G.player.car.speed >= -0.5 ? 'D' : 'R';
      } else {
        speedo.classList.add('hidden');
      }
    },
    setMission(title, obj) {
      $('missionTitle').textContent = title || '';
      const o = $('missionObj');
      if (obj) { o.textContent = '▸ ' + obj; o.classList.remove('hidden'); }
      else o.classList.add('hidden');
      $('missionDist').textContent = '';
    },
    setMissionDist(t) { $('missionDist').textContent = t || ''; },
    banner(title, sub) {
      $('bannerTitle').textContent = title;
      $('bannerSub').textContent = sub || '';
      $('banner').classList.remove('hidden');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => $('banner').classList.add('hidden'), 3600);
    },
    toast(msg) {
      const t = $('toast');
      t.textContent = msg;
      t.classList.remove('hidden');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
    },
    showRaceTimer(on) { $('racetimer').classList.toggle('hidden', !on); },
    setRadio(name) { $('radio').textContent = name; },

    // --- minimap: roads, buildings, districts, player, cars, cops, heli, beacon ---
    drawMinimap() {
      const cv = $('minimap');
      const g = cv.getContext('2d');
      const S = 190, half = 460;
      const toMap = (x, z) => [S / 2 + (x / half) * (S / 2), S / 2 + (z / half) * (S / 2)];
      g.clearRect(0, 0, S, S);
      g.fillStyle = '#0e1420';
      g.fillRect(0, 0, S, S);
      // water ring
      g.fillStyle = '#14638f';
      g.fillRect(0, 0, S, S);
      g.fillStyle = '#5d6b52';
      g.fillRect(2, 2, S - 4, S - 4);
      // districts
      for (const d of DISTRICTS) {
        const [x, y] = toMap(d.x, d.z);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.beginPath(); g.arc(x, y, d.r / half * (S / 2), 0, Math.PI * 2); g.fill();
      }
      // roads
      g.strokeStyle = '#2b2e35';
      g.lineWidth = 3;
      for (let i = -4; i <= 4; i++) {
        const p = (i * 92) / half * (S / 2) + S / 2;
        g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
        g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke();
      }
      // buildings
      g.fillStyle = '#c9c2b2';
      for (const c of G.world.colliders) {
        if (c.maxX - c.minX > 60) continue;
        const [x1, y1] = toMap(c.minX, c.minZ);
        const [x2, y2] = toMap(c.maxX, c.maxZ);
        g.fillRect(x1, y1, x2 - x1, y2 - y1);
      }
      // race gates
      if (G.races.active) {
        g.fillStyle = '#19e3ff';
        const gate = G.races.active.gates[G.races.active.idx];
        const [x, y] = toMap(gate.x, gate.z);
        g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
      }
      // mission beacon
      if (G.missions.beacon.visible) {
        const [x, y] = toMap(G.missions.beacon.position.x, G.missions.beacon.position.z);
        g.fillStyle = '#ffb020';
        g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#ffb020'; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, 10 + Math.sin(G.time * 5) * 2, 0, Math.PI * 2); g.stroke();
      }
      // garage / shop / safehouse
      const dots = [['#ffb020', -120, 60], ['#19e3ff', 210, -160], ['#7dff9b', -60, 200]];
      for (const [col, x, z] of dots) {
        const [mx, my] = toMap(x, z);
        g.fillStyle = col;
        g.fillRect(mx - 3, my - 3, 6, 6);
      }
      // cops (red) + heli (yellow)
      g.fillStyle = '#ff4040';
      for (const c of G.police.cops) {
        const [x, y] = toMap(c.mesh.position.x, c.mesh.position.z);
        g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill();
      }
      if (G.police.heli) {
        const [x, y] = toMap(G.police.heli.mesh.position.x, G.police.heli.mesh.position.z);
        g.fillStyle = '#ffd23e';
        g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
      }
      // enemies (purple)
      g.fillStyle = '#c05cff';
      for (const e of G.enemies) {
        if (e.dead) continue;
        const [x, y] = toMap(e.mesh.position.x, e.mesh.position.z);
        g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      }
      // player arrow (white, rotates with heading)
      const pp = G.player.car ? G.player.car.mesh.position : G.player.mesh.position;
      const [px, py] = toMap(pp.x, pp.z);
      const heading = G.player.car ? G.player.car.heading : G.player.heading;
      g.save();
      g.translate(px, py);
      g.rotate(-heading + Math.PI);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
      g.restore();
    },

    // --- panels ---
    openPause() {
      const p = G.player;
      $('pauseStats').textContent = `Cash ${fmtMoney(p.money)} · Respect ${p.respect} (${rankFor(p.respect).name}) · Missions ${G.missions.completed.length}/12 · Wanted ${'★'.repeat(G.wanted.level) || 'clear'} · Best race: ${Object.entries(G.races.best).map(([k, v]) => k + ' ' + v.toFixed(1) + 's').join(' · ') || 'none yet'}`;
      $('pauseMenu').classList.remove('hidden');
    },
    closePause() { $('pauseMenu').classList.add('hidden'); },
    openGarage() {
      $('garageCash').textContent = fmtMoney(G.player.money);
      const list = $('garageList');
      list.innerHTML = '';
      for (const u of UPGRADES) {
        const lvl = G.upgrades[u.id] || 0;
        const row = document.createElement('div');
        row.className = 'shopRow';
        row.innerHTML = `<div><b>${u.name} ${lvl > 0 ? '· Lv ' + lvl + '/' + u.max : ''}</b><small>${u.desc}</small></div>`;
        const btn = document.createElement('button');
        btn.className = 'buy';
        btn.textContent = lvl >= u.max ? 'MAXED' : 'BUY ' + fmtMoney(u.price * (lvl + 1));
        btn.disabled = lvl >= u.max || G.player.money < u.price * (lvl + 1);
        btn.onclick = () => { G.garage.buyUpgrade(u.id); G.hud.openGarage(); };
        row.appendChild(btn);
        list.appendChild(row);
      }
      $('garageMenu').classList.remove('hidden');
    },
    closeGarage() { $('garageMenu').classList.add('hidden'); },
    openShop() {
      $('shopCash').textContent = fmtMoney(G.player.money);
      const list = $('shopList');
      list.innerHTML = '';
      for (const item of SHOP) {
        const row = document.createElement('div');
        row.className = 'shopRow';
        const owned = item.weapon ? G.weapons.owned.includes(item.weapon) : item.id === 'smg' || item.id === 'shotgun' || item.id === 'rifle' ? G.weapons.owned.includes(item.id) : false;
        const label = item.id === 'vest' ? 'Body Armor' : item.name + (owned && !item.ammo ? ' · OWNED' : '');
        row.innerHTML = `<div><b>${label}</b><small>${item.desc}</small></div>`;
        const btn = document.createElement('button');
        btn.className = 'buy';
        btn.textContent = 'BUY ' + fmtMoney(item.price);
        btn.disabled = G.player.money < item.price || (owned && !item.ammo && item.id !== 'vest');
        btn.onclick = () => { G.garage.buyShop(item.id); G.hud.openShop(); };
        row.appendChild(btn);
        list.appendChild(row);
      }
      $('shopMenu').classList.remove('hidden');
    },
    closeShop() { $('shopMenu').classList.add('hidden'); },
  };
}
