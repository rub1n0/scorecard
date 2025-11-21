const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Launching browser for UI inspection...');
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log('Navigating to localhost:3000...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

        // Capture Screenshot
        const screenshotPath = path.join(__dirname, 'dashboard_debug.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to: ${screenshotPath}`);

        // Check for key elements
        const title = await page.title();
        console.log(`Page Title: ${title}`);

        const bodyBg = await page.evaluate(() => {
            return window.getComputedStyle(document.body).backgroundColor;
        });
        console.log(`Body Background Color: ${bodyBg}`);

        await browser.close();
        console.log('Inspection completed.');
    } catch (error) {
        console.error('Inspection failed:', error);
        process.exit(1);
    }
})();
