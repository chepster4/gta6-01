// Sound, all synthesised with WebAudio — no audio files, no network.
// Three radio stations (a chord pad, a bass groove, a bright arpeggio),
// an engine hum that follows speed, and one-shot effects: gunshot, coin,
// punch, siren wail and a mission-complete jingle.
import * as THREE from '../vendor/three.min.js';

const STATIONS = [
  { name: 'SOL 98.5', base: 220, wave: 'sine', step: 110 },
  { name: 'BAY FM 101', base: 110, wave: 'sawtooth', step: 55 },
  { name: 'NEON 104', base: 330, wave: 'triangle', step: 165 },
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let radioGain = null;
  let engineOsc = null;
  let engineGain = null;
  let station = 0;
  let muted = false;
  let radioTimer = null;
  let noteIndex = 0;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      radioGain = ctx.createGain();
      radioGain.gain.value = 0.16;
      radioGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function playNote(freq, dur, type, gainValue, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainValue, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(radioGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function radioTick() {
    if (!ctx || muted) return;
    const st = STATIONS[station];
    const scale = [1, 1.25, 1.5, 2, 2.5, 3];
    const f = st.base * scale[noteIndex % scale.length];
    playNote(f, 0.5, st.wave, 0.5);
    if (noteIndex % 4 === 0) playNote(f / 2, 0.5, 'sine', 0.4);
    noteIndex += 1;
  }

  return {
    get stationName() { return STATIONS[station].name; },
    get isMuted() { return muted; },
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
      if (ctx && !radioTimer) radioTimer = setInterval(radioTick, 420);
    },
    nextStation() {
      station = (station + 1) % STATIONS.length;
      noteIndex = 0;
      return STATIONS[station].name;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    setEngine(speed, inCar) {
      if (!ctx || !engineOsc) return;
      const target = inCar ? 0.05 + Math.min(0.12, Math.abs(speed) * 0.003) : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 4, ctx.currentTime, 0.1);
    },
    shot() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, 2205, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.connect(g);
      g.connect(master);
      noise.start(t);
    },
    coin() {
      if (!ctx) return;
      playNote(880, 0.12, 'sine', 0.5);
      playNote(1320, 0.25, 'sine', 0.5, 0.09);
    },
    punch() {
      if (!ctx) return;
      playNote(90, 0.15, 'square', 0.4);
    },
    siren() {
      if (!ctx || muted) return;
      playNote(700, 0.4, 'sine', 0.25);
      playNote(950, 0.4, 'sine', 0.25, 0.4);
    },
    jingle() {
      if (!ctx) return;
      [523, 659, 784, 1047].forEach((f, i) => playNote(f, 0.3, 'triangle', 0.5, i * 0.12));
    },
  };
}
