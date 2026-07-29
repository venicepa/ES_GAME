const sand = (p, s) => ({ p, s, tex: 'sandstone', uv: 0.3, tint: [1, 1, 1] });
const crate = (x, y, z, size = 1.25) => ({
  p: [x, y, z], s: [size, size, size], tex: 'wood', uv: 1 / size, tint: [1, 1, 1],
});
const container = (p, s, tint) => ({ p, s, tex: 'metal', uv: 0.4, tint });
const ice = (p, s) => ({ p, s, tex: 'ice', uv: 0.3, tint: [1, 1, 1] });

// 180 度旋轉複製，保證兩邊掩體完全對稱
function mirrored(items) {
  const out = [];
  for (const it of items) {
    out.push(it);
    out.push({ ...it, p: [-it.p[0], it.p[1], -it.p[2]] });
  }
  return out;
}

function box(w, d, h, tex) {
  const half = [w / 2, d / 2];
  return [
    { p: [0, h / 2, -half[1]], s: [w, h, 1.4], tex, uv: 0.3, tint: [1, 1, 1] },
    { p: [0, h / 2, half[1]], s: [w, h, 1.4], tex, uv: 0.3, tint: [1, 1, 1] },
    { p: [-half[0], h / 2, 0], s: [1.4, h, d], tex, uv: 0.3, tint: [1, 1, 1] },
    { p: [half[0], h / 2, 0], s: [1.4, h, d], tex, uv: 0.3, tint: [1, 1, 1] },
  ];
}

// 用 ASCII 網格畫地圖，再把相鄰同類的格子貪婪合併成大方塊。
// 手打幾百個座標無法維護，而合併可以把上千格壓成幾十個方塊，碰撞與陰影都更省。
const GRID_CELL = 4;
const LEGEND = {
  '#': { tex: 'sandstone', h: 6, uv: 0.3 },
  '=': { tex: 'sandstone', h: 1.3, uv: 0.3 },
  'o': { tex: 'wood', h: 2.4, uv: 0.42 },
  'X': { tex: 'metal', h: 3.2, uv: 0.4 },
};

export function fromGrid(rows, legend = LEGEND) {
  const h = rows.length;
  const w = rows[0].length;
  const used = rows.map((r) => new Array(r.length).fill(false));
  const out = [];
  const at = (x, y) => (rows[y] && rows[y][x]) || '.';
  const ox = -(w * GRID_CELL) / 2;
  const oz = -(h * GRID_CELL) / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (used[y][x] || !legend[c]) continue;
      // 先往右擴，再整段往下擴
      let ex = x;
      while (ex + 1 < w && at(ex + 1, y) === c && !used[y][ex + 1]) ex++;
      let ey = y;
      outer: while (ey + 1 < h) {
        for (let k = x; k <= ex; k++) {
          if (at(k, ey + 1) !== c || used[ey + 1][k]) break outer;
        }
        ey++;
      }
      for (let yy = y; yy <= ey; yy++) for (let xx = x; xx <= ex; xx++) used[yy][xx] = true;

      const spec = legend[c];
      const sw = (ex - x + 1) * GRID_CELL;
      const sd = (ey - y + 1) * GRID_CELL;
      out.push({
        p: [ox + x * GRID_CELL + sw / 2, spec.h / 2, oz + y * GRID_CELL + sd / 2],
        s: [sw, spec.h, sd],
        tex: spec.tex,
        uv: spec.uv,
        tint: [1, 1, 1],
      });
    }
  }
  return out;
}

export function gridSize(rows) {
  return [rows[0].length * GRID_CELL, rows.length * GRID_CELL];
}

const DUST = {
  id: 'dust',
  label: 'DE_DUST',
  zh: '沙漠遺跡',
  size: 44,
  ground: { p: [0, -0.3, 0], s: [44, 0.6, 44], tex: 'dirt', uv: 0.22, tint: [1, 1, 1] },
  env: {
    sun: [0.42, 0.76, 0.34], sunColor: [1.30, 1.18, 0.94],
    skyTop: [0.28, 0.47, 0.76], skyHorizon: [0.80, 0.79, 0.71],
    fog: [0.80, 0.77, 0.67], fogNear: 30, fogFar: 125,
    hemiSky: 0xbcd4ff, hemiGround: 0xb09a70, turbidity: 2.4, rayleigh: 3.4,
    exposure: 0.52, fogColor: 0xd3cab4, fogRange: [42, 150],
  },
  walls: [
    sand([0, 2.5, -22], [44, 5, 1.4]),
    sand([0, 2.5, 22], [44, 5, 1.4]),
    sand([-22, 2.5, 0], [1.4, 5, 44]),
    sand([22, 2.5, 0], [1.4, 5, 44]),

    sand([-9.5, 2, 0], [11, 4, 1.8]),
    sand([9.5, 2, 0], [11, 4, 1.8]),
    sand([0, 3.5, 0], [8, 1, 1.8]),

    sand([0, 1.6, -15.5], [11, 3.2, 1.6]),
    sand([0, 1.6, 15.5], [11, 3.2, 1.6]),

    sand([-18, 2.2, -18], [7, 4.4, 7]),
    sand([18, 2.2, 18], [7, 4.4, 7]),
    sand([17.5, 1.2, -17], [8, 2.4, 5]),
    sand([-17.5, 1.2, 17], [8, 2.4, 5]),

    container([-16.5, 1.35, 4], [3.2, 2.7, 8], [0.86, 0.90, 0.92]),
    container([16.5, 1.35, -4], [3.2, 2.7, 8], [0.92, 0.74, 0.58]),

    crate(-6.2, 0.63, 8), crate(-6.2, 1.88, 8), crate(-7.5, 0.63, 8.4), crate(-4.9, 0.63, 8.2),
    crate(7.4, 0.63, -7.5), crate(7.4, 1.88, -7.5), crate(8.7, 0.63, -7.1),
    crate(12.5, 0.63, 11), crate(13.8, 0.63, 11.4), crate(12.9, 1.88, 11.2),
    crate(-13, 0.63, -11), crate(-11.7, 0.63, -10.6),

    sand([-8, 0.55, -17], [5, 1.1, 1.4]),
    sand([8, 0.55, 17], [5, 1.1, 1.4]),
  ],
};

// fy_iceworld：封閉的長方形冰場，掩體 180 度對稱，兩端出生點
const ICEWORLD = {
  id: 'iceworld',
  label: 'FY_ICEWORLD',
  zh: '冰封競技場',
  size: 42,
  ground: { p: [0, -0.3, 0], s: [46, 0.6, 34], tex: 'snow', uv: 0.16, tint: [1, 1, 1] },
  env: {
    sun: [0.30, 0.86, 0.42], sunColor: [1.24, 1.28, 1.36],
    skyTop: [0.34, 0.55, 0.82], skyHorizon: [0.86, 0.91, 0.96],
    fog: [0.84, 0.90, 0.95], fogNear: 34, fogFar: 130,
    hemiSky: 0xd6e8ff, hemiGround: 0x9fbcd0, turbidity: 1.6, rayleigh: 2.2,
    exposure: 0.46, fogColor: 0xd8e6ef, fogRange: [46, 150],
  },
  walls: [
    ...box(46, 34, 6, 'ice'),

    // 中央十字矮牆（本身就對稱）
    ice([0, 1.05, 0], [7.5, 2.1, 1.5]),
    ice([0, 1.05, 0], [1.5, 2.1, 7.5]),

    ...mirrored([
      // 出生點側的掩體牆
      ice([-19, 1.3, 0], [1.5, 2.6, 8]),
      // 中線兩側的高柱
      ice([-7.5, 2.3, 5.2], [2.4, 4.6, 2.4]),
      // 上下兩條長掩體
      ice([-8.5, 1.5, -12], [9, 3, 1.6]),
      ice([-14.5, 1.0, -6.5], [1.6, 2, 6]),
      // 木箱堆
      crate(-13.5, 0.65, 8.5), crate(-13.5, 1.95, 8.5), crate(-12.3, 0.65, 9.2),
      crate(-4.6, 0.65, -6.2), crate(-5.8, 0.65, -6.6),
      crate(-10.5, 0.65, 0.6),
      // 角落矮牆
      ice([-20, 0.9, -13], [5, 1.8, 1.5]),
    ]),
  ],
};

// 大型地圖：26 x 26 格 x 4 公尺 = 104 x 104 公尺
const COMPOUND_GRID = [
  '##########################',
  '#........................#',
  '#......#.....====........#',
  '#......#.................#',
  '#..#####...####......##..#',
  '#......#...#..#.......#..#',
  '#..o...#...#..#..........#',
  '#......#...#..#....o.....#',
  '#####..#...#..######.....#',
  '#......#...#........#..###',
  '#...o..#...#..o.....#....#',
  '#......#####........#....#',
  '#...........====....#..o.#',
  '#..####..............#...#',
  '#..#..#....######....#...#',
  '#..#..#....#....#....#...#',
  '#..#..######....#.####...#',
  '#..#............#........#',
  '#..######..#####....####.#',
  '#......#..#...........#..#',
  '#......#..#...o.......#..#',
  '#......#..#....####...#..#',
  '#####..#..#....#..#...#..#',
  '#......#.......#..#......#',
  '#........................#',
  '##########################',
];

const COMPOUND = {
  id: 'compound',
  label: 'DE_COMPOUND',
  zh: '廢棄基地',
  size: 104,
  ground: { p: [0, -0.3, 0], s: [104, 0.6, 104], tex: 'dirt', uv: 0.22, tint: [1, 1, 1] },
  env: DUST.env,
  walls: fromGrid(COMPOUND_GRID),
};

export const MAPS = { dust: DUST, iceworld: ICEWORLD, compound: COMPOUND };

let current = DUST;

export let walls = current.walls;
export let GROUND = current.ground;
export let MAP_SIZE = current.size;

export function currentMap() {
  return current;
}

export function setMap(id) {
  current = MAPS[id] || DUST;
  walls = current.walls;
  GROUND = current.ground;
  MAP_SIZE = current.size;
  return current;
}

export function bounds(w) {
  return [
    [w.p[0] - w.s[0] / 2, w.p[1] - w.s[1] / 2, w.p[2] - w.s[2] / 2],
    [w.p[0] + w.s[0] / 2, w.p[1] + w.s[1] / 2, w.p[2] + w.s[2] / 2],
  ];
}

export function rayBox(o, d, mn, mx) {
  let t0 = 0;
  let t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    const inv = 1 / d[i];
    let a = (mn[i] - o[i]) * inv;
    let b = (mx[i] - o[i]) * inv;
    if (a > b) {
      const tmp = a;
      a = b;
      b = tmp;
    }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    if (t1 < t0) return Infinity;
  }
  return t0;
}

export function rayWalls(o, d, maxT = Infinity) {
  let best = maxT;
  for (const w of walls) {
    const [mn, mx] = bounds(w);
    const t = rayBox(o, d, mn, mx);
    if (t < best) best = t;
  }
  const g = bounds(GROUND);
  const tg = rayBox(o, d, g[0], g[1]);
  if (tg < best) best = tg;
  return best;
}

export function rayWallsHit(o, d, maxT = Infinity) {
  let best = maxT;
  let box = null;
  const all = walls.concat([GROUND]);
  for (const w of all) {
    const [mn, mx] = bounds(w);
    const t = rayBox(o, d, mn, mx);
    if (t < best) {
      best = t;
      box = w;
    }
  }
  if (!box) return { t: maxT, n: null, box: null };
  const p = [o[0] + d[0] * best, o[1] + d[1] * best, o[2] + d[2] * best];
  const rel = [(p[0] - box.p[0]) / box.s[0], (p[1] - box.p[1]) / box.s[1], (p[2] - box.p[2]) / box.s[2]];
  const a = rel.map(Math.abs);
  const n = [0, 0, 0];
  const axis = a[0] > a[1] ? (a[0] > a[2] ? 0 : 2) : a[1] > a[2] ? 1 : 2;
  n[axis] = Math.sign(rel[axis]) || 1;
  return { t: best, n, p, box };
}

export function collide(pos, radius, height) {
  for (const w of walls) {
    const [mn, mx] = bounds(w);
    if (pos[1] >= mx[1] || pos[1] + height <= mn[1]) continue;
    const cx = Math.max(mn[0], Math.min(pos[0], mx[0]));
    const cz = Math.max(mn[2], Math.min(pos[2], mx[2]));
    const dx = pos[0] - cx;
    const dz = pos[2] - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    const d = Math.sqrt(d2);
    if (d > 1e-5) {
      pos[0] = cx + (dx / d) * radius;
      pos[2] = cz + (dz / d) * radius;
    } else {
      const px = Math.min(pos[0] - mn[0], mx[0] - pos[0]);
      const pz = Math.min(pos[2] - mn[2], mx[2] - pos[2]);
      if (px < pz) pos[0] = pos[0] - mn[0] < mx[0] - pos[0] ? mn[0] - radius : mx[0] + radius;
      else pos[2] = pos[2] - mn[2] < mx[2] - pos[2] ? mn[2] - radius : mx[2] + radius;
    }
  }
}

// 腳下最高的可站立平面（含地面）。maxY 是腳的高度，只考慮不高於腳的箱頂。
export function groundHeight(pos, radius, maxY) {
  let best = 0;
  for (const w of walls) {
    const [mn, mx] = bounds(w);
    if (mx[1] > maxY + 0.02 || mx[1] <= best) continue;
    const cx = Math.max(mn[0], Math.min(pos[0], mx[0]));
    const cz = Math.max(mn[2], Math.min(pos[2], mx[2]));
    const dx = pos[0] - cx;
    const dz = pos[2] - cz;
    if (dx * dx + dz * dz > radius * radius) continue;
    best = mx[1];
  }
  return best;
}

// 頭頂最低的天花板。feetY 是腳的高度，只考慮高於腳的箱底。
export function ceilingHeight(pos, radius, feetY) {
  let best = Infinity;
  for (const w of walls) {
    const [mn, mx] = bounds(w);
    if (mn[1] < feetY + 0.02 || mn[1] >= best) continue;
    const cx = Math.max(mn[0], Math.min(pos[0], mx[0]));
    const cz = Math.max(mn[2], Math.min(pos[2], mx[2]));
    const dx = pos[0] - cx;
    const dz = pos[2] - cz;
    if (dx * dx + dz * dz > radius * radius) continue;
    best = mn[1];
  }
  return best;
}

export const STEP_HEIGHT = 0.42;

// 水平移動＋台階：被擋住時把腳抬高一點再走一次，成功就踏上去。
// 沒有這段的話，collide() 會在落地判定之前把玩家水平推開，連 30 公分的階梯都上不去。
export function moveWithStep(pos, radius, height, wantX, wantZ) {
  pos[0] = wantX;
  pos[2] = wantZ;
  collide(pos, radius, height);
  if (Math.abs(pos[0] - wantX) < 1e-4 && Math.abs(pos[2] - wantZ) < 1e-4) return;

  const probe = [wantX, pos[1] + STEP_HEIGHT, wantZ];
  collide(probe, radius, height);
  if (Math.abs(probe[0] - wantX) > 1e-4 || Math.abs(probe[2] - wantZ) > 1e-4) return;

  const top = groundHeight(probe, radius, probe[1]);
  if (top - pos[1] > STEP_HEIGHT) return;
  if (ceilingHeight(probe, radius * 0.65, top) - top < height) return;

  pos[0] = wantX;
  pos[2] = wantZ;
  pos[1] = top;
}

export function blocked(p, radius, height = 1.8) {
  for (const w of walls) {
    const [mn, mx] = bounds(w);
    if (mn[1] > height) continue;
    if (
      p[0] > mn[0] - radius && p[0] < mx[0] + radius &&
      p[2] > mn[2] - radius && p[2] < mx[2] + radius
    ) return true;
  }
  return false;
}

export function randomSpawn(avoid, minDist = 0) {
  const g = GROUND.s;
  const rx = g[0] - 7;
  const rz = g[2] - 7;
  for (let i = 0; i < 160; i++) {
    const p = [(Math.random() - 0.5) * rx, 0, (Math.random() - 0.5) * rz];
    if (blocked(p, 1.3)) continue;
    if (avoid && Math.hypot(p[0] - avoid[0], p[2] - avoid[2]) < minDist) continue;
    return p;
  }
  return [0, 0, 18];
}

export function drawMap(r, tex) {
  r.texture(tex.dirt, GROUND.uv);
  r.cube(GROUND.p, GROUND.s, GROUND.tint);
  let current = null;
  for (const w of walls) {
    if (w.tex !== current) {
      current = w.tex;
      r.texture(tex[w.tex], w.uv);
    } else {
      r.set('uTexScale', w.uv);
    }
    r.cube(w.p, w.s, w.tint);
  }
}

export function drawMapDepth(r) {
  r.cube(GROUND.p, GROUND.s, [1, 1, 1]);
  for (const w of walls) r.cube(w.p, w.s, [1, 1, 1]);
}
