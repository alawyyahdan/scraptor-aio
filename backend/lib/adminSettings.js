const fs = require('fs');
const path = require('path');
const net = require('net');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'admin-settings.json');

const ALLOWED_HERO_ICONS = new Set([
  'Sparkles',
  'Layers',
  'Shield',
  'Zap',
  'Globe2',
  'Database',
  'Cpu',
  'Heart',
  'Star',
  'Info',
  'LayoutDashboard',
  'Search',
  'Wrench',
  'Megaphone',
  'Lock',
  'Rocket',
]);

const ALLOWED_CARD_ICONS = ALLOWED_HERO_ICONS;
const ALLOWED_CARD_COLORS = new Set([
  'fuchsia',
  'amber',
  'emerald',
  'sky',
  'violet',
  'rose',
  'indigo',
]);

const MAX_SUBMIT_QUOTA_EXEMPT_IPS = 200;

/** Normalize IP for quota match (::ffff:x.x.x.x → IPv4). */
function normalizeClientIpForQuota(ip) {
  let s = String(ip || '').trim();
  if (!s) return '';
  if (s.toLowerCase().startsWith('::ffff:')) s = s.slice(7);
  return s;
}

function normalizeSubmitQuotaExemptIps(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const t = normalizeClientIpForQuota(x);
    if (!t || net.isIP(t) === 0) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_SUBMIT_QUOTA_EXEMPT_IPS) break;
  }
  return out;
}

function isSubmitQuotaExempt(clientIp) {
  const list = normalizeSubmitQuotaExemptIps(
    readSettings().submitQuotaExemptIps
  );
  const n = normalizeClientIpForQuota(clientIp);
  return Boolean(n && list.includes(n));
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function defaultSettings() {
  return {
    scrapeCreatorsApiKey: '',
    resendApiKey: '',
    feedbackFromEmail: '',
    feedbackToEmail: '',
    disabled: { v2: [], legacy: [] },
    site: defaultSite(),
    submitQuotaExemptIps: [],
  };
}

function defaultDonationPopup() {
  return {
    enabled: false,
    clickThreshold: 5,
    title: 'Dukung pengembangan',
    body:
      'Jika layanan ini membantu pekerjaan Anda, silakan berdonasi melalui QRIS di bawah. Setiap dukungan sangat kami hargai — terima kasih!',
    imageUrl: '/qris.jpeg',
    closeDelayEnabled: true,
    closeDelaySeconds: 5,
    closeLabel: 'Tutup',
    paypalEnabled: false,
    paypalUrl: '',
    paypalLabel: 'Donasi via PayPal',
  };
}

function defaultModals() {
  return {
    terms: {
      title: 'Quick terms',
      subtitle:
        'Scraptor UI — public extraction tools (Scrape Creators API + local legacy modules).',
      bullets: [
        'You use this service at your own risk. Results depend on third parties and may change anytime.',
        'Follow the sites you access and applicable laws (including privacy and copyright). Do not misuse collected data.',
        'To protect the server, each IP is limited to 5 scrape submits per day (v2 Execute & legacy). Page visits are aggregated in the admin panel.',
        'The server may omit sensitive fields from proxied API responses.',
        'No guarantee of availability, accuracy, or completeness. The service may change or stop without notice.',
      ],
      footerNote:
        'By continuing, you confirm you have read and accept the above and accept responsibility for how you use scraping features.',
      acceptLabel: 'I agree & continue',
    },
    desktopNotice: {
      enabled: true,
      title: 'Phone & desktop',
      body:
        'This UI is responsive on phones and works fully on desktop. On large screens, endpoint tabs, long forms, and Dashboard are easier. You can keep using this device or open the same URL on a PC.',
      dismissLabel: 'Got it, continue',
    },
    donationPopup: defaultDonationPopup(),
  };
}

function defaultBranding() {
  return {
    appName: 'Scraptor UI',
    appSubtitle: 'Public + Admin',
    sidebarIcon: 'LayoutDashboard',
    documentTitle: 'Scraptor UI',
    faviconUrl: '',
  };
}

function isAllowedFaviconUrl(u) {
  const s = String(u).trim();
  if (!s) return true;
  if (/^data:image\/(png|gif|webp|jpeg|svg\+xml|x-icon|vnd\.microsoft\.icon);/i.test(s)) {
    return s.length <= 200000;
  }
  try {
    const p = new URL(s);
    return p.protocol === 'https:' || p.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeBranding(raw, defaults) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const icon = ALLOWED_HERO_ICONS.has(String(src.sidebarIcon))
    ? String(src.sidebarIcon)
    : defaults.sidebarIcon;
  let faviconUrl = String(src.faviconUrl || '').trim();
  if (faviconUrl && !isAllowedFaviconUrl(faviconUrl)) faviconUrl = '';
  if (faviconUrl.length > 200000) faviconUrl = faviconUrl.slice(0, 200000);
  return {
    appName: String(src.appName || defaults.appName).trim().slice(0, 80) || defaults.appName,
    appSubtitle: String(src.appSubtitle || defaults.appSubtitle).trim().slice(0, 120) || defaults.appSubtitle,
    sidebarIcon: icon,
    documentTitle:
      String(src.documentTitle || defaults.documentTitle).trim().slice(0, 120) ||
      defaults.documentTitle,
    faviconUrl,
  };
}

function defaultSite() {
  return {
    branding: defaultBranding(),
    maintenance: {
      enabled: false,
      message:
        'We are performing maintenance. Please try again later.',
    },
    banners: {
      warning: { enabled: false, text: '' },
      info: { enabled: false, text: '' },
      success: { enabled: false, text: '' },
    },
    beranda: {
      heroBadge: '',
      heroTitle: '',
      heroSubtitle: '',
      searchTitle: '',
      heroIcon: 'Sparkles',
      cardMode: 'append',
      featureCards: [],
    },
    modals: defaultModals(),
  };
}

function normalizeTermsModal(t, defaults) {
  const src = t && typeof t === 'object' ? t : {};
  let bullets = Array.isArray(src.bullets)
    ? src.bullets
        .map((x) => String(x).trim().slice(0, 2000))
        .filter(Boolean)
        .slice(0, 20)
    : [];
  if (bullets.length === 0) bullets = [...defaults.bullets];
  return {
    title: String(src.title || defaults.title).trim().slice(0, 200) || defaults.title,
    subtitle:
      String(src.subtitle || defaults.subtitle).trim().slice(0, 500) ||
      defaults.subtitle,
    bullets,
    footerNote:
      String(src.footerNote || defaults.footerNote).trim().slice(0, 2000) ||
      defaults.footerNote,
    acceptLabel:
      String(src.acceptLabel || defaults.acceptLabel).trim().slice(0, 120) ||
      defaults.acceptLabel,
  };
}

function normalizeDesktopNotice(x, defaults) {
  const src = x && typeof x === 'object' ? x : {};
  return {
    enabled: src.enabled !== false,
    title: String(src.title || defaults.title).trim().slice(0, 200) || defaults.title,
    body: String(src.body || defaults.body).trim().slice(0, 4000) || defaults.body,
    dismissLabel:
      String(src.dismissLabel || defaults.dismissLabel).trim().slice(0, 120) ||
      defaults.dismissLabel,
  };
}

function isAllowedDonationImageUrl(u) {
  const s = String(u).trim();
  if (!s) return false;
  if (s.startsWith('/')) {
    if (s.includes('..')) return false;
    return s.length <= 500;
  }
  try {
    const p = new URL(s);
    return p.protocol === 'https:' || p.protocol === 'http:';
  } catch {
    return false;
  }
}

/** https / http donation link (e.g. PayPal.me). */
function isAllowedPaypalUrl(u) {
  const s = String(u).trim();
  if (!s || s.length > 2000) return false;
  try {
    const p = new URL(s);
    return p.protocol === 'https:' || p.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeDonationPopup(raw, defaults) {
  const src = raw && typeof raw === 'object' ? raw : {};
  let clickThreshold = parseInt(String(src.clickThreshold), 10);
  if (!Number.isFinite(clickThreshold)) clickThreshold = defaults.clickThreshold;
  clickThreshold = Math.min(100, Math.max(1, clickThreshold));

  let closeDelaySeconds = parseInt(String(src.closeDelaySeconds), 10);
  if (!Number.isFinite(closeDelaySeconds)) closeDelaySeconds = defaults.closeDelaySeconds;
  closeDelaySeconds = Math.min(120, Math.max(0, closeDelaySeconds));

  const delayOn = src.closeDelayEnabled !== false;
  if (delayOn && closeDelaySeconds < 1) closeDelaySeconds = 1;

  let imageUrl = String(src.imageUrl ?? defaults.imageUrl)
    .trim()
    .slice(0, 500);
  if (!isAllowedDonationImageUrl(imageUrl)) imageUrl = defaults.imageUrl;

  let paypalUrl = String(src.paypalUrl ?? '').trim().slice(0, 2000);
  if (!isAllowedPaypalUrl(paypalUrl)) paypalUrl = '';
  const paypalEnabled = !!src.paypalEnabled && !!paypalUrl;

  return {
    enabled: !!src.enabled,
    clickThreshold,
    title: String(src.title || defaults.title).trim().slice(0, 200) || defaults.title,
    body: String(src.body || defaults.body).trim().slice(0, 4000) || defaults.body,
    imageUrl,
    closeDelayEnabled: delayOn,
    closeDelaySeconds,
    closeLabel:
      String(src.closeLabel || defaults.closeLabel).trim().slice(0, 120) || defaults.closeLabel,
    paypalEnabled,
    paypalUrl,
    paypalLabel:
      String(src.paypalLabel || defaults.paypalLabel).trim().slice(0, 120) ||
      defaults.paypalLabel,
  };
}

function normalizeBanner(b, maxLen) {
  if (!b || typeof b !== 'object') return { enabled: false, text: '' };
  return {
    enabled: !!b.enabled,
    text: String(b.text || '')
      .trim()
      .slice(0, maxLen),
  };
}

function normalizeFeatureCards(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 12).map((c, i) => {
    const icon = ALLOWED_CARD_ICONS.has(String(c.icon)) ? String(c.icon) : 'Layers';
    const iconColor = ALLOWED_CARD_COLORS.has(String(c.iconColor))
      ? String(c.iconColor)
      : 'fuchsia';
    return {
      id: String(c.id || `fc-${Date.now()}-${i}`).replace(/[^\w-]/g, '').slice(0, 48) || `fc-${i}`,
      enabled: c.enabled !== false,
      icon,
      iconColor,
      title: String(c.title || '').trim().slice(0, 160),
      body: String(c.body || '').trim().slice(0, 4000),
    };
  });
}

function normalizeSite(raw) {
  const d = defaultSite();
  if (!raw || typeof raw !== 'object') return d;

  const m = raw.maintenance || {};
  const b = raw.banners || {};
  const ber = raw.beranda || {};
  const mod = raw.modals || {};
  const dm = defaultModals();
  const db = defaultBranding();

  const cardMode = ber.cardMode === 'replace' ? 'replace' : 'append';

  return {
    branding: normalizeBranding(raw.branding, db),
    maintenance: {
      enabled: !!m.enabled,
      message: String(m.message || d.maintenance.message).trim().slice(0, 4000),
    },
    banners: {
      warning: normalizeBanner(b.warning, 2000),
      info: normalizeBanner(b.info, 2000),
      success: normalizeBanner(b.success, 2000),
    },
    beranda: {
      heroBadge: String(ber.heroBadge || '').trim().slice(0, 160),
      heroTitle: String(ber.heroTitle || '').trim().slice(0, 400),
      heroSubtitle: String(ber.heroSubtitle || '').trim().slice(0, 8000),
      searchTitle: String(ber.searchTitle || '').trim().slice(0, 300),
      heroIcon: ALLOWED_HERO_ICONS.has(String(ber.heroIcon))
        ? String(ber.heroIcon)
        : 'Sparkles',
      cardMode,
      featureCards: normalizeFeatureCards(ber.featureCards),
    },
    modals: {
      terms: normalizeTermsModal(mod.terms, dm.terms),
      desktopNotice: normalizeDesktopNotice(mod.desktopNotice, dm.desktopNotice),
      donationPopup: normalizeDonationPopup(mod.donationPopup, dm.donationPopup),
    },
  };
}

function normalizeStoredFeedbackEmails(from, to) {
  return {
    feedbackFromEmail: String(from ?? '')
      .trim()
      .slice(0, 254),
    feedbackToEmail: String(to ?? '')
      .trim()
      .slice(0, 254),
  };
}

function readSettings() {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return defaultSettings();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    const emails = normalizeStoredFeedbackEmails(
      parsed.feedbackFromEmail,
      parsed.feedbackToEmail
    );
    const merged = {
      ...defaultSettings(),
      ...parsed,
      resendApiKey: String(parsed.resendApiKey || '').trim(),
      feedbackFromEmail: emails.feedbackFromEmail,
      feedbackToEmail: emails.feedbackToEmail,
      disabled: {
        v2: Array.isArray(parsed.disabled?.v2) ? parsed.disabled.v2 : [],
        legacy: Array.isArray(parsed.disabled?.legacy)
          ? parsed.disabled.legacy
          : [],
      },
      site: normalizeSite(parsed.site),
      submitQuotaExemptIps: normalizeSubmitQuotaExemptIps(
        parsed.submitQuotaExemptIps
      ),
    };
    return merged;
  } catch {
    return defaultSettings();
  }
}

function writeSettings(data) {
  ensureDir();
  const emails = normalizeStoredFeedbackEmails(
    data.feedbackFromEmail,
    data.feedbackToEmail
  );
  const payload = {
    scrapeCreatorsApiKey: data.scrapeCreatorsApiKey ?? '',
    resendApiKey: String(data.resendApiKey ?? '').trim(),
    feedbackFromEmail: emails.feedbackFromEmail,
    feedbackToEmail: emails.feedbackToEmail,
    disabled: {
      v2: data.disabled?.v2 || [],
      legacy: data.disabled?.legacy || [],
    },
    site: normalizeSite(data.site),
    submitQuotaExemptIps: normalizeSubmitQuotaExemptIps(
      data.submitQuotaExemptIps || []
    ),
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function getApiKey() {
  const fromFile = readSettings().scrapeCreatorsApiKey?.trim();
  if (fromFile) return fromFile;
  return (process.env.SCRAPE_CREATORS_API_KEY || '').trim();
}

/** Resend + feedback routing: admin file first, then .env */
function getResendFeedbackConfig() {
  const s = readSettings();
  const apiKey = (s.resendApiKey || process.env.RESEND_API_KEY || '').trim();
  const from = (s.feedbackFromEmail || process.env.FEEDBACK_FROM_EMAIL || '').trim();
  const to = (s.feedbackToEmail || process.env.FEEDBACK_TO_EMAIL || '').trim();
  return { apiKey, from, to };
}

function getPublicConfig() {
  const s = readSettings();
  const site = normalizeSite(s.site);
  return {
    disabled: {
      v2: s.disabled?.v2 || [],
      legacy: s.disabled?.legacy || [],
    },
    apiKeyConfigured: !!getApiKey(),
    site,
  };
}

module.exports = {
  readSettings,
  writeSettings,
  getApiKey,
  getPublicConfig,
  getResendFeedbackConfig,
  defaultSite,
  normalizeSite,
  normalizeSubmitQuotaExemptIps,
  isSubmitQuotaExempt,
  SETTINGS_FILE,
};
