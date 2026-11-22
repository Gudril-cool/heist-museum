// levels.js — definisi tiga ruangan "Museum Heist — Malam di Galeri".
// Peta 32 x 18 ubin (ubin 40 px, canvas 1280 x 720).
// Legenda peta: '#' dinding, '.' lantai, 'X' cover (patung/sofa/rak —
// menghalangi gerak DAN pandangan), 'P' start pencuri, 'G' start penjaga,
// 'o' loot kecil, '*' Bulan Zamrud (ruang 3), 'E' pintu darurat.
// Kamera dan laser didefinisikan di metadata tiap ruangan (posisi ubin,
// arah hadap, sapuan), bukan di peta, supaya peta tetap mudah dibaca.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

export const LEVELS = [
  {
    id: 1,
    name: 'Lobi',
    hint: 'Belajar bergerak dan bersembunyi. Dua penjaga, satu kamera.',
    map: [
      '################################',
      '#P.....X..........o............#',
      '#......X.......................#',
      '#......X..........G............#',
      '#..............................#',
      '#..XXXX......X.....XXXX........#',
      '#..............................#',
      '#......G......X......X.........#',
      '#.............X......X....E....#',
      '#.............X......X.........#',
      '#..X..........X......X.........#',
      '#..X...........................#',
      '#..X....o..........X...........#',
      '#..X...........................#',
      '#......X......X................#',
      '#......X......X................#',
      '#..............................#',
      '################################',
    ],
    guards: [
      { path: [[11, 3], [24, 3]], speed: 70, pause: 1.2 },
      { path: [[7, 7], [7, 14]], speed: 70, pause: 1.0 },
    ],
    cameras: [
      { x: 29, y: 1, dir: 200, sweep: 70, range: 7 },
    ],
    lasers: [],
    gem: null,
  },
  {
    id: 2,
    name: 'Galeri Lukisan',
    hint: 'Dua rute: koridor atas atau bawah. Laser melintasi tengah.',
    map: [
      '################################',
      '#P....X......o.....X...........#',
      '#.....X.............X..........#',
      '#.....X.....G.......X.....G....#',
      '#..............................#',
      '#..XXXX....X.......X...XXXX....#',
      '#..............................#',
      '#......X.......X.......X.......#',
      '#......X.......X.......X...o...#',
      '#..............................#',
      '#..X......X.........X......X...#',
      '#..X......X.........X......X...#',
      '#..X...........................#',
      '#..X....G..........X.......E...#',
      '#..............................#',
      '#.....X......X......X..........#',
      '#.....X......X......X....o.....#',
      '################################',
    ],
    guards: [
      { path: [[12, 3], [22, 3]], speed: 78, pause: 1.0 },
      { path: [[26, 3], [26, 12]], speed: 78, pause: 0.8 },
      { path: [[8, 13], [18, 13]], speed: 78, pause: 1.0 },
    ],
    cameras: [
      { x: 4, y: 1, dir: 90, sweep: 80, range: 7 },
      { x: 27, y: 1, dir: 90, sweep: 80, range: 7 },
    ],
    // Laser horizontal di baris 9, kolom 8..24: menyala 2,5 dtk, mati 1,5 dtk.
    lasers: [
      { axis: 'h', row: 9, from: 8, to: 24, period: 4.0, onFrac: 0.625, phase: 0 },
    ],
    gem: null,
  },
  {
    id: 3,
    name: 'Ruang Permata',
    hint: 'Ambil Bulan Zamrud di podium, lalu kabur ke pintu darurat.',
    map: [
      '################################',
      '#P.....X.........X.............#',
      '#......X.........X......G......#',
      '#......X....o....X.............#',
      '#..............................#',
      '#..XXXX.....X......X...XXXX....#',
      '#..............................#',
      '#......G.....X....X......G.....#',
      '#............X....X............#',
      '#............X.*..X............#',
      '#............X....X............#',
      '#......X.....X....X.....X......#',
      '#......X.......................#',
      '#..X..........o.........X......#',
      '#..X....................X...E..#',
      '#..X....G..........G....X......#',
      '#..............................#',
      '################################',
    ],
    guards: [
      { path: [[10, 2], [22, 2]], speed: 84, pause: 0.8 },
      { path: [[7, 7], [7, 15]], speed: 84, pause: 0.8 },
      { path: [[24, 7], [24, 15]], speed: 84, pause: 0.8 },
      { path: [[12, 15], [20, 15]], speed: 84, pause: 1.0 },
    ],
    cameras: [
      { x: 2, y: 2, dir: 45, sweep: 90, range: 8 },
      { x: 29, y: 2, dir: 135, sweep: 90, range: 8 },
      { x: 15, y: 16, dir: 270, sweep: 80, range: 8 },
    ],
    // Dua laser vertikal mengapit podium, bergantian (fase berlawanan).
    lasers: [
      { axis: 'v', col: 13, from: 7, to: 11, period: 3.0, onFrac: 0.5, phase: 0 },
      { axis: 'v', col: 18, from: 7, to: 11, period: 3.0, onFrac: 0.5, phase: 1.5 },
    ],
    gem: { x: 15, y: 9 },
  },
];

// ---- Parsing peta ke objek level yang siap dimainkan. ----
export function parseLevel(def) {
  const walls = new Set();
  const cover = new Set();
  const loot = [];
  let player = { x: 2, y: 2 };
  let exit = { x: 29, y: 9 };
  let gem = def.gem ? { ...def.gem, taken: false } : null;
  def.map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const key = x + ',' + y;
      if (c === '#') walls.add(key);
      else if (c === 'X') cover.add(key);
      else if (c === 'P') player = { x, y };
      else if (c === 'o') loot.push({ x, y, kind: 'coin', value: 100, taken: false });
      else if (c === '*') gem = { x, y, taken: false };
      else if (c === 'E') exit = { x, y };
    }
  });
  return {
    id: def.id,
    name: def.name,
    hint: def.hint,
    walls,
    cover,
    loot,
    gem,
    exit,
    player,
    guards: def.guards.map((g) => ({ ...g })),
    cameras: def.cameras.map((c) => ({ ...c })),
    lasers: def.lasers.map((l) => ({ ...l })),
  };
}

export function isSolid(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const key = tx + ',' + ty;
  return level.walls.has(key) || level.cover.has(key);
}

export function blocksSight(level, tx, ty) {
  return isSolid(level, tx, ty);
}
