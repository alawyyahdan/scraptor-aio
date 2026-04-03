/**
 * Dev: kosong → `/api` lewat proxy Vite ke backend :3008.
 * Prod: set VITE_API_BASE_URL ke URL publik API (mis. https://scraptorapi.bica.ca).
 */
const explicit = import.meta.env.VITE_API_BASE_URL;
export const API_BASE =
  explicit !== undefined && explicit !== ''
    ? explicit
    : import.meta.env.DEV
      ? ''
      : 'http://localhost:3008';

/** URL absolut ke API (untuk fetch handshake token, axios, dll.) */
export function apiUrl(path) {
  const b = (API_BASE || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}
