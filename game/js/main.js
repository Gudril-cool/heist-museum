// main.js — loop permainan "Museum Heist — Malam di Galeri".
// State: menu -> bermain -> tertangkap / menang (per ruangan, lalu total).
// Alarm 0..100: naik saat terlihat penjaga/kamera/laser, turun saat
// bersembunyi; 100 = misi gagal di ruangan itu (coba lagi dari ruangan).
// Mode demo untuk screenshot (render asli lewat jalur yang sama):
//   ?room=2&px=10&py=7&alarm=55&freeze=1  atau  ?screen=win

import { LEVELS, parseLevel, TILE } from './levels.js';
import { Guard } from './guards.js';
import { Camera, Laser } from './cameras.js';
import { Player } from './player.js';
import { drawWorld } from './render.js';
import { sfx, startMusic, stopMusic, toggleMute } from './audio.js';
import { Hud, rankFor, fmtTime } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  screen: 'menu', // menu | play | caught | win | done
  levelIndex: 1,
  level: null,
  player: null,
  guards: [],
  cameras: [],
  lasers: [],
  smokeClouds: [],
  coinLands: [],
  coinTargets: [],
  alarm: 0,
  maxAlarm: 0,
  elapsed: 0,
  totalLoot: 0,
  lastStep: 0,
  freeze: false,
  alarmTickAt: 0,
};

const hud = new Hud();
const keys = new Set();

function loadLevel(idx, keepScore) {
  const def = LEVELS[idx - 1];
  const level = parseLevel(def);
  game.levelIndex = idx;
  game.level = level;
  game.guards = level.guards.map((g) => new Guard(g));
  game.cameras = level.cameras.map((c) => new Camera(c));
  game.lasers = level.lasers.map((l) => new Laser(l));
  game.smokeClouds = [];
  game.coinLands = [];
  game.coinTargets = [];
  if (!keepScore || !game.player) {
    game.player = new Player(level.player);
  } else {
    game.player.x = (level.player.x + 0.5) * TILE;
    game.player.y = (level.player.y + 0.5) * TILE;
    game.player.dir = 0;
    game.player.coins = 3;
    game.player.emp = 1;
    game.player.smoke = 2;
    game.player.hasGem = false;
  }
  game.alarm = 0;
}

function startGame() {
  game.elapsed = 0;
  game.maxAlarm = 0;
  game.totalLoot = 0;
  loadLevel(1, false);
  game.screen = 'play';
  hud.hideOverlay();
  startMusic();
  sfx.click();
}

function roomCleared() {
  // Ruang selesai: capai EXIT (ruang 3 wajib membawa permata).
  game.totalLoot += game.player.loot + (game.player.hasGem ? 1 : 0);
  if (game.levelIndex >= 3) {
    game.screen = 'done';
    stopMusic();
    sfx.win();
    const rank = rankFor(game.elapsed, game.totalLoot, game.maxAlarm);
    hud.showOverlay('KABUR! Bulan Zamrud Dicuri',
      `<p>Waktu <b>${fmtTime(game.elapsed)}</b> · Skor <b>${game.player.score}</b> · ` +
      `Loot <b>${game.totalLoot}</b> · Alarm tertinggi <b>${Math.round(game.maxAlarm)}</b></p>` +
      `<p>Peringkat: <b>${rank}</b></p>` +
      `<p>Kamu menyelinap melewati ${game.guards.length} penjaga, kamera, dan laser — ` +
      `lalu menghilang ke malam. Galeri tidak akan pernah tahu.</p>`,
      'Main Lagi', () => startGame());
  } else {
    loadLevel(game.levelIndex + 1, true);
    sfx.gem();
  }
}

function caught() {
  game.screen = 'caught';
  stopMusic();
  sfx.caught();
  hud.showOverlay('TERTANGKAP!',
    `<p>Alarm mencapai 100 di <b>${game.level.name}</b>. Penjaga mengepungmu ` +
    `di bawah lampu sorot. Misi di ruangan ini gagal — tapi malam masih muda.</p>` +
    `<p>Waktu <b>${fmtTime(game.elapsed)}</b> · Skor <b>${game.player.score}</b></p>`,
    'Coba Lagi dari Ruangan Ini', () => {
      loadLevel(game.levelIndex, true);
      game.screen = 'play';
      hud.hideOverlay();
      startMusic();
    });
}

function update(dt) {
  if (game.screen !== 'play' || game.freeze) return;
  game.elapsed += dt;

  // Input gerak: WASD / panah, Shift = menyelinap.
  let ix = 0;
  let iy = 0;
  if (keys.has('arrowleft') || keys.has('a')) ix -= 1;
  if (keys.has('arrowright') || keys.has('d')) ix += 1;
  if (keys.has('arrowup') || keys.has('w')) iy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) iy += 1;
  const sneaking = keys.has('shift');
  const moved = game.player.move(dt, game.level, ix, iy, sneaking);
  if (moved && game.elapsed - game.lastStep > (sneaking ? 0.45 : 0.32)) {
    game.lastStep = game.elapsed;
    sfx.step(sneaking);
  }

  // Asap: hitung mundur, hapus yang kedaluwarsa.
  for (const s of game.smokeClouds) s.t += dt;
  game.smokeClouds = game.smokeClouds.filter((s) => s.t < s.ttl);
  for (const c of game.coinLands) c.t += dt;

  // Koin pengalih: penjaga terdekat berjalan ke titik jatuh.
  for (const c of game.coinTargets) {
    let best = null;
    let bestD = Infinity;
    for (const g of game.guards) {
      const d = Math.hypot(g.x - c.x, g.y - c.y);
      if (d < bestD) { bestD = d; best = g; }
    }
    if (best) best.hearCoin(c.x, c.y);
  }
  game.coinTargets = [];

  // Penjaga + kamera + laser.
  let seenByGuard = false;
  let seenByCamera = false;
  for (const g of game.guards) {
    if (g.update(dt, game.level, game.player, game.smokeClouds)) seenByGuard = true;
  }
  for (const cam of game.cameras) {
    cam.update(dt);
    if (cam.seesPlayer(game.level, game.player.x, game.player.y, game.smokeClouds)) {
      seenByCamera = true;
    }
  }
  let laserHit = false;
  for (const lz of game.lasers) {
    lz.update(dt);
    if (lz.hits(game.player.x, game.player.y)) laserHit = true;
  }

  // Alarm: naik saat terlihat, turun saat bersembunyi.
  if (seenByGuard) game.alarm += 20 * dt;
  if (seenByCamera) game.alarm += 12 * dt;
  if (laserHit && game.elapsed >= (game.laserCoolUntil || 0)) {
    game.alarm += 30;
    game.laserCoolUntil = game.elapsed + 1.2;
    sfx.laserZap();
  }
  if (!seenByGuard && !seenByCamera) game.alarm -= 9 * dt;
  game.alarm = Math.max(0, Math.min(100, game.alarm));
  game.maxAlarm = Math.max(game.maxAlarm, game.alarm);
  if ((seenByGuard || seenByCamera) && game.elapsed - game.alarmTickAt > 1.1) {
    game.alarmTickAt = game.elapsed;
    sfx.alarmTick();
  }

  // Ambil loot / permata.
  const got = game.player.collect(game.level);
  if (got === 'coin') sfx.coin();
  if (got === 'gem') sfx.gem();

  // Menang ruangan: sampai EXIT (ruang 3 butuh permata).
  if (game.player.atExit(game.level)) {
    if (game.levelIndex < 3 || game.player.hasGem) roomCleared();
  }

  if (game.alarm >= 100) caught();
}

function frame(now) {
  const dt = Math.min(0.05, (now - (frame._last || now)) / 1000 || 0);
  frame._last = now;
  if (game.screen === 'play') update(dt);
  if (game.screen !== 'menu') {
    drawWorld(ctx, game, now / 1000);
    hud.update(game);
  }
  requestAnimationFrame(frame);
}

// ---- Input keyboard + tombol alat. ----
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'm') {
    const m = toggleMute();
    document.getElementById('mute-btn').textContent = m ? 'Suara: Mati (M)' : 'Suara: Hidup (M)';
  }
  if (game.screen === 'menu' && (k === 'enter' || k === ' ')) startGame();
  if (game.screen !== 'play') return;
  if (k === '1') useCoin();
  if (k === '2') useEmp();
  if (k === '3') useSmoke();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function useCoin() {
  const c = game.player.throwCoin();
  if (!c) return;
  game.coinLands.push(c);
  game.coinTargets.push({ x: c.x, y: c.y });
  sfx.throwCoin();
}
function useEmp() {
  if (!game.player.useEmp()) return;
  for (const cam of game.cameras) cam.emp(6);
  sfx.emp();
}
function useSmoke() {
  const s = game.player.useSmoke();
  if (!s) return;
  game.smokeClouds.push(s);
  sfx.smoke();
}

document.getElementById('tool-coin').addEventListener('click', () => { if (game.screen === 'play') useCoin(); });
document.getElementById('tool-emp').addEventListener('click', () => { if (game.screen === 'play') useEmp(); });
document.getElementById('tool-smoke').addEventListener('click', () => { if (game.screen === 'play') useSmoke(); });
document.getElementById('mute-btn').addEventListener('click', (e) => {
  const m = toggleMute();
  e.target.textContent = m ? 'Suara: Mati (M)' : 'Suara: Hidup (M)';
});

// ---- Mode demo untuk screenshot: keadaan tengah permainan yang dirender
// oleh game itu sendiri (bukan edit). ?screen=win = layar kemenangan. ----
function applyDemo() {
  const q = new URLSearchParams(location.search);
  if (q.get('screen') === 'win') {
    loadLevel(3, false);
    game.player.hasGem = true;
    game.player.score = 1240;
    game.player.loot = 5;
    game.elapsed = 187;
    game.maxAlarm = 62;
    game.alarm = 0;
    game.screen = 'done';
    stopMusic();
    const rank = rankFor(game.elapsed, 6, game.maxAlarm);
    hud.showOverlay('KABUR! Bulan Zamrud Dicuri',
      `<p>Waktu <b>${fmtTime(game.elapsed)}</b> · Skor <b>1240</b> · Loot <b>6</b> · ` +
      `Alarm tertinggi <b>62</b></p><p>Peringkat: <b>${rank}</b></p>`,
      'Main Lagi', () => startGame());
    return true;
  }
  const room = Number(q.get('room') || '0');
  if (room >= 1 && room <= 3) {
    loadLevel(room, false);
    const px = Number(q.get('px') || '2');
    const py = Number(q.get('py') || '1');
    game.player.x = (px + 0.5) * TILE;
    game.player.y = (py + 0.5) * TILE;
    game.alarm = Number(q.get('alarm') || '0');
    game.maxAlarm = game.alarm;
    // Arahkan penjaga terdekat supaya kerucutnya terlihat di frame.
    const gw = (q.get('gw') || '').split(',').filter(Boolean).map(Number);
    game.guards.forEach((g, i) => {
      if (gw[i] !== undefined) g.dir = gw[i] ? Math.PI : 0;
    });
    game.screen = 'play';
    if (q.get('freeze') === '1') game.freeze = true;
    startMusic();
    return true;
  }
  return false;
}

// Menu awal.
loadLevel(1, false);
if (!applyDemo()) {
  hud.showOverlay('MUSEUM HEIST — Malam di Galeri',
    `<p>Malam ini galeri sepi. <b>Bulan Zamrud</b> menunggu di Ruang Permata. ` +
    `Lewati penjaga, kamera, dan laser — lalu kabur lewat pintu darurat.</p>` +
    `<p><b>WASD / panah</b> bergerak · <b>Shift</b> menyelinap · ` +
    `<b>1</b> koin pengalih · <b>2</b> EMP · <b>3</b> asap · <b>M</b> suara</p>` +
    `<p>Tiga ruangan. Alarm 100 berarti tertangkap. Jangan sampai terlihat.</p>`,
    'Mulai Menyusup', () => startGame());
}

window.__heist = game;
requestAnimationFrame(frame);
