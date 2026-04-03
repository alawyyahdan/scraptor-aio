const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const activityLog = require('../lib/activityLog');
const publicTraffic = require('../lib/publicTraffic');

router.post('/scrape', async (req, res) => {
    const { url, max_comments = 50 } = req.body;
    
    if (!url || !url.includes('youtube.com/watch')) {
        return res.status(400).json({ error: 'URL YouTube tidak valid' });
    }

    const gate = publicTraffic.assertSubmitSlot(req, 'legacy:youtube');
    if (!gate.ok) return res.status(429).json({ error: gate.error });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Scroll down to trigger comments load
        await page.evaluate(() => {
            window.scrollBy(0, 600);
        });
        
        // Wait for comments container
        await page.waitForSelector('ytd-comments', { timeout: 15000 }).catch(() => null);
        
        let allComments = [];
        let previousHeight = 0;
        
        // Scroll loop to load comments
        while (allComments.length < max_comments) {
            allComments = await page.evaluate(() => {
                const nodes = document.querySelectorAll('ytd-comment-thread-renderer');
                const results = [];
                nodes.forEach(node => {
                    const author = node.querySelector('#author-text span')?.innerText?.trim() || '';
                    const time = node.querySelector('#published-time-text a')?.innerText?.trim() || '';
                    const text = node.querySelector('#content-text')?.innerText?.trim() || '';
                    const likes = node.querySelector('#vote-count-middle')?.innerText?.trim() || '0';
                    if (author && text) {
                        results.push({ Author: author, Time: time, Text: text, Likes: likes });
                    }
                });
                return results;
            });
            
            if (allComments.length >= max_comments) {
                allComments = allComments.slice(0, max_comments);
                break;
            }
            
            // Scroll to bottom
            const newHeight = await page.evaluate('document.documentElement.scrollHeight');
            if (newHeight === previousHeight) break; // Reached bottom
            
            previousHeight = newHeight;
            await page.evaluate(`window.scrollTo(0, ${newHeight})`);
            await new Promise(r => setTimeout(r, 2000)); // wait for load
        }
        
        await browser.close();
        
        activityLog.append({ source: 'legacy', module: 'youtube', ok: true });
        res.json({
            success: true,
            total_comments: allComments.length,
            data: allComments,
            preview: allComments.slice(0, 20)
        });

    } catch (e) {
        if (browser) await browser.close();
        activityLog.append({
            source: 'legacy',
            module: 'youtube',
            ok: false,
            error: e.toString(),
        });
        res.status(500).json({ error: e.toString() });
    }
});

module.exports = router;
