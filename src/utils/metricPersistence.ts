import { normalizeDateOnly, normalizeValueForChartType, isMultiValueChartType } from "./metricNormalization";

export type IncomingMetric = {
  date?: string;
  value?: unknown;
  valueArray?: unknown;
  labeledValues?: Array<{ label?: string; value?: number; color?: string }>;
  color?: string;
};

export type PersistedMetricRow = {
  kpiId: string;
  date: Date;
  value: unknown;
  color: string | null;
};

export type MetricPersistResult = {
  points: PersistedMetricRow[];
  latestValue?: number;
  valueJson?: Record<string, number>;
  latestDate?: Date;
};

/**
 * Normalize incoming metrics (from API payload) into persisted rows.
 * - Collapses multi-value chart types into a single row with labeled values to avoid duplicate dates.
 * - Dedupes by date (last entry wins) to respect unique (kpiId, date) constraint.
 * - Computes latestValue and valueJson based on the last (most recent) point.
 */
export const buildPersistedMetrics = (
  kpiId: string,
  chartType: string | null | undefined,
  incomingMetrics: IncomingMetric[] | null
): MetricPersistResult => {
  if (incomingMetrics === null) return { points: [] };

  const isMulti = chartType ? isMultiValueChartType(chartType) : false;
  let rows: PersistedMetricRow[] = [];

  if (isMulti) {
    const firstWithLabeled = incomingMetrics.find(
      (dp) => dp.labeledValues && dp.labeledValues.length > 0
    );

    const labeledValues =
      firstWithLabeled?.labeledValues?.length
        ? firstWithLabeled.labeledValues.map((lv, idx) => ({
            label:
              typeof lv.label === "string" && lv.label.trim()
                ? lv.label
                : `Value ${idx + 1}`,
            value: typeof lv.value === "number" ? lv.value : Number(lv.value) || 0,
            color: lv.color,
          }))
        : incomingMetrics.map((dp, idx) => {
            const label =
              typeof dp.date === "string" && dp.date.trim()
                ? dp.date
                : `Value ${idx + 1}`;
            const fallbackNumber = Array.isArray(dp.valueArray)
              ? dp.valueArray[0]
              : Array.isArray(dp.value)
              ? dp.value[0]
              : dp.value;
            const value = Number(fallbackNumber) || 0;
            const color = dp.color ? String(dp.color) : undefined;
            return { label, value, color };
          });

    const normalizedDate = normalizeDateOnly(incomingMetrics[0]?.date);
    const value = normalizeValueForChartType(chartType, labeledValues);
    rows = [
      {
        kpiId,
        date: new Date(`${normalizedDate}T00:00:00.000Z`),
        value,
        color: labeledValues[0]?.color || null,
      },
    ];
  } else {
    rows = incomingMetrics.map((dp) => {
      const normalizedDate = normalizeDateOnly(dp.date);
      const value = normalizeValueForChartType(
        chartType,
        dp.labeledValues ?? dp.valueArray ?? dp.value
      );
      return {
        kpiId,
        date: new Date(`${normalizedDate}T00:00:00.000Z`),
        value,
        color: dp.color ? String(dp.color) : null,
      };
    });
  }

  // Deduplicate by date (last wins)
  const byDate = new Map<number, PersistedMetricRow>();
  for (const row of rows) {
    byDate.set(row.date.getTime(), row);
  }
  const points = Array.from(byDate.values());

  if (!points.length) return { points: [] };

  const sortedByDate = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const latest = sortedByDate[sortedByDate.length - 1];

  const result: MetricPersistResult = { points, latestDate: latest.date };

  if (Array.isArray(latest.value)) {
    if (latest.value.length && typeof latest.value[0] === "object") {
      const labeled = latest.value as Array<{ label?: string; value?: number }>;
      result.valueJson = labeled.reduce<Record<string, number>>((acc, item, idx) => {
        const label = typeof item.label === "string" ? item.label : String(idx);
        const val = typeof item.value === "number" ? item.value : 0;
        acc[label] = val;
        return acc;
      }, {});
      result.latestValue =
        typeof labeled[0]?.value === "number" ? labeled[0].value : undefined;
    } else {
      const arr = latest.value as number[];
      result.valueJson = arr.reduce<Record<string, number>>((acc, val, idx) => {
        acc[String(idx)] = val;
        return acc;
      }, {});
      result.latestValue = typeof arr[0] === "number" ? arr[0] : undefined;
    }
  } else {
    result.valueJson = { "0": latest.value as number };
    result.latestValue = latest.value as number;
  }

  return result;
};
