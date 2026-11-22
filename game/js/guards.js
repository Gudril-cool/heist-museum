// guards.js — penjaga: patroli waypoint, kerucut penglihatan, deteksi,
// kejar, dan respons terhadap koin pengalih.
// Satu penjaga = satu "mata" yang harus dibaca pemain sebelum bergerak.

import { TILE, blocksSight } from './levels.js';

export const CONE_RANGE = 5.2 * TILE; // jangkauan pandang (px)
export const CONE_HALF = 0.61; // setengah sudut kerucut (rad, ~35 derajat)

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Garis pandang antar dua titik ubin (Bresenham): dinding/cover menghalangi.
export function hasLineOfSight(level, ax, ay, bx, by) {
  let x0 = Math.floor(ax);
  let y0 = Math.floor(ay);
  const x1 = Math.floor(bx);
  const y1 = Math.floor(by);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (x0 === x1 && y0 === y1) return true;
    if (blocksSight(level, x0, y0)) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

// Apakah titik (px,py) terlihat dari penjaga: dalam jangkauan, dalam
// sudut kerucut, dan garis pandang bersih. Menyelinap (sneak) memperkecil
// jangkauan efektif; asap memblokir total.
export function guardSeesPlayer(guard, level, px, py, sneaking, smokeClouds) {
  const gx = guard.x;
  const gy = guard.y;
  const d = dist(gx, gy, px, py);
  const range = sneaking ? CONE_RANGE * 0.62 : CONE_RANGE;
  if (d > range) return false;
  const ang = Math.atan2(py - gy, px - gx);
  let diff = ang - guard.dir;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > CONE_HALF) return false;
  for (const s of smokeClouds) {
    if (dist(px, py, s.x, s.y) < s.r || dist(gx, gy, s.x, s.y) < s.r) return false;
    // Asap di antara penjaga dan pemain juga memutus pandangan.
    const mx = (gx + px) / 2;
    const my = (gy + py) / 2;
    if (dist(mx, my, s.x, s.y) < s.r) return false;
  }
  return hasLineOfSight(level, gx / TILE, gy / TILE, px / TILE, py / TILE);
}

export class Guard {
  constructor(def) {
    this.path = def.path.map(([x, y]) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }));
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.speed = def.speed;
    this.pause = def.pause;
    this.wp = 1 % this.path.length;
    this.wait = 0;
    this.dir = 0;
    this.state = 'patrol'; // patrol | investigate | chase | return
    this.target = null; // titik yang didatangi (koin / posisi terakhir terlihat)
    this.alert = 0; // 0..1, memori "kecurigaan" penjaga
    this.stuck = 0;
  }

  update(dt, level, player, smokeClouds) {
    const seen = guardSeesPlayer(this, level, player.x, player.y, player.sneaking, smokeClouds);
    if (seen) {
      this.alert = Math.min(1, this.alert + dt * 1.4);
      this.target = { x: player.x, y: player.y };
      if (this.alert > 0.45 || dist(this.x, this.y, player.x, player.y) < 2.2 * TILE) {
        this.state = 'chase';
      } else if (this.state === 'patrol') {
        this.state = 'investigate';
      }
    } else {
      this.alert = Math.max(0, this.alert - dt * 0.25);
      if (this.state === 'chase' && this.alert < 0.15) this.state = 'return';
      if (this.state === 'investigate' && this.alert <= 0) this.state = 'return';
    }

    let dest = null;
    let speed = this.speed;
    if (this.state === 'patrol') {
      dest = this.path[this.wp];
      if (this.wait > 0) { this.wait -= dt; return seen; }
    } else if (this.state === 'chase') {
      dest = { x: player.x, y: player.y };
      speed = this.speed * 1.6;
    } else if (this.state === 'investigate' || this.state === 'return') {
      dest = this.state === 'investigate' ? this.target : this.path[0];
      if (!dest) { this.state = 'patrol'; return seen; }
    }

    const dx = dest.x - this.x;
    const dy = dest.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) {
      if (this.state === 'patrol') {
        this.wp = (this.wp + 1) % this.path.length;
        this.wait = this.pause;
      } else if (this.state === 'investigate') {
        this.state = 'return';
      } else if (this.state === 'return') {
        this.state = 'patrol';
        this.wp = 1 % this.path.length;
      }
      return seen;
    }
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    this.dir = Math.atan2(dy, dx);
    // Gerak penjaga menabrak dinding: coba sumbu x lalu sumbu y.
    if (!blocksSight(level, Math.floor(nx / TILE), Math.floor(this.y / TILE))) this.x = nx;
    if (!blocksSight(level, Math.floor(this.x / TILE), Math.floor(ny / TILE))) this.y = ny;
    return seen;
  }

  // Koin pengalih: penjaga berjalan ke titik lempar dan memeriksa.
  hearCoin(x, y) {
    if (this.state === 'chase') return;
    this.target = { x, y };
    this.state = 'investigate';
    this.alert = Math.max(this.alert, 0.3);
  }
}
