// 其他玩家。狀態以約 20Hz 送達，這裡用兩個快照做內插補間，
// 並刻意落後 INTERP_DELAY，讓封包有時間到齊，畫面才不會抖。
const INTERP_DELAY = 0.11;
const BUFFER = 8;

export const REMOTE_SIZE = [0.8, 1.85, 0.7];

export const REMOTE_RATE = 1 / 20;

export class Remote {
  constructor(cid, name, team) {
    this.cid = cid;
    this.name = name;
    this.team = team;
    this.pos = [0, 0, 0];
    this.yaw = 0;
    this.pitch = 0;
    this.hp = 100;
    this.alive = true;
    this.moving = 0;
    this.phase = 0;
    this.flash = 0;
    this.hitFlash = 0;
    this.dying = 0;
    this.remote = true;
    this.buf = [];
  }

  get center() {
    return [this.pos[0], this.pos[1] + REMOTE_SIZE[1] / 2, this.pos[2]];
  }

  get eye() {
    return [this.pos[0], this.pos[1] + 1.5, this.pos[2]];
  }

  bounds() {
    const c = this.center;
    return [
      [c[0] - REMOTE_SIZE[0] / 2, c[1] - REMOTE_SIZE[1] / 2, c[2] - REMOTE_SIZE[2] / 2],
      [c[0] + REMOTE_SIZE[0] / 2, c[1] + REMOTE_SIZE[1] / 2, c[2] + REMOTE_SIZE[2] / 2],
    ];
  }

  headBounds() {
    const p = this.pos;
    return [
      [p[0] - 0.19, p[1] + 1.5, p[2] - 0.19],
      [p[0] + 0.19, p[1] + 1.9, p[2] + 0.19],
    ];
  }

  muzzle() {
    const f = [Math.sin(this.yaw), 0, Math.cos(this.yaw)];
    const r = [f[2], 0, -f[0]];
    return [
      this.pos[0] + r[0] * 0.19 + f[0] * 0.6,
      this.pos[1] + 1.22,
      this.pos[2] + r[2] * 0.19 + f[2] * 0.6,
    ];
  }

  push(s, now) {
    this.buf.push({ t: now, p: s.p, y: s.y, m: s.m, a: s.a, hp: s.hp });
    if (this.buf.length > BUFFER) this.buf.shift();
    this.name = s.n || this.name;
  }

  hit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.12;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  update(dt, now) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.flash = Math.max(0, this.flash - dt);
    if (!this.alive) this.dying = Math.min(0.55, this.dying + dt);

    const target = now - INTERP_DELAY;
    const b = this.buf;
    if (!b.length) return;

    let a = b[0];
    let c = b[b.length - 1];
    for (let i = 0; i < b.length - 1; i++) {
      if (b[i].t <= target && b[i + 1].t >= target) { a = b[i]; c = b[i + 1]; break; }
    }
    const span = c.t - a.t;
    const k = span > 1e-4 ? Math.max(0, Math.min(1, (target - a.t) / span)) : 1;

    const before = [this.pos[0], this.pos[2]];
    this.pos[0] = a.p[0] + (c.p[0] - a.p[0]) * k;
    this.pos[1] = a.p[1] + (c.p[1] - a.p[1]) * k;
    this.pos[2] = a.p[2] + (c.p[2] - a.p[2]) * k;

    let dy = c.y - a.y;
    while (dy > Math.PI) dy -= 6.283185;
    while (dy < -Math.PI) dy += 6.283185;
    this.yaw = a.y + dy * k;

    this.moving = c.m;
    if (c.a !== undefined) this.alive = c.a;
    if (c.hp !== undefined) this.hp = c.hp;

    const moved = Math.hypot(this.pos[0] - before[0], this.pos[2] - before[1]);
    this.phase += moved * 5.2;
  }

  draw(rn, depthOnly) {
    // 借用機器人的畫法，外觀與名牌完全一致
    Remote.drawFn.call(this, rn, depthOnly);
  }
}
