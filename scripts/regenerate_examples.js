/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const examplesDir = path.join(__dirname, '../examples');

const examples = {
    'number_kpis.csv': `KPI Name,Value,Date,Notes
Monthly Revenue,120000,2024-10-01,
Monthly Revenue,125000,2024-10-08,
Monthly Revenue,130000,2024-10-15,
Monthly Revenue,135000,2024-10-22,
Monthly Revenue,140000,2024-11-01,
Monthly Revenue,150000,2024-11-18,Strong growth
Customer Count,5450,2024-10-01,
Customer Count,5480,2024-10-08,
Customer Count,5500,2024-10-15,
Customer Count,5600,2024-10-22,
Customer Count,5550,2024-11-01,
Customer Count,5420,2024-11-18,Slight decline
Conversion Rate,3.0,2024-10-01,
Conversion Rate,3.1,2024-10-08,
Conversion Rate,2.8,2024-10-15,
Conversion Rate,2.9,2024-10-22,
Conversion Rate,3.0,2024-11-01,
Conversion Rate,3.2,2024-11-18,Improved targeting`,

    'line_chart.csv': `KPI Name,Chart Type,Date,Value,Notes
Website Traffic,line,2024-11-01,12500,
Website Traffic,line,2024-11-05,13200,
Website Traffic,line,2024-11-10,14800,
Website Traffic,line,2024-11-15,13900,
Website Traffic,line,2024-11-18,15600,Last week strong`,

    'bar_chart.csv': `KPI Name,Chart Type,Category,Value,Notes
Sales by Region,bar,North,45000,
Sales by Region,bar,South,38000,
Sales by Region,bar,East,52000,
Sales by Region,bar,West,41000,Strong performance`,

    'pie_chart.csv': `KPI Name,Chart Type,Category,Value,Notes
Traffic Sources,pie,Organic,45,
Traffic Sources,pie,Paid,25,
Traffic Sources,pie,Social,18,
Traffic Sources,pie,Direct,12,Good organic reach`,

    'radar_chart.csv': `KPI Name,Chart Type,Dimension,Value,Notes
Product Performance,radar,Quality,85,
Product Performance,radar,Speed,72,
Product Performance,radar,Reliability,90,
Product Performance,radar,Features,78,
Product Performance,radar,Price,65,Competitive pricing needed`,

    'text_kpis.csv': `KPI Name,Value,Date,Notes
Project Status,On Track,2024-11-18,All milestones met
Team Morale,High,2024-11-18,Positive feedback
Risk Level,Low,2024-11-18,No major concerns`
};

for (const [filename, content] of Object.entries(examples)) {
    fs.writeFileSync(path.join(examplesDir, filename), content);
    console.log(`Regenerated ${filename}`);
}
