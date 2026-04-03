import { API_BASE } from '../config/apiBase';
import { generateSignature } from './signature';

/** URL lengkap untuk API (dev: path relatif `/api/...` lewat proxy Vite) */
export function apiUrl(path) {
  const b = (API_BASE || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

function assertNotHtml(text) {
  const t = text.trim();
  if (t.startsWith('<') || t.startsWith('<!')) {
    throw new Error(
      'Server mengembalikan HTML, bukan JSON. Jalankan backend: `cd backend && node index.js` (port 3008). Lalu reload. Jangan set VITE_API_BASE_URL ke port frontend (3009).'
    );
  }
  return t;
}

async function injectHeader(init) {
  const { signature, timestamp } = await generateSignature();
  return {
    ...init,
    headers: {
      ...init.headers,
      'X-Scraptor-Signature': signature,
      'X-Scraptor-Timestamp': timestamp,
    },
  };
}

/** Fetch API: lempar error berisi pesan backend jika !ok */
export async function fetchJson(path, init = {}) {
  const finalInit = await injectHeader(init);
  const res = await fetch(apiUrl(path), finalInit);
  const text = await res.text();
  const t = assertNotHtml(text);
  let data;
  try {
    data = t ? JSON.parse(t) : null;
  } catch {
    throw new Error('Respons server bukan JSON yang valid.');
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Permintaan gagal (${res.status})`);
  }
  return data;
}

/** Sama fetchJson tapi kembalikan { ok, status, data } untuk skema error HTTP yang ditangani UI */
export async function fetchApi(path, init = {}) {
  const finalInit = await injectHeader(init);
  const res = await fetch(apiUrl(path), finalInit);
  const text = await res.text();
  try {
    const t = assertNotHtml(text);
    const data = t ? JSON.parse(t) : {};
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    if (String(e.message).includes('HTML')) {
      return {
        ok: false,
        status: res.status,
        data: { error: e.message },
      };
    }
    return {
      ok: false,
      status: res.status,
      data: { error: text.slice(0, 180) || 'Respons tidak valid' },
    };
  }
}
