const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

const axios = require('axios');
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3008;
const { verifyToken, JWT_SECRET } = require('./middleware/auth');
const { getApiKey, getPublicConfig } = require('./lib/adminSettings');
const { buildStatsPayload } = require('./lib/statsPayload');
const activityLog = require('./lib/activityLog');
const publicTraffic = require('./lib/publicTraffic');
const adminUsers = require('./lib/adminUsers');
const {
    buildCorsOptions,
    issuePublicAccessToken,
    apiAccessGuard,
} = require('./middleware/publicApiGuard');

app.use(cors(buildCorsOptions()));
app.use(express.json());

adminUsers.ensureSeeded();

// Auth Route (kredensial di data/admin-users.json, seed sekali dari ADMIN_USER / ADMIN_PASS)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = adminUsers.verifyLogin(username, password);
    if (user) {
        const token = jwt.sign(
            { username: user.username, role: 'admin' },
            process.env.JWT_SECRET || JWT_SECRET,
            { expiresIn: '12h' }
        );
        res.json({ token, message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

// Stats Route (Protected)
app.get('/api/stats', verifyToken, async (req, res) => {
    const activityPreset = req.query.activityRange || '7d';
    const activityFrom = req.query.activityFrom;
    const activityTo = req.query.activityTo;

    const resolved = activityLog.resolveActivityRange(
        activityPreset,
        activityFrom,
        activityTo
    );
    if (resolved.error) {
        return res.status(400).json({ error: resolved.error });
    }

    const rangeOpts = {
        activityStartYmd: resolved.startYmd,
        activityEndYmd: resolved.endYmd,
        activityPreset,
    };

    const key = getApiKey();
    if (key) {
        try {
            const r = await axios.get('https://api.scrapecreators.com/v1/credit-balance', {
                headers: { 'x-api-key': key },
                timeout: 12000,
            });
            const n = r.data?.creditCount ?? r.data?.credits;
            const remaining = typeof n === 'number' ? n : null;
            if (remaining !== null) {
                return res.json(
                    buildStatsPayload({
                        remainingCredits: remaining,
                        creditsSource: 'live',
                        ...rangeOpts,
                    })
                );
            }
        } catch {
            /* fall through demo credits */
        }
    }
    res.json(
        buildStatsPayload({
            remainingCredits: 980,
            creditsSource: 'demo',
            ...rangeOpts,
        })
    );
});

app.get('/api/public/config', (_req, res) => {
    res.json(getPublicConfig());
});

/** Token JWT singkat; hanya jika Origin ∈ FRONTEND_ORIGINS. Tidak memakai secret di bundle. */
app.post('/api/public/access-token', issuePublicAccessToken);

/** Satu log kunjungan per sesi browser (dipanggil dari frontend setelah T&C). */
app.post('/api/public/visit', apiAccessGuard, (req, res) => {
    try {
        publicTraffic.recordVisit(req);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'visit log failed' });
    }
});

// Root: HTML sederhana di browser; JSON untuk klien API / ?format=json
app.get('/', (req, res) => {
    const accept = req.get('Accept') || '';
    const fetchDest = req.get('Sec-Fetch-Dest');
    const forceJson =
        req.query.format === 'json' || /\bapplication\/json\b/i.test(accept);
    const wantsHtml =
        !forceJson &&
        (/\btext\/html\b/i.test(accept) ||
            fetchDest === 'document' ||
            fetchDest === 'iframe');

    if (wantsHtml) {
        res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Scraptor API</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1.25rem;line-height:1.5;color:#1e293b;background:#f8fafc}
  h1{font-size:1.35rem;font-weight:700;margin:0 0 .5rem}
  p{color:#64748b;font-size:.95rem;margin:.6rem 0}
  code{font-size:.85rem;background:#e2e8f0;padding:.15rem .4rem;border-radius:.25rem}
  a{color:#4f46e5;text-decoration:none;font-weight:600}
  a:hover{text-decoration:underline}
  hr{border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0}
</style>
</head>
<body>
  <h1>Scraptor API</h1>
  <p>REST endpoints live under <code>/api/…</code>. This host serves machine-to-machine requests (e.g. from <a href="https://scraptor.bica.ca">scraptor.bica.ca</a>).</p>
  <p>Health check: <code>GET /api/public/config</code> (JSON).</p>
  <hr/>
  <p>Machine-readable root: <a href="/?format=json"><code>?format=json</code></a> or <code>Accept: application/json</code>.</p>
</body>
</html>`);
        return;
    }

    res.json({
        name: 'Scraptor API',
        message: 'Use /api/… endpoints. Append ?format=json when opening in a browser.',
        ui: 'https://scraptor.bica.ca',
    });
});

// Import routes
const playstoreRoutes = require('./routes/playstore');
const newsRoutes = require('./routes/news');
const tokopediaRoutes = require('./routes/tokopedia');
const linkedinRoutes = require('./routes/linkedin');
const youtubeRoutes = require('./routes/youtube');
const scrapeCreatorsRoutes = require('./routes/scrapecreators');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');

app.use('/api/admin', adminRoutes);
app.use('/api/public/feedback', apiAccessGuard, feedbackRoutes);
app.use('/api/playstore', apiAccessGuard, playstoreRoutes);
app.use('/api/news', apiAccessGuard, newsRoutes);
app.use('/api/tokopedia', apiAccessGuard, tokopediaRoutes);
app.use('/api/linkedin', apiAccessGuard, linkedinRoutes);
app.use('/api/youtube', apiAccessGuard, youtubeRoutes);
app.use('/api/scrape-creators', apiAccessGuard, scrapeCreatorsRoutes);

app.listen(PORT, () => {
    console.log(`Server Backend berjalan dengan ketat di port ${PORT}`);
});
