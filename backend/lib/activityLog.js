const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'activity-log.json');
const MAX_ENTRIES = 600;
const CUSTOM_RANGE_MAX_DAYS = 400;

function ensureDir() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readLog() {
  ensureDir();
  if (!fs.existsSync(FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function append(entry) {
  const log = readLog();
  log.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    at: new Date().toISOString(),
    ...entry,
  });
  fs.writeFileSync(
    FILE,
    JSON.stringify(log.slice(0, MAX_ENTRIES), null, 2),
    'utf8'
  );
}

function ymdLocal(d) {
  const x = new Date(d);
  return (
    x.getFullYear() +
    '-' +
    String(x.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(x.getDate()).padStart(2, '0')
  );
}

function parseYmd(s) {
  if (!s || typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(y, mo, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== day) return null;
  return dt;
}

function eachYmdInRange(startYmd, endYmd) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (!start || !end || start > end) return [];
  const labels = [];
  const cur = new Date(start);
  while (cur <= end) {
    labels.push(ymdLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return labels;
}

/** Per-hari dalam rentang inklusif (Waktu lokal server) */
function aggregateByDayRange(startYmd, endYmd) {
  const labels = eachYmdInRange(startYmd, endYmd);
  if (labels.length === 0) return [];
  const buckets = Object.fromEntries(labels.map((d) => [d, { ok: 0, fail: 0 }]));
  const log = readLog();
  for (const row of log) {
    const day = ymdLocal(new Date(row.at || 0));
    if (!buckets[day]) continue;
    if (row.ok) buckets[day].ok += 1;
    else buckets[day].fail += 1;
  }
  return labels.map((date) => ({
    date,
    ok: buckets[date].ok,
    fail: buckets[date].fail,
    total: buckets[date].ok + buckets[date].fail,
  }));
}

/** Endpoint/path paling sering dalam rentang (inklusif per hari) */
function topEndpointsInRange(startYmd, endYmd, limit = 12) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (!start || !end) return [];
  const endInclusive = new Date(end);
  endInclusive.setHours(23, 59, 59, 999);
  const log = readLog();
  const counts = new Map();
  for (const row of log) {
    if (!row.at) continue;
    const t = new Date(row.at);
    if (t < start || t > endInclusive) continue;
    let key;
    if (row.source === 'v2' && row.path) key = row.path;
    else if (row.module) key = `legacy:${row.module}`;
    else if (row.source === 'v2') key = '(v2 tanpa path)';
    else key = '(unknown)';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, count]) => ({ path, count }));
}

/**
 * @param {'today'|'month'|'year'|'7d'|'custom'} preset
 * @returns {{ startYmd: string, endYmd: string } | { error: string }}
 */
function resolveActivityRange(preset, customFrom, customTo) {
  const p = preset && String(preset).toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ymdToday = ymdLocal(today);

  if (p === 'today') {
    return { startYmd: ymdToday, endYmd: ymdToday };
  }

  if (p === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { startYmd: ymdLocal(first), endYmd: ymdLocal(last) };
  }

  if (p === 'year') {
    const first = new Date(today.getFullYear(), 0, 1);
    const last = new Date(today.getFullYear(), 11, 31);
    return { startYmd: ymdLocal(first), endYmd: ymdLocal(last) };
  }

  if (p === 'custom') {
    let a = customFrom && String(customFrom).slice(0, 10);
    let b = customTo && String(customTo).slice(0, 10);
    if (!parseYmd(a) || !parseYmd(b)) {
      return { error: 'Untuk custom, isi activityFrom dan activityTo (YYYY-MM-DD).' };
    }
    if (a > b) [a, b] = [b, a];
    const n = eachYmdInRange(a, b).length;
    if (n > CUSTOM_RANGE_MAX_DAYS) {
      return {
        error: `Rentang custom maksimal ${CUSTOM_RANGE_MAX_DAYS} hari.`,
      };
    }
    return { startYmd: a, endYmd: b };
  }

  // 7d and default
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  return { startYmd: ymdLocal(start), endYmd: ymdToday };
}

/** 7 hari terakhir: tanggal → ok / fail / total (kompatibilitas lama) */
function aggregateByDay(numDays = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (numDays - 1));
  return aggregateByDayRange(ymdLocal(start), ymdLocal(today));
}

function recent(n = 25) {
  return readLog().slice(0, n);
}

module.exports = {
  append,
  readLog,
  recent,
  aggregateByDay,
  aggregateByDayRange,
  topEndpointsInRange,
  resolveActivityRange,
  ymdLocal,
};
