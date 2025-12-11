import { KPI, Metric, VisualizationType, ChartType, ChartSettings } from '@/types';

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

function parseBooleanField(value?: string): boolean | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();

    if (['true', 'yes', 'y', '1', 'on'].includes(normalized)) return true;
    if (['false', 'no', 'n', '0', 'off'].includes(normalized)) return false;

    return undefined;
}

function parseNumberField(value?: string): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
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

        let dataPoints: Metric[] | undefined;
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
            metrics: dataPoints,
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
        const dataPoints: Metric[] = [];
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
            metrics: dataPoints.length > 0 ? dataPoints : undefined,
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
    const visualizationTypeIdx = headers.findIndex(h => h.includes('visualization'));
    const chartTypeIdx = headers.findIndex(h => h.includes('chart') && h.includes('type'));
    const categoryIdx = headers.findIndex(h => h.includes('category'));
    const sectionIdx = headers.findIndex(h => h.includes('section'));
    const assignmentIdx = headers.findIndex(h => h.includes('assignment') || h.includes('assignee'));
    const prefixIdx = headers.findIndex(h => h.includes('prefix'));
    const suffixIdx = headers.findIndex(h => h.includes('suffix'));
    const reverseTrendIdx = headers.findIndex(h => h.includes('reverse') && h.includes('trend'));
    const strokeWidthIdx = headers.findIndex(h => h.includes('stroke') && h.includes('width'));
    const strokeColorIdx = headers.findIndex(h => h.includes('stroke') && h.includes('color'));
    const strokeOpacityIdx = headers.findIndex(h => h.includes('stroke') && h.includes('opacity'));
    const showLegendIdx = headers.findIndex(h => h.includes('legend'));
    const showGridLinesIdx = headers.findIndex(h => h.includes('grid'));
    const showDataLabelsIdx = headers.findIndex(h => h.includes('data') && h.includes('label'));

    if (kpiNameIdx === -1) {
        throw new Error('CSV is missing required "KPI Name" column');
    }

    if (valueIdx === -1) {
        throw new Error('CSV is missing required "Value" column');
    }

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

        const getColumnValue = (idx: number): string | undefined => {
            if (idx < 0) return undefined;
            const rowWithValue = rowGroup.find(row => (row[idx] || '').trim() !== '');
            return rowWithValue ? rowWithValue[idx] : undefined;
        };

        // Determine KPI type based on available data
        const rawVisualizationType = visualizationTypeIdx >= 0 ? (getColumnValue(visualizationTypeIdx)?.trim() || '') : '';
        const rawChartType = chartTypeIdx >= 0 ? (getColumnValue(chartTypeIdx)?.trim() || '') : '';
        const normalizedVisType = rawVisualizationType.toLowerCase();
        const normalizedChartType = rawChartType.toLowerCase();
        const hasChartType = chartTypeIdx >= 0 && !!rawChartType;
        const hasCategory = categoryIdx >= 0 && !!getColumnValue(categoryIdx)?.trim();

        // Default to number unless explicitly set
        let visualizationType: VisualizationType = 'number';
        let chartType: ChartType = 'line'; // Default chart type

        const normalizeVisualizationHint = (val: string): VisualizationType | undefined => {
            if (!val) return undefined;
            if (['text', 'note', 'status'].includes(val)) return 'text';
            if (['chart', 'graph', 'visual'].includes(val)) return 'chart';
            if (['number', 'metric', 'value'].includes(val)) return 'number';
            return undefined;
        };

        const visHint = normalizeVisualizationHint(normalizedVisType);
        if (visHint === 'text') {
            visualizationType = 'text';
            chartType = 'line';
        } else if (visHint === 'number') {
            visualizationType = 'number';
            chartType = 'line';
        } else if (visHint === 'chart') {
            visualizationType = 'chart';
        }

        // Allow explicit type hints for number/text in the Chart Type column
        if (visHint !== 'text' && visHint !== 'number' && ['number', 'metric', 'value'].includes(normalizedChartType)) {
            visualizationType = 'number';
            chartType = 'line';
        } else if (visHint !== 'text' && visHint !== 'number' && ['text', 'note', 'status'].includes(normalizedChartType)) {
            visualizationType = 'text';
            chartType = 'line';
        } else if (visHint !== 'text' && hasChartType) {
            visualizationType = 'chart';
            const chartTypeMap: Record<string, ChartType> = {
                'line': 'line', 'area': 'area', 'bar': 'bar', 'column': 'bar',
                'pie': 'pie', 'donut': 'donut', 'radar': 'radar',
                'radialbar': 'radialBar', 'scatter': 'scatter', 'heatmap': 'heatmap',
            };
            chartType = chartTypeMap[normalizedChartType] || 'line';
        } else if (visHint !== 'text' && hasCategory) {
            // If no chart type but has category, assume bar chart or similar?
            // Or maybe just keep it as number if it's ambiguous?
            // Let's stick to explicit chart type for charts, or default to number.
            // But if the user provided categories, they probably want a chart.
            // Let's default to 'bar' if categories are present but no chart type.
            visualizationType = 'chart';
            chartType = 'bar';
        } else if (!visHint) {
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
        const dataPoints: Metric[] = []; // Keep for backward compatibility
        let latestDate = (dateIdx >= 0 ? firstRow[dateIdx] : undefined) || new Date().toISOString().split('T')[0];
        const subtitle: string | undefined = subtitleIdx >= 0 ? getColumnValue(subtitleIdx) || undefined : undefined;
        let notes: string | undefined = notesIdx >= 0 ? getColumnValue(notesIdx) || undefined : undefined;
        const sectionName: string | undefined = sectionIdx >= 0 ? (getColumnValue(sectionIdx)?.trim() || undefined) : undefined;
        const assignees: string[] = assignmentIdx >= 0 ? parseAssigneeField(getColumnValue(assignmentIdx)) : [];
        const prefix = prefixIdx >= 0 ? (getColumnValue(prefixIdx) || '').trim() : '';
        const suffix = suffixIdx >= 0 ? (getColumnValue(suffixIdx) || '').trim() : '';
        const reverseTrend = reverseTrendIdx >= 0 ? parseBooleanField(getColumnValue(reverseTrendIdx)) : undefined;
        const chartSettings: ChartSettings = {};

        const strokeWidth = strokeWidthIdx >= 0 ? parseNumberField(getColumnValue(strokeWidthIdx)) : undefined;
        const strokeColor = strokeColorIdx >= 0 ? getColumnValue(strokeColorIdx) : undefined;
        const strokeOpacity = strokeOpacityIdx >= 0 ? parseNumberField(getColumnValue(strokeOpacityIdx)) : undefined;
        const showLegend = showLegendIdx >= 0 ? parseBooleanField(getColumnValue(showLegendIdx)) : undefined;
        const showGridLines = showGridLinesIdx >= 0 ? parseBooleanField(getColumnValue(showGridLinesIdx)) : undefined;
        const showDataLabels = showDataLabelsIdx >= 0 ? parseBooleanField(getColumnValue(showDataLabelsIdx)) : undefined;

        if (strokeWidth !== undefined) chartSettings.strokeWidth = strokeWidth;
        if (strokeColor) chartSettings.strokeColor = strokeColor;
        if (strokeOpacity !== undefined) chartSettings.strokeOpacity = strokeOpacity;
        if (showLegend !== undefined) chartSettings.showLegend = showLegend;
        if (showGridLines !== undefined) chartSettings.showGridLines = showGridLines;
        if (showDataLabels !== undefined) chartSettings.showDataLabels = showDataLabels;
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
            const rowDate = dateIdx >= 0 ? row[dateIdx] : undefined;
            const rowCategory = categoryIdx >= 0 ? row[categoryIdx] : undefined;

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
                if (rowDate) {
                    latestDate = rowDate;
                }
                if (notesIdx >= 0 && row[notesIdx]) {
                    notes = row[notesIdx];
                }
                return; // Done processing this row
            }

            // Original logic for non-categorical or old format
            let key: string;
            let value: number | string;

            if (visualizationType === 'chart' && isCategorical && rowCategory) {
                // Old format: Categorical chart with separate Category column
                key = rowCategory;
            } else if (visualizationType === 'number' || (visualizationType === 'chart' && !isCategorical)) {
                // For number/line/area: use "0" for single value, or date for time series
                key = visualizationType === 'number' ? "0" : (rowDate || new Date().toISOString().split('T')[0]);
            } else {
                // Text KPIs use "0" as key
                key = "0";
            }

            const numValue = parseFloat(valStr);

            if (!isNaN(numValue)) {
                value = numValue;
                // Also add to dataPoints for backward compatibility
                dataPoints.push({
                    date: rowCategory || rowDate || new Date().toISOString().split('T')[0],
                    value: numValue,
                });
                if (rowDate) {
                    latestDate = rowDate;
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
            const lastVal = dataPoints[dataPoints.length - 1].value;
            valueRecord["0"] = Array.isArray(lastVal) ? (lastVal[0] ?? 0) : lastVal;
        }

        // Calculate trend for number KPIs
        if (visualizationType === 'number' && dataPoints.length >= 2) {
            const lastVal = dataPoints[dataPoints.length - 1].value;
            const prevVal = dataPoints[dataPoints.length - 2].value;
            const last = Array.isArray(lastVal) ? (lastVal[0] ?? 0) : lastVal;
            const prev = Array.isArray(prevVal) ? (prevVal[0] ?? 0) : prevVal;
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
            metrics: dataPoints.length > 0 ? dataPoints : undefined,
            dataPoints: dataPoints.length > 0 ? dataPoints : undefined, // Keep for backward compatibility
            sectionName,
            assignees: assignees.length ? assignees : undefined,
            assignee: assignees[0],
            reverseTrend,
            prefix: prefix || undefined,
            suffix: suffix || undefined,
            chartSettings: Object.keys(chartSettings).length > 0 ? chartSettings : undefined,
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
export function generateExampleCSV(
    type: 'all' | 'number' | 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radar' | 'radialBar' | 'text' = 'all'
): string {
    const headers = [
        'KPI Name',
        'Subtitle',
        'Value',
        'Date',
        'Notes',
        'Visualization Type',
        'Chart Type',
        'Section',
        'Assignment',
        'Prefix',
        'Suffix',
        'Reverse Trend',
        'Stroke Width',
        'Stroke Color',
        'Stroke Opacity',
        'Show Legend',
        'Show Grid Lines',
        'Show Data Labels',
    ];

    const addVisualizationType = (rows: string[][]): string[][] => {
        return rows.map(row => {
            const [name, subtitle, value, date, notes, chartType, ...rest] = row;
            const normalizedChart = (chartType || '').toLowerCase();
            const isChart = ['line', 'area', 'bar', 'column', 'pie', 'donut', 'radar', 'radialbar', 'scatter', 'heatmap'].includes(normalizedChart);
            const isNumber = !isNaN(parseFloat(value));
            const visType = isChart ? 'chart' : isNumber ? 'number' : 'text';
            return [name, subtitle, value, date, notes, visType, chartType, ...rest];
        });
    };

    const buildCSV = (rows: string[][]) => [headers, ...addVisualizationType(rows)].map(row => row.join(',')).join('\n');

    // Unified template with all KPI types
    const unifiedRows: string[][] = [
        // Number KPIs with history
        ['Monthly Revenue', 'Total Revenue', '120000', '2024-10-01', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
        ['Monthly Revenue', 'Total Revenue', '125000', '2024-10-08', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
        ['Monthly Revenue', 'Total Revenue', '130000', '2024-10-15', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
        ['Monthly Revenue', 'Total Revenue', '135000', '2024-10-22', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
        ['Monthly Revenue', 'Total Revenue', '140000', '2024-11-01', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
        ['Monthly Revenue', 'Total Revenue', '150000', '2024-11-18', 'Strong growth', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],

        ['Customer Count', 'Active Users', '5450', '2024-10-01', '', '', 'Growth', 'sales@example.com', '', '', '', '', '', '', '', '', ''],
        ['Customer Count', 'Active Users', '5480', '2024-10-08', '', '', 'Growth', 'sales@example.com', '', '', '', '', '', '', '', '', ''],
        ['Customer Count', 'Active Users', '5500', '2024-10-15', '', '', 'Growth', 'sales@example.com', '', '', '', '', '', '', '', '', ''],
        ['Customer Count', 'Active Users', '5600', '2024-10-22', '', '', 'Growth', 'sales@example.com', '', '', '', '', '', '', '', '', ''],
        ['Customer Count', 'Active Users', '5550', '2024-11-01', '', '', 'Growth', 'sales@example.com', '', '', '', '', '', '', '', '', ''],
        ['Customer Count', 'Active Users', '5420', '2024-11-18', 'Slight decline', '', 'Growth', 'sales@example.com', '', '', '', '', '', '', '', '', ''],

        ['Conversion Rate', 'Percentage', '3.0', '2024-10-01', '', '', 'Marketing', 'marketing@example.com', '', '%', '', '', '', '', '', '', ''],
        ['Conversion Rate', 'Percentage', '3.1', '2024-10-08', '', '', 'Marketing', 'marketing@example.com', '', '%', '', '', '', '', '', '', ''],
        ['Conversion Rate', 'Percentage', '2.8', '2024-10-15', '', '', 'Marketing', 'marketing@example.com', '', '%', '', '', '', '', '', '', ''],
        ['Conversion Rate', 'Percentage', '2.9', '2024-10-22', '', '', 'Marketing', 'marketing@example.com', '', '%', '', '', '', '', '', '', ''],
        ['Conversion Rate', 'Percentage', '3.0', '2024-11-01', '', '', 'Marketing', 'marketing@example.com', '', '%', '', '', '', '', '', '', ''],
        ['Conversion Rate', 'Percentage', '3.2', '2024-11-18', 'Improved targeting', '', 'Marketing', 'marketing@example.com', '', '%', '', '', '', '', '', '', ''],

        // Text KPIs
        ['Project Status', 'Current Phase', 'On Track', '2024-11-18', 'All milestones met. See [Roadmap](https://example.com)', '', 'Operations', 'pm@example.com', '', '', '', '', '', '', '', '', ''],
        ['Team Morale', 'Employee Satisfaction', 'High', '2024-11-18', '**Positive** feedback from team', '', 'HR', 'hr@example.com', '', '', '', '', '', '', '', '', ''],

        // Line chart
        ['Website Traffic', 'Daily Visits', '12500', '2024-11-01', '', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],
        ['Website Traffic', 'Daily Visits', '13200', '2024-11-05', '', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],
        ['Website Traffic', 'Daily Visits', '14800', '2024-11-10', '', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],
        ['Website Traffic', 'Daily Visits', '15600', '2024-11-18', 'Strong week', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],

        // Area chart
        ['Latency', 'p95 by Week', '480', '2024-11-01', '', 'area', 'Platform', '', '', 'ms', '', '3', '#5094af', '0.8', 'false', 'true', 'false'],
        ['Latency', 'p95 by Week', '440', '2024-11-08', '', 'area', 'Platform', '', '', 'ms', '', '3', '#5094af', '0.8', 'false', 'true', 'false'],
        ['Latency', 'p95 by Week', '420', '2024-11-15', '', 'area', 'Platform', '', '', 'ms', '', '3', '#5094af', '0.8', 'false', 'true', 'false'],
        ['Latency', 'p95 by Week', '405', '2024-11-22', 'Caching rollout', 'area', 'Platform', '', '', 'ms', '', '3', '#5094af', '0.8', 'false', 'true', 'false'],

        // Categorical charts
        ['Sales by Region', 'Q4 Performance', 'North:45000 South:38000 East:52000 West:41000', '2024-11-18', '', 'bar', 'Sales', '', '$', '', '', '2', '#dea821', '1', 'true', 'false', 'true'],
        ['Traffic Sources', 'Channel Distribution', 'Organic:45 Paid:25 Social:18 Direct:12', '2024-11-18', '', 'pie', 'Marketing', '', '', '', '', '2', '#36c9b8', '0.85', 'true', '', 'true'],
        ['Product Score', 'Quality Metrics', 'Quality:85 Speed:72 Reliability:90 Features:78 Value:65', '2024-11-18', '', 'radar', 'Product', '', '', '', '', '2', '#e0451f', '1', 'true', 'true', 'true'],
        ['Spend by Channel', 'Budget Split', 'Paid:120 Organic:80 Direct:50 Partners:45', '2024-11-18', '', 'donut', 'Marketing', '', '$', '', '', '2', '#36c9b8', '0.9', 'true', '', 'true'],
        ['SLA Compliance', 'Regional Uptime', 'US-East:99.9 EMEA:99.7 APAC:99.5 LATAM:99.3', '2024-11-18', '', 'radialBar', 'Platform', '', '', '%', '', '4', '#5094af', '1', 'true', '', 'true'],
    ];

    const examples: Record<string, string> = {
        all: buildCSV(unifiedRows),

        number: buildCSV([
            ['Monthly Revenue', 'Total Revenue', '120000', '2024-10-01', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
            ['Monthly Revenue', 'Total Revenue', '125000', '2024-10-08', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
            ['Monthly Revenue', 'Total Revenue', '130000', '2024-10-15', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
            ['Monthly Revenue', 'Total Revenue', '135000', '2024-10-22', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
            ['Monthly Revenue', 'Total Revenue', '140000', '2024-11-01', '', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
            ['Monthly Revenue', 'Total Revenue', '150000', '2024-11-18', 'Strong growth', '', 'Financial', 'finance@example.com', '$', '', 'false', '2', '#457B9D', '1', 'false', 'false', 'false'],
        ]),

        line: buildCSV([
            ['Website Traffic', 'Daily Visits', '12500', '2024-11-01', '', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],
            ['Website Traffic', 'Daily Visits', '13200', '2024-11-05', '', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],
            ['Website Traffic', 'Daily Visits', '14800', '2024-11-10', '', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],
            ['Website Traffic', 'Daily Visits', '13900', '2024-11-15', '', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],
            ['Website Traffic', 'Daily Visits', '15600', '2024-11-18', 'Last week strong', 'line', 'Marketing', '', '', '', '', '2', '#36c9b8', '1', 'true', 'true', 'false'],
        ]),

        area: buildCSV([
            ['Latency', 'p95 by Week', '480', '2024-11-01', '', 'area', 'Platform', '', '', 'ms', '', '3', '#5094af', '0.8', 'false', 'true', 'false'],
            ['Latency', 'p95 by Week', '440', '2024-11-08', '', 'area', 'Platform', '', '', 'ms', '', '3', '#5094af', '0.8', 'false', 'true', 'false'],
            ['Latency', 'p95 by Week', '420', '2024-11-15', '', 'area', 'Platform', '', '', 'ms', '', '3', '#5094af', '0.8', 'false', 'true', 'false'],
            ['Latency', 'p95 by Week', '405', '2024-11-22', 'Caching rollout', 'area', 'Platform', '', '', 'ms', '', '3', '#5094af', '0.8', 'false', 'true', 'false'],
        ]),

        bar: buildCSV([
            ['Sales by Region', 'Q4 Performance', 'North:45000 South:38000 East:52000 West:41000', '2024-11-18', '', 'bar', 'Sales', 'sales@example.com', '$', '', '', '2', '#dea821', '1', 'true', 'false', 'true'],
        ]),

        pie: buildCSV([
            ['Traffic Sources', 'Channel Distribution', 'Organic:45 Paid:25 Social:18 Direct:12', '2024-11-18', '', 'pie', 'Marketing', '', '', '', '', '2', '#36c9b8', '0.85', 'true', '', 'true'],
        ]),

        donut: buildCSV([
            ['Spend by Channel', 'Budget Split', 'Paid:120 Organic:80 Direct:50 Partners:45', '2024-11-18', '', 'donut', 'Marketing', '', '$', '', '', '2', '#36c9b8', '0.9', 'true', '', 'true'],
        ]),

        radar: buildCSV([
            ['Product Performance', 'Quality Metrics', 'Quality:85 Speed:72 Reliability:90 Features:78 Price:65', '2024-11-18', '', 'radar', 'Product', '', '', '', '', '2', '#e0451f', '1', 'true', 'true', 'true'],
        ]),

        radialBar: buildCSV([
            ['SLA Compliance', 'Regional Uptime', 'US-East:99.9 EMEA:99.7 APAC:99.5 LATAM:99.3', '2024-11-18', '', 'radialBar', 'Platform', '', '', '%', '', '4', '#5094af', '1', 'true', '', 'true'],
        ]),

        text: buildCSV([
            ['Project Status', 'Current Phase', 'On Track', '2024-11-18', 'All milestones met. See [Roadmap](https://example.com)', '', 'Operations', 'pm@example.com', '', '', '', '', '', '', '', '', ''],
            ['Team Morale', 'Employee Satisfaction', 'High', '2024-11-18', '**Positive** feedback from team', '', 'HR', 'hr@example.com', '', '', '', '', '', '', '', '', ''],
            ['Risk Level', 'Risk Assessment', 'Low', '2024-11-18', 'No major concerns', '', 'Operations', '', '', '', '', '', '', '', '', '', ''],
        ]),
    };

    return examples[type] || examples.all;
}
