"use client";

import React, { useMemo } from "react";
import { ChartSettings, Metric } from "@/types";
import TrendBadge from "../TrendBadge";
import ChartErrorBoundary from "../ChartErrorBoundary";
import ApexChart from "./ApexChart";

type NumberVisualizationProps = {
  name: string;
  value: number;
  trendValue?: number;
  reverseTrend?: boolean;
  prefix?: string;
  prefixOpacity?: number;
  suffix?: string;
  suffixOpacity?: number;
  chartSettings?: ChartSettings;
  dataPoints?: Metric[];
  style?: React.CSSProperties;
};

const normalizeSparklineData = (dataPoints?: Metric[]) => {
  if (!dataPoints || dataPoints.length === 0) return [];

  const toTime = (dateValue: string | undefined) => {
    const t = dateValue ? new Date(dateValue).getTime() : NaN;
    return Number.isFinite(t) ? t : Date.now();
  };

  return [...dataPoints]
    .sort((a, b) => toTime(a.date) - toTime(b.date))
    .map((dp) => {
      const raw =
        typeof dp.value === "number"
          ? dp.value
          : Array.isArray(dp.value)
          ? dp.value[0]
          : Array.isArray(dp.valueArray)
          ? dp.valueArray[0]
          : parseFloat(String(dp.value));
      const y = Number.isFinite(raw) ? Number(raw) : null;
      if (y === null) return null;
      return { x: toTime(dp.date), y };
    })
    .filter(
      (val): val is { x: number; y: number } =>
        val !== null && Number.isFinite(val.y)
    );
};

export default function NumberVisualization({
  name,
  value,
  trendValue = 0,
  reverseTrend = false,
  prefix,
  prefixOpacity = 0.5,
  suffix,
  suffixOpacity = 0.5,
  chartSettings,
  dataPoints,
  style,
}: NumberVisualizationProps) {
  const isPositive = trendValue >= 0;
  const isGood = reverseTrend ? !isPositive : isPositive;
  const formattedValue = value.toLocaleString();
  const valueLength = formattedValue.length;

  let fontSizeClass = "text-[12rem]";
  let subTextSizeClass = "text-5xl";

  if (valueLength > 11) {
    fontSizeClass = "text-6xl";
    subTextSizeClass = "text-base";
  } else if (valueLength > 9) {
    fontSizeClass = "text-7xl";
    subTextSizeClass = "text-lg";
  } else if (valueLength > 6) {
    fontSizeClass = "text-8xl";
    subTextSizeClass = "text-2xl";
  } else if (valueLength > 4) {
    fontSizeClass = "text-9xl";
    subTextSizeClass = "text-3xl";
  }

  const sparklineData = useMemo(
    () => normalizeSparklineData(dataPoints),
    [dataPoints]
  );

  const strokeOpacity = chartSettings?.strokeOpacity ?? 1;
  const rawStrokeColor = chartSettings?.strokeColor;
  const primaryColor =
    (Array.isArray(rawStrokeColor) ? rawStrokeColor[0] : rawStrokeColor) || "#457B9D";
  const colorWithOpacity = (color: string, opacity: number) => {
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
  const sparkColor = colorWithOpacity(primaryColor, strokeOpacity);

  return (
    <div className="flex flex-col h-full py-4">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex justify-center items-center">
          <div className="flex">
            {prefix && (
              <div className="flex flex-col justify-end pb-3 md:pb-6 mr-2">
                <span
                  className={`${subTextSizeClass} text-industrial-300 font-mono`}
                  style={{ opacity: prefixOpacity }}
                >
                  {prefix}
                </span>
              </div>
            )}

            <span
              className={`${fontSizeClass} font-bold text-industrial-100 font-mono tracking-tighter leading-none`}
              style={style}
            >
              {formattedValue}
            </span>

            <div className="flex flex-col justify-between ml-3 py-2 md:py-4">
              <div>
                {trendValue !== 0 && (
                  <div className="scale-75 origin-top-left md:scale-100">
                    <TrendBadge
                      trend={trendValue}
                      isPositive={isPositive}
                      isGood={isGood}
                    />
                  </div>
                )}
              </div>

              {suffix && (
                <div className="flex justify-start mt-auto pb-1 md:pb-2">
                  <span
                    className={`${subTextSizeClass} text-industrial-300 font-mono`}
                    style={{ opacity: suffixOpacity }}
                  >
                    {suffix}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {sparklineData.length > 0 && (
        <div className="-mx-2 mt-2">
          <ChartErrorBoundary>
            <ApexChart
              options={{
                chart: {
                  type: "line",
                  sparkline: { enabled: true },
                  animations: { enabled: true, speed: 800 },
                },
                xaxis: {
                  type: "datetime",
                },
                stroke: {
                  curve: "smooth",
                  width: chartSettings?.strokeWidth ?? 2,
                  colors: [sparkColor],
                },
                colors: [sparkColor],
                tooltip: {
                  enabled: true,
                  theme: "dark",
                  x: { show: false },
                  fixed: { enabled: false },
                  style: {
                    fontSize: "14px",
                    fontFamily: "monospace",
                  },
                },
              }}
              series={[
                {
                  name,
                  data: sparklineData,
                },
              ]}
              type="area"
              height={60}
            />
          </ChartErrorBoundary>
        </div>
      )}
    </div>
  );
}
