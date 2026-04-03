const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const activityLog = require('../lib/activityLog');
const publicTraffic = require('../lib/publicTraffic');

router.post('/scrape', async (req, res) => {
    const { url, max_pages = 5 } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL toko wajib diisi' });
    }

    const gate = publicTraffic.assertSubmitSlot(req, 'legacy:tokopedia');
    if (!gate.ok) return res.status(429).json({ error: gate.error });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
        });
        
        const page = await browser.newPage();
        // Spoff user agent slightly
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(url, { waitUntil: 'networkidle2' });

        let allData = [];
        
        for (let i = 0; i < max_pages; i++) {
            // Wait for reviews to load
            await new Promise(r => setTimeout(r, 3000));
            
            const pageData = await page.evaluate(() => {
                const results = [];
                const articles = document.querySelectorAll('article.css-1pr2lii');
                
                articles.forEach(article => {
                    const waktu = article.querySelector('div.css-6ce5r8 p')?.innerText?.trim() || '';
                    const username = article.querySelector('div.css-k4rf3m span.name')?.innerText?.trim() || '';
                    const ulasan = article.querySelector('span[data-testid="lblItemUlasan"]')?.innerText?.trim() || '';
                    
                    let rating = null;
                    const ratingDiv = article.querySelector('div[data-testid="icnStarRating"]');
                    if (ratingDiv) {
                        const label = ratingDiv.getAttribute('aria-label') || '';
                        const match = label.match(/\d+/);
                        if (match) rating = parseInt(match[0]);
                    }
                    
                    if (ulasan) {
                        results.push({ Waktu: waktu, Username: username, Ulasan: ulasan, Rating: rating });
                    }
                });
                return results;
            });
            
            allData = allData.concat(pageData);
            
            // Try to click next
            const nextClicked = await page.evaluate(() => {
                const nextBtn = document.querySelector('button[aria-label^="Laman berikutnya"]');
                if (nextBtn && !nextBtn.disabled) {
                    nextBtn.click();
                    return true;
                }
                return false;
            });
            
            if (!nextClicked) {
                console.log("Tidak ada tombol Laman berikutnya atau sudah habis.");
                break;
            }
        }
        
        await browser.close();
        
        activityLog.append({ source: 'legacy', module: 'tokopedia', ok: true });
        res.json({
            success: true,
            total_reviews: allData.length,
            data: allData,
            preview: allData.slice(0, 20)
        });

    } catch (e) {
        if (browser) await browser.close();
        activityLog.append({
            source: 'legacy',
            module: 'tokopedia',
            ok: false,
            error: e.toString(),
        });
        res.status(500).json({ error: e.toString() });
    }
});

module.exports = router;
