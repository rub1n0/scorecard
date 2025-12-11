# CSV Import Guide

Use the unified template from the **Import CSV** modal to load metrics in bulk. The parser merges rows that share the same `KPI Name`, builds history for number/line charts, and creates new sections/assignee tokens automatically.

## Template Columns (in order)
- **KPI Name** *(required)*: Metric title.
- **Subtitle**: Smaller label under the title.
- **Value** *(required)*: Latest value or category/value pairs (e.g., `North:45000 South:38000`).
- **Date**: YYYY-MM-DD; defaults to today when blank.
- **Notes**: Freeform text (Markdown supported).
- **Visualization Type**: `number`, `text`, or `chart`. Leave blank to auto-detect from value/chart type.
- **Chart Type**: `line`, `area`, `bar`, `pie`, `donut`, `radar`, `radialBar`, `scatter`, or `heatmap`. Leave blank for number/text KPIs.
- **Section**: New names create sections and assign the metric there.
- **Assignment**: One or more emails separated by commas/semicolons. Tokens are generated for assignees.
- **Prefix / Suffix**: Shown next to number values (e.g., `$`, `%`, `ms`).
- **Reverse Trend**: `true/false`, `yes/no`, or `1/0`. When true, downward trends are treated as good.
- **Stroke Width / Stroke Color / Stroke Opacity**: Chart styling; opacity is 0–1.
- **Show Legend / Show Grid Lines / Show Data Labels**: Accept `true/false`, `yes/no`, or `1/0`.

Optional legacy column: **Category**. If present for categorical charts, the parser uses it instead of the `Category:Value` pairs in the `Value` column.

## Quick Examples
```csv
KPI Name,Subtitle,Value,Date,Notes,Visualization Type,Chart Type,Section,Assignment,Prefix,Suffix,Reverse Trend,Stroke Width,Stroke Color,Stroke Opacity,Show Legend,Show Grid Lines,Show Data Labels
Monthly Revenue,Total Revenue,150000,2024-11-18,Strong growth,number,,Financial,finance@example.com,$,,false,2,#457B9D,1,false,false,false
Website Traffic,Daily Visits,15600,2024-11-18,Strong week,chart,line,Marketing,,,,,2,#36c9b8,1,true,true,false
Latency,p95 by Week,405,2024-11-22,Caching rollout,chart,area,Platform,,,,,3,#5094af,0.8,false,true,false
Sales by Region,Q4 Performance,North:45000 South:38000 East:52000 West:41000,2024-11-18,,chart,bar,Sales,sales@example.com,$,,false,2,#dea821,1,true,false,true
SLA Compliance,Regional Uptime,US-East:99.9 EMEA:99.7 APAC:99.5 LATAM:99.3,2024-11-18,,chart,radialBar,Platform,,,,,4,#5094af,1,true,,true
Project Status,Current Phase,On Track,2024-11-18,All milestones met,text,,Operations,pm@example.com,,,,,,,,,
```

Notes:
- Multiple rows with the same `KPI Name` build history; the latest date becomes the current value.
- For categorical charts (`bar/pie/radar/donut`), you can either use `Category:Value` pairs in the `Value` column or include a `Category` column.
- Boolean fields accept `true/false`, `yes/no`, and `1/0`.
- Assignments accept multiple emails; tokens are generated for each new assignee.

## Supported Chart Types
`line`, `area`, `bar`, `pie`, `donut`, `radar`, `radialBar`, `scatter`, `heatmap`

## Import Steps
1. Click **Import CSV** on your scorecard.
2. Download the template (all types or any individual type: number, text, line, area, bar, pie, donut, radar, radial bar).
3. Replace the example values with your data, keeping headers unchanged.
4. Upload the CSV, review the preview, and import.
