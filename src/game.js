import { vadd, vmul, vnorm } from './gl.js';
import { rayWalls, rayWallsHit, rayBox, MAPS, setMap, currentMap } from './map.js';
import { buildNav } from './nav.js';
import { Player, WEAPONS } from './player.js';
import { createBots, HEAD_MULT } from './enemy.js';
import { emptyRoster, movePlayer, toggleBot, findSeat, pickBotName, TEAMS } from './roster.js';
import { Net } from './net.js';
import { UI } from './ui.js';

export const ROUND_TIME = 120;
export const ENEMY_DAMAGE = 9;

export function createGame(canvas, renderer) {
  const ui = new UI();
  const player = new Player();

  let roster = emptyRoster();
  let playerName = 'PLAYER';
  let roomName = '';
  let mapId = 'dust';
  // 標題畫面用滿編陣容當背景
  let bots = createBots({
    ct: [{ type: 'bot', name: 'Volt' }, { type: 'bot', name: 'Piper' }, null],
    t: [{ type: 'bot', name: 'Mako' }, { type: 'bot', name: 'Cinder' }, null],
  }, null);
  let tracers = [];
  let particles = [];
  let decals = [];
  let score = { ct: 0, t: 0 };
  let timeLeft = ROUND_TIME;
  let state = 'title';
  let clock = 0;
  let muzzle = 0;

  const keys = {};
  const mouse = { down: false, pressed: false };

  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (state !== 'play') return;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyR') player.reload();
    if (e.code === 'Digit1') player.switchTo('pistol');
    if (e.code === 'Digit2') player.switchTo('rifle');
    if (e.code === 'Digit3') player.switchTo('sniper');
    if (e.code === 'Digit4') player.switchTo('shotgun');
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      // 右鍵切換開鏡（不是按住）。開火會自動退鏡，再按一次右鍵就能重新開鏡。
      if (state === 'play') player.setScope(!player.scoped);
      return;
    }
    if (e.button !== 0) return;
    mouse.down = true;
    mouse.pressed = true;
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });
  addEventListener('contextmenu', (e) => {
    if (state === 'play') e.preventDefault();
  });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) player.look(e.movementX, e.movementY);
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && state === 'play') pause();
  });

  // 標題畫面把士兵擺到固定位置當背景構圖（按新建遊戲會重新隨機生成）
  const TITLE_POSE = [
    [3.2, 6.0, -2.5], [-3.6, 7.2, 2.4], [6.4, -2.2, 3.4], [-7.0, -3.4, 1.2], [1.0, 12.5, 3.0],
  ];

  const myCid = () => net.cid || 'local';
  const isMine = (slot) => !!slot && slot.type === 'human' && slot.cid === myCid();
  const mapList = () => Object.values(MAPS).map((m) => ({ id: m.id, zh: m.zh, label: m.label }));

  function lobbyModel() {
    return {
      roster, name: playerName, room: roomName, map: mapId,
      maps: mapList(), isMine,
      online: net.online,
      canStart: !net.online || !net.room || net.room.hostId === myCid(),
    };
  }

  function refreshLobby() {
    if (state === 'lobby') ui.renderLobby(lobbyModel());
  }

  // 線上時所有動作都送給伺服器，畫面等廣播回來再更新；離線時直接改本機狀態。
  const lobbyHandlers = {
    onName: (v) => {
      playerName = v.slice(0, 12);
      net.setName(playerName);
      if (!net.online) {
        const seat = findSeat(roster, myCid());
        if (seat) roster[seat.team][seat.index].name = playerName;
        refreshLobby();
      }
    },
    onRoomName: (v) => {
      roomName = v.slice(0, 18);
      if (net.online) net.send({ t: 'roomname', name: roomName });
    },
    onMap: (id) => {
      mapId = id;
      if (net.online) net.send({ t: 'map', mapId: id });
      else refreshLobby();
    },
    onSlot: (team, i, action) => {
      if (net.online) {
        net.send({ t: 'slot', team, index: i, action, botName: pickBotName(roster) });
        return;
      }
      if (action === 'join') movePlayer(roster, team, i, myCid(), playerName);
      else toggleBot(roster, team, i);
      refreshLobby();
    },
    onStart: () => {
      if (net.online) net.send({ t: 'start' });
      else { ui.hideLobby(); startMatch(); }
    },
    onBack: () => {
      if (net.online) net.send({ t: 'leave' });
      ui.hideLobby();
      title();
    },
  };

  function lobby() {
    state = 'lobby';
    ui.hideTitle();
    if (!roomName) roomName = `${playerName || '玩家'} 的房間`;
    if (net.online) {
      net.send({ t: 'create', name: roomName, mapId });
    } else {
      roster = emptyRoster(myCid(), playerName);
    }
    ui.showLobby(lobbyModel(), lobbyHandlers);
  }

  function browse() {
    state = 'browse';
    ui.hideTitle();
    ui.setNetStatus(net.online ? '線上房間' : '離線模式 · 只看得到本機房間');
    ui.showBrowse({
      onRefresh: () => net.listRooms(),
      onBack: () => { ui.hideBrowse(); title(); },
      onJoin: (room) => {
        if (net.online && !room.local) { net.send({ t: 'join', id: room.id }); return; }
        roster = room.roster || emptyRoster(myCid(), playerName);
        roomName = room.name;
        mapId = room.mapId || 'dust';
        ui.hideBrowse();
        startMatch();
      },
    });
    net.listRooms();
  }

  function startMatch() {
    setMap(mapId);
    buildNav();
    if (renderer.setMapVisual) renderer.setMapVisual();
    const seat = findSeat(roster, myCid());
    player.team = seat ? seat.team : 'ct';
    player.name = playerName || '玩家';
    bots = createBots(roster, player.pos);
    if (renderer.onEnemiesReset) renderer.onEnemiesReset(bots);
    ui.setTeam(player.team);
    restart();
  }

  function title() {
    state = 'title';
    bots.forEach((e, i) => {
      const p = TITLE_POSE[i % TITLE_POSE.length];
      e.pos[0] = p[0];
      e.pos[1] = 0;
      e.pos[2] = p[1];
      e.yaw = p[2];
      e.moving = 0;
      e.alive = true;
      e.hp = 100;
    });
    ui.showTitle({
      onNew: lobby,
      onFind: browse,
    });
  }

  function menu() {
    state = 'menu';
    ui.overlay(
      'DEATHMATCH',
      'WASD 移動 · 空白鍵跳躍 · Ctrl 蹲下<br>左鍵射擊 · 右鍵開鏡 · R 換彈<br>1 手槍 · 2 步槍 · 3 狙擊 · 4 散彈<br>爆頭四倍傷害 · 120 秒內擊倒最多敵人',
      'CLICK TO PLAY',
      resume
    );
  }

  function pause() {
    state = 'paused';
    ui.overlay('PAUSED', `CT ${score.ct} — T ${score.t}`, 'RESUME', resume);
  }

  function resume() {
    ui.hideOverlay();
    mouse.down = false;
    mouse.pressed = false;
    player.setScope(false);
    state = 'play';
    canvas.requestPointerLock();
  }

  function restart() {
    const team = player.team || 'ct';
    const name = player.name || playerName;
    player.reset();
    player.team = team;
    player.name = name;
    for (const b of bots) b.spawn(player.pos);
    tracers = [];
    particles = [];
    decals = [];
    score = { ct: 0, t: 0 };
    timeLeft = ROUND_TIME;
    ui.clearFeed();
    ui.setScore(0, 0);
    resume();
  }

  function finish(title, sub) {
    state = 'over';
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    ui.overlay(title, sub, 'PLAY AGAIN', restart);
  }

  function burst(p, n, color, speed, spread) {
    for (let i = 0; i < n; i++) {
      particles.push({
        p: [p[0], p[1], p[2]],
        v: [(Math.random() - 0.5) * spread, Math.random() * speed * 0.9, (Math.random() - 0.5) * spread],
        life: 0.35 + Math.random() * 0.4,
        max: 0.75,
        size: 0.02 + Math.random() * 0.04,
        c: color,
      });
    }
  }

  function addDecal(p, n) {
    decals.push({ p: vadd(p, vmul(n, 0.012)), n, life: 12 });
    if (decals.length > 44) decals.shift();
  }

  function credit(team) {
    score[team] += 1;
    ui.setScore(score.ct, score.t);
  }

  function botShoot(shooter, target, dir, dist) {
    const acc = dist < 12 ? 0.68 : dist < 24 ? 0.46 : 0.26;
    const hit = Math.random() < acc;
    const from = shooter.muzzle();
    const end = hit ? target.eye : vadd(from, vmul(dir, Math.min(dist, rayWalls(from, dir, dist))));
    tracers.push({ a: from, b: end, life: 0.05, max: 0.05, c: [1, 0.85, 0.45] });
    if (!hit) return;

    if (target === player) {
      ui.flashDamage();
      if (player.damage(ENEMY_DAMAGE) === 0) {
        credit(shooter.team);
        ui.killfeed(shooter.name, player.name, '✖');
        const foe = TEAMS[shooter.team].zh;
        finish('YOU DIED', `被${foe}擊倒。<br>CT ${score.ct} — T ${score.t}`);
      }
      return;
    }
    if (target.hit(ENEMY_DAMAGE)) {
      credit(shooter.team);
      ui.killfeed(shooter.name, target.name, '✖');
    }
  }

  // dirs 是這一次擊發的所有彈道（散彈槍一次多顆）。
  // 傷害先依敵人累加再一次結算，才不會一槍打出九筆擊殺訊息。
  function playerShoot(dirs) {
    const origin = player.eye;
    const spec = player.spec;
    const hits = new Map();
    muzzle = 0.05;

    for (const dir of dirs) {
      const wall = rayWallsHit(origin, dir, 200);
      let target = null;
      let head = false;
      let best = wall.t;

      for (const e of bots) {
        if (!e.alive || e.team === player.team) continue;
        const hb = e.headBounds();
        const th = rayBox(origin, dir, hb[0], hb[1]);
        if (th < best) {
          best = th;
          target = e;
          head = true;
          continue;
        }
        const [mn, mx] = e.bounds();
        const t = rayBox(origin, dir, mn, mx);
        if (t < best) {
          best = t;
          target = e;
          head = false;
        }
      }

      const end = vadd(origin, vmul(dir, Math.min(best, 200)));
      tracers.push({ a: vadd(origin, vmul(dir, 0.6)), b: end, life: 0.035, max: 0.035, c: [1, 0.96, 0.72] });

      if (!target) {
        if (wall.n) {
          addDecal(end, wall.n);
          burst(end, dirs.length > 1 ? 3 : 7, [0.72, 0.66, 0.52], 1.6, 2.2);
        }
        continue;
      }

      burst(end, head ? 12 : 8, [0.62, 0.06, 0.06], 1.4, 1.9);
      const acc = hits.get(target) || { dmg: 0, head: false };
      acc.dmg += spec.damage * (head ? HEAD_MULT : 1);
      acc.head = acc.head || head;
      hits.set(target, acc);
    }

    if (!hits.size) return;
    let killed = false;
    let killHead = false;
    for (const [enemy, acc] of hits) {
      if (!enemy.hit(acc.dmg)) continue;
      killed = true;
      killHead = killHead || acc.head;
      score.ct += 1;
      ui.killfeed(player.name, enemy.name, acc.head ? '☠ HS' : '✖');
    }
    ui.hitmarker(killed);
    if (killed && killHead) ui.message('HEADSHOT', 900);
  }

  function update(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      const verdict = score.ct > score.t ? 'CT WIN' : score.ct === score.t ? 'DRAW' : 'T WIN';
      finish('ROUND OVER', `${verdict}<br>CT ${score.ct} — T ${score.t}`);
      return;
    }

    // 先讓上一幀的特效老化，再產生這一幀的新特效。
    // 這樣即使 dt 大於特效壽命（低張數時），新特效也保證至少被畫到一次。
    muzzle = Math.max(0, muzzle - dt);
    for (const p of particles) {
      p.life -= dt;
      p.v[1] -= 9.5 * dt;
      p.p[0] += p.v[0] * dt;
      p.p[1] += p.v[1] * dt;
      p.p[2] += p.v[2] * dt;
      if (p.p[1] < 0.01) {
        p.p[1] = 0.01;
        p.v[1] *= -0.25;
        p.v[0] *= 0.6;
        p.v[2] *= 0.6;
      }
    }
    particles = particles.filter((p) => p.life > 0);
    tracers = tracers.filter((t) => (t.life -= dt) > 0);
    for (const d of decals) d.life -= dt;
    decals = decals.filter((d) => d.life > 0);

    player.update(dt, keys);
    const shots = player.tryShoot(mouse.down, mouse.pressed);
    mouse.pressed = false;
    if (shots) playerShoot(shots);

    const world = { player, bots };
    for (const b of bots) b.update(dt, world, botShoot);

    const s = player.spec;
    ui.setWeapon(s.label, player.ammo[player.weapon], s.mag, player.reloading > 0);
    ui.setHP(player.hp);
    ui.setTime(timeLeft);
    ui.setSpread(Math.min(1, player.bobAmount * 0.35 + Math.abs(player.recoil) * 7));
    ui.setScoped(player.scoped);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;
    if (state === 'play') update(dt);
    renderer.render({
      player, enemies: bots, tracers, particles, decals, clock, muzzle,
      playing: state === 'play', title: state !== 'play' && state !== 'paused' && state !== 'over',
      plates: emitPlates,
    });
    requestAnimationFrame(frame);
  }

  const emitPlates = (list) => ui.setPlates(list);

  const net = new Net({
    onStatus: () => {
      if (state === 'browse') ui.setNetStatus(net.online ? '線上房間' : '離線模式 · 只看得到本機房間');
      refreshLobby();
    },
    onRooms: (list) => {
      if (state !== 'browse') return;
      const labels = Object.fromEntries(Object.values(MAPS).map((m) => [m.id, m.label]));
      ui.renderRooms(list.map((r) => ({ ...r, mapLabel: labels[r.mapId] || r.mapId })));
    },
    onRoom: (room) => {
      roster = room.roster;
      roomName = room.name;
      mapId = room.mapId;
      if (state === 'browse') { ui.hideBrowse(); state = 'lobby'; ui.showLobby(lobbyModel(), lobbyHandlers); }
      else refreshLobby();
    },
    onStart: (room) => {
      roster = room.roster;
      mapId = room.mapId;
      ui.hideLobby();
      startMatch();
    },
    onLeft: () => {},
    onError: (msg) => ui.titleNote(msg),
  });
  net.setName(playerName);
  net.connect();
  player.team = 'ct';
  player.name = playerName;
  ui.setTeam('ct');
  ui.setScore(0, 0);
  ui.setHP(100);
  ui.setTime(ROUND_TIME);
  ui.setWeapon(WEAPONS.rifle.label, WEAPONS.rifle.mag, WEAPONS.rifle.mag, false);
  if (renderer.onEnemiesReset) renderer.onEnemiesReset(bots);
  title();
  requestAnimationFrame(frame);

  return { ui, player };
}
