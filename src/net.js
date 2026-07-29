// 大廳連線。連得上就用伺服器的房間，連不上自動退回本機房間（離線模式）。
import * as local from './rooms.js';

const DEFAULT_URL = location.protocol === 'https:'
  ? 'wss://es-game-server.onrender.com'
  : 'ws://localhost:8787';

export function serverUrl() {
  const q = new URLSearchParams(location.search).get('server');
  if (q) return q;
  const saved = (() => {
    try { return localStorage.getItem('duststrike.server'); } catch { return null; }
  })();
  return saved || DEFAULT_URL;
}

export class Net {
  constructor(handlers) {
    this.h = handlers;
    this.ws = null;
    this.cid = null;
    this.online = false;
    this.room = null;
    this.retry = 0;
    this.name = '玩家';
  }

  connect() {
    let ws;
    try {
      ws = new WebSocket(serverUrl());
    } catch (e) {
      this.fallback();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.online = true;
      this.retry = 0;
      this.send({ t: 'name', name: this.name });
      this.send({ t: 'rooms' });
      this.h.onStatus('online');
    };
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'hello') this.cid = m.cid;
      else if (m.t === 'rooms') this.h.onRooms(m.rooms);
      else if (m.t === 'room') { this.room = m.room; this.h.onRoom(m.room); }
      else if (m.t === 'start') { this.room = m.room; this.h.onStart(m.room); }
      else if (m.t === 'left') { this.room = null; this.h.onLeft(); }
      else if (m.t === 'error') this.h.onError(m.msg);
      else if (m.t === 's') this.h.onState(m.cid, m.s);
      else if (m.t === 'b') this.h.onBots(m.bots);
      else if (m.t === 'f') this.h.onFire(m.cid, m.o, m.e);
      else if (m.t === 'hit') this.h.onHit(m);
      else if (m.t === 'kill') this.h.onKill(m);
    };
    ws.onclose = () => {
      this.online = false;
      this.room = null;
      this.h.onStatus('offline');
      // 免費方案會休眠，第一次連線可能要等冷啟動，所以持續重試
      this.retry = Math.min(this.retry + 1, 6);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.connect(), 1000 * this.retry);
    };
    ws.onerror = () => ws.close();
  }

  fallback() {
    this.online = false;
    this.h.onStatus('offline');
  }

  send(msg) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  setName(name) {
    this.name = name;
    if (this.online) this.send({ t: 'name', name });
  }

  listRooms() {
    if (this.online) this.send({ t: 'rooms' });
    else this.h.onRooms(local.listRooms().map((r) => ({ ...r, humans: 1, local: true })));
  }

  isMine(slot) {
    return slot && slot.type === 'human' && slot.cid === this.cid;
  }
}
