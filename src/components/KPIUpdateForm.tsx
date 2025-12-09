'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KPI, DataPoint } from '@/types';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import ColorPicker from './ColorPicker';

interface KPIUpdateFormProps {
    kpi: KPI;
    onUpdate: (updates: Partial<KPI>) => Promise<void>;
}

export default function KPIUpdateForm({ kpi, onUpdate }: KPIUpdateFormProps) {
    const [notes, setNotes] = useState(kpi.notes || '');
    const [dataPoints, setDataPoints] = useState<DataPoint[]>(kpi.dataPoints || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showAllDataPoints, setShowAllDataPoints] = useState(false);

    // Default color palette
    const defaultColors = ['#5094af', '#36c9b8', '#dea821', '#ee7411', '#e0451f'];

    // Determine if this is a multi-value chart type
    const isMultiValueChart = useMemo(
        () => kpi.visualizationType === 'chart' && ['bar', 'pie', 'donut', 'radar', 'radialBar'].includes(kpi.chartType || ''),
        [kpi.visualizationType, kpi.chartType]
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

    // Sort data points by date and normalize date format
    useEffect(() => {
        if (kpi.dataPoints) {
            // Sort descending (newest first)
            const sorted = [...kpi.dataPoints].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            // Normalize dates to YYYY-MM-DD format for date inputs
            const normalized = sorted.map(dp => ({
                ...dp,
                date: normalizeDate(dp.date)
            }));
            setDataPoints(normalized);
        }
    }, [kpi]);

    // Determine what columns to show based on chart type
    const getColumnConfig = () => {
        if (kpi.visualizationType === 'text') {
            return { dateLabel: 'Date', showValue: false, showColor: false };
        }

        if (kpi.visualizationType === 'number' || (kpi.visualizationType === 'chart' && (kpi.chartType === 'line' || kpi.chartType === 'area'))) {
            return { dateLabel: 'Date', showValue: true, showColor: false };
        }

        if (kpi.visualizationType === 'chart' && kpi.chartType === 'radar') {
            return { dateLabel: 'Dimension', showValue: true, showColor: false };
        }

        // bar, pie, donut, radialBar
        return { dateLabel: 'Category', showValue: true, showColor: true };
    };

    const columnConfig = getColumnConfig();

    const handleAddDataPoint = () => {
        let defaultLabel = new Date().toISOString().split('T')[0];

        if (kpi.visualizationType === 'chart') {
            if (kpi.chartType === 'pie' || kpi.chartType === 'donut' || kpi.chartType === 'bar' || kpi.chartType === 'radialBar') {
                defaultLabel = 'New Category';
            } else if (kpi.chartType === 'radar') {
                defaultLabel = 'Dimension';
            }
        }

        const latestPoint = dataPoints.length > 0 ? dataPoints[0] : null;
        const inheritedLabeledValues = latestPoint?.labeledValues
            ? latestPoint.labeledValues.map(lv => ({ ...lv, value: 0 }))
            : [{ label: 'Value 1', value: 0 }];

        const newDataPointColor = latestPoint?.color || (columnConfig.showColor ? defaultColors[dataPoints.length % defaultColors.length] : undefined);

        const newPoint: DataPoint = isMultiValueChart
            ? { date: defaultLabel, value: [0], valueArray: [0], labeledValues: inheritedLabeledValues, color: newDataPointColor }
            : { date: defaultLabel, value: 0 };

        // Add color for chart types that use it
        if (columnConfig.showColor) {
            newPoint.color = defaultColors[dataPoints.length % defaultColors.length];
        }

        const updatedPoints = [...dataPoints, newPoint].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setDataPoints(updatedPoints);
    };

    // Handler for updating a single value in a multi-value data point
    const handleUpdateMultiValue = (dpIndex: number, valueIndex: number, field: 'label' | 'value' | 'color', newValue: string) => {
        const updated = [...dataPoints];
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
        setDataPoints(updated);
    };

    // Handler to add a new value to a multi-value data point
    const handleAddMultiValue = (dpIndex: number) => {
        const updated = [...dataPoints];
        const dp = updated[dpIndex];
        const currentLabeled = dp.labeledValues ? [...dp.labeledValues] : [];
        const newIndex = currentLabeled.length + 1;
        currentLabeled.push({ label: `Value ${newIndex}`, value: 0 });
        updated[dpIndex].labeledValues = currentLabeled;
        updated[dpIndex].valueArray = currentLabeled.map(lv => lv.value);
        updated[dpIndex].value = currentLabeled.map(lv => lv.value);
        setDataPoints(updated);
    };

    // Handler to remove a value from a multi-value data point
    const handleRemoveMultiValue = (dpIndex: number, valueIndex: number) => {
        const updated = [...dataPoints];
        const dp = updated[dpIndex];
        const currentLabeled = dp.labeledValues ? [...dp.labeledValues] : [{ label: 'Value 1', value: 0 }];
        if (currentLabeled.length > 1) {
            currentLabeled.splice(valueIndex, 1);
            updated[dpIndex].labeledValues = currentLabeled;
            updated[dpIndex].valueArray = currentLabeled.map(lv => lv.value);
            updated[dpIndex].value = currentLabeled.map(lv => lv.value);
            setDataPoints(updated);
        }
    };

    const handleUpdateDataPoint = (index: number, field: 'date' | 'value' | 'color', newValue: string) => {
        const updated = [...dataPoints];
        if (field === 'date') {
            updated[index].date = newValue;
        } else if (field === 'value') {
            updated[index].value = parseFloat(newValue) || 0;
        } else if (field === 'color') {
            updated[index].color = newValue;
        }
        setDataPoints(updated);
    };

    const handleRemoveDataPoint = (index: number) => {
        setDataPoints(dataPoints.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            // Sort data points
            const sortedPoints = [...dataPoints].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

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
                // Chart KPIs build from dataPoints
                sortedPoints.forEach(dp => {
                    valueRecord[dp.date] = extractNumber(dp.value);
                });
            }

            await onUpdate({
                value: valueRecord,
                trendValue: finalTrend,
                notes: notes || undefined,
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
                        onClick={handleAddDataPoint}
                        className="btn btn-secondary btn-sm"
                    >
                        <Plus size={16} />
                        Add Entry
                    </button>
                </div>

                <div className="bg-industrial-900/30 rounded-lg border border-industrial-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-industrial-900/50 text-industrial-400 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">{columnConfig.dateLabel}</th>
                                {columnConfig.showValue && <th className="px-4 py-3">Value</th>}
                                {columnConfig.showColor && <th className="px-4 py-3 w-20">Color</th>}
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-800/50">
                            {dataPoints.length === 0 ? (
                                <tr>
                                    <td colSpan={columnConfig.showColor ? 4 : columnConfig.showValue ? 3 : 2} className="px-4 py-8 text-center text-industrial-500 italic">
                                        No data points yet. Add one to start tracking.
                                    </td>
                                </tr>
                            ) : (
                                (showAllDataPoints ? dataPoints : dataPoints.slice(-10)).map((point, index) => {
                                    const valueArray = Array.isArray(point.value) ? point.value : (point.valueArray || [typeof point.value === 'number' ? point.value : 0]);

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
                                                            onChange={(e) => handleUpdateDataPoint(index, 'date', e.target.value)}
                                                            placeholder={kpi.chartType === 'radar' ? 'Dimension Name' : 'Category Name'}
                                                        />
                                                        {columnConfig.showColor && (
                                                            <ColorPicker
                                                                value={point.color || '#3b82f6'}
                                                                onChange={(color) => handleUpdateDataPoint(index, 'color', color)}
                                                                align="left"
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveDataPoint(index)}
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
                                                                    placeholder={`Label ${vIdx + 1}`}
                                                                />
                                                                <span className="text-industrial-500">:</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className="bg-industrial-800 border border-industrial-700 rounded px-2 py-1 w-24 text-center text-industrial-200 font-mono"
                                                                    value={lv.value}
                                                                    onChange={(e) => handleUpdateMultiValue(index, vIdx, 'value', e.target.value)}
                                                                    placeholder="0"
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
                                                    onChange={(e) => handleUpdateDataPoint(index, 'date', e.target.value)}
                                                    placeholder={columnConfig.dateLabel}
                                                />
                                            </td>
                                            {columnConfig.showValue && (
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        className="bg-transparent border-none focus:ring-0 text-industrial-200 w-full p-0 font-mono"
                                                        value={Array.isArray(point.value) ? (point.value[0] ?? 0) : point.value}
                                                        onChange={(e) => handleUpdateDataPoint(index, 'value', e.target.value)}
                                                    />
                                                </td>
                                            )}
                                            {columnConfig.showColor && (
                                                <td className="px-4 py-2">
                                                    <ColorPicker
                                                        value={point.color || '#3b82f6'}
                                                        onChange={(color) => handleUpdateDataPoint(index, 'color', color)}
                                                        align="left"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDataPoint(index)}
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

                    {dataPoints.length > 10 && (
                        <div className="flex justify-center p-4 border-t border-industrial-800">
                            <button
                                type="button"
                                onClick={() => setShowAllDataPoints(!showAllDataPoints)}
                                className="btn btn-secondary btn-sm"
                            >
                                {showAllDataPoints ? 'Show Less' : `Show All (${dataPoints.length} points)`}
                            </button>
                        </div>
                    )}
                </div>
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
