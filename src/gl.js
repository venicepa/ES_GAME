export const SHADOW_SIZE = 1024;

const VS_MAIN = `
attribute vec3 aPos;
attribute vec3 aNormal;
uniform mat4 uProj, uView, uModel, uLightVP;
varying vec3 vN, vW;
varying vec2 vUV;
varying vec4 vLS;
void main() {
  vec3 s = vec3(length(uModel[0].xyz), length(uModel[1].xyz), length(uModel[2].xyz));
  vec4 w = uModel * vec4(aPos, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(uModel[0].xyz / s.x, uModel[1].xyz / s.y, uModel[2].xyz / s.z) * aNormal);
  vec3 lp = aPos * s;
  vec3 an = abs(aNormal);
  vUV = an.y > 0.5 ? lp.xz : (an.x > 0.5 ? lp.zy : lp.xy);
  vLS = uLightVP * vec4(w.xyz + vN * 0.05, 1.0);
  gl_Position = uProj * uView * w;
}`;

const FS_MAIN = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex, uShadow;
uniform vec3 uColor, uCam, uSun, uSunColor, uSkyTop, uSkyHorizon, uFogColor;
uniform float uUseTex, uFlat, uFogNear, uFogFar, uShadowOn, uSky, uTexScale, uTime;
varying vec3 vN, vW;
varying vec2 vUV;
varying vec4 vLS;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise2(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

float unpackDepth(vec4 c) {
  return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
}

float shadowVis(float ndl) {
  vec3 p = vLS.xyz / vLS.w * 0.5 + 0.5;
  if (p.x < 0.005 || p.x > 0.995 || p.y < 0.005 || p.y > 0.995 || p.z > 1.0) return 1.0;
  float bias = max(0.0022 * (1.0 - ndl), 0.0014);
  float sum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y)) / ${SHADOW_SIZE}.0;
      sum += unpackDepth(texture2D(uShadow, p.xy + o)) + bias < p.z ? 0.0 : 1.0;
    }
  }
  return sum / 9.0;
}

void main() {
  if (uSky > 0.5) {
    vec3 d = normalize(vW - uCam);
    float h = clamp(d.y * 1.6 + 0.12, 0.0, 1.0);
    vec3 sky = mix(uSkyHorizon, uSkyTop, pow(h, 0.75));
    float sun = max(dot(d, uSun), 0.0);
    sky += uSunColor * (pow(sun, 220.0) * 1.6 + pow(sun, 9.0) * 0.3);
    if (d.y > 0.005) {
      vec2 cp = d.xz / d.y * 0.55 + vec2(uTime * 0.006, 0.0);
      float f = fbm(cp * 1.7);
      float cover = smoothstep(0.46, 0.78, f) * smoothstep(0.0, 0.28, d.y);
      float shade = smoothstep(0.42, 0.85, fbm(cp * 1.7 + vec2(0.25, 0.18)));
      vec3 cloud = mix(vec3(0.62, 0.66, 0.74), vec3(1.0, 0.99, 0.96), shade);
      sky = mix(sky, cloud, cover * 0.92);
    }
    gl_FragColor = vec4(sky, 1.0);
    return;
  }

  vec3 base = uColor;
  if (uUseTex > 0.5) base *= texture2D(uTex, vUV * uTexScale).rgb;

  vec3 n = normalize(vN);
  float ndl = max(dot(n, uSun), 0.0);
  float vis = uShadowOn > 0.5 ? shadowVis(ndl) : 1.0;
  vec3 skyAmb = uSkyTop * 0.18 + vec3(0.30, 0.285, 0.25);
  vec3 groundAmb = vec3(0.38, 0.335, 0.26);
  vec3 amb = mix(groundAmb, skyAmb, 0.5 + 0.5 * n.y);
  vec3 lit = base * (amb + uSunColor * ndl * vis);
  lit = vec3(1.0) - exp(-lit * 1.15);
  lit = mix(lit, base, uFlat);

  float fog = clamp((distance(vW, uCam) - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  gl_FragColor = vec4(mix(lit, uFogColor, fog * 0.92), 1.0);
}`;

const VS_DEPTH = `
attribute vec3 aPos;
uniform mat4 uLightVP, uModel;
varying vec4 vP;
void main() {
  vP = uLightVP * uModel * vec4(aPos, 1.0);
  gl_Position = vP;
}`;

const FS_DEPTH = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec4 vP;
void main() {
  float d = vP.z / vP.w * 0.5 + 0.5;
  vec4 c = fract(d * vec4(1.0, 255.0, 65025.0, 16581375.0));
  c -= c.gbaa * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
  gl_FragColor = c;
}`;

const UNIFORMS = [
  'uProj', 'uView', 'uModel', 'uLightVP', 'uTex', 'uShadow', 'uColor', 'uCam',
  'uSun', 'uSunColor', 'uSkyTop', 'uSkyHorizon', 'uFogColor',
  'uUseTex', 'uFlat', 'uFogNear', 'uFogFar', 'uShadowOn', 'uSky', 'uTexScale', 'uTime',
];

export const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vcross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
export const vnorm = (a) => {
  const l = vlen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const vlerp = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

export function ortho(halfW, halfH, near, far) {
  const nf = 1 / (near - far);
  return new Float32Array([
    1 / halfW, 0, 0, 0,
    0, 1 / halfH, 0, 0,
    0, 0, 2 * nf, 0,
    0, 0, (far + near) * nf, 1,
  ]);
}

export function lookAt(eye, center, up) {
  const z = vnorm(vsub(eye, center));
  const x = vnorm(vcross(up, z));
  const y = vcross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -vdot(x, eye), -vdot(y, eye), -vdot(z, eye), 1,
  ]);
}

export function mat4Mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export function rotateAxis(axis, ref, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return vadd(vmul(axis, c), vmul(ref, s));
}

function cubeGeometry() {
  const faces = [
    [[0, 0, 1], [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]]],
    [[0, 0, -1], [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]]],
    [[1, 0, 0], [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]]],
    [[-1, 0, 0], [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]]],
    [[0, 1, 0], [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]]],
    [[0, -1, 0], [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]]],
  ];
  const pos = [];
  const nor = [];
  const idx = [];
  faces.forEach(([n, quad], f) => {
    quad.forEach((v) => {
      pos.push(v[0], v[1], v[2]);
      nor.push(n[0], n[1], n[2]);
    });
    const b = f * 4;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

function buildProgram(gl, vs, fs) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + src);
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.bindAttribLocation(p, 1, 'aNormal');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  for (const name of UNIFORMS) u[name] = gl.getUniformLocation(p, name);
  return { p, u };
}

export function makeTexture(gl, source, repeat = true) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.generateMipmap(gl.TEXTURE_2D);
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (aniso) {
    const max = Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
    gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, max);
  }
  return t;
}

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
    this.canvas = canvas;
    this.main = buildProgram(gl, VS_MAIN, FS_MAIN);
    this.depth = buildProgram(gl, VS_DEPTH, FS_DEPTH);
    this.active = this.main;

    const g = cubeGeometry();
    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, g.pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, g.nor, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
    this.count = g.idx.length;

    this.shadowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW_SIZE, SHADOW_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.shadowFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTex, 0);
    const rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW_SIZE, SHADOW_SIZE);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    this.m = new Float32Array(16);
    this.lightVP = IDENTITY;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  use(prog) {
    this.active = prog;
    this.gl.useProgram(prog.p);
  }

  setLight(lightVP) {
    this.lightVP = lightVP;
  }

  shadowPass(draw) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.use(this.depth);
    gl.uniformMatrix4fv(this.active.u.uLightVP, false, this.lightVP);
    gl.cullFace(gl.FRONT);
    draw();
    gl.cullFace(gl.BACK);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  mainPass(proj, view, cam, env) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(env.fog[0], env.fog[1], env.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.use(this.main);
    const u = this.active.u;
    gl.uniformMatrix4fv(u.uProj, false, proj);
    gl.uniformMatrix4fv(u.uView, false, view);
    gl.uniformMatrix4fv(u.uLightVP, false, this.lightVP);
    gl.uniform3fv(u.uCam, cam);
    gl.uniform3fv(u.uSun, env.sun);
    gl.uniform3fv(u.uSunColor, env.sunColor);
    gl.uniform3fv(u.uSkyTop, env.skyTop);
    gl.uniform3fv(u.uSkyHorizon, env.skyHorizon);
    gl.uniform3fv(u.uFogColor, env.fog);
    gl.uniform1f(u.uFogNear, env.fogNear);
    gl.uniform1f(u.uFogFar, env.fogFar);
    gl.uniform1f(u.uShadowOn, 1);
    gl.uniform1f(u.uSky, 0);
    gl.uniform1f(u.uTexScale, 1);
    gl.uniform1i(u.uTex, 0);
    gl.uniform1i(u.uShadow, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.activeTexture(gl.TEXTURE0);
  }

  setProjView(proj, view) {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.active.u.uProj, false, proj);
    gl.uniformMatrix4fv(this.active.u.uView, false, view);
  }

  set(name, value) {
    const loc = this.active.u[name];
    if (!loc) return;
    if (Array.isArray(value) || value instanceof Float32Array) this.gl.uniform3fv(loc, value);
    else this.gl.uniform1f(loc, value);
  }

  texture(tex, scale = 1) {
    const gl = this.gl;
    if (!tex) {
      this.set('uUseTex', 0);
      return;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    this.set('uUseTex', 1);
    this.set('uTexScale', scale);
  }

  clearDepth() {
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
  }

  sky(cam) {
    const gl = this.gl;
    this.set('uSky', 1);
    gl.depthMask(false);
    gl.cullFace(gl.FRONT);
    this.cube(cam, [200, 200, 200], [1, 1, 1]);
    gl.cullFace(gl.BACK);
    gl.depthMask(true);
    this.set('uSky', 0);
  }

  cube(p, s, color, flat = 0) {
    const m = this.m;
    m.fill(0);
    m[0] = s[0];
    m[5] = s[1];
    m[10] = s[2];
    m[12] = p[0];
    m[13] = p[1];
    m[14] = p[2];
    m[15] = 1;
    this.draw(color, flat);
  }

  basis(x, y, z, c, s, color, flat = 0) {
    const m = this.m;
    m[0] = x[0] * s[0]; m[1] = x[1] * s[0]; m[2] = x[2] * s[0]; m[3] = 0;
    m[4] = y[0] * s[1]; m[5] = y[1] * s[1]; m[6] = y[2] * s[1]; m[7] = 0;
    m[8] = z[0] * s[2]; m[9] = z[1] * s[2]; m[10] = z[2] * s[2]; m[11] = 0;
    m[12] = c[0]; m[13] = c[1]; m[14] = c[2]; m[15] = 1;
    this.draw(color, flat);
  }

  segment(a, b, thickness, color) {
    const d = vsub(b, a);
    const L = vlen(d) || 1e-5;
    const f = vmul(d, 1 / L);
    const ref = Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const x = vnorm(vcross(ref, f));
    const y = vcross(f, x);
    this.basis(x, y, f, vmul(vadd(a, b), 0.5), [thickness, thickness, L], color, 1);
  }

  draw(color, flat) {
    const gl = this.gl;
    const u = this.active.u;
    gl.uniformMatrix4fv(u.uModel, false, this.m);
    if (u.uColor) {
      gl.uniform3fv(u.uColor, color);
      gl.uniform1f(u.uFlat, flat);
    }
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  }
}
