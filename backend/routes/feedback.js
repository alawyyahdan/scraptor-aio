const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getResendFeedbackConfig } = require('../lib/adminSettings');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.jsonl');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function simpleEmailOk(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

async function sendFeedbackViaResend(entry) {
  const { apiKey, from, to } = getResendFeedbackConfig();
  if (!apiKey || !from || !to || !simpleEmailOk(from) || !simpleEmailOk(to)) {
    return { sent: false };
  }
  try {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from: `Scraptor Feedback <${from}>`,
        to: [to],
        reply_to: [entry.email],
        subject: `Feedback: ${entry.name}`,
        text: [
          `Name: ${entry.name}`,
          `Email: ${entry.email}`,
          `Link to scrape: ${entry.scrapeUrl}`,
          '',
          'Reason / purpose:',
          entry.reason,
          '',
          `Submitted: ${entry.at}`,
          `IP: ${entry.ip || '—'}`,
        ].join('\n'),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return { sent: true };
  } catch (e) {
    const detail = e.response?.data || e.message;
    console.warn('[feedback] Resend failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    return { sent: false };
  }
}

/** Public feedback form — JSONL + optional Resend email */
router.post('/', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const name = String(body.name || '').trim().slice(0, 200);
    const email = String(body.email || '').trim().slice(0, 254);
    const scrapeUrl = String(body.scrapeUrl || body.url || '').trim().slice(0, 2000);
    const reason = String(body.reason || '').trim().slice(0, 4000);

    if (!name) {
      return res.status(400).json({ ok: false, error: 'Name is required.' });
    }
    if (!email || !simpleEmailOk(email)) {
      return res.status(400).json({ ok: false, error: 'Valid email is required.' });
    }
    if (!scrapeUrl) {
      return res.status(400).json({ ok: false, error: 'Link to scrape is required.' });
    }
    try {
      const u = new URL(scrapeUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return res.status(400).json({ ok: false, error: 'Link must be http(s).' });
      }
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid link URL.' });
    }
    if (!reason) {
      return res.status(400).json({ ok: false, error: 'Reason / purpose is required.' });
    }

    ensureDir();
    const entry = {
      at: new Date().toISOString(),
      ip: req.ip || '',
      name,
      email,
      scrapeUrl,
      reason,
    };
    fs.appendFileSync(FEEDBACK_FILE, `${JSON.stringify(entry)}\n`, 'utf8');

    const { sent } = await sendFeedbackViaResend(entry);
    res.json({
      ok: true,
      message: sent
        ? 'Thank you — your feedback was received.'
        : 'Thank you — your feedback was received. (Email notify off or failed; still saved on server.)',
      emailSent: sent,
    });
  } catch (e) {
    console.error('[feedback]', e);
    res.status(500).json({ ok: false, error: 'Could not save feedback. Try again later.' });
  }
});

module.exports = router;
