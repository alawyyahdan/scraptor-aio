import { apiUrl } from '../config/apiBase';

const REFRESH_BEFORE_MS = 30_000;

let cachedToken = null;
let expiresAt = 0;
let mintPromise = null;

async function mintAccessToken() {
  const r = await fetch(apiUrl('/api/public/access-token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Respons token bukan JSON.');
  }
  if (!r.ok) {
    throw new Error(data.error || data.message || `Token ditolak (${r.status})`);
  }
  if (!data.token || typeof data.expiresIn !== 'number') {
    throw new Error('Format respons token tidak valid.');
  }
  cachedToken = data.token;
  expiresAt = Date.now() + data.expiresIn * 1000;
}

/**
 * Header Bearer untuk route API publik (bukan login admin).
 * Token diputar ulang sebelum kedaluwarsa.
 */
export async function getAccessAuthHeaders() {
  const stale = !cachedToken || Date.now() > expiresAt - REFRESH_BEFORE_MS;
  if (stale) {
    if (!mintPromise) {
      mintPromise = mintAccessToken().finally(() => {
        mintPromise = null;
      });
    }
    await mintPromise;
  }
  return cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {};
}

/** Setelah 401: coba mint baru sekali. */
export function invalidateAccessToken() {
  cachedToken = null;
  expiresAt = 0;
}
