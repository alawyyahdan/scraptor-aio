/**
 * Dev: kosong → `/api` lewat proxy Vite ke backend :3008.
 * Prod:
 *   - Set `VITE_API_BASE_URL` saat `npm run build` jika API di host lain (mis. https://scraptorapi.bica.ca).
 *   - Tanpa env: relatif `/api` (sama origin dengan halaman) — butuh nginx `location /api` → backend.
 *
 * Jangan pakai localhost di bundle production: di browser user itu artinya PC mereka, bukan VPS.
 */
const explicit = import.meta.env.VITE_API_BASE_URL;

export const API_BASE =
  explicit !== undefined && explicit !== ''
    ? explicit
    : import.meta.env.DEV
      ? ''
      : '';

/** URL absolut ke API (untuk fetch handshake token, axios, dll.) */
export function apiUrl(path) {
  const b = (API_BASE || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}
