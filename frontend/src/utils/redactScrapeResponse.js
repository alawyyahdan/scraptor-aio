/** Must match backend/lib/redactPublicResponse.js — client-side mirror of server filtering */
const REDACT_KEYS = new Set([
  'credits_remaining',
  'credit_remaining',
  'remaining_credits',
  'creditsremaining',
  'creditremaining',
  'creditcount',
  'credit_count',
]);

export function redactScrapeResponse(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactScrapeResponse);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.has(String(k).toLowerCase())) continue;
    out[k] = redactScrapeResponse(v);
  }
  return out;
}
