/**
 * CORS + perlindungan Header kustom.
 */

function parseAllowedOrigins() {
  // Hanya ijinkan koneksi silang dari 3009 (atau set manual di .env)
  const raw = process.env.CORS_ORIGINS;
  if (raw && String(raw).trim()) {
    return String(raw)
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3009',
    'http://127.0.0.1:3009',
  ];
}

function buildCorsOptions() {
  const allowed = parseAllowedOrigins();
  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Scraptor-Signature', 'X-Scraptor-Timestamp'],
  };
}

const crypto = require('crypto');

/** 
 * Pengaman API via Dynamic HMAC Signature.
 * Memastikan request baru, punya timestamp hidup, dan hash origin tidak dirubah.
 */
function apiAccessGuard(req, res, next) {
  // Lewati pengecekan jika ini adalah rute login public/admin yang tidak sensitif
  if (req.path === '/auth/login' || req.path === '/public/config') {
    return next();
  }

  const timestamp = req.get('x-scraptor-timestamp');
  const clientSignature = req.get('x-scraptor-signature');
  const serverSecret = process.env.VITE_API_SECRET;

  if (!serverSecret) {
    console.warn('[SECURITY] VITE_API_SECRET is not set in .env! API is unprotected.');
    return next();
  }

  if (!timestamp || !clientSignature) {
    return res.status(403).json({
      error: 'Akses ditolak: Keamanan tidak teridentifikasi.',
    });
  }

  const now = Date.now();
  const reqTime = parseInt(timestamp, 10);

  // Batas toleransi 60 detik (60000ms)
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 60000) {
    return res.status(403).json({
      error: 'Akses ditolak: Sesi permintaan telah kedaluwarsa (Coba ulang).',
    });
  }

  // Bangun message persis seperti frontend
  const message = `${timestamp}:${serverSecret}`;
  const serverSignature = crypto.createHash('sha256').update(message).digest('hex');

  if (clientSignature !== serverSignature) {
    return res.status(403).json({
      error: 'Akses ditolak: Manipulasi terdeteksi (Invalid Signature).',
    });
  }

  next();
}

module.exports = {
  buildCorsOptions,
  apiAccessGuard,
  parseAllowedOrigins,
};
