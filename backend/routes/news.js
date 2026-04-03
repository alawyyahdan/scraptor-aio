const express = require('express');
const router = express.Router();
const { extract, extractFromHtml } = require('@extractus/article-extractor');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const activityLog = require('../lib/activityLog');
const publicTraffic = require('../lib/publicTraffic');
const { resolveNewsSessionProxy } = require('../lib/newsProxy');

/** Header mirip browser — banyak portal (CNN/Detik, dll.) memblokir request “bot” polos (403). */
const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

function headersForCategoryFetch(categoryUrl) {
    let origin;
    try {
        origin = new URL(categoryUrl).origin;
    } catch {
        return { ...BROWSER_HEADERS };
    }
    return {
        ...BROWSER_HEADERS,
        Referer: `${origin}/`,
    };
}

/** Fetch artikel dari halaman indeks: Referer = URL kategori (bukan Sec-Fetch navigasi palsu). */
function headersForArticleFetch(articleUrl, categoryUrl) {
    return {
        'User-Agent': BROWSER_HEADERS['User-Agent'],
        Accept: BROWSER_HEADERS.Accept,
        'Accept-Language': BROWSER_HEADERS['Accept-Language'],
        Referer: categoryUrl,
    };
}

const CATEGORY_FETCH_MS = 90000;
const PER_ARTICLE_EXTRACT_MS = 35000;
const EXTRACT_CONCURRENCY = 3;
const PUPPETEER_NAV_MS = 90000;

const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
];

async function fetchCategoryHtmlAxios(categoryUrl, sessionCtx) {
    const agents = sessionCtx.axiosAgents || {};
    return axios.get(categoryUrl, {
        timeout: CATEGORY_FETCH_MS,
        maxRedirects: 14,
        validateStatus: () => true,
        headers: headersForCategoryFetch(categoryUrl),
        responseType: 'text',
        ...agents,
    });
}

async function fetchPageHtmlPuppeteer(
    browser,
    url,
    referer,
    settleMs = 1400,
    proxyAuth = null
) {
    const page = await browser.newPage();
    try {
        if (proxyAuth && (proxyAuth.username || proxyAuth.password)) {
            await page.authenticate({
                username: proxyAuth.username || '',
                password: proxyAuth.password || '',
            });
        }
        await page.setUserAgent(BROWSER_HEADERS['User-Agent']);
        const hdr = { 'Accept-Language': BROWSER_HEADERS['Accept-Language'] };
        if (referer) hdr.Referer = referer;
        await page.setExtraHTTPHeaders(hdr);
        page.setDefaultNavigationTimeout(PUPPETEER_NAV_MS);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        if (settleMs > 0) {
            await new Promise((r) => setTimeout(r, settleMs));
        }
        return await page.content();
    } finally {
        await page.close();
    }
}

/** Bukan HTML portal: halaman error Cloudflare / challenge (IP VPS sering error 1005/1020). */
function detectCdnBlock(html) {
    if (!html || typeof html !== 'string') {
        return { blocked: true, reason: 'empty' };
    }
    if (html.length < 220 && !html.includes('href=')) {
        return { blocked: true, reason: 'empty_or_tiny' };
    }
    const low = html.toLowerCase();
    if (
        low.includes('cf-error-details') ||
        low.includes('cloudflare ray id') ||
        low.includes('error-1005') ||
        low.includes('error 1005') ||
        low.includes('/5xx-error-landing') ||
        low.includes('errors.edge.suite') ||
        (low.includes('cloudflare.com') &&
            low.includes('error') &&
            !low.includes('cnnindonesia.com') &&
            !low.includes('detik.com') &&
            !low.includes('kompas.com') &&
            html.length < 30000)
    ) {
        return { blocked: true, reason: 'cloudflare_or_cdn' };
    }
    if (
        low.includes('just a moment') ||
        low.includes('checking your browser before accessing')
    ) {
        return { blocked: true, reason: 'cloudflare_challenge' };
    }
    return { blocked: false };
}

/** Set 1 agar tiap artikel bisa buka Puppeteer jika extract gagal (lama di VPS). Default: hanya kategori pakai Puppeteer. */
const ARTICLE_PUPPETEER = process.env.NEWS_PUPPETEER_ARTICLES === '1';

/**
 * Axios dulu (ringan). Kalau timeout/403/5xx → Puppeteer (sering jalan di VPS yang diblokir CDN).
 * Matikan fallback: NEWS_PUPPETEER=0
 */
async function loadCategoryHtml(categoryUrl, getBrowser, sessionCtx) {
    let axiosRes = null;
    try {
        axiosRes = await fetchCategoryHtmlAxios(categoryUrl, sessionCtx);
    } catch {
        axiosRes = null;
    }
    if (axiosRes && axiosRes.status < 400) {
        return { html: String(axiosRes.data || ''), usedPuppeteer: false };
    }

    if (process.env.NEWS_PUPPETEER === '0') {
        const e = new Error(
            axiosRes
                ? `Failed to fetch category page: HTTP ${axiosRes.status}`
                : 'Category page request failed: timeout or network'
        );
        e.status = axiosRes?.status;
        e.code = axiosRes ? 'HTTP_ERROR' : 'ECONNABORTED';
        throw e;
    }

    const browser = await getBrowser();
    if (!browser) {
        throw new Error('Puppeteer disabled (NEWS_PUPPETEER=0)');
    }
    const html = await fetchPageHtmlPuppeteer(
        browser,
        categoryUrl,
        null,
        1400,
        sessionCtx.proxyAuth || null
    );
    if (!html || html.length < 200) {
        throw new Error('Puppeteer returned empty category HTML');
    }
    return { html, usedPuppeteer: true };
}

/** Same structure as app.py NEWS_CATEGORIES — legacy portals & section URLs only. */
const NEWS_CATEGORIES = {
    Kompas: {
        'Semua (Homepage)': 'https://www.kompas.com',
        Tekno: 'https://tekno.kompas.com',
        Bisnis: 'https://money.kompas.com',
        Bola: 'https://bola.kompas.com',
    },
    Detik: {
        'Semua (Homepage)': 'https://www.detik.com',
        Finance: 'https://finance.detik.com',
        'Inet (Teknologi)': 'https://inet.detik.com',
        Sepakbola: 'https://sport.detik.com/sepakbola',
    },
    'CNN Indonesia': {
        'Semua (Homepage)': 'https://www.cnnindonesia.com',
        Teknologi: 'https://www.cnnindonesia.com/teknologi',
        Ekonomi: 'https://www.cnnindonesia.com/ekonomi',
    },
    Liputan6: {
        'Semua (Homepage)': 'https://www.liputan6.com',
        Tekno: 'https://www.liputan6.com/tekno',
        Bisnis: 'https://www.liputan6.com/bisnis',
    },
};

function isAllowedNewsCategoryUrl(url) {
    const s = String(url || '').trim();
    for (const sections of Object.values(NEWS_CATEGORIES)) {
        for (const u of Object.values(sections)) {
            if (u === s) return true;
        }
    }
    return false;
}

/** Resolve anchor href to absolute URL, or null if unusable. */
function resolveNewsHref(href, baseUrl) {
    if (href == null || typeof href !== 'string') return null;
    const t = href.trim();
    if (!t || t.startsWith('#') || t.toLowerCase().startsWith('javascript:')) return null;
    try {
        return t.startsWith('http') ? new URL(t).href : new URL(t, baseUrl).href;
    } catch {
        return null;
    }
}

/**
 * True if URL looks like a single article on supported portals (not section homepages).
 * Kompas / Liputan6: .../read/<digits>/...
 * Detik: *.detik.com .../d-<digits>/...
 * CNN Indonesia: .../<10+digit>-<digits>-<digits>/<slug>
 */
function isLikelyArticleListUrl(absUrl) {
    let u;
    try {
        u = new URL(absUrl);
    } catch {
        return false;
    }
    if (!/^https?:$/i.test(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    const path = u.pathname;

    if (/\/read\/\d+/i.test(path)) {
        return host.includes('kompas.com') || host.includes('liputan6.com');
    }

    if (/\.detik\.com$/i.test(host) && /\/d-\d+\//.test(path)) {
        return true;
    }

    if (host.includes('cnnindonesia.com')) {
        if (/\/\d{10,}-\d+-\d+\/[^/]+/.test(path)) return true;
        if (/\/\d{9,}-\d+-\d+\/[^/]+/.test(path)) return true;
        if (/\/\d{8,}-\d{2,}-\d{2,}\/[^/]+/.test(path)) return true;
        return false;
    }

    return false;
}

router.get('/categories', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ categories: NEWS_CATEGORIES });
});

router.post('/scrape', async (req, res) => {
    let browserInstance = null;
    const sessionCtx = {
        url: null,
        axiosAgents: {},
        extractAgent: null,
        launchProxyArg: null,
        proxyAuth: null,
    };
    async function getBrowser() {
        if (process.env.NEWS_PUPPETEER === '0') return null;
        if (!browserInstance) {
            const args = [...PUPPETEER_ARGS];
            if (sessionCtx.launchProxyArg) {
                args.push(`--proxy-server=${sessionCtx.launchProxyArg}`);
            }
            browserInstance = await puppeteer.launch({
                headless: 'new',
                args,
            });
        }
        return browserInstance;
    }
    async function closeBrowser() {
        if (browserInstance) {
            await browserInstance.close().catch(() => {});
            browserInstance = null;
        }
    }

    try {
        const { category_url, limit = 5 } = req.body;

        if (!category_url) {
            return res.status(400).json({ status: 'error', message: 'category_url wajib diisi' });
        }

        if (!isAllowedNewsCategoryUrl(category_url)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid section: pick a portal & category from the list.',
            });
        }

        const gate = publicTraffic.assertSubmitSlot(req, 'legacy:news');
        if (!gate.ok) return res.status(429).json({ error: gate.error });

        Object.assign(sessionCtx, await resolveNewsSessionProxy());

        let html;
        let usedPuppeteerCategory = false;
        try {
            const loaded = await loadCategoryHtml(category_url, getBrowser, sessionCtx);
            html = loaded.html;
            usedPuppeteerCategory = loaded.usedPuppeteer;
        } catch (e) {
            await closeBrowser();
            const st = e.status;
            const hint403 =
                st === 403
                    ? 'Portal may block plain HTTP from this server. Puppeteer fallback runs unless NEWS_PUPPETEER=0. Ensure Chromium deps are installed on the VPS (`apt install -y chromium-browser` or use Puppeteer bundled Chrome).'
                    : undefined;
            return res.status(502).json({
                status: 'error',
                message: e.message || 'Category fetch failed',
                debug: { category_url, code: e.code, status: st, hint: hint403 },
            });
        }

        const extractConcurrency =
            usedPuppeteerCategory && ARTICLE_PUPPETEER ? 1 : EXTRACT_CONCURRENCY;

        const cdn = detectCdnBlock(html);
        if (cdn.blocked) {
            await closeBrowser();
            return res.status(502).json({
                status: 'error',
                message:
                    'Portal mengembalikan halaman blokir/challenge CDN (bukan daftar berita). IP server VPS Anda kemungkinan ditolak (mis. Cloudflare 1005).',
                debug: {
                    category_url,
                    usedPuppeteerFallback: usedPuppeteerCategory,
                    cdnBlock: true,
                    reason: cdn.reason,
                    hint:
                        'Atur NEWS_PROXY_PROVIDER_URL atau NEWS_PROXY_LIST (HTTP proxy). VPS + IP datacenter sering kena CDN. Set NEWS_PUPPETEER_ARTICLES=1 hanya jika perlu.',
                },
            });
        }

        const $ = cheerio.load(html);

        const seenArticleLinks = new Set();
        const links = [];
        $('a').each((i, el) => {
            const abs = resolveNewsHref($(el).attr('href'), category_url);
            if (!abs || seenArticleLinks.has(abs)) return;
            if (!isLikelyArticleListUrl(abs)) return;
            seenArticleLinks.add(abs);
            links.push(abs);
        });

        const limitN = Math.max(1, Math.min(30, parseInt(limit, 10) || 5));
        const linksBeforeSlice = links.length;
        const linksLimited = links.slice(0, limitN);

        const extractFailures = [];
        const articles = [];

        async function extractOne(link) {
            const toRow = (articleData) => ({
                title: articleData.title,
                url: articleData.url || link,
                authors: articleData.author ? [articleData.author] : [],
                publish_date: articleData.published || null,
                text: articleData.content
                    ? articleData.content.replace(/<[^>]*>?/gm, ' ').substring(0, 500) + '...'
                    : '',
                summary: articleData.description || '',
                keywords: [],
                top_image: articleData.image || '',
            });

            try {
                const articleData = await extract(link, {}, {
                    headers: headersForArticleFetch(link, category_url),
                    signal: AbortSignal.timeout(PER_ARTICLE_EXTRACT_MS),
                    ...(sessionCtx.extractAgent ? { agent: sessionCtx.extractAgent } : {}),
                });
                if (articleData && (articleData.title || articleData.content)) {
                    return { ok: true, row: toRow(articleData) };
                }
                throw new Error('Extractor returned empty title/content');
            } catch (err) {
                const msg = err.message || String(err);
                if (ARTICLE_PUPPETEER && process.env.NEWS_PUPPETEER !== '0') {
                    try {
                        const b = await getBrowser();
                        if (b) {
                            const phtml = await fetchPageHtmlPuppeteer(
                                b,
                                link,
                                category_url,
                                700,
                                sessionCtx.proxyAuth || null
                            );
                            if (phtml && phtml.length > 400 && !detectCdnBlock(phtml).blocked) {
                                const articleData = await extractFromHtml(phtml, link);
                                if (articleData && (articleData.title || articleData.content)) {
                                    return { ok: true, row: toRow(articleData) };
                                }
                            }
                        }
                    } catch (e2) {
                        console.warn('[news] puppeteer article:', link, e2.message);
                    }
                }
                console.warn('[news] extract failed:', link, msg);
                return { ok: false, fail: { link, error: msg } };
            }
        }

        for (let i = 0; i < linksLimited.length; i += extractConcurrency) {
            const batch = linksLimited.slice(i, i + extractConcurrency);
            const settled = await Promise.all(batch.map((link) => extractOne(link)));
            for (const r of settled) {
                if (r.ok) articles.push(r.row);
                else extractFailures.push(r.fail);
            }
        }

        await closeBrowser();

        const sampleHrefs = [];
        $('a[href]').each((i, el) => {
            if (sampleHrefs.length >= 12) return false;
            const h = $(el).attr('href');
            if (!h || h.startsWith('#') || h.startsWith('javascript:')) return undefined;
            let abs;
            try {
                abs = h.startsWith('http') ? h : new URL(h, category_url).href;
            } catch {
                return undefined;
            }
            if (!sampleHrefs.includes(abs)) sampleHrefs.push(abs.length > 140 ? `${abs.slice(0, 137)}…` : abs);
            return undefined;
        });

        activityLog.append({
            source: 'legacy',
            module: 'news',
            ok: articles.length > 0,
            error: articles.length === 0 ? 'no articles extracted' : undefined,
        });

        res.json({
            status: 'ok',
            data: articles,
            meta: {
                category_url,
                proxyUsed: !!sessionCtx.url,
                usedPuppeteerFallback: usedPuppeteerCategory,
                articlePuppeteerUsed: ARTICLE_PUPPETEER,
                limit: limitN,
                linksMatchedReadPattern: linksBeforeSlice,
                linksProcessed: linksLimited.length,
                articlesExtracted: articles.length,
                extractFailures: extractFailures.slice(0, 15),
                hint:
                    linksBeforeSlice === 0
                        ? 'No article links matched (Kompas/Liputan6 /read/<id>/, Detik /d-<id>/, CNN /id-triple/slug). Portal HTML may have changed; check sampleHrefs below.'
                        : articles.length === 0
                          ? 'Links were found but article extraction failed for each (see extractFailures).'
                          : undefined,
                sampleHrefs: linksBeforeSlice === 0 ? sampleHrefs : undefined,
            },
        });
        
    } catch (e) {
        await closeBrowser();
        activityLog.append({
            source: 'legacy',
            module: 'news',
            ok: false,
            error: e.toString(),
        });
        const msg = e.message || String(e);
        const debug = {
            name: e.name,
        };
        if (process.env.NODE_ENV !== 'production' && e.stack) {
            debug.stack = e.stack.split('\n').slice(0, 12).join('\n');
        }
        res.status(500).json({ status: 'error', message: msg, debug });
    }
});

module.exports = router;
