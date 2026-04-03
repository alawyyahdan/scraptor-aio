/** Safe defaults when config is not loaded yet or fields are empty. */
export const DEFAULT_TERMS_MODAL = {
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
};

export const DEFAULT_DESKTOP_NOTICE = {
  enabled: true,
  title: 'Phone & desktop',
  body:
    'This UI is responsive on phones and works fully on desktop. On large screens, endpoint tabs, long forms, and Dashboard are easier. You can keep using this device or open the same URL on a PC.',
  dismissLabel: 'Got it, continue',
};

export const DEFAULT_DONATION_POPUP = {
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

function isPaypalUrlOk(s) {
  const u = String(s || '').trim();
  if (!u || u.length > 2000) return false;
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:';
  } catch {
    return false;
  }
}

export function mergeTermsModal(fromServer) {
  const d = DEFAULT_TERMS_MODAL;
  if (!fromServer || typeof fromServer !== 'object') {
    return { ...d, bullets: [...d.bullets] };
  }
  let bullets = Array.isArray(fromServer.bullets)
    ? fromServer.bullets.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (bullets.length === 0) bullets = [...d.bullets];
  return {
    title: (String(fromServer.title || '').trim() || d.title).slice(0, 200),
    subtitle: (String(fromServer.subtitle || '').trim() || d.subtitle).slice(0, 500),
    bullets,
    footerNote: (String(fromServer.footerNote || '').trim() || d.footerNote).slice(0, 2000),
    acceptLabel: (String(fromServer.acceptLabel || '').trim() || d.acceptLabel).slice(0, 120),
  };
}

export function mergeDesktopNotice(fromServer) {
  const d = DEFAULT_DESKTOP_NOTICE;
  if (!fromServer || typeof fromServer !== 'object') {
    return { ...d };
  }
  return {
    enabled: fromServer.enabled !== false,
    title: (String(fromServer.title || '').trim() || d.title).slice(0, 200),
    body: (String(fromServer.body || '').trim() || d.body).slice(0, 4000),
    dismissLabel: (String(fromServer.dismissLabel || '').trim() || d.dismissLabel).slice(0, 120),
  };
}

export function mergeDonationPopup(fromServer) {
  const d = DEFAULT_DONATION_POPUP;
  if (!fromServer || typeof fromServer !== 'object') {
    return { ...d };
  }
  let clickThreshold = parseInt(String(fromServer.clickThreshold), 10);
  if (!Number.isFinite(clickThreshold)) clickThreshold = d.clickThreshold;
  clickThreshold = Math.min(100, Math.max(1, clickThreshold));
  let closeDelaySeconds = parseInt(String(fromServer.closeDelaySeconds), 10);
  if (!Number.isFinite(closeDelaySeconds)) closeDelaySeconds = d.closeDelaySeconds;
  closeDelaySeconds = Math.min(120, Math.max(0, closeDelaySeconds));
  const delayOn = fromServer.closeDelayEnabled !== false;
  if (delayOn && closeDelaySeconds < 1) closeDelaySeconds = 1;
  const imageUrlRaw = String(fromServer.imageUrl ?? d.imageUrl).trim().slice(0, 500);
  const imageUrl =
    imageUrlRaw.startsWith('/') || /^https?:\/\//i.test(imageUrlRaw) ? imageUrlRaw : d.imageUrl;
  let paypalUrl = String(fromServer.paypalUrl ?? '').trim().slice(0, 2000);
  if (!isPaypalUrlOk(paypalUrl)) paypalUrl = '';
  const paypalEnabled = !!fromServer.paypalEnabled && !!paypalUrl;

  return {
    enabled: !!fromServer.enabled,
    clickThreshold,
    title: (String(fromServer.title || '').trim() || d.title).slice(0, 200),
    body: (String(fromServer.body || '').trim() || d.body).slice(0, 4000),
    imageUrl,
    closeDelayEnabled: delayOn,
    closeDelaySeconds,
    closeLabel: (String(fromServer.closeLabel || '').trim() || d.closeLabel).slice(0, 120),
    paypalEnabled,
    paypalUrl,
    paypalLabel: (String(fromServer.paypalLabel || '').trim() || d.paypalLabel).slice(0, 120),
  };
}
