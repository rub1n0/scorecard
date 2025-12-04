import { KPI, DataPoint, VisualizationType, ChartType } from '@/types';

export interface ParsedKPI extends Omit<KPI, 'id'> {
    sectionName?: string;
}

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

function parseAssigneeField(value?: string): string[] {
    if (!value) return [];

    return value
        .split(/[,;]+/)
        .map(entry => entry.trim())
        .filter(Boolean);
}

/**
 * Parse simple format CSV (one row per KPI)
 * Format: KPI Name,Value,Date,Trend %,Notes,Historical Data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            value: isNumber ? { "0": numValue } : { "0": valueStr }, // New Record format
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function parseTimeSeriesFormat(rows: string[][]): ParsedKPI[] {
    const kpis: ParsedKPI[] = [];

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
            value: { "0": latestValue }, // New Record format
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
    const subtitleIdx = headers.findIndex(h => h.includes('subtitle'));
    const valueIdx = headers.findIndex(h => h.includes('value'));
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const notesIdx = headers.findIndex(h => h.includes('notes'));
    const chartTypeIdx = headers.findIndex(h => h.includes('chart') && h.includes('type'));
    const categoryIdx = headers.findIndex(h => h.includes('category'));
    const sectionIdx = headers.findIndex(h => h.includes('section'));
    const assignmentIdx = headers.findIndex(h => h.includes('assignment') || h.includes('assignee'));

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
            // Check if ANY row has a text value
            const hasTextValue = rowGroup.some(row => {
                const valStr = row[valueIdx] || '';
                return isNaN(parseFloat(valStr)) && valStr.trim() !== '';
            });

            if (hasTextValue) {
                visualizationType = 'text';
            }
        }

        // Build the new value Record structure
        const valueRecord: Record<string, number | string> = {};
        const dataPoints: DataPoint[] = []; // Keep for backward compatibility
        let latestDate = firstRow[dateIdx] || new Date().toISOString().split('T')[0];
        const subtitle: string | undefined = subtitleIdx >= 0 ? firstRow[subtitleIdx] : undefined;
        let notes: string | undefined = notesIdx >= 0 ? firstRow[notesIdx] : undefined;
        const sectionName: string | undefined = sectionIdx >= 0 ? firstRow[sectionIdx] : undefined;
        const assignees: string[] = assignmentIdx >= 0 ? parseAssigneeField(firstRow[assignmentIdx]) : [];
        let trendValue: number | undefined;

        // Sort rows by date if possible (for time series)
        if (dateIdx >= 0) {
            rowGroup.sort((a, b) => {
                const dateA = new Date(a[dateIdx] || 0).getTime();
                const dateB = new Date(b[dateIdx] || 0).getTime();
                return dateA - dateB;
            });
        }

        const isCategorical = ['bar', 'pie', 'donut', 'radar', 'radialBar'].includes(chartType);

        rowGroup.forEach(row => {
            const valStr = row[valueIdx] || '0';

            // Check if this is a categorical chart with category:value format in the Value column
            if (visualizationType === 'chart' && isCategorical && valStr.includes(':')) {
                // Parse "Category1:value1 Category2:value2 ..." format
                const pairs = valStr.split(/\s+/); // Split by whitespace

                pairs.forEach(pair => {
                    const colonIndex = pair.indexOf(':');
                    if (colonIndex > 0) {
                        const category = pair.substring(0, colonIndex).trim();
                        const valueStr = pair.substring(colonIndex + 1).trim();
                        const numValue = parseFloat(valueStr);

                        if (category && !isNaN(numValue)) {
                            valueRecord[category] = numValue;
                            // Also add to dataPoints for backward compatibility
                            dataPoints.push({
                                date: category, // Use category as date for categorical charts
                                value: numValue,
                            });
                        }
                    }
                });

                // Update date and notes from this row
                if (row[dateIdx]) {
                    latestDate = row[dateIdx];
                }
                if (notesIdx >= 0 && row[notesIdx]) {
                    notes = row[notesIdx];
                }
                return; // Done processing this row
            }

            // Original logic for non-categorical or old format
            let key: string;
            let value: number | string;

            if (visualizationType === 'chart' && isCategorical && categoryIdx >= 0 && row[categoryIdx]) {
                // Old format: Categorical chart with separate Category column
                key = row[categoryIdx];
            } else if (visualizationType === 'number' || (visualizationType === 'chart' && !isCategorical)) {
                // For number/line/area: use "0" for single value, or date for time series
                key = visualizationType === 'number' ? "0" : (row[dateIdx] || new Date().toISOString().split('T')[0]);
            } else {
                // Text KPIs use "0" as key
                key = "0";
            }

            const numValue = parseFloat(valStr);

            if (!isNaN(numValue)) {
                value = numValue;
                // Also add to dataPoints for backward compatibility
                dataPoints.push({
                    date: row[categoryIdx] || row[dateIdx] || new Date().toISOString().split('T')[0],
                    value: numValue,
                });
                if (row[dateIdx]) {
                    latestDate = row[dateIdx];
                }
            } else if (visualizationType === 'text') {
                value = valStr;
            } else {
                return; // Skip invalid numeric values
            }

            // Store in value Record
            valueRecord[key] = value;

            // Update notes if found in later rows
            if (notesIdx >= 0 && row[notesIdx]) {
                notes = row[notesIdx];
            }
        });

        // For Number KPIs with only one value, ensure it's stored as "0"
        if (visualizationType === 'number' && Object.keys(valueRecord).length === 0 && dataPoints.length > 0) {
            valueRecord["0"] = dataPoints[dataPoints.length - 1].value;
        }

        // Calculate trend for number KPIs
        if (visualizationType === 'number' && dataPoints.length >= 2) {
            const last = dataPoints[dataPoints.length - 1].value;
            const prev = dataPoints[dataPoints.length - 2].value;
            trendValue = last - prev;
        }

        kpis.push({
            name: kpiName,
            subtitle,
            value: valueRecord,
            date: latestDate,
            notes,
            visualizationType,
            chartType: visualizationType === 'chart' ? chartType : undefined,
            trendValue,
            dataPoints: dataPoints.length > 0 ? dataPoints : undefined, // Keep for backward compatibility
            sectionName,
            assignees: assignees.length ? assignees : undefined,
            assignee: assignees[0],
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
 * 
 * CSV Structure creates KPI values as Record<string, number | string>:
 * - Single values (number/text): Multiple rows with same name/date create historical data,
 *   latest value stored as {"0": value}
 * - Categorical charts (bar/pie/radar): Rows with same name/date but different categories
 *   create value object like {"Category1": val1, "Category2": val2}
 * - Time-series charts (line/area): Each row becomes a date->value mapping
 * 
 * Examples:
 * - Number KPI with 6 rows → value: {"0": 150000}, dataPoints: [historical array]
 * - Bar chart with 4 categories → value: {"North": 45000, "South": 38000, ...}
 * - Text KPI → value: {"0": "On Track"}
 */
export function generateExampleCSV(type: 'all' | 'number' | 'line' | 'bar' | 'pie' | 'radar' | 'text' = 'all'): string {
    // Unified template with all KPI types
    const unifiedTemplate = `KPI Name,Subtitle,Value,Date,Notes,Chart Type,Section,Assignment
Monthly Revenue,Total Revenue,120000,2024-10-01,,,Financial,finance@example.com
Monthly Revenue,Total Revenue,125000,2024-10-08,,,Financial,finance@example.com
Monthly Revenue,Total Revenue,130000,2024-10-15,,,Financial,finance@example.com
Monthly Revenue,Total Revenue,135000,2024-10-22,,,Financial,finance@example.com
Monthly Revenue,Total Revenue,140000,2024-11-01,,,Financial,finance@example.com
Monthly Revenue,Total Revenue,150000,2024-11-18,Strong growth,,Financial,finance@example.com
Customer Count,Active Users,5450,2024-10-01,,,Growth,sales@example.com
Customer Count,Active Users,5480,2024-10-08,,,Growth,sales@example.com
Customer Count,Active Users,5500,2024-10-15,,,Growth,sales@example.com
Customer Count,Active Users,5600,2024-10-22,,,Growth,sales@example.com
Customer Count,Active Users,5550,2024-11-01,,,Growth,sales@example.com
Customer Count,Active Users,5420,2024-11-18,Slight decline,,Growth,sales@example.com
Conversion Rate,Percentage,3.0,2024-10-01,,,Marketing,marketing@example.com
Conversion Rate,Percentage,3.1,2024-10-08,,,Marketing,marketing@example.com
Conversion Rate,Percentage,2.8,2024-10-15,,,Marketing,marketing@example.com
Conversion Rate,Percentage,2.9,2024-10-22,,,Marketing,marketing@example.com
Conversion Rate,Percentage,3.0,2024-11-01,,,Marketing,marketing@example.com
Conversion Rate,Percentage,3.2,2024-11-18,Improved targeting,,Marketing,marketing@example.com
Project Status,Current Phase,On Track,2024-11-18,"All milestones met. See [Roadmap](https://example.com)",,Operations,pm@example.com
Team Morale,Employee Satisfaction,High,2024-11-18,"**Positive** feedback from team",,HR,hr@example.com
Website Traffic,Daily Visits,12500,2024-11-01,,line,Marketing,
Website Traffic,Daily Visits,13200,2024-11-05,,line,Marketing,
Website Traffic,Daily Visits,14800,2024-11-10,,line,Marketing,
Website Traffic,Daily Visits,15600,2024-11-18,Strong week,line,Marketing,
Sales by Region,Q4 Performance,North:45000 South:38000 East:52000 West:41000,2024-11-18,,bar,Sales,
Traffic Sources,Channel Distribution,Organic:45 Paid:25 Social:18 Direct:12,2024-11-18,,pie,Marketing,
Product Score,Quality Metrics,Quality:85 Speed:72 Reliability:90 Features:78 Value:65,2024-11-18,,radar,Product,`;

    // Individual examples for backward compatibility
    const examples: Record<string, string> = {
        all: unifiedTemplate,

        number: `KPI Name,Subtitle,Value,Date,Notes,Section,Assignment
Monthly Revenue,Total Revenue,120000,2024-10-01,,Financial,finance@example.com
Monthly Revenue,Total Revenue,125000,2024-10-08,,Financial,finance@example.com
Monthly Revenue,Total Revenue,130000,2024-10-15,,Financial,finance@example.com
Monthly Revenue,Total Revenue,135000,2024-10-22,,Financial,finance@example.com
Monthly Revenue,Total Revenue,140000,2024-11-01,,Financial,finance@example.com
Monthly Revenue,Total Revenue,150000,2024-11-18,Strong growth,Financial,finance@example.com`,

        line: `KPI Name,Subtitle,Chart Type,Date,Value,Notes,Section,Assignment
Website Traffic,Daily Visits,line,2024-11-01,12500,,Marketing,
Website Traffic,Daily Visits,line,2024-11-05,13200,,Marketing,
Website Traffic,Daily Visits,line,2024-11-10,14800,,Marketing,
Website Traffic,Daily Visits,line,2024-11-15,13900,,Marketing,
Website Traffic,Daily Visits,line,2024-11-18,15600,Last week strong,Marketing,`,

        bar: `KPI Name,Subtitle,Chart Type,Value,Date,Notes,Section,Assignment
Sales by Region,Q4 Performance,bar,North:45000 South:38000 East:52000 West:41000,2024-11-18,,Sales,sales@example.com`,

        pie: `KPI Name,Subtitle,Chart Type,Value,Date,Notes,Section,Assignment
Traffic Sources,Channel Distribution,pie,Organic:45 Paid:25 Social:18 Direct:12,2024-11-18,,Marketing,`,

        radar: `KPI Name,Subtitle,Chart Type,Value,Date,Notes,Section,Assignment
Product Performance,Quality Metrics,radar,Quality:85 Speed:72 Reliability:90 Features:78 Price:65,2024-11-18,,Product,`,

        text: `KPI Name,Subtitle,Value,Date,Notes,Section,Assignment
Project Status,Current Phase,On Track,2024-11-18,"All milestones met. See [Roadmap](https://example.com)",Operations,pm@example.com
Team Morale,Employee Satisfaction,High,2024-11-18,"**Positive** feedback from team",HR,hr@example.com
Risk Level,Risk Assessment,Low,2024-11-18,No major concerns,Operations,`,
    };

    return examples[type] || examples.all;
}
