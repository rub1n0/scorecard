"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
type SankeyOptions = {
  width?: number;
  height?: number;
  viewPortWidth?: number;
  viewPortHeight?: number;
  canvasStyle?: string;
  spacing?: number;
  nodeWidth?: number;
  nodeBorderColor?: string;
  nodeBorderWidth?: number;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  fontColor?: string;
  edgeOpacity?: number;
  edgeGradientFill?: boolean;
  tooltipId?: string;
  enableTooltip?: boolean;
  tooltipBGColor?: string;
  tooltipBorderColor?: string;
  enableToolbar?: boolean;
  chart?: {
    animations?: { enabled?: boolean; easing?: string };
    toolbar?: { show?: boolean };
  };
  colors?: string[];
  dataLabels?: { enabled?: boolean; style?: { colors?: string[] } };
  plotOptions?: {
    sankey?: {
      flow?: { curvature?: number; colorMode?: "path" | "gradient" };
      startDirection?: "rtl" | "ltr";
      labels?: { enabled?: boolean };
      legend?: { show?: boolean };
    };
  };
  title?: { text?: string; align?: string };
  tooltip?: { enabled?: boolean; theme?: "dark" | "light" };
};

interface SankeyNode {
  id: string;
  title: string;
  color: string;
}

interface SankeyEdge {
  source: string;
  target: string;
  value: number;
  type?: string;
}

interface SankeyData {
  nodes?: SankeyNode[];
  edges?: SankeyEdge[];
  // Support legacy payloads that used `links`
  links?: SankeyEdge[];
  options?: Record<string, unknown>;
}

interface SankeyChartProps {
  data: SankeyData;
  height?: number;
}

interface SankeySettings {
  showLegend?: boolean;
  showLabels?: boolean;
}

type NormalizedSankey = {
  nodes: SankeyNode[];
  edges: SankeyEdge[];
  options?: Record<string, unknown>;
};

type ApexSankeyConstructor = typeof import("apexsankey")["default"];
type ApexSankeyInstance = InstanceType<ApexSankeyConstructor>;

const fallbackPalette = [
  "#ACD5FC",
  "#E37816",
  "#07CC80",
  "#0871D4",
  "#CB8E55",
  "#9FAE29",
  "#427565",
  "#6D55A6",
  "#FEF445",
  "#E177C2",
  "#F48B7B",
  "#D74B05",
  "#AA896F",
  "#14A14D",
  "#C5114D",
];

const normalizeSankeyData = (data: SankeyData): NormalizedSankey => {
  const nodes = Array.isArray(data?.nodes)
    ? data.nodes
        .filter((node) => node?.id && node?.title)
        .map((node, idx) => ({
          id: node.id,
          title: node.title,
          color:
            typeof node.color === "string" && node.color.trim()
              ? node.color
              : fallbackPalette[idx % fallbackPalette.length],
        }))
    : [];

  const rawEdges = Array.isArray(data?.edges)
    ? data.edges
    : Array.isArray(data?.links)
    ? data.links
    : [];

  const edges = rawEdges
    .map((edge, idx) => ({
      source: edge?.source ?? "",
      target: edge?.target ?? "",
      value: Number(edge?.value) || 0,
      type: edge?.type ?? `flow-${idx + 1}`,
    }))
    .filter((edge) => edge.source && edge.target && Number.isFinite(edge.value));

  return { nodes, edges, options: data?.options };
};

export default function SankeyChart({
  data,
  height = 300,
  showLegend = true,
  showLabels = true,
}: SankeyChartProps & SankeySettings) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexSankeyInstance | null>(null);
  const normalizedData = useMemo(() => normalizeSankeyData(data), [data]);

  const removeWatermark = () => {
    if (!chartRef.current) return;
    const marks = chartRef.current.querySelectorAll(".apexgantt-watermark");
    marks.forEach((mark) => mark.remove());
  };

  const adjustLabels = useCallback(() => {
    if (!chartRef.current) return;
    const labelNodes = chartRef.current.querySelectorAll<SVGTextElement>(
      "g.node text"
    );
    labelNodes.forEach((text) => {
      if (!showLabels) {
        text.style.display = "none";
        return;
      }

      const group = text.closest("g.node");
      const rect = group?.querySelector("rect");
      if (!rect) return;

      const rectX = Number(rect.getAttribute("x") || "0");
      const rectY = Number(rect.getAttribute("y") || "0");
      const rectW = Number(rect.getAttribute("width") || "0");
      const rectH = Number(rect.getAttribute("height") || "0");

      const centerX = rectX + rectW / 2;
      const centerY = rectY + rectH / 2;

      text.style.display = "block";
      text.setAttribute("x", String(centerX));
      text.setAttribute("y", String(centerY + 6));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("transform", `rotate(-90 ${centerX} ${centerY})`);
      text.style.pointerEvents = "none";
      const newFontSize = Math.max(12, rectH / 7);
      text.style.fontSize = `${newFontSize}px`;
      text.style.fontWeight = "700";
    });
  }, [showLabels]);

  useEffect(() => {
    const { nodes, edges, options: graphOptions } = normalizedData;

    if (!chartRef.current) return;

    // Clear stale markup when data is missing
    if (!nodes.length || !edges.length) {
      chartRef.current.innerHTML = "";
      chartInstance.current = null;
      return;
    }

    let isCancelled = false;

    const initChart = async () => {
      const { default: ApexSankey } = await import("apexsankey");

      if (!chartRef.current || isCancelled) return;

      if (chartInstance.current) {
        chartRef.current.innerHTML = "";
        chartInstance.current = null;
      }

      const viewPortWidth = chartRef.current.clientWidth || 900;

      const chartOptions: SankeyOptions = {
        width: viewPortWidth,
        viewPortWidth,
        height,
        viewPortHeight: height,
        canvasStyle: "border: none; background: transparent;",
        spacing: 20,
        nodeWidth: 18,
        nodeBorderColor: "transparent",
        nodeBorderWidth: 1,
        fontFamily:
          'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: "13px",
        fontWeight: "600",
        fontColor: "#e8edf2",
        edgeOpacity: 0.6,
        edgeGradientFill: true,
        tooltipId: "apexsankey-tooltip-container",
        enableTooltip: true,
        tooltipBGColor: "#0b1726",
        tooltipBorderColor: "#1f2937",
        enableToolbar: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chart = new ApexSankey(chartRef.current, chartOptions as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chart as any).render({
        nodes,
        edges,
        options: graphOptions ?? {},
      });
      chartInstance.current = chart;

      // Remove watermark added by library
      removeWatermark();
      // Lift labels above nodes
      adjustLabels();
    };

    initChart();

    return () => {
      isCancelled = true;
    };
  }, [normalizedData, height, showLabels, adjustLabels]);

  return (
    <div className="w-full flex flex-col gap-3">
      <div
        ref={chartRef}
        className="w-full flex justify-center text-industrial-200"
      />

      {showLegend && normalizedData.nodes.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs font-mono text-industrial-300">
          {normalizedData.nodes.map((node) => (
            <div
              key={node.id}
              className="flex items-center gap-2 bg-industrial-900/60 px-2 py-1 rounded"
            >
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: node.color }}
              />
              <span className="text-industrial-100">{node.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
