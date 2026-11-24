// radio.js — three synthesized radio stations, all WebAudio, no files:
// SOLMARA FM (synthwave arpeggio), TIDE 99 (laid-back bass groove),
// TALK ISLA (a chatty host blip + jingle). R switches station.
const STATIONS = [
  { id: 'fm', name: '♪ SOLMARA FM — synthwave', bpm: 112, root: 55, minor: true, wave: 'sawtooth' },
  { id: 'tide', name: '♪ TIDE 99 — island groove', bpm: 88, root: 49, minor: false, wave: 'triangle' },
  { id: 'talk', name: '♪ TALK ISLA — “Morning on the Marina”', bpm: 100, root: 65.4, minor: false, wave: 'sine' },
];

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

export function initRadio(G) {
  let ctx = null, timer = null, step = 0, stationIdx = 0, gainNode = null;

  function ensureCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = ctx.createGain();
        gainNode.gain.value = 0.16;
        gainNode.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function note(freq, dur, type, vol, when = 0) {
    const c = ctx;
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + when + dur);
    o.connect(g).connect(gainNode);
    o.start(c.currentTime + when);
    o.stop(c.currentTime + when + dur + 0.05);
  }

  function tick() {
    const st = STATIONS[stationIdx];
    const scale = SCALES[st.minor ? 'minor' : 'major'];
    const beat = 60 / st.bpm / 2; // 8th notes
    const bar = step % 16;
    const deg = scale[(step * 7 + 3) % scale.length];
    const freq = st.root * Math.pow(2, deg / 12) * 4;
    if (st.id === 'talk') {
      // host "voice": rhythmic blips + occasional jingle
      if (bar % 2 === 0) note(180 + (step % 5) * 22, 0.09, 'sine', 0.12);
      if (bar === 0) { note(523, 0.2, 'triangle', 0.14); note(784, 0.25, 'triangle', 0.12, 0.12); }
      if (bar === 8) note(392, 0.2, 'triangle', 0.12);
    } else {
      if (bar % 4 === 0) note(st.root * 2, beat * 3.5, 'sine', 0.3); // bass
      if (bar % 2 === 1) note(freq, beat * 0.9, st.wave, 0.08);       // arp
      if (bar === 0 || bar === 10) note(freq * 2, beat * 1.4, 'sine', 0.06); // sparkle
      if (bar % 8 === 4) note(st.root * 4 * Math.pow(2, scale[4] / 12), beat, 'triangle', 0.05);
    }
    step++;
    timer = setTimeout(tick, beat * 1000);
  }

  G.radio = {
    station: STATIONS[0],
    start() {
      if (!ensureCtx()) return;
      if (timer) return;
      step = 0;
      tick();
      G.hud.setRadio(STATIONS[stationIdx].name);
    },
    next() {
      stationIdx = (stationIdx + 1) % STATIONS.length;
      this.station = STATIONS[stationIdx];
      step = 0;
      G.hud.setRadio(STATIONS[stationIdx].name);
      G.hud.toast(STATIONS[stationIdx].name);
    },
    stop() { if (timer) { clearTimeout(timer); timer = null; } },
  };
}
