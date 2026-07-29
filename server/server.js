import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8787;
const SLOTS = 3;
const EMPTY_ROOM_GRACE = 5000;

/** @type {Map<string, Room>} 房間都放在記憶體，伺服器重啟就清空 */
const rooms = new Map();
let nextId = 1;

const emptyRoster = () => ({ ct: [null, null, null], t: [null, null, null] });

function roomSummary(r) {
  let filled = 0;
  let humans = 0;
  for (const team of ['ct', 't']) {
    for (const s of r.roster[team]) {
      if (!s) continue;
      filled++;
      if (s.type === 'human') humans++;
    }
  }
  return {
    id: r.id, name: r.name, host: r.hostName, mapId: r.mapId,
    filled, humans, max: SLOTS * 2, status: r.status, createdAt: r.createdAt,
  };
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcastRooms() {
  const list = [...rooms.values()].map(roomSummary).sort((a, b) => b.createdAt - a.createdAt);
  for (const c of wss.clients) if (!c.roomId) send(c, { t: 'rooms', rooms: list });
}

function roomMembers(id) {
  return [...wss.clients].filter((c) => c.roomId === id);
}

function broadcastRoom(r) {
  const payload = { t: 'room', room: { ...roomSummary(r), roster: r.roster, hostId: r.hostId } };
  for (const c of roomMembers(r.id)) send(c, payload);
}

function sendTo(roomId, cid, msg) {
  for (const c of roomMembers(roomId)) if (c.cid === cid) send(c, msg);
}

function relay(roomId, fromCid, msg) {
  for (const c of roomMembers(roomId)) if (c.cid !== fromCid) send(c, msg);
}

function teamOf(roster, cid) {
  for (const team of ['ct', 't']) {
    if (roster[team].some((s) => s && s.type === 'human' && s.cid === cid)) return team;
  }
  return null;
}

function seatFor(roster, cid) {
  for (const team of ['ct', 't']) {
    const i = roster[team].findIndex((s) => s && s.type === 'human' && s.cid === cid);
    if (i >= 0) return { team, index: i };
  }
  return null;
}

function firstFree(roster) {
  for (const team of ['ct', 't']) {
    const i = roster[team].indexOf(null);
    if (i >= 0) return { team, index: i };
  }
  return null;
}

function leaveRoom(ws) {
  const r = rooms.get(ws.roomId);
  ws.roomId = null;
  if (!r) return;
  const seat = seatFor(r.roster, ws.cid);
  if (seat) r.roster[seat.team][seat.index] = null;

  const left = roomMembers(r.id);
  if (!left.length) {
    // 留一點寬限時間，避免重整頁面就把房間弄丟
    r.emptyAt = Date.now();
  } else if (r.hostId === ws.cid) {
    r.hostId = left[0].cid;
    r.hostName = left[0].pname;
    broadcastRoom(r);
  } else {
    broadcastRoom(r);
  }
  broadcastRooms();
}

setInterval(() => {
  const now = Date.now();
  let dirty = false;
  for (const [id, r] of rooms) {
    if (r.emptyAt && now - r.emptyAt > EMPTY_ROOM_GRACE && !roomMembers(id).length) {
      rooms.delete(id);
      dirty = true;
    }
  }
  if (dirty) broadcastRooms();
}, 2000);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('es-game realtime server');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.cid = `c${nextId++}`;
  ws.pname = '玩家';
  ws.roomId = null;
  send(ws, { t: 'hello', cid: ws.cid });
  broadcastRooms();

  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    const room = rooms.get(ws.roomId);

    if (m.t === 'name') {
      ws.pname = String(m.name || '玩家').slice(0, 12);
      if (room) {
        const seat = seatFor(room.roster, ws.cid);
        if (seat) room.roster[seat.team][seat.index].name = ws.pname;
        if (room.hostId === ws.cid) room.hostName = ws.pname;
        broadcastRoom(room);
        broadcastRooms();
      }
      return;
    }

    if (m.t === 'rooms') {
      send(ws, {
        t: 'rooms',
        rooms: [...rooms.values()].map(roomSummary).sort((a, b) => b.createdAt - a.createdAt),
      });
      return;
    }

    if (m.t === 'create') {
      leaveRoom(ws);
      const id = `r${nextId++}`;
      const r = {
        id,
        name: String(m.name || `${ws.pname} 的房間`).slice(0, 18),
        hostId: ws.cid,
        hostName: ws.pname,
        mapId: m.mapId || 'dust',
        roster: emptyRoster(),
        status: 'open',
        createdAt: Date.now(),
        emptyAt: 0,
        score: { ct: 0, t: 0 },
      };
      r.roster.ct[0] = { type: 'human', cid: ws.cid, name: ws.pname };
      rooms.set(id, r);
      ws.roomId = id;
      broadcastRoom(r);
      broadcastRooms();
      return;
    }

    if (m.t === 'join') {
      const r = rooms.get(m.id);
      if (!r) { send(ws, { t: 'error', msg: '房間已經不存在' }); return; }
      // 進行中的房間不能加入：否則會被房主的下一次開始拖進別人的戰局
      if (r.status === 'playing') { send(ws, { t: 'error', msg: '這間房正在遊戲中' }); return; }
      const free = firstFree(r.roster);
      if (!free) { send(ws, { t: 'error', msg: '房間已滿' }); return; }
      leaveRoom(ws);
      r.emptyAt = 0;
      r.roster[free.team][free.index] = { type: 'human', cid: ws.cid, name: ws.pname };
      ws.roomId = r.id;
      broadcastRoom(r);
      broadcastRooms();
      return;
    }

    if (!room) return;

    if (m.t === 'leave') {
      leaveRoom(ws);
      send(ws, { t: 'left' });
      return;
    }

    if (m.t === 'slot') {
      const { team, index, action } = m;
      if (!room.roster[team] || index < 0 || index >= SLOTS) return;
      const slot = room.roster[team][index];
      // 加電腦、移除電腦只有房主能做，換隊每個人都可以
      if ((action === 'bot' || action === 'remove') && room.hostId !== ws.cid) {
        send(ws, { t: 'error', msg: '只有房主可以增減電腦' });
        return;
      }
      if (action === 'join') {
        if (slot) return;
        const seat = seatFor(room.roster, ws.cid);
        if (seat) room.roster[seat.team][seat.index] = null;
        room.roster[team][index] = { type: 'human', cid: ws.cid, name: ws.pname };
      } else if (action === 'bot') {
        if (slot) return;
        room.roster[team][index] = { type: 'bot', name: m.botName || 'BOT' };
      } else if (action === 'remove') {
        if (!slot || slot.type !== 'bot') return;
        room.roster[team][index] = null;
      }
      broadcastRoom(room);
      broadcastRooms();
      return;
    }

    if (m.t === 'map' && room.hostId === ws.cid) {
      room.mapId = m.mapId;
      broadcastRoom(room);
      broadcastRooms();
      return;
    }

    if (m.t === 'roomname' && room.hostId === ws.cid) {
      room.name = String(m.name || '').slice(0, 18);
      broadcastRoom(room);
      broadcastRooms();
      return;
    }

    // ---- 對戰中的轉發（中繼式：命中由開槍方判定，伺服器只記分與轉送）----
    if (m.t === 's') {
      relay(room.id, ws.cid, { t: 's', cid: ws.cid, s: m.s });
      return;
    }

    if (m.t === 'b') {
      if (room.hostId !== ws.cid) return;
      relay(room.id, ws.cid, { t: 'b', bots: m.bots });
      return;
    }

    if (m.t === 'f') {
      relay(room.id, ws.cid, { t: 'f', cid: ws.cid, o: m.o, e: m.e });
      return;
    }

    if (m.t === 'hit') {
      // 傷害交給被打的那一方套用：玩家自己算，電腦則由房主算
      if (m.kind === 'player') sendTo(room.id, m.cid, { t: 'hit', from: ws.cid, dmg: m.dmg });
      else sendTo(room.id, room.hostId, { t: 'hit', from: ws.cid, bot: m.bot, dmg: m.dmg });
      return;
    }

    if (m.t === 'ended' && room.hostId === ws.cid) {
      room.status = 'open';
      broadcastRoom(room);
      broadcastRooms();
      return;
    }

    if (m.t === 'kill') {
      const team = m.team === 'ct' || m.team === 't' ? m.team : null;
      if (team) room.score[team] += 1;
      const payload = { t: 'kill', killer: m.killer, victim: m.victim, head: !!m.head, score: room.score };
      for (const c of roomMembers(room.id)) send(c, payload);
      return;
    }

    if (m.t === 'start' && room.hostId === ws.cid) {
      room.status = 'playing';
      room.score = { ct: 0, t: 0 };
      const payload = {
        t: 'start',
        room: { ...roomSummary(room), roster: room.roster, hostId: room.hostId },
      };
      for (const c of roomMembers(room.id)) send(c, payload);
      broadcastRooms();
    }
  });

  ws.on('close', () => {
    leaveRoom(ws);
    broadcastRooms();
  });
});

server.listen(PORT, () => console.log(`listening on ${PORT}`));
