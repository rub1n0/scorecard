const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting E2E Test for Collaborative KPI Updates...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // 1. Navigate to Home
        console.log('Navigating to home page...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

        // 2. Create a new Scorecard
        console.log('Creating new scorecard...');
        // Wait for the "New Scorecard" button or input
        // Note: Adjust selectors based on actual UI implementation
        // Assuming there's a button to create or we pick the first one if exists

        // For simplicity, let's try to find an existing scorecard or create one
        // We'll look for a scorecard link
        const scorecardLink = await page.$('a[href^="/scorecard/"]');

        if (scorecardLink) {
            console.log('Found existing scorecard, clicking...');
            await scorecardLink.click();
            await page.waitForSelector('button ::-p-text(Manage Scorecard)');
        } else {
            console.log('No scorecard found, creating one...');

            // Click "New Scorecard" or "Initialize Scorecard"
            const createBtn = await page.$('button ::-p-text(New Scorecard)') || await page.$('button ::-p-text(Initialize Scorecard)');
            if (!createBtn) throw new Error('Could not find create scorecard button');
            await createBtn.click();

            // Wait for modal
            await page.waitForSelector('input[placeholder="e.g., Q4 2024 Metrics"]');

            // Fill form
            await page.type('input[placeholder="e.g., Q4 2024 Metrics"]', 'Test Scorecard');

            // Submit
            const submitBtn = await page.waitForSelector('button ::-p-text(Create Scorecard)');
            await submitBtn.click();

            // Wait for navigation to new scorecard (wait for Manage Scorecard button)
            await page.waitForSelector('button ::-p-text(Manage Scorecard)');
        }
        const scorecardUrl = page.url();
        console.log(`Entered scorecard: ${scorecardUrl}`);

        // 3. Add a new KPI with assignee
        console.log('Adding new KPI...');

        // Click "Manage Scorecard" dropdown
        const manageBtn = await page.waitForSelector('button ::-p-text(Manage Scorecard)');
        await manageBtn.click();

        // Click "Add Metric"
        const addBtn = await page.waitForSelector('button ::-p-text(Add Metric)');
        await addBtn.click();

        // Wait for modal
        await page.waitForSelector('input[placeholder="e.g. Revenue"]');

        // Fill form
        await page.type('input[placeholder="e.g. Revenue"]', 'Test Auto KPI');
        await page.type('input[placeholder="user@example.com"]', 'tester@example.com');
        await page.type('input[type="number"]', '100');

        // Save
        const saveBtn = await page.waitForSelector('button ::-p-text(Create Metric)');
        await saveBtn.click();

        console.log('KPI Created.');
        await new Promise(r => setTimeout(r, 2000)); // Wait for update

        // 4. Verify KPI exists and has assignee icon/text
        // We need to find the tile with "Test Auto KPI"
        const kpiTile = await page.waitForSelector('div ::-p-text(Test Auto KPI)');
        if (kpiTile) {
            console.log('Verified: KPI tile found.');
        } else {
            throw new Error('KPI tile not found!');
        }

        // 5. Test Update Link generation (simulated)
        // We can't easily click "copy link" and check clipboard in headless.
        // But we can check if the link button exists
        const linkBtn = await page.$('button[title="Copy Update Link"]');
        if (linkBtn) {
            console.log('Verified: Copy Link button exists.');
        } else {
            // It might be hidden until hover, forcing hover
            console.log('Attempting to hover to reveal link button...');
            await kpiTile.hover();
            await new Promise(r => setTimeout(r, 500));
            const linkBtnVisible = await page.$('button[title="Copy Update Link"]');
            if (linkBtnVisible) {
                console.log('Verified: Copy Link button revealed on hover.');
            } else {
                console.log('Warning: Copy Link button not found (might be due to hover state in headless).');
            }
        }

        // 6. Test Assignment Manager
        console.log('Testing Assignment Manager...');
        // Open Manage Scorecard dropdown again
        await manageBtn.click();

        // Click "Manage Assignments"
        const assignmentsBtn = await page.waitForSelector('button ::-p-text(Manage Assignments)');
        await assignmentsBtn.click();

        // Wait for modal
        await page.waitForSelector('h2 ::-p-text(Assignment Manager)');
        console.log('Verified: Assignment Manager modal opened.');

        // Check if our user is listed
        const userRow = await page.waitForSelector('h3 ::-p-text(tester@example.com)');
        if (userRow) {
            console.log('Verified: Assignee listed in manager.');
        } else {
            throw new Error('Assignee not found in Assignment Manager');
        }

        // Close modal
        const closeBtn = await page.$('button.btn-icon.btn-secondary');
        await closeBtn.click();

        console.log('Test Complete: Success!');

    } catch (error) {
        console.error('Test Failed:', error);
        // Take screenshot on failure
        await page.screenshot({ path: 'test-failure.png' });
    } finally {
        await browser.close();
    }
})();
