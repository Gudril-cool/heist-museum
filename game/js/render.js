// render.js — menggambar dunia di canvas: lantai marmer, dinding, cover,
// kerucut penglihatan, kamera, laser, loot, Bulan Zamrud, pintu, dan
// para tokohnya. Semua art prosedural — tanpa satu pun aset eksternal.
// Warna dibedakan sekilas: emas = loot, merah = bahaya, hijau = jalan keluar.

import { TILE, COLS, ROWS } from './levels.js';
import { CONE_RANGE, CONE_HALF } from './guards.js';

const GOLD = '#e8b23a';
const GREEN = '#39d98a';
const RED = '#e5484d';
const INK = '#0b0f16';

function conePath(ctx, x, y, dir, range, half) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - half, dir + half);
  ctx.closePath();
}

export function drawWorld(ctx, game, now) {
  const { level, player, guards, cameras, lasers, smokeClouds, coinLands } = game;
  ctx.clearRect(0, 0, COLS * TILE, ROWS * TILE);

  // Lantai marmer: papan catur gelap-terang + karpet merah di tengah galeri.
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key = tx + ',' + ty;
      if (level.walls.has(key)) continue;
      const even = (tx + ty) % 2 === 0;
      ctx.fillStyle = even ? '#1a2230' : '#161d29';
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      if (ty >= 7 && ty <= 10 && tx >= 10 && tx <= 21) {
        ctx.fillStyle = 'rgba(120, 30, 40, 0.35)';
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }

  // Dinding.
  for (const key of level.walls) {
    const [tx, ty] = key.split(',').map(Number);
    ctx.fillStyle = '#2c3646';
    ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    ctx.fillStyle = '#3d4a5e';
    ctx.fillRect(tx * TILE, ty * TILE, TILE, 4);
  }

  // Cover: patung (lingkaran alas), sofa (persegi panjang), tanaman.
  for (const key of level.cover) {
    const [tx, ty] = key.split(',').map(Number);
    const cx = tx * TILE + TILE / 2;
    const cy = ty * TILE + TILE / 2;
    const kind = (tx * 7 + ty * 13) % 3;
    ctx.fillStyle = '#31435c';
    ctx.fillRect(tx * TILE + 4, ty * TILE + 4, TILE - 8, TILE - 8);
    if (kind === 0) {
      ctx.fillStyle = '#8fa3b5';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8d4e0';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 1) {
      ctx.fillStyle = '#5c2e35';
      ctx.fillRect(tx * TILE + 6, ty * TILE + 10, TILE - 12, TILE - 20);
      ctx.fillStyle = '#7a3b44';
      ctx.fillRect(tx * TILE + 6, ty * TILE + 10, TILE - 12, 6);
    } else {
      ctx.fillStyle = '#2e5c3a';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7d4e';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 4, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Pintu darurat: hijau menyala + panah keluar.
  const ex = level.exit;
  ctx.fillStyle = '#0f2e1e';
  ctx.fillRect(ex.x * TILE + 2, ex.y * TILE + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 3;
  ctx.strokeRect(ex.x * TILE + 4, ex.y * TILE + 4, TILE - 8, TILE - 8);
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', (ex.x + 0.5) * TILE, (ex.y + 0.5) * TILE + 4);

  // Loot kecil: koin emas berdenyut.
  for (const l of level.loot) {
    if (l.taken) continue;
    const cx = (l.x + 0.5) * TILE;
    const cy = (l.y + 0.5) * TILE;
    const pulse = 1 + 0.15 * Math.sin(now * 3 + l.x);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5a10';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bulan Zamrud di podium: sabit hijau menyala.
  if (level.gem && !level.gem.taken) {
    const cx = (level.gem.x + 0.5) * TILE;
    const cy = (level.gem.y + 0.5) * TILE;
    ctx.fillStyle = '#123524';
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2fe08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#37e08f';
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0.6, Math.PI * 2 - 0.6);
    ctx.arc(cx + 5, cy - 2, 9, Math.PI * 2 - 0.6, 0.6, true);
    ctx.fill();
  }

  // Laser: balok merah saat menyala, garis putus-putus redup saat padam.
  for (const lz of lasers) {
    const e = lz.endpoints();
    const on = lz.isOn();
    ctx.strokeStyle = on ? RED : 'rgba(229, 72, 77, 0.25)';
    ctx.lineWidth = on ? 4 : 2;
    if (!on) ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(e.x1, e.y1);
    ctx.lineTo(e.x2, e.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (on) {
      ctx.fillStyle = 'rgba(229, 72, 77, 0.25)';
      ctx.fillRect(Math.min(e.x1, e.x2) - 3, Math.min(e.y1, e.y2) - 3,
        Math.abs(e.x2 - e.x1) + 6, Math.abs(e.y2 - e.y1) + 6);
    }
  }

  // Kerucut kamera (merah) — di bawah tokoh supaya tokoh tetap terbaca.
  for (const cam of cameras) {
    if (cam.disabled > 0) continue;
    ctx.fillStyle = 'rgba(229, 72, 77, 0.16)';
    conePath(ctx, cam.x, cam.y, cam.dir, cam.range, 0.55);
    ctx.fill();
    ctx.strokeStyle = 'rgba(229, 72, 77, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Kerucut penjaga (kuning): makin merah saat penjaga curiga/mengejar.
  for (const g of guards) {
    const heat = g.state === 'chase' ? 1 : g.alert;
    ctx.fillStyle = heat > 0.5
      ? `rgba(229, 72, 77, ${0.14 + heat * 0.16})`
      : 'rgba(232, 178, 58, 0.18)';
    conePath(ctx, g.x, g.y, g.dir, CONE_RANGE, CONE_HALF);
    ctx.fill();
    ctx.strokeStyle = heat > 0.5 ? 'rgba(229, 72, 77, 0.55)' : 'rgba(232, 178, 58, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Asap: kabut abu-abu tembus pandang.
  for (const s of smokeClouds) {
    const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    grad.addColorStop(0, 'rgba(180, 190, 205, 0.55)');
    grad.addColorStop(1, 'rgba(180, 190, 205, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kamera: kotak kecil di dinding + lensa.
  for (const cam of cameras) {
    ctx.fillStyle = cam.disabled > 0 ? '#3a4556' : '#20242e';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cam.disabled > 0 ? '#5a6a80' : RED;
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.dir) * 5, cam.y + Math.sin(cam.dir) * 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Koin yang dilempar: titik emas kecil + cincin.
  for (const c of coinLands) {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10 + (c.t % 0.6) * 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Penjaga: figur biru gelap + topi + arah hadap.
  for (const g of guards) {
    ctx.fillStyle = g.state === 'chase' ? '#7a2e33' : '#27364e';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8fa3b5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#dfe9f2';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.dir) * 7, g.y + Math.sin(g.dir) * 7, 3, 0, Math.PI * 2);
    ctx.fill();
    if (g.state === 'chase') {
      ctx.fillStyle = RED;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 18);
    } else if (g.alert > 0.25) {
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 18);
    }
  }

  // Pencuri: figur gelap bertudung + arah hadap (denyut langkah).
  const bob = player.moving ? Math.sin(player.stepPhase) * 1.5 : 0;
  ctx.fillStyle = '#10141c';
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8b23a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.dir) * 7, player.y + Math.sin(player.dir) * 7 + bob, 3, 0, Math.PI * 2);
  ctx.fill();

  // Vignette alarm: layar memerah saat alarm tinggi.
  if (game.alarm > 35) {
    const a = Math.min(0.28, (game.alarm - 35) / 100);
    const grad = ctx.createRadialGradient(640, 360, 200, 640, 360, 720);
    grad.addColorStop(0, 'rgba(229, 72, 77, 0)');
    grad.addColorStop(1, `rgba(229, 72, 77, ${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  }
  ctx.fillStyle = INK;
}
