import { vadd, vmul, vsub, vlen, vnorm } from './gl.js';
import { collide, randomSpawn, rayWalls, groundHeight, moveWithStep, STEP_HEIGHT } from './map.js';
import { findPath, advanceAlong } from './nav.js';

export const ENEMY_SIZE = [0.8, 1.85, 0.7];
export const RESPAWN_DELAY = 3;
export const HEAD_MULT = 4;

const SPEED = 3.4;
const KEEP_DISTANCE = 4.5;
const STRAFE_SPEED = 0.55;
const SIGHT_RANGE = 46;
const DEATH_TIME = 0.55;

const PANTS = [0.44, 0.40, 0.31];
const VEST = [0.40, 0.34, 0.25];
const RIG = [0.28, 0.25, 0.20];
const SLEEVE = [0.60, 0.50, 0.35];
const MASK = [0.32, 0.29, 0.25];
const SKIN = [0.66, 0.49, 0.34];
const BAND = [0.55, 0.11, 0.09];
const GUN = [0.16, 0.165, 0.17];

export class Enemy {
  constructor(team, name, avoid) {
    this.team = team;
    this.name = name;
    this.spawn(avoid);
  }

  spawn(avoid) {
    this.pos = randomSpawn(avoid, 15);
    this.hp = 100;
    this.alive = true;
    this.deadTimer = 0;
    this.dying = 0;
    this.fireTimer = 1.5 + Math.random() * 2;
    this.hitFlash = 0;
    this.flash = 0;
    this.phase = Math.random() * 6.283;
    this.yaw = Math.random() * 6.283;
    this.moving = 0;
    this.target = null;
    this.retarget = 0;
    this.path = null;
    this.pathAt = 0;
    this.pathTimer = 0;
    this.pathGoal = null;
    this.strafe = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = 0;
    this.stuck = 0;
    this.forcePath = 0;
  }

  get center() {
    return [this.pos[0], this.pos[1] + ENEMY_SIZE[1] / 2, this.pos[2]];
  }

  get eye() {
    return [this.pos[0], this.pos[1] + 1.5, this.pos[2]];
  }

  bounds() {
    const c = this.center;
    return [
      [c[0] - ENEMY_SIZE[0] / 2, c[1] - ENEMY_SIZE[1] / 2, c[2] - ENEMY_SIZE[2] / 2],
      [c[0] + ENEMY_SIZE[0] / 2, c[1] + ENEMY_SIZE[1] / 2, c[2] + ENEMY_SIZE[2] / 2],
    ];
  }

  headBounds() {
    const p = this.pos;
    return [
      [p[0] - 0.19, p[1] + 1.5, p[2] - 0.19],
      [p[0] + 0.19, p[1] + 1.9, p[2] + 0.19],
    ];
  }

  // 優先打看得見的敵人；都看不見就鎖定最近的一個主動追過去。
  // 只用「有視線」當條件的話，大地圖上雙方互相看不到，機器人會整場站著不動。
  pickTarget(dt, world) {
    this.retarget -= dt;
    const cur = this.target;
    if (cur && cur.alive && this.retarget > 0) return cur;
    this.retarget = 0.6 + Math.random() * 0.4;

    let seen = null;
    let seenD = Infinity;
    let near = null;
    let nearD = Infinity;
    const eye = this.eye;
    const consider = (c) => {
      if (!c || c === this || !c.alive || c.team === this.team) return;
      const to = vsub(c.eye, eye);
      const d = vlen(to);
      if (d < nearD) { nearD = d; near = c; }
      if (d > SIGHT_RANGE || d >= seenD) return;
      if (rayWalls(eye, vnorm(to), d) < d - 0.15) return;
      seenD = d;
      seen = c;
    };
    consider(world.player);
    for (const b of world.bots) consider(b);
    this.target = seen || near;
    return this.target;
  }

  update(dt, world, onShoot) {
    this.flash = Math.max(0, this.flash - dt);

    if (!this.alive) {
      this.dying = Math.min(DEATH_TIME, this.dying + dt);
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) this.spawn(world.player.pos);
      return;
    }

    this.hitFlash = Math.max(0, this.hitFlash - dt);

    const target = this.pickTarget(dt, world);
    if (!target) {
      this.moving += (0 - this.moving) * Math.min(1, dt * 6);
      return;
    }

    const to = vsub(target.eye, this.eye);
    const dist = vlen(to);
    const dir = vnorm(to);
    const los = rayWalls(this.eye, dir, dist) >= dist - 0.15;

    const want = Math.atan2(to[0], to[2]);
    let diff = want - this.yaw;
    while (diff > Math.PI) diff -= 6.283185;
    while (diff < -Math.PI) diff += 6.283185;
    this.yaw += diff * Math.min(1, dt * 4);

    // 看不到目標時一定要移動，否則會卡在「已經夠近」但又沒視線的死角站著不動。
    // 距離夠近且看得見時改成橫移，不要僵在原地。
    const advancing = dist > KEEP_DISTANCE || !los;
    this.moving += (1 - this.moving) * Math.min(1, dt * 6);
    const before = [this.pos[0], this.pos[2]];

    this.forcePath = Math.max(0, this.forcePath - dt);

    if (advancing) {
      // 眼睛看得到不代表走得過去：中間可能隔著胸高掩體。
      // 走直線卡住時改走 A*，導航網格會把矮牆算進去。
      const flat = los && dist < 34 && this.forcePath <= 0
        ? vnorm([to[0], 0, to[2]])
        : this.steerAlongPath(dt, target.pos);
      if (flat) moveWithStep(
        this.pos, 0.4, ENEMY_SIZE[1],
        this.pos[0] + flat[0] * SPEED * dt,
        this.pos[2] + flat[2] * SPEED * dt
      );
    } else {
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafe = Math.random() < 0.5 ? -1 : 1;
        this.strafeTimer = 0.7 + Math.random() * 1.3;
      }
      const flat = vnorm([to[0], 0, to[2]]);
      const side = [flat[2] * this.strafe, 0, -flat[0] * this.strafe];
      moveWithStep(
        this.pos, 0.4, ENEMY_SIZE[1],
        this.pos[0] + side[0] * SPEED * STRAFE_SPEED * dt,
        this.pos[2] + side[2] * SPEED * STRAFE_SPEED * dt
      );
    }

    this.pos[1] = groundHeight(this.pos, 0.4, this.pos[1] + STEP_HEIGHT);
    const moved = Math.hypot(this.pos[0] - before[0], this.pos[2] - before[1]);
    this.phase += moved * 5.2;

    if (advancing) {
      if (moved < SPEED * dt * 0.35) this.stuck += dt;
      else this.stuck = Math.max(0, this.stuck - dt * 2);
      if (this.stuck > 0.45) {
        this.forcePath = 2;
        this.path = null;
        this.stuck = 0;
      }
    }

    if (los && dist < SIGHT_RANGE) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = 2 + Math.random();
        this.flash = 0.06;
        onShoot(this, target, dir, dist);
      }
    }
  }

  steerAlongPath(dt, goal) {
    this.pathTimer -= dt;
    const stale = !this.path
      || this.pathTimer <= 0
      || !this.pathGoal
      || Math.hypot(goal[0] - this.pathGoal[0], goal[2] - this.pathGoal[2]) > 5;
    if (stale) {
      this.path = findPath(this.pos, goal);
      this.pathAt = 0;
      this.pathGoal = [goal[0], goal[1], goal[2]];
      this.pathTimer = 1.2 + Math.random() * 0.6;
    }
    if (!this.path || !this.path.length) return null;

    this.pathAt = advanceAlong(this.path, this.pathAt, this.pos);
    const wp = this.path[this.pathAt];
    const d = [wp[0] - this.pos[0], 0, wp[2] - this.pos[2]];
    const len = Math.hypot(d[0], d[2]);
    if (len < 1.2) {
      if (this.pathAt >= this.path.length - 1) { this.path = null; return null; }
      this.pathAt++;
      return null;
    }
    return [d[0] / len, 0, d[2] / len];
  }

  hit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.12;
    if (this.hp <= 0) {
      this.alive = false;
      this.deadTimer = RESPAWN_DELAY;
      this.dying = 0;
      return true;
    }
    return false;
  }

  muzzle() {
    const f = [Math.sin(this.yaw), 0, Math.cos(this.yaw)];
    const r = [f[2], 0, -f[0]];
    return vadd(vadd(this.pos, [0, 1.22, 0]), vadd(vmul(r, 0.19), vmul(f, 0.6)));
  }

  draw(rn, depthOnly) {
    const fall = this.alive ? 0 : Math.min(1, this.dying / DEATH_TIME);
    const a = fall * fall * 1.45;
    const f0 = [Math.sin(this.yaw), 0, Math.cos(this.yaw)];
    const r = [f0[2], 0, -f0[0]];
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const u = [f0[0] * sa, ca, f0[2] * sa];
    const f = [f0[0] * ca, -sa, f0[2] * ca];
    const root = [this.pos[0], this.pos[1] + fall * 0.06, this.pos[2]];

    const at = (ox, oy, oz) =>
      vadd(root, vadd(vmul(r, ox), vadd(vmul(u, oy), vmul(f, oz))));

    const tint = (c) => {
      if (depthOnly) return c;
      if (this.hitFlash > 0) return [1, 0.55, 0.5];
      return c;
    };
    const flat = !depthOnly && this.hitFlash > 0 ? 0.55 : 0;

    const walk = this.moving * Math.sin(this.phase) * 0.55;
    const walkB = -walk;
    const breathe = Math.sin(this.phase * 0.4) * 0.02;

    const limb = (jx, jy, jz, len, size, color, swing) => {
      const cs = Math.cos(swing);
      const ss = Math.sin(swing);
      const lu = [u[0] * cs + f[0] * ss, u[1] * cs + f[1] * ss, u[2] * cs + f[2] * ss];
      const lf = [f[0] * cs - u[0] * ss, f[1] * cs - u[1] * ss, f[2] * cs - u[2] * ss];
      const joint = at(jx, jy, jz);
      const c = vadd(joint, vmul(lu, -len / 2));
      rn.basis(r, lu, lf, c, size, tint(color), flat);
    };

    rn.basis(r, u, f, at(0, 0.92 + breathe, 0), [0.44, 0.3, 0.3], tint(PANTS), flat);
    rn.basis(r, u, f, at(0, 1.32 + breathe, 0), [0.54, 0.52, 0.34], tint(VEST), flat);
    rn.basis(r, u, f, at(0, 1.3 + breathe, 0.18), [0.42, 0.36, 0.06], tint(RIG), flat);
    rn.basis(r, u, f, at(0, 1.7 + breathe, 0), [0.27, 0.29, 0.27], tint(MASK), flat);
    rn.basis(r, u, f, at(0, 1.71 + breathe, 0.14), [0.17, 0.09, 0.04], tint(SKIN), flat);
    rn.basis(r, u, f, at(0, 1.86 + breathe, -0.01), [0.29, 0.09, 0.29], tint(RIG), flat);

    limb(-0.13, 0.95, 0, 0.82, [0.19, 0.82, 0.22], PANTS, walk);
    limb(0.13, 0.95, 0, 0.82, [0.19, 0.82, 0.22], PANTS, walkB);

    const aimArm = -0.92 - this.moving * 0.12;
    limb(-0.33, 1.5, 0, 0.58, [0.15, 0.58, 0.17], SLEEVE, aimArm);
    limb(0.33, 1.5, 0, 0.58, [0.15, 0.58, 0.17], SLEEVE, aimArm * 0.85);
    rn.basis(r, u, f, at(0.35, 1.52, 0.04), [0.16, 0.1, 0.1], tint(BAND), flat);

    rn.basis(r, u, f, at(0.19, 1.22, 0.36), [0.06, 0.1, 0.5], tint(GUN), flat);
    rn.basis(r, u, f, at(0.19, 1.13, 0.24), [0.05, 0.12, 0.07], tint(GUN), flat);

    if (!depthOnly && this.flash > 0) {
      const k = 0.8 + Math.random() * 0.5;
      rn.basis(r, u, f, at(0.19, 1.22, 0.66), [0.16 * k, 0.16 * k, 0.2 * k], [1, 0.9, 0.5], 1);
    }
  }
}

export function createBots(roster, avoid) {
  const list = [];
  for (const team of ['ct', 't']) {
    for (const slot of roster[team]) {
      if (!slot || slot.type !== 'bot') continue;
      list.push(new Enemy(team, slot.name, avoid));
    }
  }
  return list;
}
