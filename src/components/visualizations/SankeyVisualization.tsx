"use client";

import React, { useMemo } from "react";
import SankeyChart from "./SankeyChart";

type SankeyEdge = { source: string; target: string; value: number; type?: string };
type SankeyNode = { id: string; title: string; color?: string };

const sankeyPalette = ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"];

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null;

const parseSankeyValue = (rawValue: unknown) => {
  let parsed: unknown = {};

  try {
    parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
  } catch {
    parsed = {};
  }

  const payload = isRecord(parsed) ? parsed : {};

  const nodeMap = new Map<string, SankeyNode>();

  const baseNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  baseNodes.forEach((node) => {
    if (!isRecord(node)) return;
    const id = typeof node.id === "string" ? node.id : undefined;
    if (!id) return;
    const title =
      typeof node.title === "string" && node.title.trim() ? node.title : id;
    const color = typeof node.color === "string" ? node.color : undefined;
    nodeMap.set(id, { id, title, color });
  });

  const rawEdges = Array.isArray(payload.edges)
    ? payload.edges
    : Array.isArray(payload.links)
    ? payload.links
    : [];

  const mappedEdges = rawEdges
    .map((edge, idx: number) => {
      if (!isRecord(edge)) return null;
      const source = typeof edge.source === "string" ? edge.source : "";
      const target = typeof edge.target === "string" ? edge.target : "";
      const value = Number(edge.value);
      const type =
        typeof edge.type === "string" && edge.type.trim()
          ? edge.type
          : `flow-${idx + 1}`;

      if (!source || !target || !Number.isFinite(value)) return null;

      return { source, target, value, type };
    })
    .filter(Boolean) as Array<SankeyEdge | null>;

  const edges: SankeyEdge[] = mappedEdges
    .filter((edge): edge is SankeyEdge => Boolean(edge))
    .map((edge) => {
      if (!nodeMap.has(edge.source)) {
        nodeMap.set(edge.source, { id: edge.source, title: edge.source });
      }
      if (!nodeMap.has(edge.target)) {
        nodeMap.set(edge.target, { id: edge.target, title: edge.target });
      }
      return edge;
    });

  const nodes = Array.from(nodeMap.values()).map((node, idx) => ({
    ...node,
    color: node.color || sankeyPalette[idx % sankeyPalette.length],
  }));

  return { nodes, edges };
};

type SankeyVisualizationProps = {
  value: Record<string, number | string>;
  settings?: {
    showLegend?: boolean;
    showLabels?: boolean;
  };
  height?: number;
};

export default function SankeyVisualization({
  value,
  settings,
  height = 320,
}: SankeyVisualizationProps) {
  const sankeyData = useMemo(() => {
    const rawValue = value["0"] ?? Object.values(value)[0];
    return parseSankeyValue(rawValue);
  }, [value]);

  const finalSettings = useMemo(() => {
    if (settings?.showLegend !== undefined || settings?.showLabels !== undefined) {
      return settings;
    }

    try {
      const rawSettings = (value as Record<string, unknown>)["__sankeySettings"];
      if (typeof rawSettings === "string") {
        return JSON.parse(rawSettings) as { showLegend?: boolean; showLabels?: boolean };
      }
    } catch {
      // ignore
    }
    return settings || {};
  }, [settings, value]);

  if (!sankeyData.nodes.length || !sankeyData.edges.length) {
    return (
      <div className="py-12 text-center text-industrial-600 text-xs font-mono uppercase tracking-wider">
        Invalid Sankey Data
      </div>
    );
  }

  return (
    <div className="kpi-chart-display -ml-2">
      <SankeyChart
        data={sankeyData}
        height={height}
        showLegend={finalSettings.showLegend ?? true}
        showLabels={finalSettings.showLabels ?? true}
      />
    </div>
  );
}
