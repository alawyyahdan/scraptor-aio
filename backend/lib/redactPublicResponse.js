/**
 * Strip fields that must not be sent to public clients.
 */
const REDACT_KEYS = new Set([
  'credits_remaining',
  'credit_remaining',
  'remaining_credits',
  'creditsremaining',
  'creditremaining',
  'creditcount',
  'credit_count',
]);

function redactKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactKeys);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.has(String(k).toLowerCase())) continue;
    out[k] = redactKeys(v);
  }
  return out;
}

module.exports = { redactKeys };
