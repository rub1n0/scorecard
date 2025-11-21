# CSV Import Guide

## Overview

The scorecard application supports bulk importing of KPIs from CSV files. This guide explains the supported CSV formats and provides examples for each visualization type.

## Supported Formats

The CSV parser automatically detects which format you're using based on the structure of your data.

### Format 1: Simple Format (One Row Per KPI)

Best for: Number KPIs and Text KPIs with or without historical data

**Header Row:**
```
KPI Name,Value,Date,Trend %,Notes,Historical Data
```

**Field Descriptions:**
- **KPI Name** (required): Name of the KPI
- **Value** (required): Current value (numeric for number KPIs, text for text KPIs)
- **Date** (optional): Date of the KPI (defaults to today)
- **Trend %** (optional): Percentage trend (positive or negative)
- **Notes** (optional): Additional context or notes
- **Historical Data** (optional): Semicolon-separated values for sparkline (e.g., `100;110;120;115;125`)

**Example:**
```csv
KPI Name,Value,Date,Trend %,Notes,Historical Data
Monthly Revenue,150000,2024-11-18,15.5,Strong growth,140000;135000;130000;125000
```

### Format 2: Time Series Format (Multiple Rows Per KPI)

Best for: Chart KPIs with multiple data points

**Header Row:**
```
KPI Name,Chart Type,Date,Value,Notes
```
or
```
KPI Name,Chart Type,Category,Value,Notes
```

**Field Descriptions:**
- **KPI Name** (required): Name of the KPI (same name for all rows of one KPI)
- **Chart Type** (required): Type of chart (line, area, bar, pie, donut, radar, etc.)
- **Date/Category** (required): X-axis value (date for time series, category name for categorical)
- **Value** (required): Y-axis value (numeric)
- **Notes** (optional): Notes (only first occurrence is used)

**Example:**
```csv
KPI Name,Chart Type,Date,Value,Notes
Website Traffic,line,2024-11-01,12500,
Website Traffic,line,2024-11-05,13200,
Website Traffic,line,2024-11-10,14800,Strong performance
```

## Chart Type Reference

### Supported Chart Types

| Chart Type | Use Case | CSV Value |
|------------|----------|-----------|
| Line | Trends over time | `line` |
| Area | Filled trends over time | `area` |
| Bar | Horizontal comparison | `bar` |
| Column | Vertical comparison | `column` or `bar` |
| Pie | Part-to-whole relationships | `pie` |
| Donut | Part-to-whole with emphasis | `donut` |
| Radar | Multi-dimensional comparison | `radar` |
| Radial Bar | Circular progress indicators | `radialbar` |
| Scatter | Correlation analysis | `scatter` |
| Heatmap | Density visualization | `heatmap` |

## Examples by Chart Type

### 1. Number KPIs with Trends and Sparklines

**File:** [examples/number_kpis.csv](file:///home/rub0t/scorecard/examples/number_kpis.csv)

```csv
KPI Name,Value,Date,Trend %,Notes,Historical Data
Monthly Revenue,150000,2024-11-18,15.5,Strong growth,140000;135000;130000;125000;120000
Customer Count,5420,2024-11-18,-2.3,Slight decline,5550;5600;5500;5480;5450
Conversion Rate,3.2,2024-11-18,8.0,Improved targeting,3.0;2.9;2.8;3.1;3.0
```

**Result:** Creates number-type KPIs with:
- Large number display
- Trend arrows (up for positive, down for negative)
- Sparkline charts from historical data

---

### 2. Line Chart

**File:** [examples/line_chart.csv](file:///home/rub0t/scorecard/examples/line_chart.csv)

```csv
KPI Name,Chart Type,Date,Value,Notes
Website Traffic,line,2024-11-01,12500,
Website Traffic,line,2024-11-05,13200,
Website Traffic,line,2024-11-10,14800,
Website Traffic,line,2024-11-15,13900,
Website Traffic,line,2024-11-18,15600,Last week strong
```

**Result:** Creates a line chart showing website traffic over time

---

### 3. Bar Chart

**File:** [examples/bar_chart.csv](file:///home/rub0t/scorecard/examples/bar_chart.csv)

```csv
KPI Name,Chart Type,Category,Value,Notes
Sales by Region,bar,North America,45000,
Sales by Region,bar,South America,38000,
Sales by Region,bar,Europe,52000,Best performing region
Sales by Region,bar,Asia Pacific,41000,
```

**Result:** Creates a bar chart comparing sales across regions

---

### 4. Pie Chart

**File:** [examples/pie_chart.csv](file:///home/rub0t/scorecard/examples/pie_chart.csv)

```csv
KPI Name,Chart Type,Category,Value,Notes
Traffic Sources,pie,Organic Search,45,
Traffic Sources,pie,Paid Advertising,25,
Traffic Sources,pie,Social Media,18,
Traffic Sources,pie,Direct Traffic,12,Strong organic performance
```

**Result:** Creates a pie chart showing traffic source distribution

---

### 5. Radar Chart

**File:** [examples/radar_chart.csv](file:///home/rub0t/scorecard/examples/radar_chart.csv)

```csv
KPI Name,Chart Type,Dimension,Value,Notes
Product Performance,radar,Quality Score,85,
Product Performance,radar,Speed,72,
Product Performance,radar,Reliability,90,Excellent reliability
Product Performance,radar,Feature Set,78,
Product Performance,radar,Price Value,65,
```

**Result:** Creates a radar chart showing product performance across multiple dimensions

---

### 6. Text KPIs

**File:** [examples/text_kpis.csv](file:///home/rub0t/scorecard/examples/text_kpis.csv)

```csv
KPI Name,Value,Date,Notes
Project Status,On Track,2024-11-18,All milestones met
Team Morale,High,2024-11-18,Positive feedback
Risk Level,Low,2024-11-18,No major concerns
```

**Result:** Creates text-type KPIs for qualitative metrics

## How to Import

### Step 1: Download Example Template

1. Click "Import CSV" button on your scorecard
2. In the import dialog, click one of the example download buttons
3. Open the downloaded CSV file in Excel, Google Sheets, or text editor

### Step 2: Fill in Your Data

1. Keep the header row unchanged
2. Replace example data with your own
3. Ensure data types match (numbers for numeric fields, dates in YYYY-MM-DD format)
4. For time series data, use the same KPI Name for all rows belonging to one KPI

### Step 3: Upload and Review

1. Save your CSV file
2. In the import dialog, drag and drop your file or click to browse
3. Review the preview to ensure KPIs were parsed correctly
4. Check that the visualization types are detected correctly

### Step 4: Import

1. Click "Import X KPIs" button
2. Your KPIs will be added to the scorecard
3. You can edit individual KPIs after import if needed

## Best Practices

### ✅ Do's

- **Use consistent date formats**: YYYY-MM-DD (e.g., 2024-11-18)
- **Keep headers exactly as shown**: The parser is case-insensitive but relies on keywords
- **Use semicolons for historical data**: `100;110;120` not `100,110,120`
- **Group related data**: Keep all rows for one KPI together in time series format
- **Test with examples first**: Download and try an example before creating your own

### ❌ Don'ts

- **Don't use commas in values**: Use `10000` not `10,000` (unless quoted)
- **Don't mix formats**: Use either simple or time series format, not both in one file
- **Don't skip required fields**: KPI Name and Value are always required
- **Don't use special characters** in KPI names without quoting
- **Don't leave gaps**: Empty rows will be ignored

## Common Errors and Solutions

### Error: "CSV file must have at least a header row and one data row"

**Cause:** Empty or nearly empty CSV file

**Solution:** Ensure your CSV has a header row and at least one data row

---

### Error: "No valid KPIs found in CSV"

**Cause:** Data doesn't match expected format or all rows are invalid

**Solutions:**
- Check that your header row contains required keywords (KPI Name, Value)
- Ensure data types are correct (numbers for numeric fields)
- Verify dates are in YYYY-MM-DD format
- Download an example template and compare

---

### KPI visualization type is wrong

**Cause:** Auto-detection chose the wrong type

**Solution:** After import, click Edit on the KPI and manually change the visualization type

---

### Historical data not showing in sparkline

**Cause:** Historical Data column missing or incorrectly formatted

**Solutions:**
- Ensure column header contains "Historical"
- Use semicolons to separate values: `100;110;120`
- Provide at least 2 data points

---

### Chart shows wrong data

**Cause:** Rows not properly grouped for time series format

**Solution:** Ensure all rows for one KPI have the exact same "KPI Name" value

## Advanced Usage

### Combining Multiple CSVs

You can import multiple CSV files to a single scorecard:

1. Import first CSV file
2. Import second CSV file
3. All KPIs will be added (duplicates are not automatically merged)

### Mixing Visualization Types

You can mix different visualization types in a single CSV using simple format:

```csv
KPI Name,Value,Date,Trend %,Notes,Historical Data
Revenue,150000,2024-11-18,15.5,Strong growth,140000;135000;130000
Status,On Track,2024-11-18,,All milestones met,
```

The parser will automatically create:
- Number KPI for Revenue (because value is numeric)
- Text KPI for Status (because value is text)

### Custom Date Ranges

For chart KPIs, you can use any date range:

```csv
KPI Name,Chart Type,Date,Value,Notes
Sales,line,2024-01-01,10000,Q1 Start
Sales,line,2024-04-01,12000,Q2 Start
Sales,line,2024-07-01,14000,Q3 Start
Sales,line,2024-10-01,16000,Q4 Start
```

## Troubleshooting Tips

1. **Open CSV in text editor**: If Excel is causing issues, use a plain text editor to verify format
2. **Check encoding**: Use UTF-8 encoding for special characters
3. **Quote text with commas**: If your text contains commas, wrap in quotes: `"Value, with, commas"`
4. **Start small**: Test with 1-2 KPIs before importing large files
5. **Use examples**: Download and modify example files rather than starting from scratch

## Support

For additional help or to report issues with CSV import:
- Review the examples in the `examples/` directory
- Check that your CSV matches one of the supported formats
- Try downloading and modifying an example template
- Contact support with your CSV file if issues persist
