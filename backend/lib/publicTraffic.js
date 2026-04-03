const fs = require('fs');
const path = require('path');
const { isSubmitQuotaExempt } = require('./adminSettings');

const FILE = path.join(__dirname, '..', 'data', 'public-traffic.json');
const MAX_VISITS = 12000;
const MAX_SUBMITS = 12000;
const MAX_SUBMITS_PER_IP_PER_DAY = 5;

function ensureDir() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore() {
  ensureDir();
  if (!fs.existsSync(FILE)) {
    return { visits: [], submits: [] };
  }
  try {
    const p = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return {
      visits: Array.isArray(p.visits) ? p.visits : [],
      submits: Array.isArray(p.submits) ? p.submits : [],
    };
  } catch {
    return { visits: [], submits: [] };
  }
}

function writeStore(store) {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8');
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

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function recordVisit(req) {
  const store = readStore();
  store.visits.unshift({
    at: new Date().toISOString(),
    ip: getClientIp(req),
    referrer: String(req.get('referer') || '').slice(0, 500),
  });
  store.visits = store.visits.slice(0, MAX_VISITS);
  writeStore(store);
}

/**
 * Cek kuota & catat 1 permintaan scrape (setelah validasi input).
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function assertSubmitSlot(req, routeLabel) {
  const ip = getClientIp(req);
  const store = readStore();
  if (!isSubmitQuotaExempt(ip)) {
    const day = ymdLocal(new Date());
    const used = store.submits.filter(
      (s) => s.ip === ip && ymdLocal(new Date(s.at)) === day
    ).length;
    if (used >= MAX_SUBMITS_PER_IP_PER_DAY) {
      return {
        ok: false,
        error: `Batas ${MAX_SUBMITS_PER_IP_PER_DAY} kali submit scrape per hari untuk IP Anda sudah tercapai. Coba lagi besok.`,
      };
    }
  }
  store.submits.unshift({
    at: new Date().toISOString(),
    ip,
    referrer: String(req.get('referer') || '').slice(0, 500),
    route: String(routeLabel || '').slice(0, 240),
  });
  store.submits = store.submits.slice(0, MAX_SUBMITS);
  writeStore(store);
  return { ok: true };
}

function visitsByDayRange(startYmd, endYmd) {
  const labels = eachYmdInRange(startYmd, endYmd);
  if (labels.length === 0) return [];
  const buckets = Object.fromEntries(labels.map((d) => [d, 0]));
  const { visits } = readStore();
  for (const v of visits) {
    const day = ymdLocal(new Date(v.at));
    if (buckets[day] !== undefined) buckets[day] += 1;
  }
  return labels.map((date) => ({ date, count: buckets[date] }));
}

function inRange(ts, start, end) {
  const t = new Date(ts);
  return t >= start && t <= end;
}

function summaryInRange(startYmd, endYmd) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (!start || !end) {
    return {
      totalVisits: 0,
      uniqueVisitIps: 0,
      totalSubmits: 0,
      uniqueSubmitIps: 0,
      submitQuotaPerIpPerDay: MAX_SUBMITS_PER_IP_PER_DAY,
    };
  }
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);

  const visitIps = new Set();
  let totalVisits = 0;
  const { visits, submits } = readStore();

  for (const v of visits) {
    if (!inRange(v.at, start, endDay)) continue;
    totalVisits += 1;
    visitIps.add(v.ip);
  }

  const submitIps = new Set();
  let totalSubmits = 0;
  for (const s of submits) {
    if (!inRange(s.at, start, endDay)) continue;
    totalSubmits += 1;
    submitIps.add(s.ip);
  }

  return {
    totalVisits,
    uniqueVisitIps: visitIps.size,
    totalSubmits,
    uniqueSubmitIps: submitIps.size,
    submitQuotaPerIpPerDay: MAX_SUBMITS_PER_IP_PER_DAY,
  };
}

function ipBreakdownInRange(startYmd, endYmd, limit = 50) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (!start || !end) return [];
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);

  const byIp = new Map();
  const addRef = (o, ref) => {
    const r = String(ref || '').trim();
    if (!r || o.referrers.length >= 6) return;
    if (!o.referrers.includes(r)) o.referrers.push(r.slice(0, 220));
  };

  const bump = (ip, kind, ref) => {
    if (!byIp.has(ip)) {
      byIp.set(ip, {
        ip,
        visits: 0,
        submits: 0,
        referrers: [],
      });
    }
    const o = byIp.get(ip);
    if (kind === 'visit') {
      o.visits += 1;
      addRef(o, ref);
    } else {
      o.submits += 1;
      addRef(o, ref);
    }
  };

  const { visits, submits } = readStore();
  for (const v of visits) {
    if (!inRange(v.at, start, endDay)) continue;
    bump(v.ip, 'visit', v.referrer);
  }
  for (const s of submits) {
    if (!inRange(s.at, start, endDay)) continue;
    bump(s.ip, 'submit', s.referrer);
  }

  return [...byIp.values()]
    .sort((a, b) => b.visits + b.submits - (a.visits + a.submits))
    .slice(0, limit);
}

module.exports = {
  recordVisit,
  assertSubmitSlot,
  getClientIp,
  visitsByDayRange,
  summaryInRange,
  ipBreakdownInRange,
  MAX_SUBMITS_PER_IP_PER_DAY,
};
