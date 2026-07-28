import {
  Renderer, perspective, ortho, lookAt, mat4Mul, IDENTITY,
  vadd, vmul, vnorm, vcross,
} from './gl.js';
import { loadTextures } from './textures.js';
import { drawMap, drawMapDepth, currentMap } from './map.js';

const AIM_DOT = Math.cos(0.07);

export class GLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.r = new Renderer(canvas);
    this.tex = loadTextures(this.r.gl);
    this.setMapVisual();
  }

  setMapVisual() {
    const sun = vnorm(currentMap().env.sun);
    const lightView = lookAt(vmul(sun, 90), [0, 0, 0], [0, 1, 0]);
    this.r.setLight(mat4Mul(ortho(34, 34, 1, 190), lightView));
  }

  async init() {}

  drawScene(v, depthOnly) {
    if (depthOnly) drawMapDepth(this.r);
    else drawMap(this.r, this.tex);
    for (const e of v.enemies) {
      if (!e.alive && e.dying >= 0.55) continue;
      e.draw(this.r, depthOnly);
    }
  }

  drawEffects(v) {
    const r = this.r;
    r.texture(null);
    for (const d of v.decals) {
      const n = d.n;
      const ref = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const x = vnorm(vcross(ref, n));
      const y = vcross(n, x);
      const fade = Math.min(1, d.life / 3);
      const g = 1 - fade;
      r.basis(x, y, n, d.p, [0.11, 0.11, 0.008], [0.1 * fade + 0.5 * g, 0.09 * fade + 0.45 * g, 0.08 * fade + 0.4 * g]);
    }
    for (const p of v.particles) r.cube(p.p, [p.size, p.size, p.size], p.c, 0.5);
    for (const t of v.tracers) r.segment(t.a, t.b, 0.018, t.c);
  }

  // 名牌：手動把世界座標乘上 proj*view 投影到螢幕
  updatePlates(v, proj, view, eye) {
    if (!v.plates) return;
    if (v.title || !v.playing) {
      v.plates([]);
      return;
    }
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const fwd = v.player.dir;
    const list = [];
    for (const b of v.enemies) {
      if (!b.alive || !b.name) continue;
      const wp = [b.pos[0], b.pos[1] + 2.1, b.pos[2]];
      const dx = wp[0] - eye[0];
      const dy = wp[1] - eye[1];
      const dz = wp[2] - eye[2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 42) continue;
      const ally = b.team === v.player.team;
      if (!ally && (dx * fwd[0] + dy * fwd[1] + dz * fwd[2]) / dist < AIM_DOT) continue;

      const e = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) {
        e[i] = view[i] * wp[0] + view[4 + i] * wp[1] + view[8 + i] * wp[2] + view[12 + i];
      }
      const c = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) {
        c[i] = proj[i] * e[0] + proj[4 + i] * e[1] + proj[8 + i] * e[2] + proj[12 + i] * e[3];
      }
      if (c[3] <= 0) continue;
      list.push({
        name: b.name,
        x: Math.round((c[0] / c[3] * 0.5 + 0.5) * w),
        y: Math.round((-c[1] / c[3] * 0.5 + 0.5) * h),
        color: ally ? '#8fe39a' : '#ff8a76',
        opacity: (1 - Math.max(0, Math.min(1, (dist - 24) / 16)) * 0.75).toFixed(2),
      });
    }
    v.plates(list);
  }

  render(v) {
    const r = this.r;
    const player = v.player;
    r.resize();
    let eye;
    let fwd;
    if (v.title) {
      const t = v.clock * 0.042;
      eye = [Math.cos(t) * 20.5, 6.4 + Math.sin(t * 0.62) * 1.1, Math.sin(t) * 20.5];
      fwd = vnorm([-eye[0], 1.2 - eye[1], -eye[2]]);
    } else {
      eye = v.playing ? player.viewEye : player.eye;
      fwd = player.dir;
    }
    const aspect = this.canvas.width / this.canvas.height;

    r.shadowPass(() => this.drawScene(v, true));

    const right = vnorm(vcross(fwd, [0, 1, 0]));
    const up = v.title ? [0, 1, 0] : vnorm(vadd(vcross(right, fwd), vmul(right, Math.sin(player.roll))));
    const spec = player.spec;
    const zoom = player.scoped && spec.scopeFov ? spec.scopeFov : 1;
    const proj = perspective(v.title ? 0.77 : (Math.PI / 2.35) * zoom, aspect, 0.05, 260);
    const view = lookAt(eye, vadd(eye, fwd), up);

    this.updatePlates(v, proj, view, eye);
    const env = currentMap().env;
    r.mainPass(proj, view, eye, env);
    r.set('uTime', v.clock);

    r.set('uShadowOn', 0);
    r.texture(null);
    r.sky(eye);
    r.set('uShadowOn', 1);

    this.drawScene(v, false);
    r.set('uShadowOn', 0);
    this.drawEffects(v);

    if (player.scoped || v.title) return;

    r.clearDepth();
    r.setProjView(perspective(1.05, aspect, 0.01, 12), IDENTITY);
    r.set('uCam', [0, 0, 0]);
    r.set('uSun', vnorm([-0.35, 0.7, 0.62]));
    r.set('uFogNear', 900);
    r.set('uFogFar', 1000);
    r.texture(null);
    player.drawViewmodel(r, v.muzzle > 0 ? 1 : 0);
  }
}
