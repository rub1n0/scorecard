const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../examples/all_kpi_types.csv');

// Header matching the unified format
// KPI Name,Value,Date,Notes,Chart Type,Category
const header = 'KPI Name,Value,Date,Notes,Chart Type,Category';

const rows = [];

// Helper to add row
function addRow(kpiName, value, date, notes, chartType, categoryVal) {
    rows.push(`${kpiName},${value || ''},${date},${notes || ''},${chartType || ''},${categoryVal || ''}`);
}

// 1. Number KPIs (50 items)
for (let i = 1; i <= 50; i++) {
    const kpiName = `Metric Number ${i}`;
    const baseVal = Math.floor(Math.random() * 1000);

    // Generate history (5 weeks back)
    for (let w = 5; w >= 1; w--) {
        const date = new Date('2024-11-18');
        date.setDate(date.getDate() - w * 7);
        const dateStr = date.toISOString().split('T')[0];
        const histVal = Math.floor(baseVal * (0.9 + Math.random() * 0.2));
        addRow(kpiName, histVal, dateStr, '', '', '');
    }

    // Current value
    addRow(kpiName, baseVal, '2024-11-18', `Note for metric ${i}`, '', '');
}

// 2. Text KPIs (50 items)
const statuses = ['On Track', 'At Risk', 'Delayed', 'Completed', 'Pending'];
for (let i = 1; i <= 50; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    addRow(`Project Status ${i}`, status, '2024-11-18', `Status update ${i}`, '', '');
}

// 3. Line Charts (10 charts * 100 points = 1000 lines)
for (let c = 1; c <= 10; c++) {
    const kpiName = `Server Load ${c}`;
    let val = 50;
    for (let d = 0; d < 100; d++) {
        const date = new Date('2024-08-01');
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split('T')[0];

        // Random walk
        val = Math.max(0, Math.min(100, val + (Math.random() * 10 - 5)));

        // For time series charts: Value is in Value column (index 1)
        // Wait, unified format uses Value column for everything except categorical charts?
        // Let's check parser logic:
        // if (categoryIdx >= 0 && row[categoryIdx]) -> Categorical chart
        // else -> Time series or Number -> use Value column

        // So for Line chart, we put value in Value column
        addRow(kpiName, val.toFixed(2), dateStr, '', 'line', '');
    }
}

// 4. Area Charts (10 charts * 100 points = 1000 lines)
for (let c = 1; c <= 10; c++) {
    const kpiName = `Active Users ${c}`;
    let val = 1000;
    for (let d = 0; d < 100; d++) {
        const date = new Date('2024-08-01');
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split('T')[0];

        val = Math.max(500, val + (Math.random() * 100 - 40));

        addRow(kpiName, val.toFixed(0), dateStr, '', 'area', '');
    }
}

// 5. Bar Charts (50 charts * 5 categories = 250 lines)
const regions = ['North', 'South', 'East', 'West', 'Central'];
for (let c = 1; c <= 50; c++) {
    const kpiName = `Regional Sales ${c}`;
    for (const region of regions) {
        const val = Math.floor(Math.random() * 50000) + 10000;
        // For categorical charts:
        // Category col = Category Name (Region)
        // Value col = Value
        addRow(kpiName, val, '2024-11-18', '', 'bar', region);
    }
}

// 6. Pie Charts (50 charts * 4 slices = 200 lines)
const sources = ['Organic', 'Direct', 'Social', 'Referral'];
for (let c = 1; c <= 50; c++) {
    const kpiName = `Traffic Sources ${c}`;
    let remaining = 100;
    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        let val;
        if (i === sources.length - 1) {
            val = remaining;
        } else {
            val = Math.floor(Math.random() * (remaining - (sources.length - i) * 5));
            remaining -= val;
        }
        addRow(kpiName, val, '2024-11-18', '', 'pie', source);
    }
}

// 7. Radar Charts (50 charts * 5 dimensions = 250 lines)
const dimensions = ['Speed', 'Reliability', 'Cost', 'Features', 'Support'];
for (let c = 1; c <= 50; c++) {
    const kpiName = `Vendor Score ${c}`;
    for (const dim of dimensions) {
        const val = Math.floor(Math.random() * 100);
        addRow(kpiName, val, '2024-11-18', '', 'radar', dim);
    }
}

// Write to file
const content = [header, ...rows].join('\n');
fs.writeFileSync(outputPath, content);

console.log(`Generated ${rows.length} lines of data to ${outputPath}`);
