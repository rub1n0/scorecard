'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KPI, Metric } from '@/types';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import ColorPicker from './ColorPicker';
import { validateVisualizationData } from '@/utils/chartValidation';
import { getChartDefinition, isMultiValueChartType } from './visualizations/chartConfig';

interface KPIUpdateFormProps {
    kpi: KPI;
    onUpdate: (updates: Partial<KPI>) => Promise<void>;
}

export default function KPIUpdateForm({ kpi, onUpdate }: KPIUpdateFormProps) {
    const [notes, setNotes] = useState(kpi.notes || '');
    const [metrics, setMetrics] = useState<Metric[]>(kpi.metrics || kpi.dataPoints || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Default color palette
    const defaultColors = ['#5094af', '#36c9b8', '#dea821', '#ee7411', '#e0451f'];
    const chartDefinition = useMemo(() => getChartDefinition(kpi.chartType || 'line'), [kpi.chartType]);

    // Determine if this is a multi-value chart type
    const isMultiValueChart = useMemo(
        () => kpi.visualizationType === 'chart' && isMultiValueChartType(kpi.chartType || 'line'),
        [kpi.visualizationType, kpi.chartType]
    );
    const isMultiAxisLine = useMemo(
        () => kpi.visualizationType === 'chart' && kpi.chartType === 'multiAxisLine',
        [kpi.visualizationType, kpi.chartType]
    );
    const showColorColumn = kpi.visualizationType === 'chart' && chartDefinition.requiresColor;
    const primaryAxisLabel = useMemo(
        () =>
            (kpi.chartSettings as { primaryLabel?: string } | undefined)?.primaryLabel ||
            chartDefinition.valueLabel ||
            'Value 1',
        [kpi.chartSettings, chartDefinition.valueLabel]
    );
    const secondaryAxisLabel = useMemo(
        () =>
            (kpi.chartSettings as { secondaryLabel?: string } | undefined)?.secondaryLabel ||
            chartDefinition.secondaryValueLabel ||
            'Value 2',
        [kpi.chartSettings, chartDefinition.secondaryValueLabel]
    );

    // Helper function to normalize dates to YYYY-MM-DD format
    const normalizeDate = (dateStr: string): string => {
        // If it's already in ISO format or a category label, return as-is
        if (!dateStr) return new Date().toISOString().split('T')[0];

        // Try to parse the date
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        // If parsing failed, it might be a category label, return as-is
        return dateStr;
    };

    const toNumber = (value: unknown, fallback = 0): number => {
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        return Number.isFinite(num) ? num : fallback;
    };

    // Sort metrics by date and normalize date format
    useEffect(() => {
        const incoming = kpi.metrics || kpi.dataPoints;
        if (incoming) {
            // Sort descending (newest first)
            const sorted = [...incoming].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            // Normalize dates to YYYY-MM-DD format for date inputs
            const normalized = sorted.map(dp => {
                if (isMultiAxisLine) {
                    const rawArray = Array.isArray(dp.valueArray)
                        ? dp.valueArray
                        : Array.isArray(dp.value)
                            ? dp.value
                            : [dp.value];
                    const primary = toNumber(rawArray[0], 0);
                    const secondary = toNumber(rawArray[1], 0);
                    return {
                        ...dp,
                        value: primary,
                        valueArray: [primary, secondary],
                        date: normalizeDate(dp.date),
                    };
                }
                return {
                    ...dp,
                    date: normalizeDate(dp.date)
                };
            });
            setMetrics(normalized);
        }
    }, [isMultiAxisLine, kpi]);

    // Determine what columns to show based on chart type
    const getColumnConfig = () => {
        if (kpi.visualizationType === 'text') {
            return { dateLabel: 'Date', showValue: false, showSecondaryValue: false, showColor: false };
        }

        if (kpi.visualizationType === 'chart') {
            return {
                dateLabel: chartDefinition.dimensionLabel,
                showValue: true,
                showSecondaryValue: isMultiAxisLine,
                showColor: chartDefinition.requiresColor,
            };
        }

        return { dateLabel: 'Date', showValue: true, showSecondaryValue: false, showColor: false };
    };

    const columnConfig = getColumnConfig();

    const handleAddMetric = () => {
        const defaultLabel = chartDefinition.defaultDimensionValue || new Date().toISOString().split('T')[0];

        const latestPoint = metrics.length > 0 ? metrics[0] : null;
        const inheritedLabeledValues = latestPoint?.labeledValues
            ? latestPoint.labeledValues.map((lv, idx) => ({
                ...lv,
                value: 0,
                color: lv.color || (showColorColumn ? defaultColors[idx % defaultColors.length] : undefined),
            }))
            : [{
                label: 'Value 1',
                value: 0,
                color: showColorColumn ? defaultColors[0] : undefined,
            }];

        const newMetricColor = latestPoint?.color || (showColorColumn ? defaultColors[metrics.length % defaultColors.length] : undefined);

        const newPoint: Metric = isMultiAxisLine
            ? { date: defaultLabel, value: 0, valueArray: [0, 0] }
            : isMultiValueChart
            ? { date: defaultLabel, value: [0], valueArray: [0], labeledValues: inheritedLabeledValues, color: newMetricColor }
            : { date: defaultLabel, value: 0, color: showColorColumn ? defaultColors[metrics.length % defaultColors.length] : undefined };

        // Add color for chart types that use it
        if (showColorColumn) {
            newPoint.color = newPoint.color || defaultColors[metrics.length % defaultColors.length];
        }

        const updatedPoints = [...metrics, newPoint].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setMetrics(updatedPoints);
    };

    // Handler for updating a single value in a multi-value data point
    const handleUpdateMultiValue = (dpIndex: number, valueIndex: number, field: 'label' | 'value' | 'color', newValue: string) => {
        const updated = [...metrics];
        const dp = updated[dpIndex];
        const currentLabeled = dp.labeledValues ? [...dp.labeledValues] : [{ label: 'Value 1', value: 0 }];

        if (field === 'label') {
            currentLabeled[valueIndex] = { ...currentLabeled[valueIndex], label: newValue };
        } else if (field === 'color') {
            currentLabeled[valueIndex] = { ...currentLabeled[valueIndex], color: newValue };
        } else {
            const numValue = parseFloat(newValue) || 0;
            currentLabeled[valueIndex] = { ...currentLabeled[valueIndex], value: numValue };
        }

        updated[dpIndex].labeledValues = currentLabeled;
        updated[dpIndex].valueArray = currentLabeled.map(lv => lv.value);
        updated[dpIndex].value = currentLabeled.map(lv => lv.value);
        setMetrics(updated);
    };

    // Handler to add a new value to a multi-value data point
    const handleAddMultiValue = (dpIndex: number) => {
        const updated = [...metrics];
        const dp = updated[dpIndex];
        const currentLabeled = dp.labeledValues ? [...dp.labeledValues] : [];
        const newIndex = currentLabeled.length + 1;
        currentLabeled.push({
            label: `Value ${newIndex}`,
            value: 0,
            color: showColorColumn ? defaultColors[newIndex % defaultColors.length] : undefined,
        });
        updated[dpIndex].labeledValues = currentLabeled;
        updated[dpIndex].valueArray = currentLabeled.map(lv => lv.value);
        updated[dpIndex].value = currentLabeled.map(lv => lv.value);
        setMetrics(updated);
    };

    // Handler to remove a value from a multi-value data point
    const handleRemoveMultiValue = (dpIndex: number, valueIndex: number) => {
        const updated = [...metrics];
        const dp = updated[dpIndex];
        const currentLabeled = dp.labeledValues ? [...dp.labeledValues] : [{ label: 'Value 1', value: 0 }];
        if (currentLabeled.length > 1) {
            currentLabeled.splice(valueIndex, 1);
            updated[dpIndex].labeledValues = currentLabeled;
            updated[dpIndex].valueArray = currentLabeled.map(lv => lv.value);
            updated[dpIndex].value = currentLabeled.map(lv => lv.value);
            setMetrics(updated);
        }
    };

    const handleUpdateMetric = (index: number, field: 'date' | 'value' | 'valueB' | 'color', newValue: string) => {
        const updated = [...metrics];
        if (field === 'date') {
            updated[index].date = newValue;
        } else if (field === 'value') {
            const nextVal = parseFloat(newValue) || 0;
            updated[index].value = nextVal;
            if (isMultiAxisLine) {
                const arr = Array.isArray(updated[index].valueArray) ? [...updated[index].valueArray] : [];
                arr[0] = nextVal;
                updated[index].valueArray = [toNumber(arr[0], 0), toNumber(arr[1], 0)];
            }
        } else if (field === 'valueB' && isMultiAxisLine) {
            const nextVal = parseFloat(newValue) || 0;
            const arr = Array.isArray(updated[index].valueArray) ? [...updated[index].valueArray] : [toNumber(updated[index].value, 0), 0];
            arr[1] = nextVal;
            updated[index].valueArray = [toNumber(arr[0], 0), toNumber(arr[1], 0)];
        } else if (field === 'color') {
            updated[index].color = newValue;
        }
        setMetrics(updated);
    };

    const handleRemoveMetric = (index: number) => {
        setMetrics(metrics.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);
        setValidationErrors([]);

        try {
            // Sort data points
            const shouldPreserveOrder = kpi.visualizationType === 'chart' && (kpi.chartType === 'bar' || kpi.chartType === 'column');
            const sortedPoints = shouldPreserveOrder
                ? [...metrics]
                : [...metrics].sort((a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );

            if (kpi.visualizationType === 'chart') {
                const { isValid, errors } = validateVisualizationData(
                    kpi.visualizationType,
                    kpi.chartType ?? undefined,
                    sortedPoints
                );
                if (!isValid) {
                    setValidationErrors(errors);
                    setIsSubmitting(false);
                    return;
                }
            }

            // Build the value Record structure
            let valueRecord: Record<string, number | string> = {};
            let finalTrend = kpi.trendValue || 0;
            // Helper to extract a single number from a value that might be an array
            const extractNumber = (v: number | number[]): number => Array.isArray(v) ? (v[0] ?? 0) : v;

            if (kpi.visualizationType === 'number' && sortedPoints.length > 0) {
                const lastPoint = sortedPoints[sortedPoints.length - 1];
                valueRecord = { "0": extractNumber(lastPoint.value) };

                if (sortedPoints.length >= 2) {
                    const prevPoint = sortedPoints[sortedPoints.length - 2];
                    finalTrend = extractNumber(lastPoint.value) - extractNumber(prevPoint.value);
                }
            } else if (kpi.visualizationType === 'text') {
                // Text KPIs keep their existing value
                valueRecord = kpi.value;
            } else if (kpi.visualizationType === 'chart') {
                // Chart KPIs build from metrics
                sortedPoints.forEach(dp => {
                    valueRecord[dp.date] = extractNumber(dp.value);
                });
            }

            await onUpdate({
                value: valueRecord,
                trendValue: finalTrend,
                // Always send notes so clearing them persists
                notes: notes ?? '',
                metrics: sortedPoints,
                dataPoints: sortedPoints,
                date: new Date().toISOString()
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError('Failed to update KPI. Please try again.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Info */}
            <div className="bg-industrial-900/50 p-6 rounded-lg border border-industrial-800">
                <h2 className="text-2xl font-bold text-industrial-100 mb-1">{kpi.name}</h2>
                {kpi.subtitle && <p className="text-industrial-400">{kpi.subtitle}</p>}
                <div className="mt-4 flex items-center gap-2 text-sm text-industrial-500">
                    <span className="w-2 h-2 rounded-full bg-verdigris-500"></span>
                    Assigned to you
                </div>
            </div>

            {/* Values Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-industrial-200">Values</h3>
                        <p className="text-xs text-industrial-500 mt-1">
                            {kpi.visualizationType === 'number'
                                ? 'Add historical data points to track trends over time'
                                : kpi.visualizationType === 'chart'
                                    ? `Add data points for your ${kpi.chartType} chart`
                                    : 'Add values to update this metric'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddMetric}
                        className="btn btn-secondary btn-sm"
                    >
                        <Plus size={16} />
                        Add Metric
                    </button>
                </div>

                <div className="bg-industrial-900/30 rounded-lg border border-industrial-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-industrial-900/50 text-industrial-400 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">{columnConfig.dateLabel}</th>
                                {columnConfig.showValue && (
                                    <th className="px-4 py-3">
                                        {isMultiAxisLine ? primaryAxisLabel : 'Value'}
                                    </th>
                                )}
                                {columnConfig.showSecondaryValue && (
                                    <th className="px-4 py-3">{secondaryAxisLabel}</th>
                                )}
                                {columnConfig.showColor && <th className="px-4 py-3 w-20">Color</th>}
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-800/50">
                            {metrics.length === 0 ? (
                                <tr>
                                    <td colSpan={
                                        (columnConfig.showColor ? 1 : 0) +
                                        (columnConfig.showSecondaryValue ? 1 : 0) +
                                        (columnConfig.showValue ? 1 : 0) + 2
                                    } className="px-4 py-8 text-center text-industrial-500 italic">
                                        No data points yet. Add one to start tracking.
                                    </td>
                                </tr>
                            ) : (
                                metrics.map((point, index) => {

                                    if (isMultiAxisLine) {
                                        const primaryValue = toNumber(
                                            Array.isArray(point.valueArray)
                                                ? point.valueArray[0]
                                                : Array.isArray(point.value)
                                                    ? point.value[0]
                                                    : point.value,
                                            0
                                        );
                                        const secondaryValue = toNumber(
                                            Array.isArray(point.valueArray)
                                                ? point.valueArray[1]
                                                : Array.isArray(point.value)
                                                    ? point.value[1]
                                                    : undefined,
                                            0
                                        );
                                        return (
                                            <tr key={index} className="hover:bg-industrial-800/30 transition-colors">
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="date"
                                                        className="bg-transparent border-none focus:ring-0 text-industrial-200 w-full p-0"
                                                        value={point.date}
                                                        onChange={(e) => handleUpdateMetric(index, 'date', e.target.value)}
                                                        placeholder={chartDefinition.dimensionLabel}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        className="bg-transparent border-none focus:ring-0 text-industrial-200 w-full p-0 font-mono"
                                                        value={primaryValue}
                                                        onChange={(e) => handleUpdateMetric(index, 'value', e.target.value)}
                                                        placeholder={primaryAxisLabel}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        className="bg-transparent border-none focus:ring-0 text-industrial-200 w-full p-0 font-mono"
                                                        value={secondaryValue}
                                                        onChange={(e) => handleUpdateMetric(index, 'valueB', e.target.value)}
                                                        placeholder={secondaryAxisLabel}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMetric(index)}
                                                        className="text-industrial-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // For multi-value charts, show expanded row with individual value inputs
                                    if (isMultiValueChart) {
                                        return (
                                            <tr key={index} className="hover:bg-industrial-800/30 transition-colors">
                                                <td className="px-4 py-3" colSpan={columnConfig.showColor ? 4 : 3}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <input
                                                            type="text"
                                                            className="bg-transparent border border-industrial-700 rounded px-2 py-1 text-industrial-200 flex-1"
                                                            value={point.date}
                                                            onChange={(e) => handleUpdateMetric(index, 'date', e.target.value)}
                                                            placeholder={chartDefinition.dimensionLabel}
                                                        />
                                                        {columnConfig.showColor && (
                                                            <ColorPicker
                                                                value={point.color || '#3b82f6'}
                                                                onChange={(color) => handleUpdateMetric(index, 'color', color)}
                                                                align="left"
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMetric(index)}
                                                            className="text-industrial-500 hover:text-red-400 transition-colors"
                                                            title="Remove category"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <span className="text-xs text-industrial-400 uppercase">Values (Label : Value)</span>
                                                        {(point.labeledValues || [{ label: 'Value 1', value: Array.isArray(point.value) ? point.value[0] ?? 0 : point.value as number }]).map((lv, vIdx) => (
                                                            <div key={vIdx} className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    className="bg-industrial-800 border border-industrial-700 rounded px-2 py-1 text-industrial-200 flex-1"
                                                                    value={lv.label}
                                                                    onChange={(e) => handleUpdateMultiValue(index, vIdx, 'label', e.target.value)}
                                                                    placeholder={chartDefinition.valueLabel}
                                                                />
                                                                <span className="text-industrial-500">:</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className="bg-industrial-800 border border-industrial-700 rounded px-2 py-1 w-24 text-center text-industrial-200 font-mono"
                                                                    value={lv.value}
                                                                    onChange={(e) => handleUpdateMultiValue(index, vIdx, 'value', e.target.value)}
                                                                    placeholder={chartDefinition.valueLabel}
                                                                />
                                                                <ColorPicker
                                                                    value={lv.color || '#3b82f6'}
                                                                    onChange={(color) => handleUpdateMultiValue(index, vIdx, 'color', color)}
                                                                    align="right"
                                                                />
                                                                {(point.labeledValues?.length || 1) > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveMultiValue(index, vIdx)}
                                                                        className="text-industrial-500 hover:text-red-400 p-1"
                                                                        title="Remove value"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddMultiValue(index)}
                                                            className="btn btn-secondary btn-sm"
                                                            title="Add value"
                                                        >
                                                            <Plus size={14} />
                                                            Add Value
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Standard single-value row
                                    return (
                                        <tr key={index} className="hover:bg-industrial-800/30 transition-colors">
                                            <td className="px-4 py-2">
                                                        <input
                                                            type={columnConfig.dateLabel === 'Date' ? "date" : "text"}
                                                            className="bg-transparent border-none focus:ring-0 text-industrial-200 w-full p-0"
                                                            value={point.date}
                                                            onChange={(e) => handleUpdateMetric(index, 'date', e.target.value)}
                                                            placeholder={chartDefinition.dimensionLabel}
                                                        />
                                                    </td>
                                                    {columnConfig.showValue && (
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                className="bg-transparent border-none focus:ring-0 text-industrial-200 w-full p-0 font-mono"
                                                                value={Array.isArray(point.value) ? (point.value[0] ?? 0) : point.value}
                                                                onChange={(e) => handleUpdateMetric(index, 'value', e.target.value)}
                                                                placeholder={chartDefinition.valueLabel}
                                                            />
                                                        </td>
                                                    )}
                                            {columnConfig.showColor && (
                                                <td className="px-4 py-2">
                                                    <ColorPicker
                                                        value={point.color || '#3b82f6'}
                                                        onChange={(color) => handleUpdateMetric(index, 'color', color)}
                                                        align="left"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMetric(index)}
                                                    className="text-industrial-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Show-all toggle removed; always render all points */}
                </div>

                {validationErrors.length > 0 && (
                    <div className="border border-red-700/70 bg-red-900/20 text-red-200 rounded-md p-3 text-sm space-y-1">
                        {validationErrors.map((err, idx) => (
                            <div key={idx}>• {err}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notes */}
            <div className="form-group">
                <label className="label">Notes / Context (Optional)</label>
                <textarea
                    className="input min-h-[100px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any context about this update..."
                />
            </div>

            {/* Feedback & Actions */}
            {error && (
                <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-900/20 border border-green-900/50 text-green-400 p-4 rounded flex items-center gap-2">
                    <Save size={18} />
                    Update saved successfully!
                </div>
            )}

            <div className="pt-6 border-t border-industrial-800">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary w-full md:w-auto md:px-8 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? 'Saving...' : (
                        <>
                            <Save size={18} />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
