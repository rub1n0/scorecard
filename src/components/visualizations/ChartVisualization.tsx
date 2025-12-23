"use client";

import React, { useMemo } from "react";
import { ChartSettings, ChartType, Metric } from "@/types";
import ChartErrorBoundary from "../ChartErrorBoundary";
import ApexChart from "./ApexChart";
import type { ApexOptions } from "apexcharts";
import {
  ChartDefinition,
  getChartDefinition,
  isMultiValueChartType,
} from "./chartConfig";

type ChartVisualizationProps = {
  name: string;
  chartType: ChartType;
  dataPoints?: Metric[];
  chartSettings?: ChartSettings;
};

const defaultPalette = ["#5094af", "#36c9b8", "#dea821", "#ee7411", "#e0451f"];

const withOpacity = (color: string | undefined, opacity: number) => {
  if (!color || typeof color !== "string") return color;
  const clamped = Math.min(Math.max(opacity, 0), 1);
  const hex = color.replace("#", "");
  if (hex.length === 3 || hex.length === 6) {
    const normalized =
      hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const intVal = parseInt(normalized, 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }
  return color;
};

type TimeSeriesData = {
  kind: "timeseries";
  points: { label: string; displayLabel: string; value: number }[];
};

type MultiAxisSeriesPoint = { x: number; y: number };
type MultiAxisData = {
  kind: "multiAxis";
  left: MultiAxisSeriesPoint[];
  right: MultiAxisSeriesPoint[];
};

type CategoricalData = {
  kind: "categorical";
  categories: string[];
  values: number[];
  colors: (string | undefined)[];
};

type NormalizedChartData = TimeSeriesData | CategoricalData | MultiAxisData | null;

type DataLabelFormatterOptions = {
  w?: { globals?: { series?: ApexNonAxisChartSeries } };
  seriesIndex: number;
};

type TotalFormatter = { globals?: { seriesTotals?: number[] } };

const normalizeNumber = (val: unknown): number | null => {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (Array.isArray(val)) {
    const first = val.find((entry) => Number.isFinite(Number(entry)));
    return first !== undefined && Number.isFinite(Number(first))
      ? Number(first)
      : null;
  }
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeArrayValues = (vals?: Array<number | string>): number[] => {
  if (!vals) return [];
  return vals
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
};

const normalizeTimeSeries = (dataPoints: Metric[]): TimeSeriesData | null => {
  const points = dataPoints
    .map((dp) => {
      const numericValue =
        normalizeNumber(dp.value) ?? normalizeNumber(dp.valueArray);
      if (!Number.isFinite(numericValue ?? NaN) || !dp.date) return null;

      const displayLabel = (() => {
        const parsed = new Date(dp.date);
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        }
        return dp.date;
      })();

      return {
        label: dp.date,
        displayLabel,
        value: numericValue as number,
      };
    })
    .filter(
      (point): point is { label: string; displayLabel: string; value: number } =>
        Boolean(point)
    );

  if (!points.length) return null;

  return { kind: "timeseries", points };
};

const normalizeMultiAxis = (dataPoints: Metric[]): MultiAxisData | null => {
  const points = [...dataPoints]
    .map((dp) => {
      const time = dp.date ? new Date(dp.date).getTime() : NaN;
      if (!Number.isFinite(time)) return null;
      const arr = Array.isArray(dp.valueArray)
        ? dp.valueArray
        : Array.isArray(dp.value)
        ? dp.value
        : [dp.value];
      const left = normalizeNumber(arr?.[0]);
      const right = normalizeNumber(arr?.[1]);
      if (left === null || right === null) return null;
      return {
        x: time,
        left,
        right,
      };
    })
    .filter(
      (p): p is { x: number; left: number; right: number } => {
        if (!p) return false;
        return Number.isFinite(p.left) && Number.isFinite(p.right);
      }
    )
    .sort((a, b) => a.x - b.x);

  if (!points.length) return null;

  return {
    kind: "multiAxis",
    left: points.map((p) => ({ x: p.x, y: p.left })),
    right: points.map((p) => ({ x: p.x, y: p.right })),
  };
};

type AxisSeries = { name: string; data: number[] }[];
type NonAxisSeries = number[];
type MultiAxisSeries = { name: string; data: MultiAxisSeriesPoint[] }[];
type ApexChartTypeLocal = NonNullable<ApexOptions["chart"]>["type"];

const normalizeCategorical = (
  dataPoints: Metric[],
  chartType: ChartType,
  definition: ChartDefinition
): CategoricalData | null => {
  const arrayPoint = [...dataPoints]
    .reverse()
    .find(
      (dp) =>
        Array.isArray(dp.value) ||
        Array.isArray(dp.valueArray) ||
        (dp.labeledValues && dp.labeledValues.length > 0)
    );

  if (arrayPoint) {
    const values = normalizeArrayValues(
      (arrayPoint.valueArray as Array<number | string>) ??
        (arrayPoint.value as Array<number | string>)
    );
    if (!values.length) return null;

    const categories =
      arrayPoint.labeledValues && arrayPoint.labeledValues.length === values.length
        ? arrayPoint.labeledValues.map(
            (lv, idx) => lv.label || `${definition.dimensionLabel} ${idx + 1}`
          )
        : values.map((_, idx) => `${definition.dimensionLabel} ${idx + 1}`);

    const colors =
      arrayPoint.labeledValues && arrayPoint.labeledValues.length === values.length
        ? arrayPoint.labeledValues.map((lv) => lv.color)
        : Array(values.length).fill(arrayPoint.color);

    return { kind: "categorical", categories, values, colors };
  }

  const fallback = dataPoints
    .map((dp) => {
      const value = normalizeNumber(dp.value) ?? normalizeNumber(dp.valueArray);
      if (!Number.isFinite(value ?? NaN) || !dp.date) return null;
      return { category: dp.date, value: value as number, color: dp.color };
    })
    .filter(
      (entry): entry is { category: string; value: number; color: string | undefined } =>
        Boolean(entry)
    );

  if (!fallback.length) return null;

  return {
    kind: "categorical",
    categories: fallback.map((entry) => entry.category),
    values: fallback.map((entry) => entry.value),
    colors: fallback.map((entry) => entry.color),
  };
};

const buildChartOptions = (
  chartType: ChartType,
  definition: ChartDefinition,
  chartSettings: ChartSettings | undefined,
  chartData: Exclude<NormalizedChartData, null>,
  labels?: { primary: string; secondary?: string }
) => {
  const strokeOptions: ApexOptions["stroke"] = {
    curve: "smooth",
    width: chartSettings?.strokeWidth ?? 2,
  };

  const strokeOpacity = chartSettings?.strokeOpacity ?? 1.0;

  const normalizedStrokeColors = (() => {
    if (Array.isArray(chartSettings?.strokeColor)) {
      return chartSettings?.strokeColor.filter(
        (c): c is string => typeof c === "string"
      );
    }
    if (
      typeof chartSettings?.strokeColor === "string" &&
      chartSettings.strokeColor.trim()
    ) {
      return [chartSettings.strokeColor];
    }
    return [];
  })();

  const baseColors =
    normalizedStrokeColors.length > 0 &&
    (!isMultiValueChartType(chartType) || chartType === "radar")
      ? [normalizedStrokeColors[0], normalizedStrokeColors[1] || defaultPalette[1]]
      : defaultPalette;
  const fillOpacity = chartSettings?.fillOpacity ?? 0.8;
  const legendDefault =
    chartType === "pie" ||
    chartType === "donut" ||
    chartType === "radialBar" ||
    chartType === "bar" ||
    chartType === "column" ||
    chartType === "radar";

  const resolvedType =
    definition.apexType === "column"
      ? "bar"
      : definition.apexType === "sankey"
      ? "bar"
      : definition.apexType;
  const apexType = resolvedType as ApexChartTypeLocal;

  const options: ApexOptions = {
    chart: {
      type: apexType,
      background: "transparent",
      foreColor: "#71717a",
      toolbar: { show: false },
      animations: { enabled: true, speed: 800 },
      fontFamily: "monospace",
    },
    theme: { mode: "dark", palette: "palette1" },
    dataLabels: {
      enabled: chartSettings?.showDataLabels ?? false,
      style: {
        fontSize: "13px",
        fontFamily: "Inter, sans-serif",
        fontWeight: "700",
        colors: ["#e5e7eb"],
      },
      offsetY: -6,
      background: {
        enabled: false,
      },
      dropShadow: { enabled: false },
    },
    stroke: {
      ...strokeOptions,
      colors: (normalizedStrokeColors.length > 0 && !isMultiValueChartType(chartType))
        ? [withOpacity(normalizedStrokeColors[0], strokeOpacity)]
        : baseColors.map((color) => withOpacity(color, strokeOpacity)),
    },
    grid: {
      borderColor: "#27272a",
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: chartSettings?.showGridLines ?? false,
        },
      },
      yaxis: {
        lines: {
          show: chartSettings?.showGridLines ?? true,
        },
      },
    },
    tooltip: {
      theme: "dark",
      style: {
        fontSize: "13px",
        fontFamily: "Inter, sans-serif",
      },
      y: {
        formatter: (val: number) => val.toLocaleString(),
      },
      marker: {
        show: true,
      },
    },
    colors: baseColors,
    legend: {
      show: chartSettings?.showLegend ?? legendDefault,
      labels: {
        colors: "#e5e7eb",
      },
      fontSize: "13px",
      fontFamily: "Inter, sans-serif",
    },
    fill: {
      type: "solid",
      opacity: fillOpacity,
    },
  };

  if (chartData.kind === "timeseries") {
    options.xaxis = {
      categories: chartData.points.map((p) => p.displayLabel),
      labels: {
        style: {
          colors: "#71717a",
          fontSize: "16px",
          fontFamily: "monospace",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };
    options.yaxis = {
      labels: {
        style: {
          colors: "#71717a",
          fontSize: "16px",
          fontFamily: "monospace",
        },
        formatter: (val: number) =>
          val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0),
      },
    };
  }

  if (chartData.kind === "categorical") {
    options.xaxis = {
      categories: chartData.categories,
      labels: {
        style: {
          colors: Array(chartData.categories.length).fill("#71717a"),
          fontSize: "16px",
          fontFamily: "monospace",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };
  }

  if (chartData.kind === "multiAxis") {
    options.chart = {
      ...options.chart,
      stacked: false,
      animations: { enabled: true, speed: 700 },
    };
    options.xaxis = {
      type: "datetime",
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
          fontFamily: "Inter, sans-serif",
        },
      },
    };
    options.yaxis = [
      {
        seriesName: labels?.primary || definition.valueLabel,
        labels: {
          style: {
            colors: "#cbd5e1",
            fontSize: "12px",
            fontFamily: "Inter, sans-serif",
          },
        },
        title: {
          text: labels?.primary || definition.valueLabel,
          style: {
            color: "#cbd5e1",
            fontSize: "12px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
          },
        },
      },
      {
        opposite: true,
        seriesName: labels?.secondary || definition.secondaryValueLabel || "Secondary",
        labels: {
          style: {
            colors: "#cbd5e1",
            fontSize: "12px",
            fontFamily: "Inter, sans-serif",
          },
        },
        title: {
          text: labels?.secondary || definition.secondaryValueLabel || "Secondary",
          style: {
            color: "#cbd5e1",
            fontSize: "12px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
          },
        },
      },
    ];
    options.stroke = {
      ...options.stroke,
      width: [chartSettings?.strokeWidth ?? 2, chartSettings?.strokeWidth ?? 2],
      curve: "smooth",
      colors: [
        Array.isArray(chartSettings?.strokeColor)
          ? chartSettings.strokeColor[0]
          : normalizedStrokeColors[0] || baseColors[0],
        Array.isArray(chartSettings?.strokeColor)
          ? chartSettings.strokeColor[1] ?? defaultPalette[1]
          : normalizedStrokeColors[1] || baseColors[1] || defaultPalette[1],
      ].map((c) => withOpacity(c, strokeOpacity)),
    };
    options.colors = [
      Array.isArray(chartSettings?.strokeColor)
        ? chartSettings.strokeColor[0]
        : normalizedStrokeColors[0] || baseColors[0],
      Array.isArray(chartSettings?.strokeColor)
        ? chartSettings.strokeColor[1] ?? defaultPalette[1]
        : normalizedStrokeColors[1] || baseColors[1] || defaultPalette[1],
    ].map((c) => withOpacity(c, strokeOpacity));
    options.legend = {
      show: chartSettings?.showLegend ?? true,
      labels: { colors: "#d4d4d8" },
    };
    options.tooltip = {
      ...options.tooltip,
      shared: true,
      x: { show: true },
    };
  }

  if (chartType === "pie" || chartType === "donut" || chartType === "radialBar") {
    options.labels = chartData.kind === "categorical" ? chartData.categories : [];
    const colors =
      chartData.kind === "categorical" &&
      chartData.colors.filter(Boolean).length === chartData.categories.length
        ? chartData.colors
        : baseColors;

    options.colors = colors;

    options.dataLabels = {
      enabled: true,
      formatter: function (_val: number, opts?: DataLabelFormatterOptions) {
        const series = opts?.w?.globals?.series;
        const raw =
          Array.isArray(series) && typeof opts?.seriesIndex === "number"
            ? series[opts.seriesIndex]
            : null;
        return typeof raw === "number"
          ? raw.toLocaleString()
          : raw !== null && raw !== undefined
          ? String(raw)
          : "";
      },
      style: {
        fontSize: "18px",
        fontFamily: "monospace",
        fontWeight: "bold",
        colors: ["#ffffff"],
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        color: "#000",
        opacity: 0.7,
      },
    };

    options.legend = {
      show: chartSettings?.showLegend ?? true,
      position: "bottom",
      fontSize: "16px",
      fontFamily: "monospace",
      labels: {
        colors: "#d4d4d8",
      },
    };

    options.stroke = {
      show: true,
      width: chartSettings?.strokeWidth ?? 2,
      colors: chartSettings?.strokeColor
        ? [chartSettings.strokeColor]
        : ["#18181b"],
    };

    options.fill = {
      type: "solid",
      opacity: fillOpacity,
    };

    if (chartType === "donut") {
      options.plotOptions = {
        pie: {
          donut: {
            size: "65%",
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: "18px",
                fontFamily: "monospace",
                color: "#a1a1aa",
              },
              value: {
                show: true,
                fontSize: "22px",
                fontFamily: "monospace",
                fontWeight: "bold",
                color: "#f4f4f5",
              },
              total: {
                show: true,
                label: "Total",
                fontSize: "16px",
                fontFamily: "monospace",
                color: "#71717a",
                formatter: function (w: TotalFormatter) {
                  const totals = w.globals?.seriesTotals || [];
                  return totals.reduce((a, b) => a + b, 0).toFixed(0);
                },
              },
            },
          },
        },
      };
    }
  }

  if (chartType === "bar" || chartType === "column") {
    options.plotOptions = {
      bar: {
        distributed: true,
      },
    };
    options.legend = {
      show: chartSettings?.showLegend ?? false,
    };

    if (
      chartData.kind === "categorical" &&
      chartData.colors.filter(Boolean).length === chartData.categories.length
    ) {
      options.colors = chartData.colors;
    }
  }

  if (chartType === "radar") {
    const radarStrokeRaw =
      (Array.isArray(chartSettings?.strokeColor) && chartSettings.strokeColor.length
        ? chartSettings.strokeColor[0]
        : chartSettings?.strokeColor) ||
      normalizedStrokeColors[0] ||
      baseColors[0];
    const radarStroke = typeof radarStrokeRaw === "string" ? radarStrokeRaw : baseColors[0];
    const radarStrokeWithOpacity = withOpacity(radarStroke, strokeOpacity) || radarStroke;
    const radarFill = withOpacity(radarStroke, fillOpacity) || radarStroke;

    options.xaxis = {
      categories:
        chartData.kind === "categorical" ? chartData.categories : undefined,
      labels: {
        style: {
          colors:
            chartData.kind === "categorical"
              ? Array(chartData.categories.length).fill("#a1a1aa")
              : [],
          fontSize: "16px",
          fontFamily: "monospace",
        },
      },
    };
    options.yaxis = { show: false };
    options.markers = {
      size: 3,
      colors: ["#18181b"],
      strokeColors: radarStrokeWithOpacity,
      strokeWidth: 2,
    };

    options.stroke = {
      ...options.stroke,
      colors: [radarStrokeWithOpacity],
    };

    // Always honor the chart-level color for radar to avoid stale per-dimension colors.
    options.colors = [radarStroke];
    options.fill = {
      ...(options.fill || {}),
      opacity: fillOpacity,
      colors: [radarFill],
    };
  }

  return options;
};

export default function ChartVisualization({
  name,
  chartType,
  dataPoints = [],
  chartSettings,
}: ChartVisualizationProps) {
  const definition = getChartDefinition(chartType);
  const primaryLabel =
    (chartSettings as ChartSettings & { primaryLabel?: string })?.primaryLabel ||
    definition.valueLabel ||
    `${name} A`;
  const secondaryLabel =
    (chartSettings as ChartSettings & { secondaryLabel?: string })?.secondaryLabel ||
    definition.secondaryValueLabel ||
    `${name} B`;

  const chartData = useMemo<NormalizedChartData>(() => {
    const def = getChartDefinition(chartType);
    if (chartType === "multiAxisLine") {
      return normalizeMultiAxis(dataPoints);
    }
    if (isMultiValueChartType(chartType)) {
      return normalizeCategorical(dataPoints, chartType, def);
    }
    return normalizeTimeSeries(dataPoints);
  }, [chartType, dataPoints]);

  if (!chartData) {
    return (
      <div className="py-12 text-center text-industrial-600 text-xs font-mono uppercase tracking-wider">
        Invalid Chart Data
      </div>
    );
  }

  const options = buildChartOptions(
    chartType,
    definition,
    chartSettings,
    chartData,
    { primary: primaryLabel, secondary: secondaryLabel }
  );

  const series: AxisSeries | NonAxisSeries | MultiAxisSeries =
    chartType === "pie" || chartType === "donut" || chartType === "radialBar"
      ? chartData.kind === "categorical"
        ? chartData.values
        : []
      : chartData.kind === "multiAxis"
      ? [
          {
            name: primaryLabel,
            data: chartData.left,
          },
          {
            name: secondaryLabel,
            data: chartData.right,
          },
        ]
      : [
          {
            name,
            data:
              chartData.kind === "categorical"
                ? chartData.values
                : chartData.points.map((p) => p.value),
          },
        ];

  const apexType = (
    definition.apexType === "column"
      ? "bar"
      : definition.apexType === "sankey"
      ? "bar"
      : definition.apexType
  ) as ApexChartTypeLocal;
  const height = definition.height;

  return (
    <div className="kpi-chart-display -ml-2">
      <ChartErrorBoundary>
        <ApexChart
          options={options}
          series={series}
          type={apexType}
          height={height}
        />
      </ChartErrorBoundary>
    </div>
  );
}
