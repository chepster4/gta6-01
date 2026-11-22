// HUD: health/money/wanted/ammo/coins/respect, minimap canvas, mission
// banner, weapon wheel, shop + garage panels, radio display, start
// screen and game-over overlay. All DOM is built here so index.html
// stays a thin shell.
import { WEAPONS, WEAPON_ORDER, rankFor, GARAGE_UPGRADES, SHOP } from './config.js';

function el(tag, id, parent, html = '') {
  const e = document.createElement(tag);
  if (id) e.id = id;
  e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export class HUD {
  constructor(G) {
    this.G = G;
    this.root = el('div', 'hud', document.body);
    this.root.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:Arial,sans-serif;color:#fff;z-index:5';
    this._buildTop();
    this._buildBottom();
    this._buildMinimap();
    this._buildWheel();
    this._buildPanels();
    this._buildOverlays();
    this._flashTimer = 0;
    this._bannerTimer = 0;
  }
  _buildTop() {
    const top = el('div', 'hud-top', this.root);
    top.style.cssText = 'position:absolute;top:12px;left:14px;display:flex;gap:14px;align-items:flex-start';
    this.wantedEl = el('div', 'wanted', top, '');
    this.wantedEl.style.cssText = 'font-size:26px;letter-spacing:2px;text-shadow:0 2px 4px #000';
    const stats = el('div', '', top);
    stats.style.cssText = 'font-size:15px;line-height:1.5;text-shadow:0 1px 3px #000';
    this.moneyEl = el('div', 'money', stats, '$0');
    this.moneyEl.style.cssText = 'font-size:22px;font-weight:bold;color:#7dff8a';
    this.rankEl = el('div', 'rank', stats, '');
    this.coinsEl = el('div', 'coins', stats, '');
    this.radioEl = el('div', 'radio', stats, '');
    this.radioEl.style.cssText = 'color:#ffd24a';
  }
  _buildBottom() {
    const bot = el('div', 'hud-bot', this.root);
    bot.style.cssText = 'position:absolute;left:14px;bottom:14px;text-shadow:0 1px 3px #000';
    this.hpBar = el('div', 'hpbar', bot);
    this.hpBar.style.cssText = 'width:220px;height:14px;background:#0008;border:1px solid #fff6;border-radius:3px;overflow:hidden';
    this.hpFill = el('div', 'hpfill', this.hpBar);
    this.hpFill.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#37d67a,#a8ff6a)';
    this.weaponEl = el('div', 'weapon', bot, '');
    this.weaponEl.style.cssText = 'margin-top:6px;font-size:17px;font-weight:bold';
    this.ammoEl = el('div', 'ammo', bot, '');
    this.ammoEl.style.cssText = 'font-size:14px;color:#ffd24a';
    this.hintEl = el('div', 'hint', bot, '');
    this.hintEl.style.cssText = 'margin-top:8px;font-size:13px;color:#cfe8ff';
    this.flashEl = el('div', 'flash', this.root, '');
    this.flashEl.style.cssText = 'position:absolute;left:50%;top:18%;transform:translateX(-50%);font-size:20px;font-weight:bold;text-shadow:0 2px 6px #000;color:#ffe27a;text-align:center';
    this.bannerEl = el('div', 'banner', this.root, '');
    this.bannerEl.style.cssText = 'position:absolute;left:50%;top:32%;transform:translateX(-50%);text-align:center;display:none';
    this.bannerTitle = el('div', '', this.bannerEl, '');
    this.bannerTitle.style.cssText = 'font-size:34px;font-weight:bold;letter-spacing:3px;text-shadow:0 3px 8px #000;color:#ffd24a';
    this.bannerSub = el('div', '', this.bannerEl, '');
    this.bannerSub.style.cssText = 'font-size:16px;text-shadow:0 2px 4px #000;margin-top:6px';
  }
  _buildMinimap() {
    const wrap = el('div', 'minimap-wrap', this.root);
    wrap.style.cssText = 'position:absolute;right:14px;bottom:14px;background:#000a;border:1px solid #fff5;border-radius:6px;padding:4px';
    this.map = el('canvas', 'minimap', wrap);
    this.map.width = 190; this.map.height = 190;
    this.map.style.cssText = 'display:block;border-radius:4px';
  }
  _buildWheel() {
    this.wheel = el('div', 'wheel', this.root);
    this.wheel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:340px;height:340px;border-radius:50%;background:#000a;border:2px solid #ffd24a;display:none;pointer-events:none';
    this.wheelSlots = {};
    WEAPON_ORDER.forEach((key, i) => {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      const s = el('div', '', this.wheel, `<b>${i + 1}</b><br>${WEAPONS[key].name}`);
      s.style.cssText = `position:absolute;left:${50 + Math.cos(a) * 34}%;top:${50 + Math.sin(a) * 34}%;transform:translate(-50%,-50%);text-align:center;font-size:14px;text-shadow:0 1px 3px #000`;
      this.wheelSlots[key] = s;
    });
    const c = el('div', '', this.wheel, 'WEAPON WHEEL<br><span style="font-size:12px">1–4 / click to pick</span>');
    c.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;font-size:15px;font-weight:bold';
  }
  _buildPanels() {
    // Shop panel.
    this.shopPanel = el('div', 'shop', this.root);
    this.shopPanel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#101018ee;border:2px solid #ffcc33;border-radius:10px;padding:20px 24px;display:none;pointer-events:auto;width:340px';
    this.shopPanel.innerHTML = `<h2 style="margin:0 0 4px;color:#ffcc33">SOLMAR ARMS</h2>
      <p style="margin:0 0 12px;color:#ccc;font-size:13px">Ammo &amp; supplies — press E again or Esc to close</p>
      <button data-buy="ammo" style="display:block;width:100%;margin:6px 0;padding:10px;font-size:15px">Ammo +${SHOP.ammoAmount} — $${SHOP.ammoPrice}</button>
      <button data-buy="medkit" style="display:block;width:100%;margin:6px 0;padding:10px;font-size:15px">Medkit (full heal) — $${SHOP.medkitPrice}</button>
      <button data-buy="smg" style="display:block;width:100%;margin:6px 0;padding:10px;font-size:15px">Buy SMG — $400</button>
      <button data-buy="shotgun" style="display:block;width:100%;margin:6px 0;padding:10px;font-size:15px">Buy Shotgun — $600</button>
      <button data-buy="rifle" style="display:block;width:100%;margin:6px 0;padding:10px;font-size:15px">Buy Rifle — $900</button>`;
    this.shopPanel.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-buy]');
      if (b) this.G.onShopBuy(b.dataset.buy);
    });
    // Garage panel.
    this.garagePanel = el('div', 'garage', this.root);
    this.garagePanel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#101018ee;border:2px solid #33aaff;border-radius:10px;padding:20px 24px;display:none;pointer-events:auto;width:360px';
    this.garagePanel.innerHTML = `<h2 style="margin:0 0 4px;color:#33aaff">GARAGE — UPGRADES</h2>
      <p style="margin:0 0 12px;color:#ccc;font-size:13px">Upgrades apply to the car you are driving. Press E again or Esc to close</p>
      ${GARAGE_UPGRADES.map((u) => `<button data-up="${u.id}" style="display:block;width:100%;margin:6px 0;padding:10px;font-size:15px;text-align:left">${u.name} — $${u.price}<br><span style="font-size:12px;color:#aaa">${u.desc}</span></button>`).join('')}`;
    this.garagePanel.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-up]');
      if (b) this.G.onGarageBuy(b.dataset.up);
    });
  }
  _buildOverlays() {
    // Start screen.
    this.startEl = el('div', 'start', this.root);
    this.startEl.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,#1a1030ee,#30160aee);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;text-align:center';
    this.startEl.innerHTML = `<div style="font-size:64px;font-weight:bold;letter-spacing:6px;color:#ffd24a;text-shadow:0 4px 18px #000">PALMIRA BAY</div>
      <div style="font-size:22px;letter-spacing:8px;color:#fff;margin-top:4px">STREETS OF THE SUN</div>
      <div style="margin-top:18px;font-size:15px;line-height:1.8;color:#e8e8e8">Open-world crime — 10 story missions · wanted 1–5 · CONDOR-1 heli · roadblocks<br>
      weapon wheel · garage upgrades · street races · respect ranks · radio · crew<br>
      <b>WASD</b> move / drive &nbsp; <b>Mouse</b> shoot &nbsp; <b>1–4</b> weapons &nbsp; <b>Q</b> weapon wheel<br>
      <b>E</b> enter car / shop / garage &nbsp; <b>R</b> radio &nbsp; <b>Shift</b> run / nitro</div>
      <button id="startBtn" style="margin-top:26px;padding:14px 44px;font-size:20px;font-weight:bold;background:#ffd24a;border:0;border-radius:8px;cursor:pointer">▶ START GAME</button>
      <button id="continueBtn" style="margin-top:10px;padding:10px 30px;font-size:15px;background:#333;color:#fff;border:1px solid #888;border-radius:8px;cursor:pointer;display:none">Continue saved game</button>
      <div style="margin-top:16px;font-size:12px;color:#aaa">Progress saves automatically (localStorage)</div>`;
    this.startEl.querySelector('#startBtn').addEventListener('click', () => this.G.startGame(false));
    this.continueBtn = this.startEl.querySelector('#continueBtn');
    this.continueBtn.addEventListener('click', () => this.G.startGame(true));
    // Game over.
    this.overEl = el('div', 'gameover', this.root);
    this.overEl.style.cssText = 'position:absolute;inset:0;background:#200000cc;display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;text-align:center';
    this.overEl.innerHTML = `<div style="font-size:52px;font-weight:bold;color:#ff5555">BUSTED / WASTED</div>
      <div style="font-size:17px;margin-top:10px">You went down. The city keeps moving without you.</div>
      <button id="retryBtn" style="margin-top:22px;padding:12px 36px;font-size:18px;background:#ffd24a;border:0;border-radius:8px;cursor:pointer">Respawn at safehouse</button>`;
    this.overEl.querySelector('#retryBtn').addEventListener('click', () => this.G.respawn());
    // Pause hint.
    this.pauseEl = el('div', 'pause', this.root, 'PAUSED — press P to resume');
    this.pauseEl.style.cssText = 'position:absolute;left:50%;top:46%;transform:translateX(-50%);font-size:26px;font-weight:bold;display:none;text-shadow:0 2px 6px #000';
  }
  showContinue(show) { this.continueBtn.style.display = show ? '' : 'none'; }
  hideStart() { this.startEl.style.display = 'none'; }
  showGameOver() { this.overEl.style.display = 'flex'; }
  hideGameOver() { this.overEl.style.display = 'none'; }
  setPaused(p) { this.pauseEl.style.display = p ? '' : 'none'; }
  showShop(show) { this.shopPanel.style.display = show ? '' : 'none'; }
  showGarage(show) { this.garagePanel.style.display = show ? '' : 'none'; }
  showWheel(show) { this.wheel.style.display = show ? '' : 'none'; }
  flash(text, secs = 2.2) {
    this.flashEl.textContent = text;
    this._flashTimer = secs;
  }
  banner(title, sub = '') {
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = sub;
    this.bannerEl.style.display = 'block';
    this._bannerTimer = 3.2;
  }
  update(dt, G) {
    const p = G.player;
    // Wanted stars.
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < p.wanted ? '★' : '☆';
    this.wantedEl.textContent = stars;
    this.wantedEl.style.color = p.wanted >= 3 ? '#ff5555' : '#ffd24a';
    this.moneyEl.textContent = `$${Math.floor(p.money).toLocaleString('en-US')}`;
    const rank = rankFor(p.respect);
    this.rankEl.textContent = `Respect: ${rank.name} (${p.respect})`;
    this.coinsEl.textContent = `🪙 ${p.coins || 0}/12`;
    this.radioEl.textContent = `♪ ${G.audio.stationName()}`;
    this.hpFill.style.width = `${Math.max(0, p.hp)}%`;
    this.hpFill.style.background = p.hp > 50 ? 'linear-gradient(90deg,#37d67a,#a8ff6a)' : p.hp > 25 ? 'linear-gradient(90deg,#d8a837,#ffd24a)' : 'linear-gradient(90deg,#d83737,#ff6a6a)';
    const w = WEAPONS[p.weapon];
    this.weaponEl.textContent = p.car ? `🚗 ${p.car.sport ? 'Sports car' : 'Sedan'}  ·  HP ${Math.ceil(p.car.hp)}/${p.car.maxHp}` : `🔫 ${w.name}`;
    this.ammoEl.textContent = p.car ? 'W A S D drive · E exit · Shift nitro' : `Ammo: ${p.ammo[p.weapon] ?? 0} · 1–4 switch · Q wheel`;
    // Context hint.
    let hint = '';
    if (!p.car && G.world.nearShop(p.pos)) hint = '[E] SOLMAR ARMS — buy ammo / medkit';
    else if (p.car && G.world.nearGarage(p.pos)) hint = '[E] GARAGE — upgrade this car';
    else if (!p.car && G.vehicles.nearestCar(p.pos.x, p.pos.z, 4)) hint = '[E] Steal car';
    else if (G.missions.current()) hint = `Mission ${G.missions.current().id}/10: ${G.missions.current().title} — follow the gold beam`;
    this.hintEl.textContent = hint;
    // Wheel slot highlight.
    for (const key of WEAPON_ORDER) {
      const s = this.wheelSlots[key];
      const owned = !!p.weapons[key];
      s.style.opacity = owned ? '1' : '0.35';
      s.style.color = p.weapon === key ? '#ffd24a' : '#fff';
    }
    // Timers.
    if (this._flashTimer > 0) { this._flashTimer -= dt; if (this._flashTimer <= 0) this.flashEl.textContent = ''; }
    if (this._bannerTimer > 0) { this._bannerTimer -= dt; if (this._bannerTimer <= 0) this.bannerEl.style.display = 'none'; }
    this._drawMinimap(G);
  }
  _drawMinimap(G) {
    const ctx = this.map.getContext('2d');
    const S = 190, scale = S / 560;
    const toX = (x) => (x + 280) * scale;
    const toZ = (z) => (z + 280) * scale;
    ctx.fillStyle = '#0c1410';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#3a3a44';
    ctx.lineWidth = 4;
    for (let k = -5; k <= 5; k++) {
      const c = k * 56;
      ctx.beginPath(); ctx.moveTo(toX(c), 0); ctx.lineTo(toX(c), S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, toZ(c)); ctx.lineTo(S, toZ(c)); ctx.stroke();
    }
    // Docks.
    ctx.fillStyle = '#5a6a7a';
    ctx.fillRect(toX(196), toZ(84), 84 * scale, 112 * scale);
    // Solmar Tower.
    ctx.fillStyle = '#ff5a8a';
    ctx.fillRect(toX(84) - 3, toZ(140) - 3, 6, 6);
    // Mission marker.
    const m = G.missions.current();
    if (m) {
      ctx.fillStyle = '#ffcc22';
      ctx.beginPath(); ctx.arc(toX(m.target[0]), toZ(m.target[1]), 5, 0, Math.PI * 2); ctx.fill();
    }
    // Coins left.
    ctx.fillStyle = '#ffd24a';
    for (const c of G.world.coins) if (!c.taken) ctx.fillRect(toX(c.x) - 1, toZ(c.z) - 1, 2, 2);
    // Police + heli.
    ctx.fillStyle = '#4a9aff';
    for (const c of G.police.cars) { ctx.beginPath(); ctx.arc(toX(c.x), toZ(c.z), 3, 0, Math.PI * 2); ctx.fill(); }
    if (G.police.heli.visible) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(toX(G.police.heliPos.x), toZ(G.police.heliPos.z), 4, 0, Math.PI * 2); ctx.fill();
    }
    // Rivals.
    ctx.fillStyle = '#ff3333';
    for (const r of G.missions.rivals) if (r.hp > 0) { ctx.beginPath(); ctx.arc(toX(r.x), toZ(r.z), 3, 0, Math.PI * 2); ctx.fill(); }
    // Player arrow.
    const p = G.player;
    ctx.save();
    ctx.translate(toX(p.pos.x), toZ(p.pos.z));
    ctx.rotate(-p.angle + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
