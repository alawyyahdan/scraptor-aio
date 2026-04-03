const express = require('express');
const router = express.Router();
const activityLog = require('../lib/activityLog');
const publicTraffic = require('../lib/publicTraffic');
let gplay = require('google-play-scraper');
if (gplay.default) gplay = gplay.default;

router.post('/crawl', async (req, res) => {
    try {
        const { app_input, n_reviews = 100, lang = 'id', sort_by = 'most_relevant' } = req.body;
        
        let appId = app_input;
        if (appId.includes('http')) {
            try {
                const urlObj = new URL(appId);
                appId = urlObj.searchParams.get('id') || appId;
            } catch (e) {
                // simple regex fallback
                const match = appId.match(/id=([a-zA-Z0-9._]+)/);
                if (match) appId = match[1];
            }
        }
        appId = appId.trim();

        if (!appId) {
            return res.status(400).json({ error: 'App id / URL tidak valid' });
        }

        const gate = publicTraffic.assertSubmitSlot(req, 'legacy:playstore');
        if (!gate.ok) return res.status(429).json({ error: gate.error });

        const sortObj = sort_by === 'newest' ? gplay.sort.NEWEST : gplay.sort.HELPFULNESS;

        const info = await gplay.app({ appId, lang, country: 'id' }).catch(() => null);
        const app_info = info ? {
            title: info.title || appId,
            developer: info.developer || '-',
            score: info.score || '-',
            ratings: info.ratings || '-'
        } : { title: appId, developer: '-', score: '-', ratings: '-' };

        const result = await gplay.reviews({
            appId,
            lang,
            country: 'id',
            sort: sortObj,
            num: parseInt(n_reviews)
        });

        const df = result.data.map(r => ({
            reviewId: r.id,
            userName: r.userName,
            score: r.score,
            at: new Date(r.date).toISOString().split('T')[0],
            content: r.text,
            replyContent: r.replyText || '',
            thumbsUpCount: r.thumbsUp
        }));

        activityLog.append({ source: 'legacy', module: 'playstore', ok: true });
        res.json({
            success: true,
            app_id: appId,
            app_info,
            total_reviews: df.length,
            reviews: df.slice(0, 20), // preview
            all_data: df
        });

    } catch (e) {
        activityLog.append({
            source: 'legacy',
            module: 'playstore',
            ok: false,
            error: e.toString(),
        });
        res.status(500).json({ success: false, message: e.toString() });
    }
});

module.exports = router;
