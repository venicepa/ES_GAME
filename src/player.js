import { vadd, vmul, vnorm } from './gl.js';
import { collide, randomSpawn, groundHeight, ceilingHeight, moveWithStep } from './map.js';

export const WEAPONS = {
  pistol: {
    label: 'USP', mag: 12, damage: 34, delay: 0.15, auto: false,
    reloadTime: 1.5, spread: 0.004, kick: 0.016, punch: 0.055,
  },
  rifle: {
    label: 'M4A1', mag: 30, damage: 26, delay: 0.09, auto: true,
    reloadTime: 2.3, spread: 0.012, kick: 0.018, punch: 0.03,
  },
  sniper: {
    label: 'AWP', mag: 5, damage: 115, delay: 1.4, auto: false,
    reloadTime: 3.0, spread: 0.0016, kick: 0.055, punch: 0.11,
    scope: true, scopeFov: 0.26, scopedSpread: 0.0004,
  },
  shotgun: {
    label: 'M3', mag: 8, damage: 21, pellets: 9, delay: 0.85, auto: false,
    reloadTime: 3.2, spread: 0.055, kick: 0.06, punch: 0.13,
  },
};

export const EYE_HEIGHT = 1.62;
export const CROUCH_EYE = 0.95;
const STAND_HEIGHT = 1.75;
const CROUCH_HEIGHT = 1.05;
// 頭頂偵測要用比身體細的圓柱：collide() 會把玩家推到離箱子正好等於半徑的位置，
// 若兩者同半徑，只要貼著高箱子站就會被判定頭上有東西而強制蹲下。
const HEAD_RADIUS = 0.65;
const GRAVITY = 21;
const JUMP_SPEED = 6.4;

const GUN_METAL = [0.22, 0.23, 0.245];
const GUN_DARK = [0.15, 0.155, 0.165];
const GUN_POLY = [0.27, 0.27, 0.285];
const VM_SCALE = 0.52;
const VM_SKIN = [0.70, 0.54, 0.37];
const VM_SLEEVE = [0.55, 0.50, 0.35];

const RIFLE_PARTS = [
  [[0, 0, 0], [0.052, 0.072, 0.30], GUN_METAL],
  [[0, 0.048, 0.02], [0.022, 0.036, 0.16], GUN_DARK],
  [[0, 0.004, -0.25], [0.05, 0.062, 0.22], GUN_POLY],
  [[0, 0.014, -0.44], [0.019, 0.019, 0.2], GUN_DARK],
  [[0, 0.056, -0.36], [0.015, 0.048, 0.028], GUN_DARK],
  [[0, -0.10, -0.015], [0.036, 0.155, 0.072], GUN_DARK],
  [[0, -0.085, 0.095], [0.04, 0.125, 0.05], GUN_POLY],
  [[0, -0.004, 0.245], [0.046, 0.068, 0.2], GUN_POLY],
  [[0.004, -0.125, 0.075], [0.072, 0.085, 0.088], VM_SKIN],
  [[-0.006, -0.055, -0.27], [0.076, 0.088, 0.1], VM_SKIN],
  [[0.03, -0.215, 0.235], [0.096, 0.1, 0.3], VM_SLEEVE],
];

const PISTOL_PARTS = [
  [[0, 0, 0], [0.038, 0.058, 0.2], GUN_METAL],
  [[0, 0.032, -0.02], [0.03, 0.03, 0.19], GUN_DARK],
  [[0, 0.012, -0.14], [0.022, 0.024, 0.08], GUN_DARK],
  [[0, -0.09, 0.05], [0.036, 0.12, 0.05], GUN_POLY],
  [[0.004, -0.115, 0.045], [0.07, 0.085, 0.085], VM_SKIN],
  [[-0.02, -0.1, 0.005], [0.07, 0.08, 0.08], VM_SKIN],
  [[0.03, -0.21, 0.2], [0.094, 0.098, 0.3], VM_SLEEVE],
];

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.pos = randomSpawn(null, 0);
    this.yaw = Math.atan2(-this.pos[0], -this.pos[2]) + Math.PI;
    this.pitch = 0;
    this.recoil = 0;
    this.punch = 0;
    this.hp = 100;
    this.pos[1] = 0;
    this.vy = 0;
    this.grounded = true;
    this.crouch = 0;
    this.height = STAND_HEIGHT;
    this.radius = 0.36;
    this.speed = 5.2;
    this.weapon = 'rifle';
    this.ammo = {};
    for (const k of Object.keys(WEAPONS)) this.ammo[k] = WEAPONS[k].mag;
    this.scoped = false;
    this.cooldown = 0;
    this.reloading = 0;
    this.alive = true;
    this.bob = 0;
    this.bobAmount = 0;
    this.sway = [0, 0];
    this.shake = 0;
  }

  get spec() {
    return WEAPONS[this.weapon];
  }

  get eyeHeight() {
    return EYE_HEIGHT + (CROUCH_EYE - EYE_HEIGHT) * this.crouch;
  }

  get eye() {
    return [this.pos[0], this.pos[1] + this.eyeHeight, this.pos[2]];
  }

  get viewEye() {
    const b = this.bobAmount;
    const s = this.shake;
    return [
      this.pos[0] + (Math.random() - 0.5) * s,
      this.pos[1] + this.eyeHeight + Math.sin(this.bob * 2) * 0.032 * b + (Math.random() - 0.5) * s,
      this.pos[2] + (Math.random() - 0.5) * s,
    ];
  }

  get roll() {
    return Math.sin(this.bob) * 0.014 * this.bobAmount;
  }

  get viewPitch() {
    return Math.max(-1.45, Math.min(1.45, this.pitch + this.recoil));
  }

  get dir() {
    const p = this.viewPitch;
    const cp = Math.cos(p);
    return [-Math.sin(this.yaw) * cp, Math.sin(p), -Math.cos(this.yaw) * cp];
  }

  look(dx, dy) {
    const s = 0.0021;
    this.yaw -= dx * s;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * s));
    this.sway[0] = Math.max(-1, Math.min(1, this.sway[0] - dx * 0.006));
    this.sway[1] = Math.max(-1, Math.min(1, this.sway[1] - dy * 0.006));
  }

  setScope(on) {
    this.scoped = !!on && !!this.spec.scope && this.reloading <= 0;
  }

  switchTo(name) {
    if (name === this.weapon || !WEAPONS[name]) return;
    this.scoped = false;
    this.weapon = name;
    this.reloading = 0;
    this.cooldown = 0.4;
    this.swap = 0.4;
  }

  reload() {
    const s = this.spec;
    if (this.reloading > 0 || this.ammo[this.weapon] >= s.mag) return;
    this.reloading = s.reloadTime;
    this.scoped = false;
  }

  update(dt, keys) {
    this.cooldown -= dt;
    this.swap = Math.max(0, (this.swap || 0) - dt);
    this.recoil += (0 - this.recoil) * Math.min(1, dt * 6);
    this.punch += (0 - this.punch) * Math.min(1, dt * 9);
    this.shake = Math.max(0, this.shake - dt * 0.6);
    this.sway[0] += (0 - this.sway[0]) * Math.min(1, dt * 7);
    this.sway[1] += (0 - this.sway[1]) * Math.min(1, dt * 7);

    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        this.reloading = 0;
        this.ammo[this.weapon] = this.spec.mag;
      }
    }

    const wantCrouch = !!(keys.ControlLeft || keys.ControlRight);
    // 頭頂有東西時站不起來
    const headroom = ceilingHeight(this.pos, this.radius * HEAD_RADIUS, this.pos[1]) - this.pos[1];
    const canStand = headroom >= STAND_HEIGHT;
    const target = wantCrouch || !canStand ? 1 : 0;
    const prevHeight = this.height;
    this.crouch += (target - this.crouch) * Math.min(1, dt * 11);
    if (Math.abs(this.crouch - target) < 0.01) this.crouch = target;
    this.height = STAND_HEIGHT + (CROUCH_HEIGHT - STAND_HEIGHT) * this.crouch;
    // 蹲跳：在空中蹲下時把腳往上收、頭維持原位，
    // 這樣不用把跳躍高度調到超人也能上得了木箱。
    if (!this.grounded) this.pos[1] += prevHeight - this.height;

    let mx = 0;
    let mz = 0;
    if (keys.KeyW) mz += 1;
    if (keys.KeyS) mz -= 1;
    if (keys.KeyD) mx += 1;
    if (keys.KeyA) mx -= 1;

    const moving = mx !== 0 || mz !== 0;
    this.bobAmount += ((moving && this.grounded ? 1 : 0) - this.bobAmount) * Math.min(1, dt * 8);
    if (moving) {
      const f = [-Math.sin(this.yaw), 0, -Math.cos(this.yaw)];
      const r = [-f[2], 0, f[0]];
      let vx = f[0] * mz + r[0] * mx;
      let vz = f[2] * mz + r[2] * mx;
      const l = Math.hypot(vx, vz) || 1;
      vx /= l;
      vz /= l;
      let speed = this.speed;
      if (this.scoped) speed *= 0.38;
      speed *= 1 - 0.55 * this.crouch;
      if (!this.grounded) speed *= 0.9;
      const wantX = this.pos[0] + vx * speed * dt;
      const wantZ = this.pos[2] + vz * speed * dt;
      if (this.grounded) {
        moveWithStep(this.pos, this.radius, this.height, wantX, wantZ);
      } else {
        this.pos[0] = wantX;
        this.pos[2] = wantZ;
        collide(this.pos, this.radius, this.height);
      }
      if (this.grounded) this.bob += dt * 9.5;
    }

    if (keys.Space && this.grounded && this.crouch < 0.5) {
      this.vy = JUMP_SPEED;
      this.grounded = false;
    }

    this.vy -= GRAVITY * dt;
    this.pos[1] += this.vy * dt;

    const ceil = ceilingHeight(this.pos, this.radius * HEAD_RADIUS, this.pos[1]);
    if (this.vy > 0 && this.pos[1] + this.height > ceil) {
      this.pos[1] = ceil - this.height;
      this.vy = 0;
    }

    const floor = groundHeight(this.pos, this.radius, this.pos[1] + 0.35);
    if (this.pos[1] <= floor) {
      this.pos[1] = floor;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
  }

  // 回傳這一次擊發的所有彈道方向（散彈槍一次多顆），沒開火則回傳 null
  tryShoot(down, pressed) {
    const s = this.spec;
    if (!(s.auto ? down : pressed)) return null;
    if (this.reloading > 0 || this.cooldown > 0) return null;
    if (this.ammo[this.weapon] <= 0) {
      this.reload();
      return null;
    }
    // 彈道要在套用後座力之前算：this.dir 會讀 viewPitch（含 recoil），
    // 若先加後座力，子彈就會往槍口跳上去之後的方向飛，而不是你瞄的方向。
    const d = this.dir;
    const base = this.scoped && s.scopedSpread !== undefined ? s.scopedSpread : s.spread;
    const spread = base * (this.bobAmount > 0.4 ? 2.2 : 1);
    const shots = [];
    for (let i = 0; i < (s.pellets || 1); i++) {
      shots.push(vnorm([
        d[0] + (Math.random() - 0.5) * spread * 2,
        d[1] + (Math.random() - 0.5) * spread * 2,
        d[2] + (Math.random() - 0.5) * spread * 2,
      ]));
    }

    this.ammo[this.weapon] -= 1;
    this.cooldown = s.delay;
    this.recoil += s.kick;
    this.punch = s.punch;
    this.shake = Math.min(0.06, this.shake + 0.02);
    if (s.scope && this.scoped) this.scoped = false;
    return shots;
  }

  damage(n) {
    this.hp = Math.max(0, this.hp - n);
    this.shake = Math.min(0.09, this.shake + 0.05);
    if (this.hp === 0) this.alive = false;
    return this.hp;
  }

  muzzleOffset() {
    return this.weapon === 'rifle' ? [0.17, -0.155, -0.96] : [0.17, -0.15, -0.66];
  }

  drawViewmodel(r, muzzleFlash) {
    const parts = this.weapon === 'pistol' ? PISTOL_PARTS : RIFLE_PARTS;
    const b = this.bobAmount;
    const swap = this.swap || 0;
    const k = VM_SCALE;
    const base = [
      0.168 + Math.sin(this.bob) * 0.009 * b + this.sway[0] * 0.04,
      -0.152 + Math.abs(Math.sin(this.bob)) * 0.009 * b + this.sway[1] * 0.04 - swap * 0.34
        - (this.reloading > 0 ? Math.sin(Math.min(1, this.reloading / this.spec.reloadTime) * Math.PI) * 0.12 : 0),
      -0.50 + this.punch * 1.1,
    ];

    const roll = -0.05 + this.sway[0] * 0.12;
    const pitch = -this.punch * 3.2 - swap * 0.8
      + (this.reloading > 0 ? Math.sin(Math.min(1, this.reloading / this.spec.reloadTime) * Math.PI) * 0.5 : 0);
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const x1 = [cr, sr, 0];
    const y1 = [-sr, cr, 0];
    const ca = Math.cos(pitch);
    const sa = Math.sin(pitch);
    const y2 = [y1[0] * ca, y1[1] * ca, sa];
    const z2 = [-y1[0] * sa, -y1[1] * sa, ca];

    for (const [o, s, color] of parts) {
      const c = vadd(vadd(base, vmul(x1, o[0] * k)), vadd(vmul(y2, o[1] * k), vmul(z2, o[2] * k)));
      r.basis(x1, y2, z2, c, [s[0] * k, s[1] * k, s[2] * k], color);
    }

    if (muzzleFlash > 0) {
      const tip = (this.weapon === 'pistol' ? -0.24 : -0.55) * k;
      const c = vadd(vadd(base, vmul(y2, 0.014 * k)), vmul(z2, tip));
      const f = (0.5 + Math.random() * 0.6) * k;
      r.basis(x1, y2, z2, c, [0.085 * f, 0.085 * f, 0.13 * f], [1, 0.94, 0.62], 1);
      r.basis(y2, z2, x1, c, [0.07 * f, 0.13 * f, 0.07 * f], [1, 0.82, 0.36], 1);
    }
  }
}
