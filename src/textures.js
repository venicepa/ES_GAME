import { makeTexture } from './gl.js';

const SIZE = 256;

function surface() {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return { c, g: c.getContext('2d') };
}

function grain(g, amount, alpha) {
  const img = g.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  g.putImageData(img, 0, 0);
  if (!alpha) return;
  for (let i = 0; i < 260; i++) {
    const r = 6 + Math.random() * 26;
    g.fillStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.035})`;
    g.beginPath();
    g.arc(Math.random() * SIZE, Math.random() * SIZE, r, 0, 7);
    g.fill();
  }
}

function sandstone() {
  const { c, g } = surface();
  g.fillStyle = '#a88a58';
  g.fillRect(0, 0, SIZE, SIZE);
  const rows = 6;
  const h = SIZE / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (SIZE / 6);
    for (let i = 0; i < 3; i++) {
      const w = SIZE / 3;
      const x = ((i * w + offset) % SIZE) - 2;
      const shade = 176 + Math.random() * 30;
      g.fillStyle = `rgb(${shade | 0}, ${shade - 28 | 0}, ${shade - 82 | 0})`;
      g.fillRect(x + 2, r * h + 2, w - 4, h - 4);
      g.fillStyle = 'rgba(255,244,214,0.16)';
      g.fillRect(x + 2, r * h + 2, w - 4, 2);
      g.fillStyle = 'rgba(70,52,28,0.22)';
      g.fillRect(x + 2, r * h + h - 5, w - 4, 3);
    }
  }
  grain(g, 30, true);
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = `rgba(96,74,44,${0.03 + Math.random() * 0.06})`;
    g.lineWidth = 1;
    g.beginPath();
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 30);
    g.stroke();
  }
  return c;
}

function dirt() {
  const { c, g } = surface();
  g.fillStyle = '#b8a074';
  g.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 110; i++) {
    const l = 0.84 + Math.random() * 0.3;
    g.fillStyle = `rgba(${184 * l | 0},${160 * l | 0},${116 * l | 0},0.42)`;
    g.beginPath();
    g.ellipse(Math.random() * SIZE, Math.random() * SIZE, 14 + Math.random() * 44, 10 + Math.random() * 32, Math.random() * 3, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 380; i++) {
    const s = 1 + Math.random() * 2.4;
    const l = 0.62 + Math.random() * 0.3;
    g.fillStyle = `rgba(${168 * l | 0},${146 * l | 0},${104 * l | 0},0.6)`;
    g.fillRect(Math.random() * SIZE, Math.random() * SIZE, s, s);
  }
  grain(g, 18, false);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(120,100,66,${0.02 + Math.random() * 0.05})`;
    g.beginPath();
    g.arc(Math.random() * SIZE, Math.random() * SIZE, 8 + Math.random() * 30, 0, 7);
    g.fill();
  }
  return c;
}

function wood() {
  const { c, g } = surface();
  g.fillStyle = '#8a6132';
  g.fillRect(0, 0, SIZE, SIZE);
  const planks = 5;
  const h = SIZE / planks;
  for (let i = 0; i < planks; i++) {
    const shade = 128 + Math.random() * 40;
    g.fillStyle = `rgb(${shade | 0},${shade * 0.7 | 0},${shade * 0.4 | 0})`;
    g.fillRect(0, i * h + 2, SIZE, h - 4);
    for (let k = 0; k < 16; k++) {
      g.strokeStyle = `rgba(${70 + Math.random() * 40 | 0},${48 + Math.random() * 30 | 0},${24 + Math.random() * 20 | 0},0.35)`;
      g.lineWidth = 0.6 + Math.random();
      g.beginPath();
      const y = i * h + 4 + Math.random() * (h - 8);
      g.moveTo(0, y);
      g.bezierCurveTo(SIZE / 3, y + (Math.random() - 0.5) * 7, (SIZE / 3) * 2, y + (Math.random() - 0.5) * 7, SIZE, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(46,30,14,0.5)';
    g.fillRect(0, i * h + h - 3, SIZE, 3);
    g.fillStyle = 'rgba(255,222,170,0.1)';
    g.fillRect(0, i * h + 1, SIZE, 2);
  }
  g.strokeStyle = 'rgba(58,38,18,0.85)';
  g.lineWidth = 12;
  g.strokeRect(6, 6, SIZE - 12, SIZE - 12);
  g.strokeStyle = 'rgba(120,84,44,0.7)';
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(12, 12);
  g.lineTo(SIZE - 12, SIZE - 12);
  g.moveTo(SIZE - 12, 12);
  g.lineTo(12, SIZE - 12);
  g.stroke();
  for (const [x, y] of [[16, 16], [SIZE - 16, 16], [16, SIZE - 16], [SIZE - 16, SIZE - 16]]) {
    g.fillStyle = '#5a4020';
    g.beginPath();
    g.arc(x, y, 4, 0, 7);
    g.fill();
  }
  grain(g, 22, false);
  return c;
}

function metal() {
  const { c, g } = surface();
  g.fillStyle = '#8a949c';
  g.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 4; i++) {
    const x = i * (SIZE / 4);
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
    g.fillRect(x, 0, SIZE / 4, SIZE);
    g.fillStyle = 'rgba(48,56,62,0.5)';
    g.fillRect(x - 2, 0, 4, SIZE);
  }
  g.fillStyle = 'rgba(48,56,62,0.45)';
  g.fillRect(0, SIZE / 2 - 2, SIZE, 4);
  for (let i = 0; i < 26; i++) {
    const x = 8 + (i % 13) * (SIZE / 13);
    const y = i < 13 ? 10 : SIZE - 10;
    g.fillStyle = 'rgba(196,206,212,0.8)';
    g.beginPath();
    g.arc(x, y, 2.4, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 50; i++) {
    g.fillStyle = `rgba(${110 + Math.random() * 40 | 0},${62 + Math.random() * 30 | 0},${34 + Math.random() * 20 | 0},${0.05 + Math.random() * 0.2})`;
    g.fillRect(Math.random() * SIZE, Math.random() * SIZE, 2 + Math.random() * 8, 6 + Math.random() * 40);
  }
  grain(g, 24, true);
  return c;
}

export function cloudCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const grid = 8;
  const rnd = [];
  for (let i = 0; i < grid * grid; i++) rnd.push(Math.random());
  const at = (x, y) => rnd[((y % grid) + grid) % grid * grid + (((x % grid) + grid) % grid)];
  const smooth = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 0.5;
      let f = grid / size;
      for (let o = 0; o < 5; o++) {
        v += smooth(x * f, y * f) * amp;
        f *= 2;
        amp *= 0.5;
      }
      const a = Math.max(0, Math.min(1, (v - 0.54) / 0.24));
      const i = (y * size + x) * 4;
      const shade = 228 + a * 27;
      img.data[i] = shade;
      img.data[i + 1] = shade;
      img.data[i + 2] = Math.min(255, shade + 12);
      img.data[i + 3] = a * a * 225;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function iceWall() {
  const { c, g } = surface();
  g.fillStyle = '#9fc4d8';
  g.fillRect(0, 0, SIZE, SIZE);
  const rows = 5;
  const h = SIZE / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (SIZE / 5);
    for (let i = 0; i < 3; i++) {
      const w = SIZE / 3;
      const x = ((i * w + offset) % SIZE) - 2;
      const l = 0.9 + Math.random() * 0.22;
      g.fillStyle = `rgb(${168 * l | 0},${202 * l | 0},${222 * l | 0})`;
      g.fillRect(x + 2, r * h + 2, w - 4, h - 4);
      g.fillStyle = 'rgba(238,250,255,0.4)';
      g.fillRect(x + 2, r * h + 2, w - 4, 3);
      g.fillStyle = 'rgba(58,96,120,0.28)';
      g.fillRect(x + 2, r * h + h - 5, w - 4, 3);
    }
  }
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(236,250,255,${0.08 + Math.random() * 0.2})`;
    g.lineWidth = 0.7 + Math.random() * 1.4;
    g.beginPath();
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 70, y + (Math.random() - 0.5) * 50);
    g.stroke();
  }
  grain(g, 16, false);
  return c;
}

function iceFloor() {
  const { c, g } = surface();
  g.fillStyle = '#c3dcea';
  g.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 70; i++) {
    const l = 0.92 + Math.random() * 0.16;
    g.fillStyle = `rgba(${200 * l | 0},${224 * l | 0},${238 * l | 0},0.5)`;
    g.beginPath();
    g.ellipse(Math.random() * SIZE, Math.random() * SIZE, 18 + Math.random() * 50, 12 + Math.random() * 34, Math.random() * 3, 0, 7);
    g.fill();
  }
  // 冰面裂痕
  for (let i = 0; i < 22; i++) {
    g.strokeStyle = `rgba(126,168,192,${0.12 + Math.random() * 0.22})`;
    g.lineWidth = 0.6 + Math.random();
    g.beginPath();
    let x = Math.random() * SIZE;
    let y = Math.random() * SIZE;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  grain(g, 12, false);
  return c;
}

export function textureCanvases() {
  return {
    sandstone: sandstone(), dirt: dirt(), wood: wood(), metal: metal(),
    ice: iceWall(), snow: iceFloor(),
  };
}

export function normalFromHeight(src, strength = 2.2) {
  const w = src.width;
  const h = src.height;
  const sg = src.getContext('2d').getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const og = out.getContext('2d');
  const img = og.createImageData(w, h);
  const lum = (x, y) => {
    const i = (((y + h) % h) * w + ((x + w) % w)) * 4;
    return (sg[i] * 0.299 + sg[i + 1] * 0.587 + sg[i + 2] * 0.114) / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (lum(x - 1, y) - lum(x + 1, y)) * strength;
      const dy = (lum(x, y - 1) - lum(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  og.putImageData(img, 0, 0);
  return out;
}

export function loadTextures(gl) {
  const c = textureCanvases();
  return {
    sandstone: makeTexture(gl, c.sandstone),
    dirt: makeTexture(gl, c.dirt),
    wood: makeTexture(gl, c.wood),
    metal: makeTexture(gl, c.metal),
    ice: makeTexture(gl, c.ice),
    snow: makeTexture(gl, c.snow),
  };
}
