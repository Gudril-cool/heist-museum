// player.js — pencuri: gerak halus berbasis ubin, menyelinap, dan tiga
// alat dengan biaya (koin pengalih, EMP, asap). Setiap alat adalah
// keputusan: sekali pakai, tidak bisa diisi ulang di ruangan yang sama.

import { TILE, isSolid } from './levels.js';

export const WALK_SPEED = 175; // px/detik
export const SNEAK_SPEED = 92; // px/detik (Shift) — lebih sulit terlihat
export const PLAYER_R = 13;

export class Player {
  constructor(start) {
    this.x = (start.x + 0.5) * TILE;
    this.y = (start.y + 0.5) * TILE;
    this.dir = 0; // arah hadap (rad) — arah terakhir bergerak
    this.sneaking = false;
    this.moving = false;
    this.coins = 3; // koin pengalih
    this.emp = 1; // EMP kamera
    this.smoke = 2; // bom asap
    this.loot = 0; // jumlah loot kecil yang diambil
    this.score = 0;
    this.hasGem = false;
    this.stepPhase = 0;
  }

  reset(start) {
    this.x = (start.x + 0.5) * TILE;
    this.y = (start.y + 0.5) * TILE;
    this.dir = 0;
    this.coins = 3;
    this.emp = 1;
    this.smoke = 2;
    this.loot = 0;
    this.score = 0;
    this.hasGem = false;
  }

  // Gerak dengan tabrakan ubin (coba sumbu x lalu y supaya bisa meluncur
  // di sepanjang dinding). Mengembalikan true bila benar-benar bergerak.
  move(dt, level, ix, iy, sneaking) {
    this.sneaking = sneaking;
    const speed = sneaking ? SNEAK_SPEED : WALK_SPEED;
    const len = Math.hypot(ix, iy);
    this.moving = len > 0;
    if (!this.moving) return false;
    const nx = ix / len;
    const ny = iy / len;
    const dx = nx * speed * dt;
    const dy = ny * speed * dt;
    this.dir = Math.atan2(ny, nx);
    this.stepPhase += dt * (sneaking ? 5 : 9);
    const r = PLAYER_R;
    const tryX = this.x + dx;
    if (!this.hitsSolid(level, tryX, this.y, r)) this.x = tryX;
    const tryY = this.y + dy;
    if (!this.hitsSolid(level, this.x, tryY, r)) this.y = tryY;
    return true;
  }

  hitsSolid(level, px, py, r) {
    // Cek keempat sudut kotak tabrakan terhadap ubin padat.
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      if (isSolid(level, Math.floor((px + ox) / TILE), Math.floor((py + oy) / TILE))) {
        return true;
      }
    }
    return false;
  }

  tile() {
    return { tx: Math.floor(this.x / TILE), ty: Math.floor(this.y / TILE) };
  }

  // Lempar koin 4 ubin ke arah hadap. Mengembalikan titik jatuh atau null.
  throwCoin() {
    if (this.coins <= 0) return null;
    this.coins -= 1;
    const tx = this.x + Math.cos(this.dir) * 4 * TILE;
    const ty = this.y + Math.sin(this.dir) * 4 * TILE;
    return { x: tx, y: ty, t: 0 };
  }

  useEmp() {
    if (this.emp <= 0) return false;
    this.emp -= 1;
    return true;
  }

  useSmoke() {
    if (this.smoke <= 0) return null;
    this.smoke -= 1;
    return { x: this.x, y: this.y, r: 2.4 * TILE, t: 0, ttl: 4 };
  }

  // Ambil loot/gem di ubin pemain. Mengembalikan 'coin' | 'gem' | null.
  collect(level) {
    const { tx, ty } = this.tile();
    for (const l of level.loot) {
      if (!l.taken && l.x === tx && l.y === ty) {
        l.taken = true;
        this.loot += 1;
        this.score += l.value;
        return 'coin';
      }
    }
    if (level.gem && !level.gem.taken && level.gem.x === tx && level.gem.y === ty) {
      level.gem.taken = true;
      this.hasGem = true;
      this.score += 500;
      return 'gem';
    }
    return null;
  }

  atExit(level) {
    const { tx, ty } = this.tile();
    return tx === level.exit.x && ty === level.exit.y;
  }
}
