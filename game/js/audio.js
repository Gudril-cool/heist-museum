// audio.js — semua suara disintesis WebAudio prosedural: langkah,
// denting loot, dering alarm, dan arpeggio kemenangan. Tanpa file suara.
// AudioContext dibuat malas (setelah interaksi pertama) supaya tidak
// diblokir kebijakan autoplay browser.

let ctx = null;
let muted = false;
let musicTimer = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.08, when = 0, slideTo = 0) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  step(sneaking) {
    tone(sneaking ? 140 : 190, 0.05, 'triangle', sneaking ? 0.015 : 0.03);
  },
  coin() {
    tone(880, 0.12, 'sine', 0.07);
    tone(1318, 0.18, 'sine', 0.06, 0.07);
  },
  gem() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'sine', 0.08, i * 0.09));
  },
  throwCoin() {
    tone(600, 0.15, 'square', 0.03, 0, 300);
  },
  emp() {
    tone(1200, 0.4, 'sawtooth', 0.05, 0, 80);
  },
  smoke() {
    tone(300, 0.5, 'sine', 0.05, 0, 90);
  },
  alarmTick() {
    tone(740, 0.1, 'square', 0.045);
    tone(554, 0.12, 'square', 0.045, 0.12);
  },
  laserZap() {
    tone(1800, 0.2, 'sawtooth', 0.05, 0, 300);
  },
  caught() {
    [392, 311, 233].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.07, i * 0.22));
  },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, i * 0.11));
  },
  click() {
    tone(500, 0.05, 'square', 0.03);
  },
};

// Musik ketegangan minimal: denting rendah berulang tiap 2,4 detik.
export function startMusic() {
  if (musicTimer) return;
  musicTimer = setInterval(() => {
    if (muted) return;
    tone(110, 0.5, 'sine', 0.02);
    tone(116.5, 0.5, 'sine', 0.015, 1.2);
  }, 2400);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}
