import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { textureCanvases, normalFromHeight, cloudCanvas } from './textures.js';
import { walls, GROUND, currentMap } from './map.js';

const SUN = new THREE.Vector3(0.42, 0.76, 0.34).normalize();

export const ASSETS = {
  weapons: {
    rifle: {
      url: 'assets/rifle.glb', length: 0.86,
      pos: [0.27, -0.15, -0.68], muzzle: [0.27, -0.088, -1.10],
      axes: { x: [0, 0, -1], y: [0, 1, 0], z: [1, 0, 0] },
      grip: {
        right: { at: [0.305, -0.180, -0.505], aim: [-0.20, 0.58, -0.79], up: [0, 0, -1] },
        left: { at: [0.262, -0.158, -0.808], aim: [0.50, 0.66, -0.56], up: [0, 0, -1] },
        mag: [0.27, -0.295, -0.680],
      },
      charge: [0.30, -0.075, -0.50],
      magSize: [0.05, 0.20, 0.07],
    },
    sniper: {
      url: 'assets/sniper.glb', length: 1.15,
      pos: [0.27, -0.15, -1.02], muzzle: [0.27, -0.105, -1.60],
      axes: { x: [0, 0, -1], y: [0, 1, 0], z: [1, 0, 0] },
      grip: {
        right: { at: [0.305, -0.190, -0.540], aim: [-0.20, 0.58, -0.79], up: [0, 0, -1] },
        left: { at: [0.262, -0.185, -1.175], aim: [0.50, 0.66, -0.56], up: [0, 0, -1] },
        mag: [0.27, -0.220, -0.820],
      },
      charge: [0.315, -0.080, -0.70],
      magSize: [0.05, 0.13, 0.06],
    },
    shotgun: {
      url: 'assets/shotgun.glb', length: 1.00,
      pos: [0.27, -0.15, -0.74], muzzle: [0.27, -0.112, -1.25],
      axes: { x: [0, 0, -1], y: [0, 1, 0], z: [1, 0, 0] },
      grip: {
        right: { at: [0.303, -0.182, -0.545], aim: [-0.20, 0.58, -0.79], up: [0, 0, -1] },
        left: { at: [0.262, -0.158, -0.825], aim: [0.50, 0.66, -0.56], up: [0, 0, -1] },
        mag: [0.27, -0.180, -0.640],
      },
      charge: [0.315, -0.095, -0.62],
      magSize: [0.045, 0.10, 0.05],
    },
    pistol: {
      url: 'assets/pistol.glb', length: 0.30,
      pos: [0.26, -0.17, -0.60], muzzle: [0.26, -0.104, -0.75],
      axes: { x: [0, 0, -1], y: [0, 1, 0], z: [1, 0, 0] },
      grip: {
        right: { at: [0.292, -0.205, -0.508], aim: [-0.18, 0.62, -0.76], up: [0, 0, -1] },
        left: { at: [0.228, -0.235, -0.545], aim: [0.52, 0.72, -0.46], up: [0, 0, -1] },
        mag: [0.26, -0.262, -0.520],
      },
      charge: [0.29, -0.135, -0.52],
      magSize: [0.035, 0.13, 0.045],
    },
  },
  enemy: {
    url: 'assets/enemy.glb', height: 1.85, rot: Math.PI,
    gunBone: /RightHand$/, gunPos: [0, 0.08, 0.01], gunRot: [-0.15, 0.05, 0.15],
    clips: {
      idle: 'assets/anim-idle.fbx',
      walk: 'assets/anim-walk.fbx',
      fire: 'assets/anim-fire.fbx',
      death: 'assets/anim-death.fbx',
    },
  },
};

const CHAR = {
  pants: 0x6d6450, vest: 0x5e5342, rig: 0x3e382e, sleeve: 0x8a7550,
  mask: 0x4b453c, skin: 0xa8825a, band: 0x8c1c18, gun: 0x2a2c2e,
};

const VM = {
  metal: 0x3b3a37, dark: 0x272624, poly: 0x4a4844, skin: 0xb08757, sleeve: 0x8d8259,
};

const RIFLE_PARTS = [
  [[0, 0, 0], [0.052, 0.072, 0.30], VM.metal, 0.45],
  [[0, 0.048, 0.02], [0.022, 0.036, 0.16], VM.dark, 0.4],
  [[0, 0.062, -0.06], [0.016, 0.012, 0.24], VM.dark, 0.4],
  [[0, 0.004, -0.25], [0.05, 0.062, 0.22], VM.poly, 0.7],
  [[0, 0.014, -0.44], [0.019, 0.019, 0.2], VM.dark, 0.35],
  [[0, 0.056, -0.36], [0.015, 0.048, 0.028], VM.dark, 0.4],
  [[0, -0.10, -0.015], [0.036, 0.155, 0.072], VM.dark, 0.6],
  [[0, -0.085, 0.095], [0.04, 0.125, 0.05], VM.poly, 0.8],
  [[0, -0.004, 0.245], [0.046, 0.068, 0.2], VM.poly, 0.8],
  [[0.004, -0.125, 0.075], [0.072, 0.085, 0.088], VM.skin, 0.9],
  [[-0.006, -0.055, -0.27], [0.076, 0.088, 0.1], VM.skin, 0.9],
  [[0.03, -0.215, 0.235], [0.096, 0.1, 0.3], VM.sleeve, 0.95],
];

const PISTOL_PARTS = [
  [[0, 0, 0], [0.038, 0.058, 0.2], VM.metal, 0.4],
  [[0, 0.032, -0.02], [0.03, 0.03, 0.19], VM.dark, 0.35],
  [[0, 0.012, -0.14], [0.022, 0.024, 0.08], VM.dark, 0.35],
  [[0, -0.09, 0.05], [0.036, 0.12, 0.05], VM.poly, 0.8],
  [[0.004, -0.115, 0.045], [0.07, 0.085, 0.085], VM.skin, 0.9],
  [[-0.02, -0.1, 0.005], [0.07, 0.08, 0.08], VM.skin, 0.9],
  [[0.03, -0.21, 0.2], [0.094, 0.098, 0.3], VM.sleeve, 0.95],
];

const boneKey = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^mixamorig/, '');

function retargetTrackNames(clip, boneNames) {
  const lookup = new Map();
  for (const n of boneNames) lookup.set(boneKey(n), n);
  clip.tracks = clip.tracks.filter((track) => {
    const dot = track.name.lastIndexOf('.');
    const node = track.name.slice(0, dot);
    const prop = track.name.slice(dot);
    const target = lookup.get(boneKey(node));
    if (!target) return false;
    track.name = target + prop;
    return true;
  });
  return clip;
}

const BASE_FOV = 78;
const PLATE_HEIGHT = 2.1;
const PLATE_RANGE = 42;
const PLATE_AIM_DOT = Math.cos(0.07);
const TITLE_ORBIT_RADIUS = 20.5;
const TITLE_ORBIT_SPEED = 0.042;
const MAX_PIXEL_RATIO = 1.5;
const MIN_PIXEL_RATIO = 0.75;
const SHADOW_SIZE = 1024;
const ARM_LENGTH = 0.46;
const SLEEVE_LENGTH = 1.1;
const SLEEVE_COLOR = 0x8d7d58;
const CURL = 1.0;

const smoothstep = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

function sampleTrack(track, p) {
  if (p <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    if (p > track[i][0]) continue;
    const [p0, a] = track[i - 1];
    const [p1, b] = track[i];
    const t = smoothstep((p - p0) / (p1 - p0 || 1));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  return track[track.length - 1][1];
}

function roundedBox(w, h, d, color, roughness, metalness = 0.15) {
  const r = Math.min(w, h, d) * 0.16;
  const geo = new RoundedBoxGeometry(w, h, d, 2, r);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return new THREE.Mesh(geo, mat);
}

function boxWithUV(w, h, d, uvScale) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] * uvScale, uv.getY(k) * dims[f][1] * uvScale);
    }
  }
  return g;
}

export class ThreeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    // Retina 全螢幕在 dpr=2 時是 ~590 萬像素/幀，這裡的成本幾乎都在片段著色，
    // 所以上限壓到 1.5，並在偵測到掉幀時再往下調（見 adaptResolution）。
    const dpr = devicePixelRatio || 1;
    this.maxPixelRatio = Math.min(dpr, MAX_PIXEL_RATIO);
    this.pixelRatio = this.maxPixelRatio;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.maxPixelRatio < 1.5,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(this.pixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.52;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xd3cab4, 42, 150);

    this.camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.07, 2600);
    this.camera.rotation.order = 'YXZ';

    this.viewScene = new THREE.Scene();
    this.viewCamera = new THREE.PerspectiveCamera(52, 1, 0.01, 12);

    this.enemyViews = new Map();
    this.mixers = [];
    this.frameMs = 16;
    this.adaptHold = 0;
    this.lastFrameTime = 0;
    this.assets = { rifle: null, pistol: null, enemy: null, enemyClips: null };

    this.mapMeshes = [];
    this.buildSky();
    this.buildLights();
    this.buildTextures();
    this.buildMap();
    this.applyEnv(currentMap().env);
    this.buildEffects();
    this.buildViewmodel();
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  buildSky() {
    const sky = new Sky();
    sky.scale.setScalar(6000);
    const u = sky.material.uniforms;
    u.turbidity.value = 2.4;
    u.rayleigh.value = 3.4;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(SUN);

    this.sky = sky;
    this.scene.environmentIntensity = 0.42;
    this.viewScene.environmentIntensity = 0.14;
    this.scene.add(sky);

    const cloudTex = new THREE.CanvasTexture(cloudCanvas(512));
    cloudTex.colorSpace = THREE.SRGBColorSpace;
    cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping;
    cloudTex.repeat.set(1.8, 1.8);
    const clouds = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshBasicMaterial({
        map: cloudTex, transparent: true, opacity: 0.85,
        depthWrite: false, fog: false, side: THREE.DoubleSide,
      })
    );
    clouds.rotation.x = Math.PI / 2;
    clouds.position.y = 340;
    clouds.renderOrder = -1;
    this.clouds = clouds;
    this.scene.add(clouds);
  }

  buildLights() {
    const sun = new THREE.DirectionalLight(0xfff0cf, 2.9);
    sun.position.copy(SUN).multiplyScalar(70);
    sun.castShadow = true;
    sun.shadow.mapSize.set(SHADOW_SIZE, SHADOW_SIZE);
    const c = sun.shadow.camera;
    c.left = -30; c.right = 30; c.top = 30; c.bottom = -30;
    c.near = 1; c.far = 160;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;

    this.hemi = new THREE.HemisphereLight(0xbcd4ff, 0xb09a70, 0.22);
    this.scene.add(this.hemi);

    const vmKey = new THREE.DirectionalLight(0xffffff, 1.9);
    vmKey.position.set(-0.4, 0.8, 0.6);
    this.viewScene.add(vmKey);
    this.viewScene.add(new THREE.AmbientLight(0xffffff, 0.35));
  }

  buildTextures() {
    const canvases = textureCanvases();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const makeMat = (canvas, roughness, normalStrength) => {
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = maxAniso;
      const normalMap = new THREE.CanvasTexture(normalFromHeight(canvas, normalStrength));
      normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
      normalMap.anisotropy = maxAniso;
      return new THREE.MeshStandardMaterial({
        map, normalMap, roughness, metalness: 0.02,
        normalScale: new THREE.Vector2(0.8, 0.8),
      });
    };

    this.mats = {
      sandstone: makeMat(canvases.sandstone, 0.94, 2.6),
      dirt: makeMat(canvases.dirt, 0.98, 1.4),
      wood: makeMat(canvases.wood, 0.86, 2.2),
      metal: makeMat(canvases.metal, 0.52, 2.0),
      ice: makeMat(canvases.ice, 0.42, 2.0),
      snow: makeMat(canvases.snow, 0.55, 1.2),
    };
    this.mats.metal.metalness = 0.35;
    this.mats.metal.roughness = 0.62;
    this.mats.ice.metalness = 0.05;
    this.mats.snow.metalness = 0.05;
    for (const m of Object.values(this.mats)) m.vertexColors = true;
  }

  buildMap() {
    for (const m of this.mapMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
    }
    this.mapMeshes = [];

    const mats = this.mats;
    const groups = {};
    const push = (w) => {
      const g = boxWithUV(w.s[0], w.s[1], w.s[2], w.uv);
      g.translate(w.p[0], w.p[1], w.p[2]);
      if (w.tint && (w.tint[0] !== 1 || w.tint[1] !== 1 || w.tint[2] !== 1)) {
        const colors = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < g.attributes.position.count; i++) {
          colors[i * 3] = w.tint[0];
          colors[i * 3 + 1] = w.tint[1];
          colors[i * 3 + 2] = w.tint[2];
        }
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      } else {
        const colors = new Float32Array(g.attributes.position.count * 3).fill(1);
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      (groups[w.tex] = groups[w.tex] || []).push(g);
    };

    push(GROUND);
    walls.forEach(push);

    for (const key of Object.keys(groups)) {
      const merged = BufferGeometryUtils.mergeGeometries(groups[key]);
      const mesh = new THREE.Mesh(merged, mats[key]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.mapMeshes.push(mesh);
    }
  }

  // 依地圖套用光線與天空。換圖時重新烘一次環境貼圖。
  applyEnv(env) {
    SUN.set(env.sun[0], env.sun[1], env.sun[2]).normalize();
    this.scene.fog.color.setHex(env.fogColor);
    this.scene.fog.near = env.fogRange[0];
    this.scene.fog.far = env.fogRange[1];
    this.renderer.toneMappingExposure = env.exposure;

    this.sun.color.setRGB(env.sunColor[0] / 1.3, env.sunColor[1] / 1.3, env.sunColor[2] / 1.3);
    this.sun.position.copy(SUN).multiplyScalar(70);
    this.hemi.color.setHex(env.hemiSky);
    this.hemi.groundColor.setHex(env.hemiGround);

    const u = this.sky.material.uniforms;
    u.turbidity.value = env.turbidity;
    u.rayleigh.value = env.rayleigh;
    u.sunPosition.value.copy(SUN);

    if (this.envRT) this.envRT.dispose();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const proxy = this.sky.clone();
    envScene.add(proxy);
    this.envRT = pmrem.fromScene(envScene);
    this.scene.environment = this.envRT.texture;
    this.viewScene.environment = this.envRT.texture;
    pmrem.dispose();
  }

  setMapVisual() {
    this.buildMap();
    this.applyEnv(currentMap().env);
  }

  buildEffects() {
    const tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 5);
    tracerGeo.rotateX(Math.PI / 2);
    this.tracerPool = [];
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({
        color: 0xfff0b0, transparent: true, opacity: 0.9, depthWrite: false,
      }));
      m.visible = false;
      m.frustumCulled = false;
      this.scene.add(m);
      this.tracerPool.push(m);
    }

    this.particles = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ vertexColors: true }),
      120
    );
    this.particles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(120 * 3), 3);
    this.particles.frustumCulled = false;
    this.particles.count = 0;
    this.scene.add(this.particles);

    this.decals = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.13, 0.13),
      new THREE.MeshBasicMaterial({
        color: 0x1a1410, transparent: true, opacity: 0.75, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4,
      }),
      48
    );
    this.decals.frustumCulled = false;
    this.decals.count = 0;
    this.scene.add(this.decals);

    this.tmpObj = new THREE.Object3D();
    this.tmpColor = new THREE.Color();
  }

  buildViewmodel() {
    this.vmRoot = new THREE.Group();
    this.viewScene.add(this.vmRoot);
    this.vmFallback = {
      rifle: this.buildGun(RIFLE_PARTS),
      pistol: this.buildGun(PISTOL_PARTS),
      sniper: this.buildGun(RIFLE_PARTS),
      shotgun: this.buildGun(RIFLE_PARTS),
    };
    for (const g of Object.values(this.vmFallback)) this.vmRoot.add(g);
    this.vmLoaded = {};
    for (const k of Object.keys(ASSETS.weapons)) this.vmLoaded[k] = null;

    this.muzzleGroup = new THREE.Group();
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.95 })
    );
    flash.scale.set(1, 1, 1.8);
    this.muzzleGroup.add(flash);
    this.muzzleGroup.visible = false;
    this.vmRoot.add(this.muzzleGroup);
    this.muzzleLight = new THREE.PointLight(0xffd27a, 0, 6, 2);
    this.viewScene.add(this.muzzleLight);

    this.hands = { left: new THREE.Group(), right: new THREE.Group() };
    for (const side of ['left', 'right']) {
      const mesh = this.buildHand();
      this.hands[side].add(mesh);
      this.hands[side].userData.mesh = mesh;
    }
    this.vmRoot.add(this.hands.left, this.hands.right);

    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // 烘出來的手是「手指朝 +Z、拇指朝 +Y」的標準姿勢。
    // 右手握把：直接用標準姿勢再往下壓。
    // 左手護木：手指橫過槍身（+X）、掌心朝上貼住護木、拇指沿槍管朝前。
    this.handPose = {
      right: new THREE.Quaternion(),
      left: new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0))
      ),
    };

    this.spareMag = roundedBox(0.05, 0.2, 0.07, 0x2b2d30, 0.55, 0.2);
    this.spareMag.visible = false;
    this.spareMag.frustumCulled = false;
    this.hands.left.add(this.spareMag);
  }

  // 從士兵模型的蒙皮網格切出手＋前臂，烘成靜態網格當第一人稱的手。
  // 骨架是 Mixamo 標準，每根手指都有骨頭，所以烘之前先把手指彎起來成握姿。
  bakeHands(scene) {
    let mesh = null;
    scene.traverse((o) => { if (!mesh && o.isSkinnedMesh && o.geometry.attributes.skinIndex) mesh = o; });
    if (!mesh || typeof mesh.applyBoneTransform !== 'function') return null;

    const bones = mesh.skeleton.bones;
    const byName = new Map(bones.map((b) => [b.name, b]));
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const si = geo.attributes.skinIndex;
    const sw = geo.attributes.skinWeight;
    const index = geo.index;

    const dominant = new Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      let bi = -1;
      let bw = -1;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w > bw) { bw = w; bi = si.getComponent(i, k); }
      }
      dominant[i] = bones[bi] ? bones[bi].name : '';
    }

    const refresh = () => {
      scene.updateMatrixWorld(true);
      mesh.skeleton.update();
    };

    const v = new THREE.Vector3();
    const bakeInto = (i, toHand) => {
      v.fromBufferAttribute(pos, i);
      mesh.applyBoneTransform(i, v);
      return v.applyMatrix4(toHand);
    };

    const out = {};
    for (const side of ['Left', 'Right']) {
      const keepRe = new RegExp(`${side}(Hand|ForeArm)`);
      const handBone = byName.get(`mixamorig:${side}Hand`) || byName.get(`mixamorig${side}Hand`);
      if (!handBone) continue;

      const keep = new Uint8Array(pos.count);
      for (let i = 0; i < pos.count; i++) if (keepRe.test(dominant[i])) keep[i] = 1;

      refresh();
      const toHand = new THREE.Matrix4()
        .copy(handBone.matrixWorld).invert().multiply(mesh.matrixWorld);

      const centroid = (re) => {
        const acc = new THREE.Vector3();
        let n = 0;
        for (let i = 0; i < pos.count; i++) {
          if (!keep[i] || !re.test(dominant[i])) continue;
          acc.add(bakeInto(i, toHand));
          n++;
        }
        return n ? acc.divideScalar(n) : null;
      };

      const finger = centroid(new RegExp(`${side}Hand(Index|Middle|Ring)[23]$`));
      const thumb = centroid(new RegExp(`${side}HandThumb[23]$`));
      if (!finger || !thumb) continue;

      // 用手指與拇指方向推出手的座標系，把幾何轉成「手指朝 +Z、拇指朝 +Y」的標準姿勢，
      // 擺放時只要調角度，不必猜原始骨骼朝向。
      const fwd = finger.clone().normalize();
      const sideAxis = new THREE.Vector3().crossVectors(thumb, fwd).normalize();
      const up = new THREE.Vector3().crossVectors(fwd, sideAxis).normalize();
      if (up.dot(thumb) < 0) { sideAxis.negate(); up.negate(); }
      const basis = new THREE.Matrix4().makeBasis(sideAxis, up, fwd).transpose();

      // 手指要繞「手掌側向軸」彎曲。該軸在每根骨頭的 local 空間方向都不同，
      // 所以把世界空間的側向軸換算進各骨頭再轉，比硬猜 x/y/z 可靠。
      const sideWorld = sideAxis.clone()
        .applyMatrix4(new THREE.Matrix4().extractRotation(handBone.matrixWorld)).normalize();
      const axisLocal = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const curl = (re, angle) => {
        for (const b of bones) {
          if (!re.test(b.name)) continue;
          b.getWorldQuaternion(q).invert();
          axisLocal.copy(sideWorld).applyQuaternion(q).normalize();
          b.rotateOnAxis(axisLocal, angle);
        }
      };
      curl(new RegExp(`${side}Hand(Index|Middle|Ring|Pinky)[123]$`), CURL * 0.62);
      curl(new RegExp(`${side}HandThumb[12]$`), CURL * -0.3);
      refresh();

      const tris = [];
      for (let t = 0; t < index.count; t += 3) {
        const a = index.getX(t);
        const b = index.getX(t + 1);
        const c = index.getX(t + 2);
        if (keep[a] && keep[b] && keep[c]) tris.push(a, b, c);
      }
      if (!tris.length) continue;

      const remap = new Map();
      const P = [];
      const N = [];
      const U = [];
      const idx = [];
      const nrm = new THREE.Vector3();
      const normalMat = new THREE.Matrix3().setFromMatrix4(basis);
      for (const i of tris) {
        let ni = remap.get(i);
        if (ni === undefined) {
          ni = P.length / 3;
          remap.set(i, ni);
          const pt = bakeInto(i, toHand).clone().applyMatrix4(basis);
          P.push(pt.x, pt.y, pt.z);
          nrm.fromBufferAttribute(geo.attributes.normal, i).applyMatrix3(normalMat).normalize();
          N.push(nrm.x, nrm.y, nrm.z);
          if (uv) U.push(uv.getX(i), uv.getY(i));
        }
        idx.push(ni);
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      if (U.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      g.setIndex(idx);

      // 手骨的世界矩陣帶著模型自己的單位縮放，所以量 bounding box 正規化成真人尺寸。
      g.computeBoundingBox();
      const bb = g.boundingBox;
      const span = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) || 1;

      const mat = mesh.material.clone();
      mat.side = THREE.DoubleSide;
      mat.envMapIntensity = 0.4;
      const m = new THREE.Mesh(g, mat);
      m.frustumCulled = false;
      const scale = ARM_LENGTH / span;
      m.scale.setScalar(scale);

      // 前臂的切面會露在畫面裡（尤其握點離攝影機較遠的長槍），
      // 所以在切口接一截袖子。前臂本身是斜的，沿 -Z 直接延伸會有折角，
      // 因此先從幾何求出前臂的真實軸向再延伸。
      const zSpan = bb.max.z - bb.min.z;
      const bandCentroid = (lo, hi) => {
        const c = new THREE.Vector3();
        let n = 0;
        for (let i = 0; i < P.length; i += 3) {
          const t = (P[i + 2] - bb.min.z) / (zSpan || 1);
          if (t < lo || t > hi) continue;
          c.x += P[i]; c.y += P[i + 1]; c.z += P[i + 2];
          n++;
        }
        return n ? c.divideScalar(n) : null;
      };
      const tip = bandCentroid(0, 0.05);
      const inner2 = bandCentroid(0.10, 0.22);
      if (tip && inner2) {
        const axis = tip.clone().sub(inner2).normalize();
        // 切面在垂直於軸向的平面上的尺寸
        let r0 = 0;
        let r1 = 0;
        const rel = new THREE.Vector3();
        const perpX = new THREE.Vector3(1, 0, 0).cross(axis).normalize();
        const perpY = new THREE.Vector3().crossVectors(axis, perpX).normalize();
        for (let i = 0; i < P.length; i += 3) {
          const t = (P[i + 2] - bb.min.z) / (zSpan || 1);
          if (t > 0.08) continue;
          rel.set(P[i] - tip.x, P[i + 1] - tip.y, P[i + 2] - tip.z);
          r0 = Math.max(r0, Math.abs(rel.dot(perpX)));
          r1 = Math.max(r1, Math.abs(rel.dot(perpY)));
        }
        const len = span * (SLEEVE_LENGTH / ARM_LENGTH);
        const sleeve = new THREE.Mesh(
          new THREE.BoxGeometry(r0 * 2.1, r1 * 2.1, len),
          new THREE.MeshStandardMaterial({ color: SLEEVE_COLOR, roughness: 0.95, metalness: 0 })
        );
        sleeve.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().lookAt(axis.clone().negate(), new THREE.Vector3(), perpY)
        );
        // 往內埋一小段，接縫才不會露出來
        sleeve.position.copy(tip).addScaledVector(axis, len / 2 - len * 0.06);
        sleeve.frustumCulled = false;
        m.add(sleeve);
      }

      // 手掌質心（掌骨主導的頂點）——定位時用它對準握把，而不是用手腕。
      const palmRe = new RegExp(`${side}Hand$`);
      const palm = new THREE.Vector3();
      let pn = 0;
      for (let i = 0; i < pos.count; i++) {
        if (!keep[i] || !palmRe.test(dominant[i])) continue;
        palm.add(bakeInto(i, toHand).clone().applyMatrix4(basis));
        pn++;
      }
      if (pn) palm.divideScalar(pn).multiplyScalar(scale);
      m.userData.palm = palm;
      out[side.toLowerCase()] = m;
    }
    return out.left && out.right ? out : null;
  }

  buildHand() {
    const g = new THREE.Group();
    const palm = roundedBox(0.062, 0.058, 0.092, VM.skin, 0.85, 0);
    g.add(palm);
    const thumb = roundedBox(0.024, 0.026, 0.055, VM.skin, 0.85, 0);
    thumb.position.set(-0.028, 0.022, -0.018);
    g.add(thumb);
    const cuff = roundedBox(0.074, 0.070, 0.055, 0x6f6a4d, 0.95, 0);
    cuff.position.set(0, -0.003, 0.072);
    g.add(cuff);
    const arm = roundedBox(0.068, 0.066, 0.13, VM.sleeve, 0.95, 0);
    arm.position.set(0, -0.005, 0.16);
    g.add(arm);
    g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    return g;
  }

  buildWorldGun() {
    if (this.assets.rifle) {
      const g = this.assets.rifle.clone(true);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      return g;
    }
    const g = new THREE.Group();
    for (const [o, s, color, rough] of RIFLE_PARTS) {
      if (color === VM.skin || color === VM.sleeve) continue;
      const m = roundedBox(s[0], s[1], s[2], color, rough, 0.1);
      m.position.set(o[0], o[1], o[2]);
      m.castShadow = true;
      g.add(m);
    }
    return g;
  }

  attachGun(model) {
    const cfg = ASSETS.enemy;
    let bone = null;
    model.traverse((o) => { if (!bone && o.isBone && cfg.gunBone.test(o.name)) bone = o; });
    if (!bone) return null;
    const holder = new THREE.Group();
    holder.add(this.buildWorldGun());
    bone.add(holder);
    model.updateMatrixWorld(true);
    const ws = new THREE.Vector3();
    bone.getWorldScale(ws);
    const k = 1 / (ws.x || 1);
    holder.scale.setScalar(k);
    holder.position.set(cfg.gunPos[0] * k, cfg.gunPos[1] * k, cfg.gunPos[2] * k);
    holder.rotation.set(...cfg.gunRot);
    return holder;
  }

  buildGun(parts) {
    const g = new THREE.Group();
    for (const [o, s, color, rough] of parts) {
      const m = roundedBox(s[0], s[1], s[2], color, rough, color === VM.skin || color === VM.sleeve ? 0 : 0.06);
      m.position.set(o[0], o[1], o[2]);
      g.add(m);
    }
    return g;
  }

  buildCharacter() {
    const root = new THREE.Group();
    const part = (w, h, d, color, x, y, z, rough = 0.8) => {
      const m = roundedBox(w, h, d, color, rough, 0);
      m.position.set(x, y, z);
      m.castShadow = true;
      root.add(m);
      return m;
    };

    part(0.44, 0.3, 0.3, CHAR.pants, 0, 0.92, 0);
    part(0.54, 0.52, 0.34, CHAR.vest, 0, 1.32, 0, 0.75);
    part(0.42, 0.36, 0.06, CHAR.rig, 0, 1.3, 0.18, 0.7);
    part(0.27, 0.29, 0.27, CHAR.mask, 0, 1.7, 0, 0.85);
    part(0.17, 0.09, 0.04, CHAR.skin, 0, 1.71, 0.14, 0.7);
    part(0.29, 0.09, 0.29, CHAR.rig, 0, 1.86, -0.01, 0.7);

    const joint = (x, y, z) => {
      const p = new THREE.Group();
      p.position.set(x, y, z);
      root.add(p);
      return p;
    };
    const limb = (pivot, w, h, d, color) => {
      const m = roundedBox(w, h, d, color, 0.85, 0);
      m.position.y = -h / 2;
      m.castShadow = true;
      pivot.add(m);
      return m;
    };

    const legL = joint(-0.13, 0.95, 0);
    const legR = joint(0.13, 0.95, 0);
    limb(legL, 0.19, 0.82, 0.22, CHAR.pants);
    limb(legR, 0.19, 0.82, 0.22, CHAR.pants);

    const armL = joint(-0.33, 1.5, 0);
    const armR = joint(0.33, 1.5, 0);
    limb(armL, 0.15, 0.58, 0.17, CHAR.sleeve);
    limb(armR, 0.15, 0.58, 0.17, CHAR.sleeve);
    part(0.16, 0.1, 0.1, CHAR.band, 0.35, 1.52, 0.04, 0.9);

    const gun = new THREE.Group();
    root.add(gun);
    const body = roundedBox(0.06, 0.1, 0.5, CHAR.gun, 0.45, 0.6);
    body.position.set(0.19, 1.22, 0.36);
    body.castShadow = true;
    gun.add(body);
    const mag = roundedBox(0.05, 0.12, 0.07, CHAR.gun, 0.5, 0.4);
    mag.position.set(0.19, 1.13, 0.24);
    gun.add(mag);

    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffe08a })
    );
    flash.position.set(0.19, 1.22, 0.66);
    flash.visible = false;
    root.add(flash);

    return { root, legL, legR, armL, armR, flash, mixer: null, actions: null };
  }

  async init() {
    const gltf = new GLTFLoader();
    const fbx = new FBXLoader();
    const tryLoad = async (url) => {
      const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
      if (!head || !head.ok) return null;
      if (url.toLowerCase().endsWith('.fbx')) {
        const obj = await fbx.loadAsync(url).catch(() => null);
        return obj ? { scene: obj, animations: obj.animations || [] } : null;
      }
      return gltf.loadAsync(url).catch(() => null);
    };

    for (const key of Object.keys(ASSETS.weapons)) {
      const cfg = ASSETS.weapons[key];
      const loaded = await tryLoad(cfg.url);
      if (!loaded) continue;

      const inner = loaded.scene;
      if (cfg.axes) {
        inner.setRotationFromMatrix(new THREE.Matrix4().makeBasis(
          new THREE.Vector3(...cfg.axes.x),
          new THREE.Vector3(...cfg.axes.y),
          new THREE.Vector3(...cfg.axes.z)
        ));
      } else {
        inner.rotation.set(...(cfg.rot || [0, 0, 0]));
      }
      inner.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(inner);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const k = cfg.length ? cfg.length / Math.max(size.x, size.y, size.z) : (cfg.scale || 1);
      inner.position.sub(center).multiplyScalar(k);
      inner.scale.setScalar(k);

      const obj = new THREE.Group();
      obj.add(inner);
      obj.position.set(...cfg.pos);
      obj.userData.anchored = true;
      obj.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        if (o.material) {
          o.material = o.material.clone();
          o.material.envMapIntensity = 0.5;
        }
      });
      this.vmLoaded[key] = obj;
      this.assets[key] = inner;
      if (this.vmFallback[key]) this.vmFallback[key].visible = false;
      this.vmRoot.add(obj);
    }

    const enemyAsset = await tryLoad(ASSETS.enemy.url);
    if (enemyAsset) {
      const bakeSrc = cloneSkinned(enemyAsset.scene);
      const box = new THREE.Box3().setFromObject(enemyAsset.scene);
      const h = box.max.y - box.min.y || 1;
      this.assets.enemyScale = ASSETS.enemy.height / h;
      this.assets.enemy = enemyAsset.scene;

      const boneNames = [];
      enemyAsset.scene.traverse((o) => { if (o.isBone) boneNames.push(o.name); });
      const clips = (enemyAsset.animations || []).slice();

      for (const [name, url] of Object.entries(ASSETS.enemy.clips || {})) {
        const file = await tryLoad(url);
        const clip = file && file.animations && file.animations[0];
        if (!clip) continue;
        clip.name = name;
        retargetTrackNames(clip, boneNames);
        clips.push(clip);
      }
      this.assets.enemyClips = clips;

      const baked = this.bakeHands(bakeSrc);
      if (baked) {
        for (const side of ['left', 'right']) {
          const holder = this.hands[side];
          if (holder.userData.mesh) holder.remove(holder.userData.mesh);
          holder.add(baked[side]);
          holder.userData.mesh = baked[side];
        }
        this.realHands = true;
      }
    }
  }

  onEnemiesReset(enemies) {
    for (const view of this.enemyViews.values()) this.scene.remove(view.root);
    this.enemyViews.clear();
    this.mixers = [];
    for (const e of enemies) this.enemyView(e);
  }

  enemyView(enemy) {
    let view = this.enemyViews.get(enemy);
    if (view) return view;

    if (this.assets.enemy) {
      const root = new THREE.Group();
      const model = cloneSkinned(this.assets.enemy);
      model.scale.setScalar(this.assets.enemyScale);
      model.rotation.y = ASSETS.enemy.rot;
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      root.add(model);
      view = { root, model, skinned: true };
      view.gun = this.attachGun(model);
      const clips = this.assets.enemyClips;
      if (clips && clips.length) {
        view.mixer = new THREE.AnimationMixer(model);
        const pick = (...res) => {
          for (const re of res) {
            const c = clips.find((x) => re.test(x.name) && !/tpose|t-pose|bind/i.test(x.name));
            if (c) return c;
          }
          return null;
        };
        view.clips = {
          idle: pick(/^idle$/i, /idle/i, /stand/i) || clips[0],
          walk: pick(/^walk$/i, /walk/i, /run/i) || clips[0],
          fire: pick(/^fire$/i, /fire|shoot/i),
          death: pick(/^death$/i, /death/i, /dying/i, /\bdie\b/i),
        };
        view.actions = {};
        for (const k of Object.keys(view.clips)) {
          if (!view.clips[k]) continue;
          const action = view.mixer.clipAction(view.clips[k]);
          if (k === 'death') {
            action.loop = THREE.LoopOnce;
            action.clampWhenFinished = true;
          }
          view.actions[k] = action;
        }
        if (view.actions.idle) view.actions.idle.play();
        this.mixers.push(view.mixer);
      }
    } else {
      view = this.buildCharacter();
      view.skinned = false;
    }

    this.scene.add(view.root);
    this.enemyViews.set(enemy, view);
    return view;
  }

  syncEnemies(v, dt) {
    for (const e of v.enemies) {
      const view = this.enemyView(e);
      const hidden = !e.alive && e.dying >= 0.55 && !view.skinned;
      view.root.visible = !hidden;
      if (hidden) continue;

      const fall = e.alive ? 0 : Math.min(1, e.dying / 0.55);
      view.root.position.set(e.pos[0], e.pos[1] + fall * 0.06, e.pos[2]);
      view.root.rotation.y = e.yaw;
      view.root.rotation.x = fall * fall * 1.45;

      if (view.skinned) {
        if (view.actions) {
          const moving = e.moving > 0.5;
          const dead = !e.alive;
          if (!dead && view.actions.fire && e.flash > 0 && view.firing <= 0) view.firing = 0.55;
          view.firing = Math.max(0, (view.firing || 0) - dt);
          const want = dead && view.actions.death ? 'death'
            : view.firing > 0 && view.actions.fire ? 'fire'
            : moving ? 'walk' : 'idle';
          if (view.current !== want && view.actions[want]) {
            if (view.current && view.actions[view.current]) view.actions[view.current].fadeOut(0.18);
            view.actions[want].reset().fadeIn(0.18).play();
            view.current = want;
          }
          if (view.mixer) view.mixer.timeScale = dead && !view.actions.death ? 0 : 1;
        }
        continue;
      }

      const swing = e.moving * Math.sin(e.phase) * 0.55;
      view.legL.rotation.x = swing;
      view.legR.rotation.x = -swing;
      const aim = -0.92 - e.moving * 0.12;
      view.armL.rotation.x = aim;
      view.armR.rotation.x = aim * 0.85;
      view.flash.visible = e.flash > 0;
    }
  }

  syncEffects(v) {
    let i = 0;
    for (const t of v.tracers) {
      if (i >= this.tracerPool.length) break;
      const m = this.tracerPool[i++];
      const a = new THREE.Vector3(...t.a);
      const b = new THREE.Vector3(...t.b);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.lookAt(b);
      m.scale.set(1, 1, a.distanceTo(b));
      m.material.color.setRGB(t.c[0], t.c[1], t.c[2]);
      m.material.opacity = Math.min(1, t.life / (t.max || 0.05));
      m.visible = true;
    }
    for (; i < this.tracerPool.length; i++) this.tracerPool[i].visible = false;

    const o = this.tmpObj;
    let n = 0;
    for (const p of v.particles) {
      if (n >= this.particles.instanceMatrix.count) break;
      o.position.set(p.p[0], p.p[1], p.p[2]);
      o.rotation.set(p.p[0] * 3, p.p[1] * 3, 0);
      const s = p.size * Math.min(1, p.life * 4);
      o.scale.set(s, s, s);
      o.updateMatrix();
      this.particles.setMatrixAt(n, o.matrix);
      this.tmpColor.setRGB(p.c[0], p.c[1], p.c[2]);
      this.particles.setColorAt(n, this.tmpColor);
      n++;
    }
    this.particles.count = n;
    this.particles.instanceMatrix.needsUpdate = true;
    if (this.particles.instanceColor) this.particles.instanceColor.needsUpdate = true;

    let d = 0;
    for (const dec of v.decals) {
      if (d >= this.decals.instanceMatrix.count) break;
      o.position.set(dec.p[0], dec.p[1], dec.p[2]);
      o.lookAt(dec.p[0] + dec.n[0], dec.p[1] + dec.n[1], dec.p[2] + dec.n[2]);
      const s = Math.min(1, dec.life / 2);
      o.scale.set(s, s, 1);
      o.updateMatrix();
      this.decals.setMatrixAt(d, o.matrix);
      d++;
    }
    this.decals.count = d;
    this.decals.instanceMatrix.needsUpdate = true;
  }

  syncViewmodel(v) {
    const player = v.player;
    const key = player.weapon;
    for (const k of Object.keys(ASSETS.weapons)) {
      const active = k === key && !player.scoped;
      if (this.vmLoaded[k]) this.vmLoaded[k].visible = active;
      else if (this.vmFallback[k]) this.vmFallback[k].visible = active;
    }
    if (player.scoped) {
      this.hands.left.visible = false;
      this.hands.right.visible = false;
      this.spareMag.visible = false;
      this.muzzleGroup.visible = false;
      this.muzzleLight.intensity = 0;
      return;
    }

    const b = player.bobAmount;
    const swap = player.swap || 0;
    const reloadT = player.reloading > 0
      ? Math.sin(Math.min(1, player.reloading / player.spec.reloadTime) * Math.PI)
      : 0;

    // 載入模型時，槍與手都放在 vmRoot 空間的絕對座標（由 ASSETS 指定），
    // vmRoot 只負責晃動 / 後座 / 換槍等動態偏移。
    const base = this.vmLoaded[key] ? [0, 0, 0] : [0.168, -0.152, -0.50];

    this.vmRoot.position.set(
      base[0] + Math.sin(player.bob) * 0.009 * b + player.sway[0] * 0.04,
      base[1] + Math.abs(Math.sin(player.bob)) * 0.009 * b + player.sway[1] * 0.04 - swap * 0.34 - reloadT * 0.12,
      base[2] + player.punch * 1.1
    );
    this.vmRoot.rotation.set(
      -player.punch * 3.2 - swap * 0.8 + reloadT * 0.5,
      0,
      -0.05 + player.sway[0] * 0.12
    );

    this.syncHands(player, key);

    const firing = v.muzzle > 0;
    this.muzzleGroup.visible = firing;
    const cfg = ASSETS.weapons[key];
    const tip = this.vmLoaded[key] && cfg.muzzle
      ? cfg.muzzle
      : [0, 0.014, key === 'rifle' ? -0.55 : -0.24];
    if (firing) {
      this.muzzleGroup.position.set(tip[0], tip[1], tip[2]);
      const s = 0.55 + Math.random() * 0.6;
      this.muzzleGroup.scale.set(s, s, s);
      this.muzzleGroup.rotation.z = Math.random() * 3;
    }
    this.muzzleLight.intensity = firing ? 14 : 0;
    this.muzzleLight.position.set(tip[0], tip[1], tip[2] + 0.1);
  }

  syncHands(player, key) {
    const cfg = ASSETS.weapons[key];
    const show = !!this.vmLoaded[key] && !!cfg.grip;
    this.hands.left.visible = show;
    this.hands.right.visible = show;
    if (!show) {
      this.spareMag.visible = false;
      return;
    }

    const g = cfg.grip;
    const reloading = player.reloading > 0;
    const p = reloading ? 1 - player.reloading / player.spec.reloadTime : 0;

    // 手腕擺在畫面外，手指朝握把方向伸過去；前臂因此自然從畫面底部進來，
    // 手腕的切口永遠看不到（真實 FPS 的做法）。
    this.aimHand(this.hands.right, g.right.at, g.right.aim, g.right.up);

    const home = g.left.at;
    const below = [home[0] - 0.02, home[1] - 0.46, home[2] + 0.14];
    const atMag = [g.mag[0] - 0.01, g.mag[1] - 0.05, g.mag[2] - 0.01];
    const pulled = [g.mag[0] - 0.02, g.mag[1] - 0.16, g.mag[2] + 0.02];
    const seated = [g.mag[0] - 0.01, g.mag[1] + 0.05, g.mag[2] - 0.01];
    const charge = [cfg.charge[0] + 0.02, cfg.charge[1] - 0.03, cfg.charge[2] + 0.02];
    const chargeBack = [charge[0], charge[1] - 0.01, charge[2] + 0.12];
    const idle = [home[0], home[1], home[2]];

    const posTrack = [
      [0.00, idle],
      [0.15, atMag],       // 手移到彈匣
      [0.23, pulled],      // 往下退出舊彈匣
      [0.44, below],       // 離開畫面
      [0.56, below],       // 取新彈匣（畫面外，停頓看不到）
      [0.74, atMag],       // 帶回來
      [0.80, seated],      // 推入
      [0.87, charge],      // 移到槍機
      [0.92, chargeBack],  // 拉開
      [1.00, idle],
    ];

    // 手的朝向也用軌道插值。之前是在幾個狀態間直接切換，換彈中途會有明顯的一頓。
    const aimHome = g.left.aim;
    const aimMag = [0.22, 0.86, -0.46];
    const aimCarry = [0.08, 0.96, -0.27];
    const aimCharge = [-0.12, 0.80, -0.59];
    const aimTrack = [
      [0.00, aimHome],
      [0.15, aimMag],
      [0.30, aimCarry],
      [0.62, aimCarry],
      [0.78, aimMag],
      [0.87, aimCharge],
      [0.92, aimCharge],
      [1.00, aimHome],
    ];

    const at = reloading ? sampleTrack(posTrack, p) : idle;
    const aim = reloading ? sampleTrack(aimTrack, p) : aimHome;
    this.aimHand(this.hands.left, at, aim, g.left.up);

    // 彈匣掛在手上（跟著手的位置與旋轉），並且在手位於畫面外時才出現／消失，
    // 所以看不到它憑空冒出來。
    const carrying = reloading && p > 0.47 && p < 0.80;
    this.spareMag.visible = carrying;
    if (carrying) {
      const mesh = this.hands.left.userData.mesh;
      const palm = mesh && mesh.userData && mesh.userData.palm;
      this.spareMag.scale.set(
        cfg.magSize[0] / 0.05, cfg.magSize[1] / 0.2, cfg.magSize[2] / 0.07
      );
      this.spareMag.position.set(
        (palm ? palm.x : 0) + 0.022,
        (palm ? palm.y : 0),
        (palm ? palm.z : 0) + 0.075
      );
      this.spareMag.rotation.set(Math.PI / 2, 0, 0);
    }
  }

  // 讓手掌質心貼在 at，並讓「手指方向」（烘出來的 +Z）指向 aim。
  // 先定旋轉，再把旋轉後的手掌偏移扣掉，才能算出手腕該放哪裡。
  aimHand(hand, at, aim, up) {
    const v = this._av || (this._av = new THREE.Vector3());
    const u = this._au || (this._au = new THREE.Vector3());
    const o = this._ao || (this._ao = new THREE.Vector3());
    const m = this._am || (this._am = new THREE.Matrix4());
    v.set(aim[0], aim[1], aim[2]).normalize();
    u.set(up[0], up[1], up[2]);
    if (Math.abs(u.dot(v)) > 0.99) u.set(0, 1, 0);
    // Matrix4.lookAt 的 Z 軸 = (eye - target)，所以 eye 給 aim、target 給原點即可讓 +Z 對齊 aim
    m.lookAt(v, o.set(0, 0, 0), u);
    hand.quaternion.setFromRotationMatrix(m);

    const mesh = hand.userData.mesh;
    const palm = mesh && mesh.userData && mesh.userData.palm;
    if (palm) o.copy(palm).applyQuaternion(hand.quaternion);
    else o.set(0, 0, 0);
    hand.position.set(at[0] - o.x, at[1] - o.y, at[2] - o.z);
  }

  // 依實際幀時間動態調整解析度。太慢就降、有餘裕再升，
  // 調整後鎖一段時間避免在臨界值來回震盪。
  adaptResolution() {
    const now = performance.now();
    const ms = this.lastFrameTime ? now - this.lastFrameTime : 16;
    this.lastFrameTime = now;
    if (ms > 200) return;
    this.frameMs += (ms - this.frameMs) * 0.06;

    if (this.adaptHold > 0) {
      this.adaptHold -= 1;
      return;
    }
    let next = this.pixelRatio;
    if (this.frameMs > 23) next = Math.max(MIN_PIXEL_RATIO, next - 0.25);
    else if (this.frameMs < 13) next = Math.min(this.maxPixelRatio, next + 0.25);
    if (next === this.pixelRatio) return;
    this.pixelRatio = next;
    this.renderer.setPixelRatio(next);
    this.resize();
    this.adaptHold = 90;
  }

  // 名牌：把角色頭頂投影到螢幕。隊友一直顯示，敵人只有在準心對上時才顯示（跟 CS 一樣）。
  updatePlates(v) {
    if (!v.plates) return;
    if (v.title || !v.playing) {
      v.plates([]);
      return;
    }
    const cam = this.camera;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const fwd = v.player.dir;
    const p = this._pv || (this._pv = new THREE.Vector3());
    const list = [];
    for (const b of v.enemies) {
      if (!b.alive || !b.name) continue;
      const dx = b.pos[0] - cam.position.x;
      const dy = b.pos[1] + PLATE_HEIGHT - cam.position.y;
      const dz = b.pos[2] - cam.position.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > PLATE_RANGE) continue;
      const ally = b.team === v.player.team;
      if (!ally && (dx * fwd[0] + dy * fwd[1] + dz * fwd[2]) / dist < PLATE_AIM_DOT) continue;
      p.set(b.pos[0], b.pos[1] + PLATE_HEIGHT, b.pos[2]).project(cam);
      if (p.z > 1) continue;
      list.push({
        name: b.name,
        x: Math.round((p.x * 0.5 + 0.5) * w),
        y: Math.round((-p.y * 0.5 + 0.5) * h),
        color: ally ? '#8fe39a' : '#ff8a76',
        opacity: (1 - Math.max(0, Math.min(1, (dist - 24) / 16)) * 0.75).toFixed(2),
      });
    }
    v.plates(list);
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = w / h;
    this.viewCamera.updateProjectionMatrix();
  }

  render(v) {
    this.adaptResolution();
    const dt = Math.min(0.05, v.clock - (this.lastClock || v.clock));
    this.lastClock = v.clock;

    const player = v.player;
    const spec = player.spec;
    const fov = v.title ? 44 : BASE_FOV * (player.scoped && spec.scopeFov ? spec.scopeFov : 1);
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    // 標題畫面：攝影機沿著場景緩慢繞行，士兵留在原地播待機動作當背景
    let eye;
    if (v.title) {
      const t = v.clock * TITLE_ORBIT_SPEED;
      eye = [Math.cos(t) * TITLE_ORBIT_RADIUS, 6.4 + Math.sin(t * 0.62) * 1.1, Math.sin(t) * TITLE_ORBIT_RADIUS];
      this.camera.position.set(eye[0], eye[1], eye[2]);
      this.camera.lookAt(0, 1.2, 0);
    } else {
      eye = v.playing ? player.viewEye : player.eye;
      this.camera.position.set(eye[0], eye[1], eye[2]);
      this.camera.rotation.set(player.viewPitch, player.yaw, player.roll);
    }

    this.sun.position.set(eye[0], 0, eye[2]).addScaledVector(SUN, 70);
    this.sun.target.position.set(eye[0], 0, eye[2]);

    this.syncEnemies(v, dt);
    this.syncEffects(v);
    this.updatePlates(v);
    if (!v.title) this.syncViewmodel(v);
    for (const m of this.mixers) m.update(dt);

    this.renderer.render(this.scene, this.camera);
    if (v.title) return;
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.viewScene, this.viewCamera);
    this.renderer.autoClear = true;
  }
}
