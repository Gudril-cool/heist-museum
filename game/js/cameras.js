// cameras.js — kamera pengawas (kerucut berputar, bisa di-EMP) dan
// laser (balok berdenyut yang harus ditunggu padam sebelum dilewati).

import { TILE, blocksSight } from './levels.js';
import { hasLineOfSight } from './guards.js';

export const CAM_RANGE = 7 * TILE;

// Kamera: terpasang di dinding, kerucutnya menyapu kiri-kanan di sekitar
// arah dasarnya. Terlihat kamera = alarm naik. EMP mematikannya 6 detik.
export class Camera {
  constructor(def) {
    this.x = (def.x + 0.5) * TILE;
    this.y = (def.y + 0.5) * TILE;
    this.baseDir = (def.dir * Math.PI) / 180;
    this.sweep = (def.sweep * Math.PI) / 180;
    this.range = def.range * TILE;
    this.t = Math.random() * 10; // fase sapuan (visual saja)
    this.disabled = 0; // detik tersisa nonaktif (EMP)
    this.dir = this.baseDir;
  }

  update(dt) {
    this.t += dt;
    if (this.disabled > 0) this.disabled -= dt;
    // Sapuan sinus halus: -sweep/2 .. +sweep/2 di sekitar arah dasar.
    this.dir = this.baseDir + Math.sin(this.t * 0.55) * (this.sweep / 2);
  }

  seesPlayer(level, px, py, smokeClouds) {
    if (this.disabled > 0) return false;
    const d = Math.hypot(px - this.x, py - this.y);
    if (d > this.range) return false;
    let diff = Math.atan2(py - this.y, px - this.x) - this.dir;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > 0.55) return false;
    for (const s of smokeClouds) {
      const mx = (this.x + px) / 2;
      const my = (this.y + py) / 2;
      if (Math.hypot(mx - s.x, my - s.y) < s.r) return false;
    }
    return hasLineOfSight(level, this.x / TILE, this.y / TILE, px / TILE, py / TILE);
  }

  emp(seconds) {
    this.disabled = Math.max(this.disabled, seconds);
  }
}

// Laser: satu segmen balok (horizontal di satu baris ubin, atau vertikal
// di satu kolom) yang berdenyut: menyala sebagian periode, padam sisanya.
// Pemain yang memotong balok saat menyala memicu alarm.
export class Laser {
  constructor(def) {
    this.axis = def.axis;
    this.from = def.from;
    this.to = def.to;
    this.fixed = def.axis === 'h' ? def.row : def.col;
    this.period = def.period;
    this.onFrac = def.onFrac;
    this.t = def.phase || 0;
  }

  update(dt) {
    this.t += dt;
  }

  isOn() {
    return (this.t % this.period) < this.period * this.onFrac;
  }

  // Ubin pemain bersentuhan dengan balok saat menyala?
  hits(px, py) {
    if (!this.isOn()) return false;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (this.axis === 'h') {
      return ty === this.fixed && tx >= this.from && tx <= this.to;
    }
    return tx === this.fixed && ty >= this.from && ty <= this.to;
  }

  // Titik-titik ujung balok untuk gambar.
  endpoints() {
    if (this.axis === 'h') {
      return {
        x1: this.from * TILE,
        y1: (this.fixed + 0.5) * TILE,
        x2: (this.to + 1) * TILE,
        y2: (this.fixed + 0.5) * TILE,
      };
    }
    return {
      x1: (this.fixed + 0.5) * TILE,
      y1: this.from * TILE,
      x2: (this.fixed + 0.5) * TILE,
      y2: (this.to + 1) * TILE,
    };
  }
}

export function blocksSightTile(level, tx, ty) {
  return blocksSight(level, tx, ty);
}
