"use client";

import { ChartType, VisualizationType, Metric } from "@/types";
import { getChartDefinition } from "@/components/visualizations/chartConfig";

type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

const isFiniteNumber = (val: unknown): boolean => {
  const num = typeof val === "number" ? val : Number(val);
  return Number.isFinite(num);
};

export const validateVisualizationData = (
  visualizationType: VisualizationType,
  chartType: ChartType | undefined,
  dataPoints: Metric[]
): ValidationResult => {
  const errors: string[] = [];

  if (visualizationType !== "chart") {
    return { isValid: true, errors };
  }

  if (!chartType) {
    errors.push("Select a chart type.");
    return { isValid: false, errors };
  }

  if (chartType === "sankey") {
    return { isValid: true, errors };
  }

  const definition = getChartDefinition(chartType);

  if (!dataPoints.length) {
    errors.push("Add at least one data point.");
    return { isValid: false, errors };
  }

  const requiresDualValues = chartType === "multiAxisLine";

  dataPoints.forEach((dp, idx) => {
    const label = dp.date?.trim();
    if (!label) {
      errors.push(`Row ${idx + 1}: ${definition.dimensionLabel} is required.`);
    }

    if (requiresDualValues) {
      const primary = Array.isArray(dp.valueArray) ? dp.valueArray[0] : dp.value;
      const secondary = Array.isArray(dp.valueArray) ? dp.valueArray[1] : undefined;
      if (!isFiniteNumber(primary)) {
        errors.push(`Row ${idx + 1}: primary ${definition.valueLabel} is required.`);
      }
      if (!isFiniteNumber(secondary)) {
        errors.push(
          `Row ${idx + 1}: ${definition.secondaryValueLabel || "Secondary value"} is required.`
        );
      }
      return;
    }

    if (definition.usesLabeledValues) {
      const labeled =
        dp.labeledValues && dp.labeledValues.length ? dp.labeledValues : null;

      if (labeled) {
        labeled.forEach((lv, lvIdx) => {
          if (!lv.label?.trim()) {
            errors.push(
              `Row ${idx + 1}, Value ${lvIdx + 1}: label is required.`
            );
          }
          if (!isFiniteNumber(lv.value)) {
            errors.push(
              `Row ${idx + 1}, Value ${lvIdx + 1}: numeric value is required.`
            );
          }
          if (definition.requiresColor && !lv.color) {
            errors.push(
              `Row ${idx + 1}, Value ${lvIdx + 1}: color is required.`
            );
          }
        });
        if (
          definition.requiresColor &&
          !dp.color &&
          labeled.every((lv) => !lv.color)
        ) {
          errors.push(
            `Row ${idx + 1}: set a color for this ${definition.dimensionLabel}.`
          );
        }
      } else {
        if (!isFiniteNumber(dp.value)) {
          errors.push(
            `Row ${idx + 1}: numeric ${definition.valueLabel} is required.`
          );
        }
        if (definition.requiresColor && !dp.color) {
          errors.push(
            `Row ${idx + 1}: color is required for this ${definition.dimensionLabel}.`
          );
        }
      }
    } else {
      if (!isFiniteNumber(dp.value)) {
        errors.push(`Row ${idx + 1}: numeric ${definition.valueLabel} is required.`);
      }
    }
  });

  return { isValid: errors.length === 0, errors };
};
