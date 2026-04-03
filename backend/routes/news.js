const express = require('express');
const router = express.Router();
const { extract } = require('@extractus/article-extractor');
const axios = require('axios');
const cheerio = require('cheerio');
const activityLog = require('../lib/activityLog');
const publicTraffic = require('../lib/publicTraffic');

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
        return /\/\d{10,}-\d+-\d+\/[^/]+/.test(path);
    }

    return false;
}

router.get('/categories', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ categories: NEWS_CATEGORIES });
});

router.post('/scrape', async (req, res) => {
    try {
        const { category_url, limit = 5 } = req.body;
        
        if (!category_url) {
            return res.status(400).json({ status: "error", message: "category_url wajib diisi" });
        }

        if (!isAllowedNewsCategoryUrl(category_url)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid section: pick a portal & category from the list.',
            });
        }

        const gate = publicTraffic.assertSubmitSlot(req, 'legacy:news');
        if (!gate.ok) return res.status(429).json({ error: gate.error });

        let html;
        try {
            const pageRes = await axios.get(category_url, { timeout: 20000, validateStatus: () => true });
            if (pageRes.status >= 400) {
                return res.status(502).json({
                    status: 'error',
                    message: `Failed to fetch category page: HTTP ${pageRes.status}`,
                    debug: { category_url, status: pageRes.status },
                });
            }
            html = pageRes.data;
        } catch (e) {
            return res.status(502).json({
                status: 'error',
                message: `Category page request failed: ${e.message}`,
                debug: { category_url, code: e.code },
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
        for (const link of linksLimited) {
            try {
                const articleData = await extract(link);
                if (articleData && (articleData.title || articleData.content)) {
                    articles.push({
                        title: articleData.title,
                        url: articleData.url || link,
                        authors: articleData.author ? [articleData.author] : [],
                        publish_date: articleData.published || null,
                        text: articleData.content ? articleData.content.replace(/<[^>]*>?/gm, ' ').substring(0, 500) + '...' : '',
                        summary: articleData.description || '',
                        keywords: [],
                        top_image: articleData.image || ''
                    });
                } else {
                    extractFailures.push({ link, error: 'Extractor returned empty title/content' });
                }
            } catch (err) {
                const msg = err.message || String(err);
                extractFailures.push({ link, error: msg });
                console.warn('[news] extract failed:', link, msg);
            }
        }

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
