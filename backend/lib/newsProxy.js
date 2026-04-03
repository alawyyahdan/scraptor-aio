const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

let rotateIdx = 0;

function normalizeProxyUrl(s) {
    if (!s || !String(s).trim()) return null;
    let x = String(s).trim();
    if (!/^https?:\/\//i.test(x) && !/^socks5:\/\//i.test(x)) {
        x = `http://${x}`;
    }
    return x;
}

function staticProxyList() {
    const raw = process.env.NEWS_PROXY_LIST || process.env.NEWS_HTTP_PROXY || '';
    if (!raw.trim()) return [];
    return raw.split(',').map((x) => normalizeProxyUrl(x)).filter(Boolean);
}

/**
 * URL yang di-GET sekali per scrape (proxy rotasi dari API penyedia).
 * Respons: JSON { "proxy": "http://..." } / { "url": "..." } / teks satu baris URL.
 * Opsional auth: NEWS_PROXY_PROVIDER_AUTH=Bearer ... (header Authorization)
 */
async function fetchProxyFromProvider() {
    const url = (process.env.NEWS_PROXY_PROVIDER_URL || '').trim();
    if (!url) return null;
    const headers = {};
    const auth = (process.env.NEWS_PROXY_PROVIDER_AUTH || '').trim();
    if (auth) headers.Authorization = auth;
    try {
        const r = await axios.get(url, {
            timeout: 20000,
            validateStatus: (st) => st < 500,
            headers,
        });
        if (r.status >= 400) return null;
        if (r.data && typeof r.data === 'object') {
            const raw =
                r.data.proxy ||
                r.data.url ||
                r.data.http ||
                r.data.https ||
                (Array.isArray(r.data.proxies) && r.data.proxies[0]) ||
                (Array.isArray(r.data.data) && r.data.data[0]);
            if (raw) return normalizeProxyUrl(String(raw));
        }
        if (typeof r.data === 'string') {
            const line = r.data.split(/\r?\n/).find((l) => l.trim());
            if (line && /^https?:\/\//i.test(line.trim())) {
                return normalizeProxyUrl(line.trim());
            }
        }
        return null;
    } catch (e) {
        console.warn('[newsProxy] NEWS_PROXY_PROVIDER_URL failed:', e.message);
        return null;
    }
}

function axiosAgents(proxyUrl) {
    if (!proxyUrl || /^socks5:\/\//i.test(proxyUrl)) {
        if (proxyUrl && /^socks5:\/\//i.test(proxyUrl)) {
            console.warn(
                '[newsProxy] SOCKS5 tidak didukung oleh agent HTTP saat ini; pakai http:// proxy atau tanpa proxy.'
            );
        }
        return {};
    }
    try {
        const ag = new HttpsProxyAgent(proxyUrl);
        return { httpsAgent: ag, httpAgent: ag, proxy: false };
    } catch (e) {
        console.warn('[newsProxy] HttpsProxyAgent:', e.message);
        return {};
    }
}

/** Untuk Chromium: --proxy-server=... + page.authenticate jika user:pass di URL */
function puppeteerProxyParts(proxyUrl) {
    if (!proxyUrl || /^socks5:\/\//i.test(proxyUrl)) {
        return { launchProxyArg: null, proxyAuth: null };
    }
    try {
        const u = new URL(proxyUrl);
        const port = u.port || (u.protocol === 'https:' ? '443' : '80');
        const launchProxyArg = `${u.protocol}//${u.hostname}:${port}`;
        const proxyAuth =
            u.username || u.password
                ? {
                      username: decodeURIComponent(u.username || ''),
                      password: decodeURIComponent(u.password || ''),
                  }
                : null;
        return { launchProxyArg, proxyAuth };
    } catch {
        return { launchProxyArg: null, proxyAuth: null };
    }
}

/**
 * Satu konteks proxy per POST /news/scrape:
 * - NEWS_PROXY_PROVIDER_URL: ambil proxy baru dari API (prioritas)
 * - NEWS_PROXY_LIST / NEWS_HTTP_PROXY: round-robin
 */
async function resolveNewsSessionProxy() {
    const fromProvider = await fetchProxyFromProvider();
    let url = fromProvider;
    if (!url) {
        const list = staticProxyList();
        if (list.length > 0) url = list[rotateIdx++ % list.length];
    }
    if (!url) {
        return {
            url: null,
            axiosAgents: {},
            extractAgent: null,
            launchProxyArg: null,
            proxyAuth: null,
        };
    }
    const axiosExtra = axiosAgents(url);
    const extractAgent = axiosExtra.httpsAgent || null;
    const { launchProxyArg, proxyAuth } = puppeteerProxyParts(url);
    return {
        url,
        axiosAgents: axiosExtra,
        extractAgent,
        launchProxyArg,
        proxyAuth,
    };
}

module.exports = {
    resolveNewsSessionProxy,
    normalizeProxyUrl,
};
