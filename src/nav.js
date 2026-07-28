import { blocked, GROUND, rayWalls } from './map.js';

const CELL = 2;
let nav = null;

// 導航網格用取樣建立，不依賴地圖是怎麼畫的，所以三張圖都適用。
export function buildNav() {
  const w = Math.max(1, Math.floor(GROUND.s[0] / CELL));
  const h = Math.max(1, Math.floor(GROUND.s[2] / CELL));
  const ox = -GROUND.s[0] / 2;
  const oz = -GROUND.s[2] / 2;
  const walk = new Uint8Array(w * h);
  const p = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      p[0] = ox + (x + 0.5) * CELL;
      p[2] = oz + (y + 0.5) * CELL;
      walk[y * w + x] = blocked(p, 0.55) ? 0 : 1;
    }
  }
  nav = { w, h, ox, oz, walk };
  return nav;
}

export function navStats() {
  if (!nav) buildNav();
  let open = 0;
  for (const v of nav.walk) open += v;
  return { w: nav.w, h: nav.h, open, total: nav.w * nav.h };
}

function nearestOpen(x, y) {
  const { w, h, walk } = nav;
  if (walk[y * w + x]) return [x, y];
  for (let r = 1; r < 12; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (walk[ny * w + nx]) return [nx, ny];
      }
    }
  }
  return null;
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142],
];

export function findPath(from, to) {
  if (!nav) buildNav();
  const { w, h, ox, oz, walk } = nav;
  const cx = (v) => Math.max(0, Math.min(w - 1, Math.floor((v - ox) / CELL)));
  const cz = (v) => Math.max(0, Math.min(h - 1, Math.floor((v - oz) / CELL)));

  const s = nearestOpen(cx(from[0]), cz(from[2]));
  const g = nearestOpen(cx(to[0]), cz(to[2]));
  if (!s || !g) return null;
  const start = s[1] * w + s[0];
  const goal = g[1] * w + g[0];
  if (start === goal) return [];

  const cost = new Float32Array(w * h).fill(Infinity);
  const prev = new Int32Array(w * h).fill(-1);
  const heap = [{ i: start, f: 0 }];
  cost[start] = 0;
  const gx = g[0];
  const gy = g[1];

  while (heap.length) {
    let bi = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i].f < heap[bi].f) bi = i;
    const cur = heap.splice(bi, 1)[0];
    if (cur.i === goal) break;
    const x = cur.i % w;
    const y = (cur.i - x) / w;
    for (const [dx, dy, dc] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (!walk[ni]) continue;
      // 不切角：斜走時兩側都要通
      if (dx && dy && (!walk[y * w + nx] || !walk[ny * w + x])) continue;
      const nc = cost[cur.i] + dc;
      if (nc >= cost[ni]) continue;
      cost[ni] = nc;
      prev[ni] = cur.i;
      heap.push({ i: ni, f: nc + Math.hypot(nx - gx, ny - gy) });
    }
  }
  if (prev[goal] < 0) return null;

  const out = [];
  for (let i = goal; i !== start && i >= 0; i = prev[i]) {
    const x = i % w;
    const y = (i - x) / w;
    out.push([ox + (x + 0.5) * CELL, 0, oz + (y + 0.5) * CELL]);
  }
  out.reverse();
  return out;
}

// 拉直：從目前位置往前找最遠一個還看得到的路徑點，避免貼著格線走出鋸齒
export function advanceAlong(path, index, pos) {
  let i = Math.min(index, path.length - 1);
  while (i < path.length - 1) {
    const wp = path[i + 1];
    const d = [wp[0] - pos[0], 0, wp[2] - pos[2]];
    const len = Math.hypot(d[0], d[2]);
    if (len < 0.01) { i++; continue; }
    const dir = [d[0] / len, 0, d[2] / len];
    if (rayWalls([pos[0], 1.2, pos[2]], dir, len) < len - 0.2) break;
    i++;
  }
  return i;
}
