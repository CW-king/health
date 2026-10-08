// 눈보라 벌목장 — WebAudio로 합성한 효과음. 파일 없이 동작한다.
'use strict';

const Sfx = {
  ctx: null, muted: false, last: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  tone(f0, f1, dur, type, vol, delay) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, hp, delay) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0);
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = buf; f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || 900;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  },
  play(name) {
    if (this.muted || !this.ctx) return;
    const now = performance.now(), gap = { chop: 70, coin: 50, hit: 60, drop: 40, arrow: 80 }[name] || 0;
    if (gap && this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'chop': this.noise(0.07, 0.25, 0); this.tone(180, 70, 0.09, 'triangle', 0.25); break;
      case 'drop': this.tone(300, 180, 0.06, 'triangle', 0.12); break;
      case 'coin': this.tone(880, 880, 0.05, 'sine', 0.18); this.tone(1320, 1320, 0.09, 'sine', 0.18, 0.05); break;
      case 'sell': this.tone(520, 780, 0.08, 'sine', 0.14); break;
      case 'buy': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.12, 'square', 0.08, i * 0.07)); break;
      case 'hit': this.noise(0.05, 0.2, 1800); this.tone(140, 60, 0.08, 'square', 0.12); break;
      case 'kill': this.tone(200, 60, 0.3, 'sawtooth', 0.15); this.tone(660, 990, 0.12, 'sine', 0.12, 0.1); break;
      case 'arrow': this.noise(0.09, 0.12, 2500); break;
      case 'hitFence': this.noise(0.06, 0.2, 0); this.tone(120, 80, 0.12, 'triangle', 0.2); break;
      case 'hitHut': this.noise(0.12, 0.3, 0); this.tone(90, 40, 0.25, 'sawtooth', 0.25); break;
      case 'fenceBroken': this.noise(0.3, 0.3, 0); this.tone(160, 50, 0.4, 'sawtooth', 0.2); break;
      case 'warn': [0, 0.3, 0.6].forEach(d => { this.tone(620, 620, 0.14, 'square', 0.08, d); this.tone(440, 440, 0.14, 'square', 0.08, d + 0.15); }); break;
      case 'wave': this.tone(70, 55, 0.5, 'sawtooth', 0.22); this.tone(74, 50, 0.5, 'sawtooth', 0.18, 0.05); this.noise(0.4, 0.12, 0); break;
      case 'clear': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.18, 'triangle', 0.12, i * 0.09)); break;
      case 'angry': this.tone(300, 220, 0.12, 'square', 0.08); this.tone(300, 220, 0.12, 'square', 0.08, 0.15); break;
      case 'over': [392, 349, 311, 262].forEach((f, i) => this.tone(f, f * 0.98, 0.4, 'sawtooth', 0.12, i * 0.35)); break;
    }
  },
};
