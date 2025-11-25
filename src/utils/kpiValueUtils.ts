/**
 * Utility functions for working with the new KPI value structure
 */

/**
 * Gets the display value for a KPI
 * For single values (number/text), returns the value stored at key "0"
 * For multi-value (charts), returns a formatted string or the first value
 */
export function getDisplayValue(value: Record<string, number | string>): string {
    // Try to get the "0" key for single values
    if (value["0"] !== undefined) {
        return String(value["0"]);
    }

    // Otherwise get the first value
    const values = Object.values(value);
    if (values.length === 0) return '';
    if (values.length === 1) return String(values[0]);

    // For multi-value, return a summary
    return `${values.length} values`;
}

/**
 * Gets the numeric value for a number KPI
 */
export function getNumericValue(value: Record<string, number | string>): number {
    const rawValue = value["0"] || Object.values(value)[0] || 0;
    return typeof rawValue === 'number' ? rawValue : parseFloat(rawValue as string);
}

/**
 * Gets the text value for a text KPI
 */
export function getTextValue(value: Record<string, number | string>): string {
    return String(value["0"] || Object.values(value)[0] || '');
}

/**
 * Converts value Record to chart-compatible data points
 * For categorical charts: keys become categories, values become data
 */
export function valueToChartData(value: Record<string, number | string>): Array<{ label: string; value: number }> {
    return Object.entries(value).map(([label, val]) => ({
        label,
        value: typeof val === 'number' ? val : parseFloat(String(val))
    }));
}

/**
 * Creates a single-value Record from a number or string
 */
export function createSingleValue(val: number | string): Record<string, number | string> {
    return { "0": val };
}

/**
 * Creates a multi-value Record from categories and values
 */
export function createMultiValue(data: Record<string, number | string>): Record<string, number | string> {
    return data;
}
