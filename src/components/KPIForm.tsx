'use client';

import React, { useState, useEffect } from 'react';
import { KPI, VisualizationType, ChartType, DataPoint } from '@/types';
import { X, Plus, Trash2 } from 'lucide-react';
import ColorPicker from './ColorPicker';

interface KPIFormProps {
    kpi?: KPI;
    onSave: (kpi: Omit<KPI, 'id'>) => void;
    onCancel: () => void;
}

export default function KPIForm({ kpi, onSave, onCancel }: KPIFormProps) {
    const [name, setName] = useState(kpi?.name || '');
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
    const [trendValue, setTrendValue] = useState(kpi?.trendValue?.toString() || '0');
    const [dataPoints, setDataPoints] = useState<DataPoint[]>(kpi?.dataPoints || []);

    // Chart Settings State
    const [strokeWidth, setStrokeWidth] = useState(kpi?.chartSettings?.strokeWidth ?? 2);
    const [strokeColor, setStrokeColor] = useState(kpi?.chartSettings?.strokeColor || '#457B9D');
    const [strokeOpacity, setStrokeOpacity] = useState(kpi?.chartSettings?.strokeOpacity ?? 1.0);
    const [showLegend, setShowLegend] = useState(kpi?.chartSettings?.showLegend ?? true);
    const [showGridLines, setShowGridLines] = useState(kpi?.chartSettings?.showGridLines ?? true);
    const [showDataLabels, setShowDataLabels] = useState(kpi?.chartSettings?.showDataLabels ?? true);
    const [reverseTrend, setReverseTrend] = useState(kpi?.reverseTrend ?? false);
    const [showAllDataPoints, setShowAllDataPoints] = useState(false);

    // Default color palette (same as KPITile.tsx)
    const defaultColors = ['#5094af', '#36c9b8', '#dea821', '#ee7411', '#e0451f'];

    // Populate missing colors and sort data points when editing
    useEffect(() => {
        if (kpi?.dataPoints) {
            // Sort descending (newest first)
            const sorted = [...kpi.dataPoints].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            const needsColors = sorted.some(dp => !dp.color);
            if (needsColors) {
                const updatedPoints = sorted.map((dp, index) => ({
                    ...dp,
                    color: dp.color || defaultColors[index % defaultColors.length]
                }));
                setDataPoints(updatedPoints);
            } else {
                setDataPoints(sorted);
            }
        }
    }, [kpi]);


    const handleAddDataPoint = () => {
        let defaultLabel = new Date().toISOString().split('T')[0];

        if (visualizationType === 'chart') {
            if (chartType === 'pie' || chartType === 'donut' || chartType === 'bar' || chartType === 'radialBar') {
                defaultLabel = 'New Category';
            } else if (chartType === 'radar') {
                defaultLabel = 'Dimension';
            }
        }

        const newPoint = {
            date: defaultLabel,
            value: 0,
        };

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
            updated[index].value = parseFloat(newValue) || 0;
        } else if (field === 'color') {
            updated[index].color = newValue;
        }
        setDataPoints(updated);
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
            // Sort by date to ensure chronological order
            const sortedPoints = [...dataPoints].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const lastPoint = sortedPoints[sortedPoints.length - 1];
            finalValue = lastPoint.value;

            if (sortedPoints.length >= 2) {
                const prevPoint = sortedPoints[sortedPoints.length - 2];
                finalTrend = lastPoint.value - prevPoint.value;
            } else {
                finalTrend = 0;
            }
        }

        const kpiData: Omit<KPI, 'id'> = {
            name,
            subtitle: subtitle || undefined,
            value: visualizationType === 'text' ? value : finalValue,
            date,
            notes: notes || undefined,
            visualizationType,
            chartType: visualizationType === 'chart' ? chartType : undefined,
            trendValue: visualizationType === 'number' ? finalTrend : undefined,
            chartSettings: (visualizationType === 'chart' || visualizationType === 'number') ? {
                strokeWidth,
                strokeColor,
                strokeOpacity,
                showLegend,
                showGridLines,
                showDataLabels,
            } : undefined,
            dataPoints: visualizationType !== 'text' ? dataPoints : undefined,
            reverseTrend,
        };

        onSave(kpiData);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal kpi-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{kpi ? 'EDIT METRIC' : 'NEW METRIC'}</h2>
                    <button onClick={onCancel} className="btn btn-icon btn-secondary">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Metric Name</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g., SYSTEM LOAD"
                        />
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
                                <label className="form-label">Stroke Color</label>
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
                        <label className="form-label">Notes (Optional)</label>
                        <textarea
                            className="textarea"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add system context..."
                        />
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
                                    <div className="space-y-2">
                                        {(showAllDataPoints ? dataPoints : dataPoints.slice(-10)).map((dp, index) => (
                                            <div key={index} className={`grid ${gridCols} gap-2 items-center`}>
                                                <input
                                                    type={visualizationType === 'chart' && (chartType === 'pie' || chartType === 'donut' || chartType === 'radar' || chartType === 'bar' || chartType === 'radialBar') ? 'text' : 'date'}
                                                    className="input"
                                                    value={dp.date}
                                                    onChange={(e) => handleUpdateDataPoint(index, 'date', e.target.value)}
                                                    placeholder={labels[0]}
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input"
                                                    value={dp.value}
                                                    onChange={(e) => handleUpdateDataPoint(index, 'value', e.target.value)}
                                                    placeholder={labels[1]}
                                                />
                                                {labels.length === 3 && (
                                                    <ColorPicker
                                                        value={dp.color || '#3b82f6'}
                                                        onChange={(color) => handleUpdateDataPoint(index, 'color', color)}
                                                        align="right"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDataPoint(index)}
                                                    className="btn btn-icon btn-danger"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        {dataPoints.length > 10 && (
                                            <div className="flex justify-center pt-4">
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
                                ) : (
                                    <p className="text-muted" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                        No data points configured.
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </form>
            </div>
        </div>
    );
}
