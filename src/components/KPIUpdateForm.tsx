'use client';

import React, { useState, useEffect } from 'react';
import { KPI, DataPoint } from '@/types';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';

interface KPIUpdateFormProps {
    kpi: KPI;
    onUpdate: (updates: Partial<KPI>) => Promise<void>;
}

export default function KPIUpdateForm({ kpi, onUpdate }: KPIUpdateFormProps) {
    const [value, setValue] = useState(kpi.value.toString());
    const [trendValue, setTrendValue] = useState(kpi.trendValue?.toString() || '0');
    const [notes, setNotes] = useState(kpi.notes || '');
    const [dataPoints, setDataPoints] = useState<DataPoint[]>(kpi.dataPoints || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Sort data points by date
    useEffect(() => {
        if (kpi.dataPoints) {
            const sorted = [...kpi.dataPoints].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            setDataPoints(sorted);
        }
    }, [kpi]);

    const handleAddDataPoint = () => {
        const today = new Date().toISOString().split('T')[0];
        setDataPoints([
            ...dataPoints,
            {
                date: today,
                value: 0,
                color: kpi.chartSettings?.strokeColor || '#3b82f6'
            }
        ]);
    };

    const handleUpdateDataPoint = (index: number, field: 'date' | 'value', newValue: string) => {
        const updated = [...dataPoints];
        if (field === 'date') {
            updated[index].date = newValue;
        } else {
            updated[index].value = parseFloat(newValue) || 0;
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
            const finalValue = parseFloat(value) || 0;
            const finalTrend = parseFloat(trendValue) || 0;

            // Sort data points
            const sortedPoints = [...dataPoints].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            await onUpdate({
                value: finalValue,
                trendValue: finalTrend,
                notes: notes || undefined,
                dataPoints: sortedPoints,
                date: new Date().toISOString()
            });

            setSuccess(true);
        } catch (err) {
            setError('Failed to update KPI. Please try again.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Header Info */}
            <div className="bg-industrial-900/50 p-6 rounded-lg border border-industrial-800">
                <h2 className="text-2xl font-bold text-industrial-100 mb-1">{kpi.name}</h2>
                {kpi.subtitle && <p className="text-industrial-400">{kpi.subtitle}</p>}
                <div className="mt-4 flex items-center gap-2 text-sm text-industrial-500">
                    <span className="w-2 h-2 rounded-full bg-verdigris-500"></span>
                    Assigned to you
                </div>
            </div>

            {/* Main Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                    <label className="label">Current Value</label>
                    <input
                        type="number"
                        step="any"
                        className="input text-2xl font-mono"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label className="label">Trend %</label>
                    <input
                        type="number"
                        step="any"
                        className="input text-2xl font-mono"
                        value={trendValue}
                        onChange={(e) => setTrendValue(e.target.value)}
                    />
                </div>
            </div>

            {/* Notes */}
            <div className="form-group">
                <label className="label">Notes / Context</label>
                <textarea
                    className="input min-h-[100px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any context about this update..."
                />
            </div>

            {/* Data Points */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-industrial-200">Historical Data</h3>
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
                                <th className="px-4 py-3">Date / Label</th>
                                <th className="px-4 py-3">Value</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-800/50">
                            {dataPoints.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-industrial-500 italic">
                                        No data points yet. Add one to start tracking history.
                                    </td>
                                </tr>
                            ) : (
                                dataPoints.map((point, index) => (
                                    <tr key={index} className="hover:bg-industrial-800/30 transition-colors">
                                        <td className="px-4 py-2">
                                            <input
                                                type={kpi.visualizationType === 'chart' && kpi.chartType !== 'line' && kpi.chartType !== 'area' ? "text" : "date"}
                                                className="bg-transparent border-none focus:ring-0 text-industrial-200 w-full p-0"
                                                value={point.date}
                                                onChange={(e) => handleUpdateDataPoint(index, 'date', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                step="any"
                                                className="bg-transparent border-none focus:ring-0 text-industrial-200 w-full p-0 font-mono"
                                                value={point.value}
                                                onChange={(e) => handleUpdateDataPoint(index, 'value', e.target.value)}
                                            />
                                        </td>
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
                            Update KPI
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
