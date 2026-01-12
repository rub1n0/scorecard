import { ChartSettings, ChartType, LabeledValue, VisualizationType } from '@/types';

const MULTI_VALUE_TYPES = new Set<ChartType | string>(['radar', 'bar', 'column', 'pie', 'donut', 'radialBar']);

const isLabeledValue = (value: unknown): value is LabeledValue => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as Partial<LabeledValue>;
    return (
        typeof candidate.value === 'number' &&
        'label' in candidate &&
        typeof candidate.label === 'string'
    );
};

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

export const resolveVisualizationType = (
    visualizationType?: string | null,
    chartType?: string | null
): VisualizationType => {
    if (chartType === 'sankey') return 'sankey';
    if (chartType) return 'chart';
    if (visualizationType === 'text' || visualizationType === 'chart' || visualizationType === 'sankey' || visualizationType === 'number') {
        return visualizationType;
    }
    return 'number';
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
    if (chartType === 'multiAxisLine') {
        if (Array.isArray(raw)) {
            const values = raw.map(toFiniteNumber).filter((n): n is number => n !== null);
            const [a, b] = [values[0] ?? 0, values[1] ?? 0];
            return [a, b];
        }

        if (raw && typeof raw === 'object') {
            const record = raw as Record<string, unknown>;
            const values = [
                toFiniteNumber(record.a ?? record.primary ?? record[0] ?? Object.values(record)[0]),
                toFiniteNumber(record.b ?? record.secondary ?? record[1] ?? Object.values(record)[1]),
            ].map((n) => n ?? 0);
            return [values[0], values[1] ?? 0];
        }

        const num = toFiniteNumber(raw);
        return [num ?? 0, 0];
    }

    const multi = isMultiValueChartType(chartType);

    if (multi) {
        // preserve labeled values if present
        if (Array.isArray(raw) && raw.length > 0 && isLabeledValue(raw[0])) {
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

export const mapMetricValue = (chartType: string | null | undefined, rawDate: unknown, rawValue: unknown, color?: string | null) => {
    const date = normalizeDateOnly(typeof rawDate === 'string' || rawDate instanceof Date ? rawDate : undefined);

    if (chartType === 'multiAxisLine') {
        const rawArray = Array.isArray(rawValue)
            ? rawValue
            : rawValue && typeof rawValue === 'object'
                ? Object.values(rawValue as Record<string, unknown>)
                : [rawValue];
        const values = rawArray.map((v) => toFiniteNumber(v) ?? 0);
        const primary = values[0] ?? 0;
        const secondary = values[1] ?? 0;
        return {
            date,
            value: primary,
            valueArray: [primary, secondary],
            color: color || undefined,
        };
    }

    const normalizedValue = normalizeValueForChartType(chartType, rawValue);

    if (Array.isArray(normalizedValue)) {
        // Handle LabeledValue array
        if (normalizedValue.length > 0 && isLabeledValue(normalizedValue[0])) {
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
    fillOpacity?: number | null;
    showLegend?: boolean | number | null;
    showGridLines?: boolean | number | null;
    showDataLabels?: boolean | number | null;
}): ChartSettings => {
    const jsonSettings = (row.chartSettings || {}) as Partial<ChartSettings> & {
        showGridlines?: boolean;
        showGridLines?: boolean;
    };
    const strokeColorFromJson = jsonSettings.strokeColor;
    const normalizeStroke = (value: unknown) => {
        if (Array.isArray(value) && value.length > 0) return value as string[];
        if (typeof value === 'string') return value;
        return undefined;
    };
    return {
        strokeWidth: row.strokeWidth ?? jsonSettings.strokeWidth,
        strokeColor: normalizeStroke(strokeColorFromJson) ?? row.strokeColor ?? undefined,
        strokeOpacity: row.strokeOpacity ?? jsonSettings.strokeOpacity,
        fillOpacity: row.fillOpacity ?? jsonSettings.fillOpacity,
        showLegend: (typeof row.showLegend === 'number' ? Boolean(row.showLegend) : row.showLegend) ?? jsonSettings.showLegend,
        showGridLines:
            (typeof row.showGridLines === 'number' ? Boolean(row.showGridLines) : row.showGridLines) ??
            (typeof row.showGridLines === 'number' ? Boolean(row.showGridLines) : row.showGridLines) ??
            jsonSettings.showGridLines ??
            (jsonSettings as { showGridlines?: boolean }).showGridlines,
        showDataLabels: (typeof row.showDataLabels === 'number' ? Boolean(row.showDataLabels) : row.showDataLabels) ?? jsonSettings.showDataLabels,
        primaryLabel: (jsonSettings as { primaryLabel?: string }).primaryLabel,
        secondaryLabel: (jsonSettings as { secondaryLabel?: string }).secondaryLabel,
        primarySeriesType: (jsonSettings as { primarySeriesType?: 'line' | 'area' }).primarySeriesType,
        secondarySeriesType: (jsonSettings as { secondarySeriesType?: 'line' | 'area' }).secondarySeriesType,
        useSubtitleStyleOnName: (jsonSettings as { useSubtitleStyleOnName?: boolean }).useSubtitleStyleOnName,
        syncAxisScales: (jsonSettings as { syncAxisScales?: boolean }).syncAxisScales,
    };
};

export const extractChartSettingColumns = (settings?: (ChartSettings & { showGridlines?: boolean }) | null) => {
    if (!settings) return {};
    const normalizeStrokeColor = (value: unknown) => {
        if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
        if (typeof value === 'string') return value;
        return undefined;
    };
    return {
        strokeWidth: settings.strokeWidth,
        strokeColor: normalizeStrokeColor(settings.strokeColor),
        strokeOpacity: settings.strokeOpacity,
        fillOpacity: settings.fillOpacity,
        showLegend: settings.showLegend,
        showGridlines: settings.showGridLines ?? (settings as { showGridlines?: boolean }).showGridlines,
        showDataLabels: settings.showDataLabels,
        syncAxisScales: settings.syncAxisScales,
    };
};
