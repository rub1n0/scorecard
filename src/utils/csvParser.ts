import { KPI, DataPoint, VisualizationType, ChartType } from '@/types';

export interface ParsedKPI extends Omit<KPI, 'id'> { }

export interface CSVParseResult {
    success: boolean;
    kpis: ParsedKPI[];
    errors: string[];
}

/**
 * Parse CSV string to array of rows
 */
function parseCSVToRows(csvContent: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < csvContent.length; i++) {
        const char = csvContent[i];
        const nextChar = csvContent[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentField += '"';
                i++; // Skip next quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip \n in \r\n
            }
            if (currentField || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                if (currentRow.some(field => field !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            }
        } else {
            currentField += char;
        }
    }

    // Add last field and row if exists
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field !== '')) {
            rows.push(currentRow);
        }
    }

    return rows;
}

/**
 * Parse simple format CSV (one row per KPI)
 * Format: KPI Name,Value,Date,Trend %,Notes,Historical Data
 */
function parseSimpleFormat(rows: string[][]): ParsedKPI[] {
    const kpis: ParsedKPI[] = [];
    const headers = rows[0].map(h => h.toLowerCase());

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;

        const kpiNameIdx = headers.findIndex(h => h.includes('name'));
        const valueIdx = headers.findIndex(h => h.includes('value') && !h.includes('historical'));
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const trendIdx = headers.findIndex(h => h.includes('trend'));
        const notesIdx = headers.findIndex(h => h.includes('notes'));
        const historicalIdx = headers.findIndex(h => h.includes('historical'));

        const name = row[kpiNameIdx] || `KPI ${i}`;
        const valueStr = row[valueIdx] || '0';
        const date = row[dateIdx] || new Date().toISOString().split('T')[0];
        const notes = notesIdx >= 0 ? row[notesIdx] : undefined;
        const trendStr = trendIdx >= 0 ? row[trendIdx] : undefined;
        const historicalStr = historicalIdx >= 0 ? row[historicalIdx] : undefined;

        // Determine if it's a number or text
        const numValue = parseFloat(valueStr);
        const isNumber = !isNaN(numValue);

        let dataPoints: DataPoint[] | undefined;
        if (historicalStr) {
            const values = historicalStr.split(';').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
            if (values.length > 0) {
                // Generate dates for historical data (going backwards from current date)
                const currentDate = new Date(date);
                dataPoints = values.map((value, idx) => {
                    const pointDate = new Date(currentDate);
                    pointDate.setDate(currentDate.getDate() - (values.length - idx) * 7); // Weekly intervals
                    return {
                        date: pointDate.toISOString().split('T')[0],
                        value,
                    };
                });
            }
        }

        const kpi: ParsedKPI = {
            name,
            value: isNumber ? numValue : valueStr,
            date,
            notes,
            visualizationType: isNumber ? 'number' : 'text',
            trendValue: trendStr ? parseFloat(trendStr) : undefined,
            dataPoints,
        };

        kpis.push(kpi);
    }

    return kpis;
}

/**
 * Parse time series format CSV (multiple rows per KPI)
 * Format: KPI Name,Chart Type,Date/Category,Value,Notes
 */
function parseTimeSeriesFormat(rows: string[][]): ParsedKPI[] {
    const kpis: ParsedKPI[] = [];
    const headers = rows[0].map(h => h.toLowerCase());

    // Group rows by KPI name
    const kpiGroups = new Map<string, string[][]>();

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;

        const kpiName = row[0];
        if (!kpiGroups.has(kpiName)) {
            kpiGroups.set(kpiName, []);
        }
        kpiGroups.get(kpiName)!.push(row);
    }

    // Process each KPI group
    kpiGroups.forEach((rowGroup, kpiName) => {
        const firstRow = rowGroup[0];
        const chartTypeStr = firstRow[1]?.toLowerCase() || 'line';

        // Map chart type strings
        const chartTypeMap: Record<string, ChartType> = {
            'line': 'line',
            'area': 'area',
            'bar': 'bar',
            'column': 'bar',
            'pie': 'pie',
            'donut': 'donut',
            'radar': 'radar',
            'radialbar': 'radialBar',
            'scatter': 'scatter',
            'heatmap': 'heatmap',
        };

        const chartType = chartTypeMap[chartTypeStr] || 'line';

        // Extract data points
        const dataPoints: DataPoint[] = [];
        let latestValue = 0;
        let latestDate = new Date().toISOString().split('T')[0];
        let notes: string | undefined;

        rowGroup.forEach(row => {
            const dateOrCategory = row[2] || new Date().toISOString().split('T')[0];
            const valueStr = row[3] || '0';
            const value = parseFloat(valueStr);

            if (!isNaN(value)) {
                dataPoints.push({
                    date: dateOrCategory,
                    value,
                });
                latestValue = value;
                latestDate = dateOrCategory;
            }

            if (row[4] && !notes) {
                notes = row[4];
            }
        });

        const kpi: ParsedKPI = {
            name: kpiName,
            value: latestValue,
            date: latestDate,
            notes,
            visualizationType: 'chart',
            chartType,
            dataPoints: dataPoints.length > 0 ? dataPoints : undefined,
        };

        kpis.push(kpi);
    });

    return kpis;
}

/**
 * Parse unified format CSV (handles mixed KPI types)
 * Supports all columns: KPI Name, Value, Date, Trend %, Notes, Chart Type, Category
 */
function parseUnifiedFormat(rows: string[][]): ParsedKPI[] {
    const kpis: ParsedKPI[] = [];
    const headers = rows[0].map(h => h.toLowerCase());

    // Find all possible column indices
    const kpiNameIdx = headers.findIndex(h => h.includes('name'));
    const valueIdx = headers.findIndex(h => h.includes('value'));
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const notesIdx = headers.findIndex(h => h.includes('notes'));
    const chartTypeIdx = headers.findIndex(h => h.includes('chart') && h.includes('type'));
    const categoryIdx = headers.findIndex(h => h.includes('category'));

    // Group rows by KPI name
    const kpiGroups = new Map<string, string[][]>();

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2 || !row[kpiNameIdx]) continue;

        const kpiName = row[kpiNameIdx];
        if (!kpiGroups.has(kpiName)) {
            kpiGroups.set(kpiName, []);
        }
        kpiGroups.get(kpiName)!.push(row);
    }

    // Process each KPI group
    kpiGroups.forEach((rowGroup, kpiName) => {
        const firstRow = rowGroup[0];

        // Determine KPI type based on available data
        const hasChartType = chartTypeIdx >= 0 && !!firstRow[chartTypeIdx];
        const hasCategory = categoryIdx >= 0 && !!firstRow[categoryIdx];

        // Default to number unless chart type is specified or it looks like a categorical chart
        let visualizationType: VisualizationType = 'number';
        let chartType: ChartType = 'line'; // Default chart type

        if (hasChartType) {
            visualizationType = 'chart';
            const chartTypeStr = (firstRow[chartTypeIdx] || 'line').toLowerCase();
            const chartTypeMap: Record<string, ChartType> = {
                'line': 'line', 'area': 'area', 'bar': 'bar', 'column': 'bar',
                'pie': 'pie', 'donut': 'donut', 'radar': 'radar',
                'radialbar': 'radialBar', 'scatter': 'scatter', 'heatmap': 'heatmap',
            };
            chartType = chartTypeMap[chartTypeStr] || 'line';
        } else if (hasCategory) {
            // If no chart type but has category, assume bar chart or similar?
            // Or maybe just keep it as number if it's ambiguous?
            // Let's stick to explicit chart type for charts, or default to number.
            // But if the user provided categories, they probably want a chart.
            // Let's default to 'bar' if categories are present but no chart type.
            visualizationType = 'chart';
            chartType = 'bar';
        } else {
            // Check if value is text
            const valueStr = firstRow[valueIdx] || '';
            if (isNaN(parseFloat(valueStr)) && valueStr.trim() !== '') {
                visualizationType = 'text';
            }
        }

        // Extract data points from all rows
        const dataPoints: DataPoint[] = [];
        let latestValue: number | string = 0;
        let latestDate = firstRow[dateIdx] || new Date().toISOString().split('T')[0];
        let notes: string | undefined = notesIdx >= 0 ? firstRow[notesIdx] : undefined;
        let trendValue: number | undefined;

        // Sort rows by date if possible (for time series)
        if (dateIdx >= 0) {
            rowGroup.sort((a, b) => {
                const dateA = new Date(a[dateIdx] || 0).getTime();
                const dateB = new Date(b[dateIdx] || 0).getTime();
                return dateA - dateB;
            });
        }

        rowGroup.forEach(row => {
            let dateOrCategory: string;
            let value: number;

            const isCategorical = ['bar', 'pie', 'donut', 'radar', 'radialBar'].includes(chartType);

            if (visualizationType === 'chart' && isCategorical && categoryIdx >= 0 && row[categoryIdx]) {
                // Categorical chart: use Category column for label
                dateOrCategory = row[categoryIdx];
            } else {
                // Time series or Number: use Date column
                dateOrCategory = row[dateIdx] || new Date().toISOString().split('T')[0];
            }

            const valStr = row[valueIdx] || '0';
            value = parseFloat(valStr);

            if (!isNaN(value)) {
                dataPoints.push({
                    date: dateOrCategory,
                    value,
                });
                latestValue = value; // Update latest value to the last row's value
                if (row[dateIdx]) {
                    latestDate = row[dateIdx];
                }
            } else if (visualizationType === 'text') {
                latestValue = valStr;
            }

            // Update notes if found in later rows (optional, maybe just keep first?)
            if (notesIdx >= 0 && row[notesIdx]) {
                notes = row[notesIdx];
            }
        });

        // For Number KPIs, if we have data points but no explicit trend, calculate it
        if (visualizationType === 'number' && dataPoints.length >= 2) {
            const last = dataPoints[dataPoints.length - 1].value;
            const prev = dataPoints[dataPoints.length - 2].value;
            trendValue = last - prev;
        }

        kpis.push({
            name: kpiName,
            value: latestValue,
            date: latestDate,
            notes,
            visualizationType,
            chartType: visualizationType === 'chart' ? chartType : undefined,
            trendValue,
            dataPoints: dataPoints.length > 0 ? dataPoints : undefined,
        });
    });

    return kpis;
}

/**
 * Detect CSV format and parse accordingly
 */
export function parseCSV(csvContent: string): CSVParseResult {
    const errors: string[] = [];

    try {
        const rows = parseCSVToRows(csvContent);

        if (rows.length < 2) {
            return {
                success: false,
                kpis: [],
                errors: ['CSV file must have at least a header row and one data row'],
            };
        }

        // Always use unified parser now as it handles grouping and all types
        const kpis = parseUnifiedFormat(rows);

        if (kpis.length === 0) {
            errors.push('No valid KPIs found in CSV');
        }

        return {
            success: kpis.length > 0,
            kpis,
            errors,
        };
    } catch (error) {
        return {
            success: false,
            kpis: [],
            errors: [`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
        };
    }
}

/**
 * Generate example CSV for download
 */
export function generateExampleCSV(type: 'all' | 'number' | 'line' | 'bar' | 'pie' | 'radar' | 'text' = 'all'): string {
    // Unified template with all KPI types
    const unifiedTemplate = `KPI Name,Value,Date,Notes,Chart Type,Category
Monthly Revenue,120000,2024-10-01,,,
Monthly Revenue,125000,2024-10-08,,,
Monthly Revenue,130000,2024-10-15,,,
Monthly Revenue,135000,2024-10-22,,,
Monthly Revenue,140000,2024-11-01,,,
Monthly Revenue,150000,2024-11-18,Strong growth,,
Customer Count,5450,2024-10-01,,,
Customer Count,5480,2024-10-08,,,
Customer Count,5500,2024-10-15,,,
Customer Count,5600,2024-10-22,,,
Customer Count,5550,2024-11-01,,,
Customer Count,5420,2024-11-18,Slight decline,,
Conversion Rate,3.0,2024-10-01,,,
Conversion Rate,3.1,2024-10-08,,,
Conversion Rate,2.8,2024-10-15,,,
Conversion Rate,2.9,2024-10-22,,,
Conversion Rate,3.0,2024-11-01,,,
Conversion Rate,3.2,2024-11-18,Improved targeting,,
Project Status,On Track,2024-11-18,All milestones met,,
Team Morale,High,2024-11-18,Positive feedback,,
Website Traffic,12500,2024-11-01,,line,
Website Traffic,13200,2024-11-05,,line,
Website Traffic,14800,2024-11-10,,line,
Website Traffic,15600,2024-11-18,Strong week,line,
Sales by Region,45000,2024-11-18,,bar,North America
Sales by Region,38000,2024-11-18,,bar,South America
Sales by Region,52000,2024-11-18,Best region,bar,Europe
Sales by Region,41000,2024-11-18,,bar,Asia Pacific
Traffic Sources,45,2024-11-18,,pie,Organic
Traffic Sources,25,2024-11-18,,pie,Paid Ads
Traffic Sources,18,2024-11-18,,pie,Social
Traffic Sources,12,2024-11-18,,pie,Direct
Product Score,85,2024-11-18,,radar,Quality
Product Score,72,2024-11-18,,radar,Speed
Product Score,90,2024-11-18,,radar,Reliability
Product Score,78,2024-11-18,,radar,Features
Product Score,65,2024-11-18,,radar,Value`;

    // Individual examples for backward compatibility
    const examples: Record<string, string> = {
        all: unifiedTemplate,

        number: `KPI Name,Value,Date,Notes
Monthly Revenue,120000,2024-10-01,
Monthly Revenue,125000,2024-10-08,
Monthly Revenue,130000,2024-10-15,
Monthly Revenue,135000,2024-10-22,
Monthly Revenue,140000,2024-11-01,
Monthly Revenue,150000,2024-11-18,Strong growth`,

        line: `KPI Name,Chart Type,Date,Value,Notes
Website Traffic,line,2024-11-01,12500,
Website Traffic,line,2024-11-05,13200,
Website Traffic,line,2024-11-10,14800,
Website Traffic,line,2024-11-15,13900,
Website Traffic,line,2024-11-18,15600,Last week strong`,

        bar: `KPI Name,Chart Type,Category,Value,Notes
Sales by Region,bar,North,45000,
Sales by Region,bar,South,38000,
Sales by Region,bar,East,52000,
Sales by Region,bar,West,41000,Strong performance`,

        pie: `KPI Name,Chart Type,Category,Value,Notes
Traffic Sources,pie,Organic,45,
Traffic Sources,pie,Paid,25,
Traffic Sources,pie,Social,18,
Traffic Sources,pie,Direct,12,Good organic reach`,

        radar: `KPI Name,Chart Type,Dimension,Value,Notes
Product Performance,radar,Quality,85,
Product Performance,radar,Speed,72,
Product Performance,radar,Reliability,90,
Product Performance,radar,Features,78,
Product Performance,radar,Price,65,Competitive pricing needed`,

        text: `KPI Name,Value,Date,Notes
Project Status,On Track,2024-11-18,All milestones met
Team Morale,High,2024-11-18,Positive feedback
Risk Level,Low,2024-11-18,No major concerns`,
    };

    return examples[type] || examples.all;
}
