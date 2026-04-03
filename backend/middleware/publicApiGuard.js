const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function parseList(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

/** Production + FRONTEND_ORIGINS terisi → kunci ketat (CORS + Origin di guard). */
function strictFrontendLock() {
  return (
    process.env.NODE_ENV === 'production' &&
    parseList(process.env.FRONTEND_ORIGINS).length > 0
  );
}

function frontendOriginSet() {
  return new Set(parseList(process.env.FRONTEND_ORIGINS));
}

function originFromReferer(referer) {
  if (!referer || typeof referer !== 'string') return null;
  try {
    return new URL(referer.trim()).origin;
  } catch {
    return null;
  }
}

/** Header Origin; bila kosong (mis. proxy tidak meneruskan), pakai origin dari Referer. */
function getEffectiveOrigin(req) {
  const direct = req.get('origin');
  if (direct) return direct;
  return originFromReferer(req.get('referer'));
}

/**
 * Production dengan whitelist: hanya origin frontend (bukan reflect semua).
 * Dev / tanpa FRONTEND_ORIGINS: tetap reflect (nyaman lokal).
 */
function buildCorsOptions() {
  if (strictFrontendLock()) {
    const allowed = frontendOriginSet();
    return {
      origin(origin, callback) {
        if (!origin) return callback(null, false);
        if (allowed.has(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    };
  }
  return {
    origin: true,
    credentials: true,
  };
}

/** Origin yang boleh minta access token. */
function allowedHandshakeOrigins() {
  const fromEnv = parseList(process.env.FRONTEND_ORIGINS);
  if (fromEnv.length) return new Set(fromEnv);
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  return new Set([
    'http://localhost:3009',
    'http://127.0.0.1:3009',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);
}

function getPublicAccessSecret() {
  const s =
    process.env.PUBLIC_ACCESS_SECRET ||
    (process.env.JWT_SECRET && `${process.env.JWT_SECRET}.scraptor.public`);
  if (!s) {
    throw new Error(
      'PUBLIC_ACCESS_SECRET (atau JWT_SECRET) wajib ada untuk token akses publik'
    );
  }
  return s;
}

const ACCESS_TTL_SEC = Math.min(
  600,
  Math.max(60, parseInt(process.env.PUBLIC_ACCESS_TTL_SEC || '180', 10) || 180)
);

function issuePublicAccessToken(req, res) {
  let allowed;
  try {
    allowed = allowedHandshakeOrigins();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  if (allowed == null) {
    return res.status(503).json({
      error:
        'FRONTEND_ORIGINS belum di-set (.env). Contoh: https://app.domain.com (pisahkan koma).',
    });
  }

  const origin = getEffectiveOrigin(req);
  if (!origin || !allowed.has(origin)) {
    return res.status(403).json({
      error: 'Origin tidak diizinkan meminta token. Sesuaikan FRONTEND_ORIGINS.',
    });
  }

  const secret = getPublicAccessSecret();
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign(
    {
      scraptor: 'access',
      jti,
      origin,
    },
    secret,
    { expiresIn: ACCESS_TTL_SEC, algorithm: 'HS256' }
  );

  return res.json({
    token,
    expiresIn: ACCESS_TTL_SEC,
    tokenType: 'Bearer',
  });
}

function readBearer(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const alt = req.get('x-scraptor-access');
  return alt ? String(alt).trim() : null;
}

function apiAccessGuard(req, res, next) {
  const secret = getPublicAccessSecret();
  const raw = readBearer(req);
  if (!raw) {
    return res.status(401).json({
      error: 'Akses API memerlukan token. Muat ulang halaman.',
    });
  }
  try {
    const payload = jwt.verify(raw, secret, {
      algorithms: ['HS256'],
    });
    if (payload.scraptor !== 'access' || !payload.origin) {
      return res.status(403).json({ error: 'Token akses tidak valid.' });
    }

    const effectiveOrigin = getEffectiveOrigin(req);
    if (strictFrontendLock() && !effectiveOrigin) {
      return res.status(403).json({
        error:
          'Permintaan ditolak: butuh Origin atau Referer dari frontend. Cek nginx: proxy_set_header Origin $http_origin; proxy_set_header Referer $http_referer;',
      });
    }
    if (
      strictFrontendLock() &&
      effectiveOrigin &&
      !frontendOriginSet().has(effectiveOrigin)
    ) {
      return res.status(403).json({ error: 'Origin tidak diizinkan.' });
    }
    if (effectiveOrigin && effectiveOrigin !== payload.origin) {
      return res.status(403).json({ error: 'Token tidak cocok dengan asal permintaan.' });
    }

    req.publicAccess = payload;
    return next();
  } catch (e) {
    const msg =
      e.name === 'TokenExpiredError'
        ? 'Token akses kedaluwarsa. Muat ulang halaman.'
        : 'Token akses tidak valid.';
    return res.status(401).json({ error: msg });
  }
}

module.exports = {
  buildCorsOptions,
  issuePublicAccessToken,
  apiAccessGuard,
  allowedHandshakeOrigins,
};
