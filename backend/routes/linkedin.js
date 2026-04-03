const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const activityLog = require('../lib/activityLog');
const publicTraffic = require('../lib/publicTraffic');

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
};

/** Guest cards link id.linkedin.com etc.; www + numeric id is most reliable for HTML description. */
function canonicalLinkedInJobUrl(raw) {
    if (!raw) return '';
    let u = String(raw).trim().split('?')[0];
    if (u.startsWith('//')) u = `https:${u}`;
    if (!/^https?:\/\//i.test(u)) {
        u = `https://www.linkedin.com${u.startsWith('/') ? '' : '/'}${u}`;
    }
    try {
        const parsed = new URL(u);
        let path = decodeURIComponent(parsed.pathname || '');
        const host = (parsed.hostname || '').toLowerCase();
        if (host.endsWith('.linkedin.com') && host !== 'www.linkedin.com') {
            u = `https://www.linkedin.com${parsed.pathname}`;
            path = decodeURIComponent(new URL(u).pathname || '');
        }
        let m = path.match(/\/jobs\/view\/.+-(\d{7,})$/i);
        if (!m) m = path.match(/\/jobs\/view\/(\d{7,})$/i);
        if (m) return `https://www.linkedin.com/jobs/view/${m[1]}`;
        return u;
    } catch {
        return u;
    }
}

function extractJobDescriptionHtml($j) {
    let desc = $j('div.show-more-less-html__markup').first().text().trim();
    if (!desc) desc = $j('div.description__text').first().text().trim();
    if (!desc) desc = $j('div.jobs-description-content__text').first().text().trim();
    if (!desc) {
        const og = $j('meta[property="og:description"]').attr('content');
        if (og) desc = String(og).trim();
    }
    return desc;
}

async function fetchDescriptionWithRetry(jobUrl) {
    const canonical = canonicalLinkedInJobUrl(jobUrl);
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const jobRes = await axios.get(canonical, { headers: HEADERS, timeout: 20000 });
            if (jobRes.status >= 400) continue;
            const $j = cheerio.load(jobRes.data);
            const desc = extractJobDescriptionHtml($j);
            if (desc && desc.length > 30) return desc;
        } catch {
            /* retry */
        }
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
    return '';
}

router.post('/scrape', async (req, res) => {
    const { search_query = 'data scientist', location = 'Indonesia', max_pages = 2 } = req.body;

    const gate = publicTraffic.assertSubmitSlot(req, 'legacy:linkedin');
    if (!gate.ok) return res.status(429).json({ error: gate.error });
    
    let allJobs = [];
    let successful_pages = 0;

    try {
        for (let page = 0; page < max_pages; page++) {
            const start = page * 25;
            const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(search_query)}&location=${encodeURIComponent(location)}&start=${start}`;
            
            try {
                const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
                const $ = cheerio.load(response.data);
                
                const cards = $('li');
                if (cards.length === 0) break;
                
                let jobPromises = [];
                cards.each((i, el) => {
                    const title = $(el).find('h3.base-search-card__title').text().trim();
                    const company = $(el).find('h4.base-search-card__subtitle').text().trim();
                    const loc = $(el).find('span.job-search-card__location').text().trim();
                    const rawLink = $(el).find('a.base-card__full-link').attr('href');
                    const link = rawLink?.includes('?') ? rawLink.split('?')[0] : rawLink;
                    
                    if (title && link) {
                        jobPromises.push({ Title: title, Company: company, Location: loc, URL: link });
                    }
                });

                for (let job of jobPromises) {
                    const desc = await fetchDescriptionWithRetry(job.URL);
                    job.Description =
                        desc || 'Description unavailable (LinkedIn blocked or changed layout).';
                    await new Promise((r) => setTimeout(r, 350 + Math.floor(Math.random() * 250)));
                    allJobs.push(job);
                }
                successful_pages++;
                // Small delay to prevent blocking
                await new Promise(r => setTimeout(r, 1500));
            } catch (err) {
                console.log('Error fetching page:', page, err.message);
                break; // Stop if blocked
            }
        }

        // Optional: fetch descriptions for top 5 to save time, or skip description for now to be fast
        // For standard UI, the list structure is enough.

        activityLog.append({ source: 'legacy', module: 'linkedin', ok: true });
        res.json({
            success: true,
            total_jobs: allJobs.length,
            pages_scraped: successful_pages,
            data: allJobs,
            preview: allJobs.slice(0, 20)
        });

    } catch (e) {
        activityLog.append({
            source: 'legacy',
            module: 'linkedin',
            ok: false,
            error: e.toString(),
        });
        res.status(500).json({ error: e.toString() });
    }
});

module.exports = router;
