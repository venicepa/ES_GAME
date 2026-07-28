export const TEAMS = {
  ct: { label: '反恐部隊', short: 'CT', zh: '警察' },
  t: { label: '恐怖分子', short: 'T', zh: '歹徒' },
};

const BOT_NAMES = [
  'Volt', 'Rebar', 'Mako', 'Piper', 'Cinder', 'Dozer',
  'Kestrel', 'Nomad', 'Vex', 'Ash', 'Grit', 'Halo',
];

export function emptyRoster() {
  return {
    ct: [{ type: 'player' }, null, null],
    t: [null, null, null],
  };
}

function usedNames(roster) {
  const set = new Set();
  for (const team of ['ct', 't']) {
    for (const s of roster[team]) if (s && s.name) set.add(s.name);
  }
  return set;
}

export function pickBotName(roster) {
  const used = usedNames(roster);
  const free = BOT_NAMES.filter((n) => !used.has(n));
  const pool = free.length ? free : BOT_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function findPlayer(roster) {
  for (const team of ['ct', 't']) {
    const i = roster[team].findIndex((s) => s && s.type === 'player');
    if (i >= 0) return { team, index: i };
  }
  return null;
}

export function movePlayer(roster, team, index) {
  if (roster[team][index]) return false;
  const at = findPlayer(roster);
  if (at) roster[at.team][at.index] = null;
  roster[team][index] = { type: 'player' };
  return true;
}

export function toggleBot(roster, team, index) {
  const slot = roster[team][index];
  if (!slot) {
    roster[team][index] = { type: 'bot', name: pickBotName(roster) };
    return true;
  }
  if (slot.type === 'bot') {
    roster[team][index] = null;
    return true;
  }
  return false;
}
