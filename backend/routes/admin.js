const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  readSettings,
  writeSettings,
  normalizeSite,
  normalizeSubmitQuotaExemptIps,
} = require('../lib/adminSettings');

function simpleEmailOk(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

router.get('/settings', verifyToken, (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  const s = readSettings();
  const key = s.scrapeCreatorsApiKey?.trim();
  const rKey = (s.resendApiKey || '').trim();
  const envR = !!(process.env.RESEND_API_KEY || '').trim();
  const from = (s.feedbackFromEmail || process.env.FEEDBACK_FROM_EMAIL || '').trim();
  const to = (s.feedbackToEmail || process.env.FEEDBACK_TO_EMAIL || '').trim();
  const effectiveKey = rKey || (process.env.RESEND_API_KEY || '').trim();
  const feedbackEmailReady = !!(
    effectiveKey &&
    from &&
    to &&
    simpleEmailOk(from) &&
    simpleEmailOk(to)
  );

  res.json({
    apiKeyConfigured: !!(key || process.env.SCRAPE_CREATORS_API_KEY),
    apiKeyHint: key
      ? `****${key.slice(-4)}`
      : process.env.SCRAPE_CREATORS_API_KEY
        ? '****(dari .env)'
        : '',
    apiKeyFromEnv: !key && !!process.env.SCRAPE_CREATORS_API_KEY,
    resendKeyHint: rKey ? `****${rKey.slice(-4)}` : envR ? '****(.env)' : '',
    resendKeyFromEnv: !rKey && envR,
    feedbackFromEmail: (s.feedbackFromEmail || '').trim(),
    feedbackToEmail: (s.feedbackToEmail || '').trim(),
    feedbackEmailReady,
    disabled: {
      v2: s.disabled?.v2 || [],
      legacy: s.disabled?.legacy || [],
    },
    site: s.site,
    submitQuotaExemptIps: s.submitQuotaExemptIps || [],
  });
});

/**
 * Body:
 * - scrapeCreatorsApiKey: string = set key; omit = no change; null | "" = clear file key (fall back to .env)
 * - disabled: { v2: string[], legacy: string[] }
 */
router.post('/settings', verifyToken, (req, res) => {
  const cur = readSettings();
  const next = {
    scrapeCreatorsApiKey: cur.scrapeCreatorsApiKey,
    resendApiKey: (cur.resendApiKey || '').trim(),
    feedbackFromEmail: (cur.feedbackFromEmail || '').trim(),
    feedbackToEmail: (cur.feedbackToEmail || '').trim(),
    disabled: { ...cur.disabled },
    site: cur.site,
    submitQuotaExemptIps: normalizeSubmitQuotaExemptIps(
      cur.submitQuotaExemptIps || []
    ),
  };

  if (Object.prototype.hasOwnProperty.call(req.body, 'resendApiKey')) {
    const v = req.body.resendApiKey;
    if (v === null || v === '') {
      next.resendApiKey = '';
    } else if (typeof v === 'string') {
      next.resendApiKey = v.trim();
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, 'feedbackFromEmail') &&
    typeof req.body.feedbackFromEmail === 'string'
  ) {
    next.feedbackFromEmail = String(req.body.feedbackFromEmail).trim().slice(0, 254);
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, 'feedbackToEmail') &&
    typeof req.body.feedbackToEmail === 'string'
  ) {
    next.feedbackToEmail = String(req.body.feedbackToEmail).trim().slice(0, 254);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'scrapeCreatorsApiKey')) {
    const v = req.body.scrapeCreatorsApiKey;
    if (v === null || v === '') {
      next.scrapeCreatorsApiKey = '';
    } else if (typeof v === 'string') {
      next.scrapeCreatorsApiKey = v.trim();
    }
  }

  if (req.body.disabled && typeof req.body.disabled === 'object') {
    if (Array.isArray(req.body.disabled.v2)) {
      next.disabled.v2 = [...new Set(req.body.disabled.v2.map(String))];
    }
    if (Array.isArray(req.body.disabled.legacy)) {
      next.disabled.legacy = [...new Set(req.body.disabled.legacy.map(String))];
    }
  }

  if (req.body.site !== undefined && typeof req.body.site === 'object') {
    next.site = normalizeSite(req.body.site);
  }

  if (Array.isArray(req.body.submitQuotaExemptIps)) {
    next.submitQuotaExemptIps = normalizeSubmitQuotaExemptIps(
      req.body.submitQuotaExemptIps
    );
  }

  writeSettings(next);
  const key = next.scrapeCreatorsApiKey;
  const rKey = (next.resendApiKey || '').trim();
  const envR = !!(process.env.RESEND_API_KEY || '').trim();
  const from = (next.feedbackFromEmail || process.env.FEEDBACK_FROM_EMAIL || '').trim();
  const to = (next.feedbackToEmail || process.env.FEEDBACK_TO_EMAIL || '').trim();
  const effectiveKey = rKey || (process.env.RESEND_API_KEY || '').trim();

  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.json({
    ok: true,
    apiKeyConfigured: !!(key || process.env.SCRAPE_CREATORS_API_KEY),
    apiKeyHint: key ? `****${key.slice(-4)}` : '',
    resendKeyHint: rKey ? `****${rKey.slice(-4)}` : envR ? '****(.env)' : '',
    resendKeyFromEnv: !rKey && envR,
    feedbackFromEmail: (next.feedbackFromEmail || '').trim(),
    feedbackToEmail: (next.feedbackToEmail || '').trim(),
    feedbackEmailReady: !!(
      effectiveKey &&
      from &&
      to &&
      simpleEmailOk(from) &&
      simpleEmailOk(to)
    ),
    disabled: next.disabled,
    site: next.site,
    submitQuotaExemptIps: next.submitQuotaExemptIps || [],
  });
});

module.exports = router;
