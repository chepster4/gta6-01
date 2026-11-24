// audio.js — all sound is synthesized with WebAudio: engine hum, gunshots,
// sirens, explosions, UI clicks. No audio files, no network.
export function initAudio(G) {
  let ctx = null;
  let lastResumeTry = 0;
  let engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, heliOsc = null, heliGain = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') {
      // headless / no-gesture environments: retry resume at most once a second
      const now = performance.now();
      if (now - lastResumeTry > 1000) { lastResumeTry = now; ctx.resume().catch(() => {}); }
      return null;
    }
    return ctx;
  }

  function noiseBuffer(dur = 0.3) {
    const c = ensure();
    if (!c) return null;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    return buf;
  }

  function blip(freq, dur, type = 'sine', vol = 0.2, slideTo = null) {
    const c = ensure();
    if (!c || muted) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  G.audio = {
    unlock() { ensure(); },
    engine(speed, max, nitro) {
      const c = ensure();
      if (!c || muted) return;
      if (!engineOsc) {
        engineOsc = c.createOscillator();
        engineGain = c.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 60;
        engineGain.gain.value = 0;
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter).connect(engineGain).connect(c.destination);
        engineOsc.start();
        G.audio._engineFilter = filter;
      }
      const ratio = max > 0 ? speed / max : 0;
      engineOsc.frequency.setTargetAtTime(55 + ratio * 165 + (nitro ? 40 : 0), c.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(speed > 1 ? 0.05 + ratio * 0.05 : 0, c.currentTime, 0.1);
    },
    siren(on) {
      const c = ensure();
      if (!c) return;
      if (on && !sirenOsc) {
        sirenOsc = c.createOscillator();
        sirenGain = c.createGain();
        sirenOsc.type = 'triangle';
        sirenOsc.frequency.value = 700;
        sirenGain.gain.value = 0.0;
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.value = 0.6;
        lfoGain.gain.value = 260;
        lfo.connect(lfoGain).connect(sirenOsc.frequency);
        sirenOsc.connect(sirenGain).connect(c.destination);
        sirenOsc.start();
        lfo.start();
        sirenGain.gain.setTargetAtTime(muted ? 0 : 0.035, c.currentTime, 0.3);
        G.audio._sirenLfo = lfo;
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); G.audio._sirenLfo.stop(); } catch (e) {}
        sirenOsc = null;
      }
    },
    heli(on) {
      const c = ensure();
      if (!c) return;
      if (on && !heliOsc) {
        heliOsc = c.createOscillator();
        heliGain = c.createGain();
        heliOsc.type = 'square';
        heliOsc.frequency.value = 14;
        heliGain.gain.value = 0.05;
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 220;
        heliOsc.connect(filter).connect(heliGain).connect(c.destination);
        heliOsc.start();
      } else if (!on && heliOsc) {
        try { heliOsc.stop(); } catch (e) {}
        heliOsc = null;
      }
    },
    shot(kind) {
      const c = ensure();
      if (!c || muted) return;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(kind === 'shotgun' ? 0.28 : kind === 'rifle' ? 0.22 : 0.12);
      const g = c.createGain();
      g.gain.value = kind === 'shotgun' ? 0.5 : kind === 'rifle' ? 0.45 : 0.3;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = kind === 'smg' ? 2600 : 1500;
      src.connect(f).connect(g).connect(c.destination);
      src.start();
      blip(kind === 'rifle' ? 180 : 120, 0.08, 'square', 0.12, 50);
    },
    enemyShot() {
      const c = ensure();
      if (!c || muted) return;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(0.1);
      const g = c.createGain();
      g.gain.value = 0.12;
      src.connect(g).connect(c.destination);
      src.start();
    },
    explosion() {
      const c = ensure();
      if (!c || muted) return;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(0.9);
      const g = c.createGain();
      g.gain.value = 0.6;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      src.connect(f).connect(g).connect(c.destination);
      src.start();
      blip(90, 0.7, 'sine', 0.5, 28);
    },
    checkpoint() { blip(660, 0.12, 'sine', 0.22); setTimeout(() => blip(990, 0.18, 'sine', 0.22), 90); },
    raceWin() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.25), i * 110)); },
    missionStart() { [392, 523].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'triangle', 0.22), i * 130)); },
    missionComplete() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'triangle', 0.25), i * 120)); },
    click() { blip(800, 0.05, 'square', 0.12); },
    carDoor() { blip(220, 0.09, 'square', 0.15, 140); },
    pickup() { blip(880, 0.1, 'sine', 0.2); setTimeout(() => blip(1174, 0.14, 'sine', 0.2), 80); },
    toggleMute() { muted = !muted; return muted; },
  };
}
