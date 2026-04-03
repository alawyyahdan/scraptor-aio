const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getApiKey } = require('../lib/adminSettings');
const { redactKeys } = require('../lib/redactPublicResponse');
const activityLog = require('../lib/activityLog');
const publicTraffic = require('../lib/publicTraffic');

const BASE_URL = 'https://api.scrapecreators.com';

/**
 * POST body: { path: string, query?: Record<string, string | number | boolean> }
 * Proxies GET to Scrape Creators API with server-side x-api-key.
 */
router.post('/fetch', async (req, res) => {
  const apiPath = req.body?.path;
  const query = req.body?.query && typeof req.body.query === 'object'
    ? req.body.query
    : {};

  if (!apiPath || typeof apiPath !== 'string' || !apiPath.startsWith('/')) {
    return res.status(400).json({ error: 'Invalid or missing path (must start with /)' });
  }

  const key = getApiKey();
  if (!key) {
    activityLog.append({
      source: 'v2',
      path: apiPath,
      ok: false,
      error: 'API key not configured',
    });
    return res.status(503).json({
      error: 'Scrape Creators API key not configured',
      hint: 'Isi di Admin → API & fitur, atau set SCRAPE_CREATORS_API_KEY di .env',
    });
  }

  const gate = publicTraffic.assertSubmitSlot(req, `v2:${apiPath}`);
  if (!gate.ok) {
    return res.status(429).json({ error: gate.error });
  }

  try {
    const url = `${BASE_URL}${apiPath}`;
    const response = await axios.get(url, {
      headers: { 'x-api-key': key },
      params: query,
      timeout: 120000,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      activityLog.append({
        source: 'v2',
        path: apiPath,
        ok: false,
        error: `HTTP ${response.status}`,
      });
      return res.status(response.status).json({
        error: 'Upstream Scrape Creators API error',
        status: response.status,
        data: redactKeys(response.data),
      });
    }

    activityLog.append({
      source: 'v2',
      path: apiPath,
      ok: true,
    });
    res.json(redactKeys(response.data));
  } catch (e) {
    activityLog.append({
      source: 'v2',
      path: apiPath,
      ok: false,
      error: e.message || 'proxy error',
    });
    const status = e.response?.status || 500;
    res.status(status >= 400 ? status : 500).json({
      error: e.message || 'Proxy request failed',
      details: redactKeys(e.response?.data),
    });
  }
});

module.exports = router;
