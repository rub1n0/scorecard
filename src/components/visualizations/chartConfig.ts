"use client";

import { ChartType } from "@/types";

export type ChartDefinition = {
  displayName: string;
  description: string;
  dimensionLabel: string;
  valueLabel: string;
  secondaryValueLabel?: string;
  primaryLabelKey?: string;
  secondaryLabelKey?: string;
  defaultDimensionValue: string;
  usesLabeledValues: boolean;
  requiresColor: boolean;
  apexType: ChartType;
  height: number;
  dimensionInput: "date" | "text";
  requiredFields: string[];
};

const today = () => new Date().toISOString().split("T")[0];

export const chartTypeConfig: Record<ChartType, ChartDefinition> = {
  line: {
    displayName: "Line",
    description: "Line charts show trends over time. Add dated values.",
    dimensionLabel: "Date",
    valueLabel: "Value",
    defaultDimensionValue: today(),
    usesLabeledValues: false,
    requiresColor: false,
    apexType: "line",
    height: 280,
    dimensionInput: "date",
    requiredFields: ["Date", "Value"],
  },
  area: {
    displayName: "Area",
    description: "Area charts display filled trends. Add dated values.",
    dimensionLabel: "Date",
    valueLabel: "Value",
    defaultDimensionValue: today(),
    usesLabeledValues: false,
    requiresColor: false,
    apexType: "area",
    height: 280,
    dimensionInput: "date",
    requiredFields: ["Date", "Value"],
  },
  bar: {
    displayName: "Bar",
    description: "Bar charts compare categories. Add categories and values.",
    dimensionLabel: "Category",
    valueLabel: "Value",
    defaultDimensionValue: "New Category",
    usesLabeledValues: true,
    requiresColor: true,
    apexType: "bar",
    height: 320,
    dimensionInput: "text",
    requiredFields: ["Category", "Value", "Color"],
  },
  column: {
    displayName: "Column",
    description: "Column charts compare values vertically.",
    dimensionLabel: "Category",
    valueLabel: "Value",
    defaultDimensionValue: "New Category",
    usesLabeledValues: true,
    requiresColor: true,
    apexType: "bar",
    height: 320,
    dimensionInput: "text",
    requiredFields: ["Category", "Value", "Color"],
  },
  pie: {
    displayName: "Pie",
    description: "Pie charts show proportions. Add categories and values.",
    dimensionLabel: "Category",
    valueLabel: "Value",
    defaultDimensionValue: "Slice",
    usesLabeledValues: true,
    requiresColor: true,
    apexType: "pie",
    height: 320,
    dimensionInput: "text",
    requiredFields: ["Category", "Value", "Color"],
  },
  donut: {
    displayName: "Donut",
    description: "Donut charts show proportions with a center hole.",
    dimensionLabel: "Category",
    valueLabel: "Value",
    defaultDimensionValue: "Slice",
    usesLabeledValues: true,
    requiresColor: true,
    apexType: "donut",
    height: 320,
    dimensionInput: "text",
    requiredFields: ["Category", "Value", "Color"],
  },
  radar: {
    displayName: "Radar",
    description: "Radar charts compare dimensions. Add dimensions and values.",
    dimensionLabel: "Dimension",
    valueLabel: "Score",
    defaultDimensionValue: "Dimension",
    usesLabeledValues: true,
    requiresColor: false,
    apexType: "radar",
    height: 400,
    dimensionInput: "text",
    requiredFields: ["Dimension", "Value"],
  },
  radialBar: {
    displayName: "Radial Bar",
    description: "Radial bars show progress in a circular form.",
    dimensionLabel: "Category",
    valueLabel: "Value",
    defaultDimensionValue: "Segment",
    usesLabeledValues: true,
    requiresColor: true,
    apexType: "radialBar",
    height: 320,
    dimensionInput: "text",
    requiredFields: ["Category", "Value", "Color"],
  },
  multiAxisLine: {
    displayName: "Multi-axis",
    description: "Plot two related values over time on separate axes.",
    dimensionLabel: "Date",
    valueLabel: "Primary Value",
    secondaryValueLabel: "Secondary Value",
    defaultDimensionValue: today(),
    usesLabeledValues: false,
    requiresColor: false,
    apexType: "line",
    height: 320,
    dimensionInput: "date",
    requiredFields: ["Date", "Primary Value", "Secondary Value"],
    primaryLabelKey: "primaryLabel",
    secondaryLabelKey: "secondaryLabel",
  },
  scatter: {
    displayName: "Scatter",
    description: "Scatter plots show correlation between two series.",
    dimensionLabel: "X Value",
    valueLabel: "Y Value",
    defaultDimensionValue: "0",
    usesLabeledValues: false,
    requiresColor: false,
    apexType: "scatter",
    height: 320,
    dimensionInput: "text",
    requiredFields: ["X Value", "Y Value"],
  },
  heatmap: {
    displayName: "Heatmap",
    description: "Heatmaps visualize intensity across categories.",
    dimensionLabel: "Category",
    valueLabel: "Value",
    defaultDimensionValue: "Bucket",
    usesLabeledValues: true,
    requiresColor: false,
    apexType: "heatmap",
    height: 320,
    dimensionInput: "text",
    requiredFields: ["Category", "Value"],
  },
  sankey: {
    displayName: "Sankey",
    description: "Sankey charts show flows between nodes. Define nodes and links.",
    dimensionLabel: "Node",
    valueLabel: "Value",
    defaultDimensionValue: "Node",
    usesLabeledValues: false,
    requiresColor: false,
    apexType: "bar",
    height: 320,
    dimensionInput: "text",
    requiredFields: ["Node", "Value"],
  },
};

export const getChartDefinition = (chartType: ChartType): ChartDefinition =>
  chartTypeConfig[chartType] || chartTypeConfig.line;

export const isMultiValueChartType = (chartType: ChartType): boolean =>
  getChartDefinition(chartType).usesLabeledValues;

export const chartRequiresColor = (chartType: ChartType): boolean =>
  getChartDefinition(chartType).requiresColor;
