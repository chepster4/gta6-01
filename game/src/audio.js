// Synthetic WebAudio: no audio files. Gunshots, explosions, pickups,
// sirens, engine hum and three switchable radio stations built from
// scheduled oscillators. Everything starts on the first user gesture.
import { RADIO_STATIONS } from './config.js';

export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.station = 0;
    this.radioOn = false; this.radioNodes = null; this.radioTimer = null;
    this.sirenNodes = null; this.engineNodes = null;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }
  _tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  _noise(dur, vol = 0.3, low = 400) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }
  shoot(kind) {
    this.ensure();
    if (kind === 'shotgun') { this._noise(0.28, 0.5, 900); this._tone(90, 0.2, 'square', 0.25, 0, 40); }
    else if (kind === 'rifle') { this._noise(0.16, 0.4, 1600); this._tone(160, 0.12, 'sawtooth', 0.2, 0, 60); }
    else if (kind === 'smg') { this._noise(0.08, 0.28, 2200); }
    else { this._noise(0.12, 0.35, 1400); this._tone(120, 0.1, 'square', 0.2, 0, 50); }
  }
  explosion() { this.ensure(); this._noise(0.9, 0.7, 500); this._tone(60, 0.7, 'sine', 0.5, 0, 28); }
  pickup() { this.ensure(); this._tone(660, 0.09, 'sine', 0.25); this._tone(990, 0.14, 'sine', 0.25, 0.09); }
  cash() { this.ensure(); [523, 659, 784].forEach((f, i) => this._tone(f, 0.12, 'triangle', 0.22, i * 0.08)); }
  missionDone() { this.ensure(); [392, 523, 659, 784].forEach((f, i) => this._tone(f, 0.18, 'triangle', 0.25, i * 0.11)); }
  hurt() { this.ensure(); this._tone(180, 0.15, 'sawtooth', 0.25, 0, 90); }
  engine(on, speed = 0) {
    if (!this.ctx) return;
    if (on && !this.engineNodes) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      const g = this.ctx.createGain(); g.gain.value = 0.05;
      o.connect(f); f.connect(g); g.connect(this.master); o.start();
      this.engineNodes = { o, f, g };
    } else if (!on && this.engineNodes) {
      try { this.engineNodes.o.stop(); } catch { /* already stopped */ }
      this.engineNodes = null;
    }
    if (this.engineNodes) {
      this.engineNodes.o.frequency.value = 45 + speed * 3.2;
      this.engineNodes.g.gain.value = 0.03 + speed * 0.002;
    }
  }
  siren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenNodes) {
      const o = this.ctx.createOscillator(); o.type = 'sine';
      const g = this.ctx.createGain(); g.gain.value = 0.045;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.7;
      const lg = this.ctx.createGain(); lg.gain.value = 320;
      lfo.connect(lg); lg.connect(o.frequency); o.frequency.value = 850;
      o.connect(g); g.connect(this.master); o.start(); lfo.start();
      this.sirenNodes = { o, lfo };
    } else if (!on && this.sirenNodes) {
      try { this.sirenNodes.o.stop(); this.sirenNodes.lfo.stop(); } catch { /* stopped */ }
      this.sirenNodes = null;
    }
  }
  // Radio: a looping bassline + lead arpeggio per station, pure oscillators.
  radioStart() {
    this.ensure(); if (!this.ctx || this.radioNodes) return;
    this.radioOn = true;
    const st = RADIO_STATIONS[this.station];
    const step = 60 / st.bpm / 2;
    const base = 110;
    let i = 0;
    const tick = () => {
      if (!this.radioOn || !this.ctx) return;
      const n = st.notes[i % st.notes.length];
      const f = base * Math.pow(2, n / 12);
      this._tone(f, step * 0.95, st.wave, 0.11);
      this._tone(f / 2, step * 1.8, 'sine', 0.16);
      if (i % 4 === 2) this._tone(f * 2, step * 0.5, 'sine', 0.07);
      i++;
      this.radioTimer = setTimeout(tick, step * 1000);
    };
    this.radioNodes = true;
    tick();
  }
  radioStop() {
    this.radioOn = false;
    if (this.radioTimer) { clearTimeout(this.radioTimer); this.radioTimer = null; }
    this.radioNodes = null;
  }
  radioNext() {
    this.station = (this.station + 1) % RADIO_STATIONS.length;
    const wasOn = this.radioOn;
    this.radioStop();
    if (wasOn) this.radioStart();
    return RADIO_STATIONS[this.station].name;
  }
  stationName() { return RADIO_STATIONS[this.station].name; }
}
