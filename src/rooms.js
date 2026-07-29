const KEY = 'duststrike.rooms';
const CHANNEL = 'duststrike.rooms';
// 房主每 5 秒更新一次心跳，超過這個時間沒更新就當作分頁關掉了
const TTL = 26000;
export const HEARTBEAT = 5000;

const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

function readAll() {
  // localStorage 可能被停用（隱私模式、file:// 協定），或存著壞掉的內容
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch (e) {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    return;
  }
  if (chan) chan.postMessage(Date.now());
}

export function listLocalRooms() {
  const now = Date.now();
  const all = readAll();
  const live = all.filter((r) => now - r.updatedAt < TTL);
  if (live.length !== all.length) writeAll(live);
  return live.sort((a, b) => b.createdAt - a.createdAt);
}

export function publishRoom(room) {
  const list = readAll().filter((r) => r.id !== room.id);
  list.push({ ...room, updatedAt: Date.now() });
  writeAll(list);
}

export function touchRoom(id) {
  const list = readAll();
  const r = list.find((x) => x.id === id);
  if (!r) return;
  r.updatedAt = Date.now();
  writeAll(list);
}

export function removeRoom(id) {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function onRoomsChanged(fn) {
  if (chan) chan.onmessage = fn;
  addEventListener('storage', (e) => { if (e.key === KEY) fn(); });
}

export function newRoomId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
