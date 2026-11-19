// The HUD: money, coins, HP, clock, radio, wanted stars, the job banner,
// minimap (a live 2D canvas of the city), speed and weapon readouts, plus
// the start screen, pause screen, shop panel and game-over screen.
import { HALF } from './config.js';

const STAR_ON = '★';
const STAR_OFF = '☆';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const moneyEl = $('money');
  const coinsEl = $('coins');
  const hpFill = $('hp-fill');
  const hpText = $('hp-text');
  const clockEl = $('clock');
  const radioEl = $('radio');
  const starsEl = $('stars');
  const jobTitle = $('job-title');
  const jobBrief = $('job-brief');
  const speedEl = $('speed');
  const vehicleEl = $('vehicle');
  const weaponEl = $('weapon');
  const toastEl = $('toast');
  const minimap = $('minimap');
  const mctx = minimap.getContext('2d');
  const startScreen = $('start-screen');
  const pauseScreen = $('pause-screen');
  const overScreen = $('over-screen');
  const shopPanel = $('shop');
  const shopMoney = $('shop-money');
  let toastTimer = 0;

  function fmtClock(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function toast(message, ms = 2600) {
    toastEl.textContent = message;
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, ms);
  }

  return {
    setMoney(v) { moneyEl.textContent = `$${v}`; },
    setCoins(n) { coinsEl.textContent = `🪙 ${n}/12`; },
    setHp(hp) {
      hpFill.style.width = `${Math.max(0, hp)}%`;
      hpFill.style.background = hp > 50 ? '#58d858' : hp > 25 ? '#e8b800' : '#e84040';
      hpText.textContent = String(Math.round(hp));
    },
    setClock(minutes) { clockEl.textContent = fmtClock(minutes); },
    setRadio(name) { radioEl.textContent = `RADIO ${name}`; },
    setWanted(stars) {
      let s = '';
      for (let i = 0; i < 5; i += 1) s += i < stars ? STAR_ON : STAR_OFF;
      starsEl.textContent = s;
      starsEl.className = stars > 0 ? 'stars hot' : 'stars';
    },
    setJob(title, brief, distance) {
      jobTitle.textContent = title;
      jobBrief.textContent = distance === null ? brief : `${brief} · ${Math.round(distance)}m`;
    },
    setSpeed(kmh, vehicle, weapon) {
      speedEl.innerHTML = `${Math.round(kmh)} <small>km/h</small>`;
      vehicleEl.textContent = vehicle;
      weaponEl.textContent = weapon;
    },
    toast,
    showStart() { startScreen.style.display = 'flex'; },
    hideStart() { startScreen.style.display = 'none'; },
    showPause(show) { pauseScreen.style.display = show ? 'flex' : 'none'; },
    showOver(show, money, jobs) {
      overScreen.style.display = show ? 'flex' : 'none';
      if (show) $('over-stats').textContent = `You banked $${money} and finished ${jobs} job${jobs === 1 ? '' : 's'}.`;
    },
    openShop(money) {
      shopMoney.textContent = `$${money}`;
      shopPanel.style.display = 'block';
    },
    closeShop() { shopPanel.style.display = 'none'; },
    shopVisible() { return shopPanel.style.display === 'block'; },
    /** Draw the minimap: roads, buildings, player arrow, target, police, coins. */
    drawMinimap(state) {
      const S = 200;
      const toMap = (v) => ((v + HALF) / 560) * S;
      mctx.clearRect(0, 0, S, S);
      mctx.fillStyle = '#16202e';
      mctx.fillRect(0, 0, S, S);
      // Roads.
      mctx.strokeStyle = '#5a6a7a';
      mctx.lineWidth = 4;
      for (let k = 0; k <= 8; k += 1) {
        const p = (k / 8) * S;
        mctx.beginPath(); mctx.moveTo(p, 0); mctx.lineTo(p, S); mctx.stroke();
        mctx.beginPath(); mctx.moveTo(0, p); mctx.lineTo(S, p); mctx.stroke();
      }
      // Buildings as pale blocks.
      mctx.fillStyle = '#3a4a5a';
      for (const c of state.colliders) {
        mctx.fillRect(toMap(c.minX), toMap(c.minZ), toMap(c.maxX) - toMap(c.minX), toMap(c.maxZ) - toMap(c.minZ));
      }
      // Coins.
      mctx.fillStyle = '#ffd040';
      for (const coin of state.coins) {
        if (coin.taken) continue;
        mctx.beginPath();
        mctx.arc(toMap(coin.x), toMap(coin.z), 2.5, 0, Math.PI * 2);
        mctx.fill();
      }
      // Mission target.
      if (state.target) {
        mctx.fillStyle = '#ffd040';
        const tx = toMap(state.target.x); const tz = toMap(state.target.z);
        mctx.beginPath();
        mctx.moveTo(tx, tz - 7); mctx.lineTo(tx + 6, tz + 5); mctx.lineTo(tx - 6, tz + 5);
        mctx.closePath(); mctx.fill();
      }
      // Police.
      mctx.fillStyle = '#ff4040';
      for (const p of state.police) {
        mctx.beginPath();
        mctx.arc(toMap(p.x), toMap(p.z), 3, 0, Math.PI * 2);
        mctx.fill();
      }
      // Player arrow.
      const px = toMap(state.playerX); const pz = toMap(state.playerZ);
      mctx.save();
      mctx.translate(px, pz);
      mctx.rotate(state.heading);
      mctx.fillStyle = '#ffffff';
      mctx.beginPath();
      mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6);
      mctx.closePath(); mctx.fill();
      mctx.restore();
      // North marker.
      mctx.fillStyle = '#ffffff';
      mctx.font = 'bold 11px system-ui, sans-serif';
      mctx.fillText('N', S / 2 - 4, 12);
    },
  };
}
