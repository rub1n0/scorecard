'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { KPI, VisualizationType, ChartType, DataPoint, LabeledValue, Section } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import ColorPicker from './ColorPicker';
import Modal from './Modal';

interface KPIFormProps {
    kpi?: KPI;
    sections?: Section[];
    onSave: (kpi: Omit<KPI, 'id'>) => void;
    onCancel: () => void;
}

export default function KPIForm({ kpi, sections = [], onSave, onCancel }: KPIFormProps) {
    const [name, setName] = useState(kpi?.name || '');
    const [sectionId, setSectionId] = useState<string | null>(kpi?.sectionId || null);
    const [visible, setVisible] = useState(kpi?.visible !== false);
    const [subtitle, setSubtitle] = useState(kpi?.subtitle || '');
    const [value, setValue] = useState(kpi?.value.toString() || '');
    const [date, setDate] = useState(
        kpi?.date ? new Date(kpi.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );
    const [notes, setNotes] = useState(kpi?.notes || '');
    const [visualizationType, setVisualizationType] = useState<VisualizationType>(
        kpi?.visualizationType || 'number'
    );
    const [chartType, setChartType] = useState<ChartType>(kpi?.chartType || 'line');
    const [trendValue] = useState(kpi?.trendValue?.toString() || '0');
    const isMultiValueChart = useMemo(
        () => ['bar', 'pie', 'donut', 'radar', 'radialBar'].includes(chartType),
        [chartType]
    );

    // Chart Settings State
    const [strokeWidth, setStrokeWidth] = useState(kpi?.chartSettings?.strokeWidth ?? 2);
    const [strokeColor, setStrokeColor] = useState(kpi?.chartSettings?.strokeColor || '#457B9D');
    const [strokeOpacity, setStrokeOpacity] = useState(kpi?.chartSettings?.strokeOpacity ?? 1.0);
    const [showLegend, setShowLegend] = useState(kpi?.chartSettings?.showLegend ?? true);
    const [showGridLines, setShowGridLines] = useState(kpi?.chartSettings?.showGridLines ?? true);
    const [showDataLabels, setShowDataLabels] = useState(kpi?.chartSettings?.showDataLabels ?? true);
    const [reverseTrend, setReverseTrend] = useState(kpi?.reverseTrend ?? false);
    const [prefix, setPrefix] = useState(kpi?.prefix || '');
    const [prefixOpacity, setPrefixOpacity] = useState(kpi?.prefixOpacity ?? 0.50);
    const [suffix, setSuffix] = useState(kpi?.suffix || '');
    const [suffixOpacity, setSuffixOpacity] = useState(kpi?.suffixOpacity ?? 0.50);

    // Default color palette (same as KPITile.tsx)
    const defaultColors = useMemo(() => ['#5094af', '#36c9b8', '#dea821', '#ee7411', '#e0451f'], []);

    // Hydrate datapoints from persisted array or fall back to value map so history shows up
    const rawDataPoints = useMemo<DataPoint[]>(() => {
        const existing = (kpi?.dataPoints || []).map(dp => ({ ...dp }));
        if (existing.length > 0) return existing;

        const entries = Object.entries(kpi?.value || {});
        if (entries.length === 0) return [];

        // Prefer non-zero keys (historical entries). If only "0" exists, use KPI date as label.
        const nonZero = entries.filter(([key]) => key !== '0');
        const toUse = nonZero.length > 0 ? nonZero : entries;
        const fallbackDate = kpi?.date
            ? new Date(kpi.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        return toUse.map(([key, val]) => ({
            date: key === '0' ? fallbackDate : key,
            value: typeof val === 'number' ? val : parseFloat(String(val)) || 0,
        }));
    }, [kpi]);

    const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);

    // Helper function to normalize dates to YYYY-MM-DD format for HTML date inputs
    const normalizeDateForInput = (dateString: string): string => {
        // If it's already a valid date format, try to parse and normalize it
        try {
            const parsed = new Date(dateString);
            // Check if it's a valid date
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
            }
        } catch {
            // If parsing fails, return the original string (for categorical values)
        }
        // Return the original string if it's not a parseable date
        return dateString;
    };

    // Populate missing colors and sort data points when editing
    useEffect(() => {
        // Sort descending (newest first) and normalize where needed
        if (rawDataPoints.length === 0) {
            setDataPoints([]);
            return;
        }

        const sorted = [...rawDataPoints].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (!isNaN(dateA) && !isNaN(dateB)) {
                return dateB - dateA;
            }
            return 0;
        });

        const needsColors = sorted.some(dp => !dp.color);
        const needsDateNormalization = sorted.some(dp => {
            // Check if this looks like a date (not a category)
            const parsed = new Date(dp.date);
            return !isNaN(parsed.getTime()) && dp.date !== parsed.toISOString().split('T')[0];
        });

        if (needsColors || needsDateNormalization) {
            const updatedPoints = sorted.map((dp, index) => ({
                ...dp,
                date: (visualizationType === 'number' ||
                    (visualizationType === 'chart' && ['line', 'area'].includes(chartType)))
                    ? normalizeDateForInput(dp.date)
                    : dp.date,
                color: dp.color || defaultColors[index % defaultColors.length]
            }));
            setDataPoints(updatedPoints);
        } else {
            setDataPoints(sorted);
        }
    }, [rawDataPoints, visualizationType, chartType, defaultColors]);


    const handleAddDataPoint = () => {
        let defaultLabel = new Date().toISOString().split('T')[0];

        if (visualizationType === 'chart') {
            if (chartType === 'pie' || chartType === 'donut' || chartType === 'bar' || chartType === 'radialBar') {
                defaultLabel = 'New Category';
            } else if (chartType === 'radar') {
                defaultLabel = 'Dimension';
            }
        }

        const latestPoint = dataPoints.length > 0 ? dataPoints[0] : null;
        const inheritedLabeledValues: LabeledValue[] = latestPoint?.labeledValues
            ? latestPoint.labeledValues.map(lv => ({ ...lv, value: 0 }))
            : [{ label: 'Value 1', value: 0 }];

        const newPoint: DataPoint = isMultiValueChart
            ? { date: defaultLabel, value: [0], valueArray: [0], labeledValues: inheritedLabeledValues }
            : { date: defaultLabel, value: 0 };

        const updatedPoints = [...dataPoints, newPoint].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setDataPoints(updatedPoints);
    };

    const handleUpdateDataPoint = (index: number, field: 'date' | 'value' | 'color', newValue: string) => {
        const updated = [...dataPoints];
        if (field === 'date') {
            updated[index].date = newValue;
        } else if (field === 'value') {
            if (isMultiValueChart) {
                const parts = newValue
                    .split(/[,\\s]+/)
                    .map(p => p.trim())
                    .filter(Boolean)
                    .map(val => parseFloat(val))
                    .filter(v => Number.isFinite(v));
                updated[index].valueArray = parts.length ? parts : [0];
                updated[index].value = parts.length ? parts : [0];
            } else {
                updated[index].value = parseFloat(newValue) || 0;
            }
        } else if (field === 'color') {
            updated[index].color = newValue;
        }
        setDataPoints(updated);
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
        // Also update valueArray for backward compatibility
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

    const handleRemoveDataPoint = (index: number) => {
        setDataPoints(dataPoints.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalValue = parseFloat(value) || 0;
        let finalTrend = parseFloat(trendValue) || 0;

        // For number type, derive value and trend from data points
        if (visualizationType === 'number' && dataPoints.length > 0) {
            // Helper to extract a single number from a value that might be an array
            const extractNumber = (v: number | number[]): number => Array.isArray(v) ? (v[0] ?? 0) : v;

            // Sort by date to ensure chronological order
            const sortedPoints = [...dataPoints].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const lastPoint = sortedPoints[sortedPoints.length - 1];
            finalValue = extractNumber(lastPoint.value);

            if (sortedPoints.length >= 2) {
                const prevPoint = sortedPoints[sortedPoints.length - 2];
                finalTrend = extractNumber(lastPoint.value) - extractNumber(prevPoint.value);
            } else {
                finalTrend = 0;
            }
        }

        // Sort data points by date before saving
        const sortedDataPoints = [...dataPoints].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (!isNaN(dateA) && !isNaN(dateB)) {
                return dateA - dateB;
            }
            return 0;
        });

        // Build the value Record based on visualization type
        let valueRecord: Record<string, number | string> = {};

        if (visualizationType === 'text') {
            // Text KPIs store value at "0" key
            valueRecord = { "0": value };
        } else if (visualizationType === 'number') {
            // Number KPIs store the latest value at "0" key
            valueRecord = { "0": finalValue };
        } else if (visualizationType === 'chart') {
            // Chart KPIs build value from dataPoints
            const isCategorical = ['bar', 'pie', 'donut', 'radar', 'radialBar'].includes(chartType);
            // Helper to extract a single number from a value that might be an array
            const extractValue = (v: number | number[]): number => Array.isArray(v) ? (v[0] ?? 0) : v;

            if (isCategorical) {
                // Categorical charts: category -> value mapping
                sortedDataPoints.forEach(dp => {
                    valueRecord[dp.date] = extractValue(dp.value); // date field holds category name
                });
            } else {
                // Time-series charts: use date -> value mapping
                sortedDataPoints.forEach(dp => {
                    valueRecord[dp.date] = extractValue(dp.value);
                });
            }
        }



        const kpiData: Omit<KPI, 'id'> = {
            name,
            kpiName: name, // Normalized name could be generated here if needed
            subtitle: subtitle || undefined,
            value: valueRecord, // Assuming valueRecord is the correct final value
            date,
            notes: notes || undefined,
            visualizationType,
            chartType: visualizationType === 'chart' ? chartType : undefined,
            trendValue: visualizationType === 'number' ? finalTrend : undefined, // Assuming trendValue is a state variable
            chartSettings: (visualizationType === 'chart' || visualizationType === 'number') ? {
                strokeWidth,
                strokeColor,
                strokeOpacity,
                showLegend,
                showGridLines,
                showDataLabels,
            } : undefined,
            dataPoints: visualizationType !== 'text' ? sortedDataPoints : undefined, // Assuming sortedDataPoints is the correct final dataPoints
            sectionId: sectionId || undefined,
            visible,
            reverseTrend,
            prefix: prefix,
            prefixOpacity,
            suffix: suffix,
            suffixOpacity,
        };

        onSave(kpiData);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title={kpi ? 'EDIT KPI' : 'NEW METRIC'}
            className="kpi-form-modal"
        >
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="form-label">Metric Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            placeholder="e.g. Monthly Revenue"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="form-label">Section</label>
                        <select
                            value={sectionId || ''}
                            onChange={(e) => setSectionId(e.target.value || null)}
                            className="select w-full"
                        >
                            <option value="">Unassigned</option>
                            {sections?.map((section) => (
                                <option key={section.id} value={section.id}>
                                    {section.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        checked={visible}
                        onChange={(e) => setVisible(e.target.checked)}
                        className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                        id="kpi-visible"
                    />
                    <label htmlFor="kpi-visible" className="text-sm text-industrial-200 cursor-pointer">
                        Visible on Scorecard
                    </label>
                </div>

                <div className="form-group">
                    <label className="form-label">Subtitle (Optional)</label>
                    <input
                        type="text"
                        className="input"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="e.g., Average Response Time"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label flex justify-between">
                            <span>Prefix (Optional)</span>
                            <span className="text-xs text-industrial-500 font-mono">Opacity: {Math.round(prefixOpacity * 100)}%</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input flex-1"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                                placeholder="e.g., $, €"
                                maxLength={5}
                            />
                            <div className="w-24 flex items-center">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    className="w-full accent-industrial-500"
                                    value={prefixOpacity}
                                    onChange={(e) => setPrefixOpacity(parseFloat(e.target.value))}
                                    title="Prefix Opacity"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label flex justify-between">
                            <span>Suffix (Optional)</span>
                            <span className="text-xs text-industrial-500 font-mono">Opacity: {Math.round(suffixOpacity * 100)}%</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input flex-1"
                                value={suffix}
                                onChange={(e) => setSuffix(e.target.value)}
                                placeholder="e.g., %, ms, GB"
                                maxLength={10}
                            />
                            <div className="w-24 flex items-center">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    className="w-full accent-industrial-500"
                                    value={suffixOpacity}
                                    onChange={(e) => setSuffixOpacity(parseFloat(e.target.value))}
                                    title="Suffix Opacity"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="input"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Visualization</label>
                        <select
                            className="select"
                            value={visualizationType}
                            onChange={(e) => setVisualizationType(e.target.value as VisualizationType)}
                        >
                            <option value="number">Number with Trend</option>
                            <option value="chart">Chart</option>
                            <option value="text">Text</option>
                        </select>
                    </div>
                </div>

                {(visualizationType === 'chart' || visualizationType === 'number') && (
                    <div className="form-group border-t border-industrial-800 pt-6 mt-6">
                        <h3 className="text-sm font-semibold text-industrial-200 mb-4 uppercase tracking-wide">Visualization Settings</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Stroke Width ({strokeWidth}px)</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="1"
                                    className="w-full accent-industrial-500"
                                    value={strokeWidth}
                                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Opacity ({Math.round(strokeOpacity * 100)}%)</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    className="w-full accent-industrial-500"
                                    value={strokeOpacity}
                                    onChange={(e) => setStrokeOpacity(parseFloat(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Color</label>
                            <div className="flex items-center gap-3">
                                <ColorPicker
                                    value={strokeColor}
                                    onChange={setStrokeColor}
                                />
                                <input
                                    type="text"
                                    className="input font-mono flex-1"
                                    value={strokeColor}
                                    onChange={(e) => setStrokeColor(e.target.value)}
                                    placeholder="#RRGGBB"
                                />
                            </div>
                        </div>

                        {visualizationType === 'chart' && (
                            <div className="flex flex-wrap gap-4 mt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                                        checked={showLegend}
                                        onChange={(e) => setShowLegend(e.target.checked)}
                                    />
                                    <span className="text-sm text-industrial-300">Show Legend</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                                        checked={showGridLines}
                                        onChange={(e) => setShowGridLines(e.target.checked)}
                                    />
                                    <span className="text-sm text-industrial-300">Show Grid Lines</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                                        checked={showDataLabels}
                                        onChange={(e) => setShowDataLabels(e.target.checked)}
                                    />
                                    <span className="text-sm text-industrial-300">Show Data Labels</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {/* Reverse Trend Option - Available for all types */}
                <div className="form-group mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                            checked={reverseTrend}
                            onChange={(e) => setReverseTrend(e.target.checked)}
                        />
                        <span className="text-sm text-industrial-300">Reverse Trend (Down is Good)</span>
                    </label>
                    <p className="text-xs text-industrial-500 mt-1 ml-6">
                        If checked, a negative trend will be shown in green and a positive trend in red.
                    </p>
                </div>

                {/* Value field - required for Number and Text, optional for Chart */}
                {/* Value field - only for Text type */}
                {visualizationType === 'text' && (
                    <div className="form-group">
                        <label className="form-label">Value</label>
                        <input
                            type="text"
                            className="input"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            required
                            placeholder="Enter text value"
                        />
                    </div>
                )}

                {/* Chart Type Selection */}
                {visualizationType === 'chart' && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Chart Type</label>
                            <select className="select" value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
                                <option value="line">Line</option>
                                <option value="area">Area</option>
                                <option value="bar">Bar</option>
                                <option value="pie">Pie</option>
                                <option value="donut">Donut</option>
                                <option value="radar">Radar</option>
                                <option value="radialBar">Radial Bar</option>
                            </select>
                        </div>
                        <div className="chart-help-text">
                            <p className="text-muted">
                                {chartType === 'line' && '📈 Line charts show trends over time. Add data points with dates and values.'}
                                {chartType === 'area' && '📊 Area charts display filled trends. Add data points with dates and values.'}
                                {chartType === 'bar' && '📊 Bar charts compare categories. Add data points with categories/dates and values.'}
                                {chartType === 'pie' && '🥧 Pie charts show proportions. Add categories with percentage or absolute values.'}
                                {chartType === 'donut' && '🍩 Donut charts show proportions with a center hole. Add categories with values.'}
                                {chartType === 'radar' && '🕸️ Radar charts compare multiple dimensions. Add 3+ dimensions with scores (0-100).'}
                                {chartType === 'radialBar' && '⭕ Radial bar charts show progress in circular form. Add categories with values.'}
                            </p>
                        </div>
                    </>
                )}



                {/* Notes */}
                <div className="form-group">
                    <div className="flex items-center justify-between">
                        <label className="form-label">Notes (Optional)</label>
                        <span className="text-[11px] uppercase tracking-wide text-industrial-500">Markdown supported</span>
                    </div>
                    <textarea
                        className="textarea"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add system context... (bold, lists, code blocks, etc.)"
                    />
                    {notes && (
                        <div className="mt-3 border border-industrial-800 rounded-md bg-industrial-950/60 p-3">
                            <div className="text-[11px] uppercase tracking-wide text-industrial-500 mb-2">Preview</div>
                            <div className="text-sm text-industrial-200 leading-relaxed space-y-2">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-5 space-y-1" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-5 space-y-1" {...props} />,
                                        li: ({ node, ...props }) => <li className="text-industrial-200" {...props} />,
                                        table: ({ node, ...props }) => (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse border border-industrial-800 text-sm" {...props} />
                                            </div>
                                        ),
                                        thead: ({ node, ...props }) => <thead className="bg-industrial-900" {...props} />,
                                        tbody: ({ node, ...props }) => <tbody {...props} />,
                                        tr: ({ node, ...props }) => <tr className="border-b border-industrial-800 last:border-0" {...props} />,
                                        th: ({ node, ...props }) => <th className="px-3 py-2 font-semibold text-industrial-100" {...props} />,
                                        td: ({ node, ...props }) => <td className="px-3 py-2 text-industrial-200 align-top" {...props} />,
                                        code: ({ node, ...props }) => {
                                            const isInline = (props as any).inline === true;
                                            return isInline ? (
                                                <code className="bg-industrial-900 px-1.5 py-0.5 rounded text-xs text-amber-300" {...props} />
                                            ) : (
                                                <code className="block bg-industrial-900 p-3 rounded text-xs text-amber-300 overflow-x-auto" {...props} />
                                            );
                                        },
                                        strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                                    }}
                                >
                                    {notes}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-actions my-6">
                    <button type="button" onClick={onCancel} className="btn btn-secondary">
                        CANCEL
                    </button>
                    <button type="submit" className="btn btn-primary">
                        {kpi ? 'UPDATE METRIC' : 'CREATE METRIC'}
                    </button>
                </div>

                {(visualizationType === 'chart' || visualizationType === 'number') && (() => {
                    const getColumnLabels = () => {
                        if (visualizationType === 'number' || (visualizationType === 'chart' && (chartType === 'line' || chartType === 'area'))) {
                            return ['Date', 'Value'];
                        }
                        if (visualizationType === 'chart' && chartType === 'radar') {
                            return ['Dimension', 'Score'];
                        }
                        // bar, pie, donut, radialBar
                        return ['Category', 'Value', 'Color'];
                    };
                    const labels = getColumnLabels();
                    const gridCols = labels.length === 3 ? 'grid-cols-[1fr_1fr_auto_auto]' : 'grid-cols-[1fr_1fr_auto]';

                    return (
                        <div className="form-group border-t border-industrial-800 pt-6">
                            <div className="data-points-header">
                                <label className="form-label">Values</label>
                                <button type="button" onClick={handleAddDataPoint} className="btn btn-secondary btn-sm">
                                    <Plus size={14} />
                                    ADD POINT
                                </button>
                            </div>

                            {/* Column Headers */}
                            <div className={`grid ${gridCols} gap-2 mb-2 px-1`}>
                                <div className="text-xs font-mono text-industrial-400 uppercase">{labels[0]}</div>
                                <div className="text-xs font-mono text-industrial-400 uppercase">{labels[1]}</div>
                                {labels.length === 3 && (
                                    <div className="text-xs font-mono text-industrial-400 uppercase text-center w-[42px]">{labels[2]}</div>
                                )}
                                <div className="w-8"></div> {/* Spacer for delete button */}
                            </div>

                            {dataPoints.length > 0 ? (
                                <div className="space-y-3">
                                    {dataPoints.map((dp, actualIndex) => {
                                        // For multi-value charts, show expanded input section
                                        if (isMultiValueChart) {
                                            return (
                                                <div key={actualIndex} className="bg-industrial-900/50 rounded-lg p-3 border border-industrial-800">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <input
                                                            type="text"
                                                            className="input flex-1"
                                                            value={dp.date}
                                                            onChange={(e) => handleUpdateDataPoint(actualIndex, 'date', e.target.value)}
                                                            placeholder={chartType === 'radar' ? 'Dimension Name' : 'Category Name'}
                                                        />
                                                        {labels.length === 3 && (
                                                            <ColorPicker
                                                                value={dp.color || '#3b82f6'}
                                                                onChange={(color) => handleUpdateDataPoint(actualIndex, 'color', color)}
                                                                align="right"
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveDataPoint(actualIndex)}
                                                            className="btn btn-icon btn-danger"
                                                            title="Remove category"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-mono text-industrial-400 uppercase">Values (Label : Value)</div>
                                                        <div className="space-y-2">
                                                            {(dp.labeledValues || [{ label: 'Value 1', value: Array.isArray(dp.value) ? dp.value[0] ?? 0 : dp.value as number }]).map((lv, vIdx) => (
                                                                <div key={vIdx} className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        className="input flex-1"
                                                                        value={lv.label}
                                                                        onChange={(e) => handleUpdateMultiValue(actualIndex, vIdx, 'label', e.target.value)}
                                                                        placeholder={`Label ${vIdx + 1}`}
                                                                    />
                                                                    <span className="text-industrial-500">:</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        className="input w-24 text-center"
                                                                        value={lv.value}
                                                                        onChange={(e) => handleUpdateMultiValue(actualIndex, vIdx, 'value', e.target.value)}
                                                                        placeholder="0"
                                                                    />
                                                                    <ColorPicker
                                                                        value={lv.color || '#3b82f6'}
                                                                        onChange={(color) => handleUpdateMultiValue(actualIndex, vIdx, 'color', color)}
                                                                        align="right"
                                                                    />
                                                                    {(dp.labeledValues?.length || 1) > 1 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveMultiValue(actualIndex, vIdx)}
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
                                                                onClick={() => handleAddMultiValue(actualIndex)}
                                                                className="btn btn-secondary btn-sm"
                                                                title="Add value"
                                                            >
                                                                <Plus size={12} />
                                                                Add Value
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Standard single-value layout for line/area/number
                                        return (
                                            <div key={actualIndex} className={`grid ${gridCols} gap-2 items-center`}>
                                                <input
                                                    type="date"
                                                    className="input"
                                                    value={dp.date}
                                                    onChange={(e) => handleUpdateDataPoint(actualIndex, 'date', e.target.value)}
                                                    placeholder={labels[0]}
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input"
                                                    value={dp.value as number}
                                                    onChange={(e) => handleUpdateDataPoint(actualIndex, 'value', e.target.value)}
                                                    placeholder={labels[1]}
                                                />
                                                {labels.length === 3 && (
                                                    <ColorPicker
                                                        value={dp.color || '#3b82f6'}
                                                        onChange={(color) => handleUpdateDataPoint(actualIndex, 'color', color)}
                                                        align="right"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDataPoint(actualIndex)}
                                                    className="btn btn-icon btn-danger"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-muted" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                    No data points configured. Click ADD POINT to create {isMultiValueChart ? 'a category' : 'a data point'}.
                                </p>
                            )}
                        </div>
                    );
                })()}
            </form>
        </Modal >
    );
}
