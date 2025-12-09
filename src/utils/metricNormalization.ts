import { ChartSettings, ChartType, LabeledValue } from '@/types';

const MULTI_VALUE_TYPES = new Set<ChartType | string>(['radar', 'bar', 'column', 'pie', 'donut', 'radialBar']);

const toFiniteNumber = (input: unknown): number | null => {
    const num = typeof input === 'number' ? input : Number(input);
    return Number.isFinite(num) ? num : null;
};

const parseMultiValueString = (value: string): number[] => {
    const tokens = value
        .split(/[\s,;|]+/)
        .map(token => token.trim())
        .filter(Boolean);

    const numbers: number[] = [];
    for (const token of tokens) {
        const [, maybeNumber] = token.includes(':') ? token.split(':', 2) : [null, token];
        const num = toFiniteNumber(maybeNumber);
        if (num !== null) numbers.push(num);
    }
    return numbers;
};

export const isMultiValueChartType = (chartType?: string | null) => {
    if (!chartType) return false;
    return MULTI_VALUE_TYPES.has(chartType as ChartType);
};

export const normalizeDateOnly = (value?: string | Date): string => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'string' && value.trim()) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())).toISOString().slice(0, 10);
        }
    }
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
};

/**
 * Normalize a raw value into a number or array of numbers based on chart type.
 * For multi-value chart types, arrays are enforced even if a single number is provided.
 */
export const normalizeValueForChartType = (chartType: string | null | undefined, raw: unknown): number | number[] | LabeledValue[] => {
    const multi = isMultiValueChartType(chartType);

    if (multi) {
        // preserve labeled values if present
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null && 'label' in raw[0] && 'value' in raw[0]) {
            return raw as LabeledValue[];
        }

        if (Array.isArray(raw)) {
            const values = raw.map(toFiniteNumber).filter((n): n is number => n !== null);
            return values.length ? values : [0];
        }

        if (raw && typeof raw === 'object') {
            const values = Object.values(raw as Record<string, unknown>).map(toFiniteNumber).filter((n): n is number => n !== null);
            return values.length ? values : [0];
        }

        const parsed = typeof raw === 'string' ? parseMultiValueString(raw) : [];
        const coalesced = toFiniteNumber(raw);
        const combined = [...parsed, ...(coalesced !== null ? [coalesced] : [])];
        return combined.length ? combined : [0];
    }

    if (Array.isArray(raw)) {
        const first = toFiniteNumber(raw[0]);
        if (first !== null) return first;
    }

    const num = toFiniteNumber(raw);
    return num ?? 0;
};

export const serializeValueForStorage = (chartType: string | null | undefined, raw: unknown) => normalizeValueForChartType(chartType, raw);

export const mapDataPointValue = (chartType: string | null | undefined, rawDate: unknown, rawValue: unknown, color?: string | null) => {
    const normalizedValue = normalizeValueForChartType(chartType, rawValue);
    const date = normalizeDateOnly(typeof rawDate === 'string' || rawDate instanceof Date ? rawDate : undefined);

    if (Array.isArray(normalizedValue)) {
        // Handle LabeledValue array
        if (normalizedValue.length > 0 && typeof normalizedValue[0] === 'object' && 'value' in (normalizedValue[0] as any)) {
            const labeled = normalizedValue as LabeledValue[];
            const aggregate = labeled.reduce((sum, item) => sum + item.value, 0);
            return {
                date,
                value: aggregate,
                valueArray: labeled.map(item => item.value),
                labeledValues: labeled,
                color: color || undefined,
            };
        }

        // Handle number array
        const aggregate = (normalizedValue as number[]).reduce((sum, val) => sum + val, 0);
        return {
            date,
            value: aggregate,
            valueArray: normalizedValue as number[],
            color: color || undefined,
        };
    }

    return {
        date,
        value: normalizedValue as number,
        color: color || undefined,
    };
};

export const buildChartSettings = (row: {
    chartSettings?: unknown;
    strokeWidth?: number | null;
    strokeColor?: string | null;
    strokeOpacity?: number | null;
    showLegend?: boolean | number | null;
    showGridlines?: boolean | number | null;
    showDataLabels?: boolean | number | null;
}): ChartSettings => {
    const jsonSettings = (row.chartSettings || {}) as ChartSettings & { showGridlines?: boolean };
    return {
        strokeWidth: row.strokeWidth ?? jsonSettings.strokeWidth,
        strokeColor: row.strokeColor ?? jsonSettings.strokeColor,
        strokeOpacity: row.strokeOpacity ?? jsonSettings.strokeOpacity,
        showLegend: (typeof row.showLegend === 'number' ? Boolean(row.showLegend) : row.showLegend) ?? jsonSettings.showLegend,
        showGridLines:
            (typeof row.showGridlines === 'number' ? Boolean(row.showGridlines) : row.showGridlines) ??
            jsonSettings.showGridLines ??
            jsonSettings.showGridlines,
        showDataLabels: (typeof row.showDataLabels === 'number' ? Boolean(row.showDataLabels) : row.showDataLabels) ?? jsonSettings.showDataLabels,
    };
};

export const extractChartSettingColumns = (settings?: (ChartSettings & { showGridlines?: boolean }) | null) => {
    if (!settings) return {};
    return {
        strokeWidth: settings.strokeWidth,
        strokeColor: settings.strokeColor,
        strokeOpacity: settings.strokeOpacity,
        showLegend: settings.showLegend,
        showGridlines: settings.showGridlines ?? settings.showGridLines,
        showDataLabels: settings.showDataLabels,
    };
};
