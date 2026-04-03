import { apiUrl } from '../config/apiBase';
import { getAccessAuthHeaders, invalidateAccessToken } from './apiAccess';

export { apiUrl };

function assertNotHtml(text) {
  const t = text.trim();
  if (t.startsWith('<') || t.startsWith('<!')) {
    throw new Error(
      'Server mengembalikan HTML, bukan JSON. Jalankan backend: `cd backend && node index.js` (port 3008). Lalu reload. Jangan set VITE_API_BASE_URL ke port frontend (3009).'
    );
  }
  return t;
}

async function withAccessAuth(path, init = {}) {
  const skip =
    path.includes('/public/access-token') ||
    path.includes('/public/config') ||
    path.includes('/api/auth/login');
  const auth = skip ? {} : await getAccessAuthHeaders();
  const headers = {
    ...auth,
    ...(init.headers || {}),
  };
  return { ...init, headers };
}

/** Fetch API: lempar error berisi pesan backend jika !ok */
export async function fetchJson(path, init = {}) {
  const doFetch = async () => {
    const finalInit = await withAccessAuth(path, init);
    return fetch(apiUrl(path), finalInit);
  };
  let res = await doFetch();
  if (res.status === 401 && !path.includes('/public/access-token')) {
    invalidateAccessToken();
    res = await doFetch();
  }
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
  const doFetch = async () => {
    const finalInit = await withAccessAuth(path, init);
    return fetch(apiUrl(path), finalInit);
  };
  let res = await doFetch();
  if (res.status === 401 && !path.includes('/public/access-token')) {
    invalidateAccessToken();
    res = await doFetch();
  }
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
