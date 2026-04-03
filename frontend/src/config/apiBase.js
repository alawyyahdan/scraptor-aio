/**
 * Dev: string kosong → request ke origin Vite; `vite.config.js` mem-proxy `/api` ke backend :5001.
 * Produksi: fallback localhost:5001 kecuali VITE_API_BASE_URL di-set (URL backend Anda).
 */
const explicit = import.meta.env.VITE_API_BASE_URL;
export const API_BASE =
  explicit !== undefined && explicit !== ''
    ? explicit
    : import.meta.env.DEV
      ? ''
      : 'http://localhost:5001';
