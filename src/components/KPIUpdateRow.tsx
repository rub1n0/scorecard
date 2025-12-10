'use client';

import React, { useMemo, useState } from 'react';
import { KPI } from '@/types';
import { Save } from 'lucide-react';

type KPIUpdateRowProps = {
    kpi: KPI;
    onUpdate: (updates: Partial<KPI>) => Promise<void>;
};

type ValueEntry = { key: string; value: number | string };

export default function KPIUpdateRow({ kpi, onUpdate }: KPIUpdateRowProps) {
    const isChart = kpi.visualizationType === 'chart';

    // Helper to normalize array values to single number
    const normalizeValue = (v: number | string | number[] | undefined): number | string => {
        if (Array.isArray(v)) return v[0] ?? 0;
        return v ?? 0;
    };

    const historyPoints = useMemo(() => {
        const fromMetrics = (kpi.metrics || kpi.dataPoints || []).map(dp => ({
            key: dp.date,
            value: normalizeValue(dp.value),
        }));

        if (fromMetrics.length > 0) {
            return fromMetrics.sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime());
        }

        const fromValue = Object.entries(kpi.value || {}).map(([key, val]) => ({
            key,
            value: val as number | string,
        }));

        return fromValue.sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime());
    }, [kpi.metrics, kpi.dataPoints, kpi.value]);

    const latestPoint = historyPoints[0];

    const initialEntries: ValueEntry[] = useMemo(() => {
        if (isChart) {
            const base = historyPoints.length
                ? historyPoints
                : Object.entries(kpi.value || {}).map(([key, val]) => ({ key, value: val as number | string }));
            return base.map(dp => ({
                key: dp.key || 'Value',
                value: typeof dp.value === 'number' ? dp.value : Number(dp.value) || 0
            }));
        }
        if (kpi.visualizationType === 'text') {
            const entry = Object.values(kpi.value || {})[0];
            return [{ key: '0', value: typeof entry === 'string' ? entry : '' }];
        }
        const numeric = kpi.value?.['0'];
        const firstVal = typeof numeric === 'number'
            ? numeric
            : (typeof latestPoint?.value === 'number'
                ? latestPoint.value
                : Object.values(kpi.value || {}).find(v => typeof v === 'number') ?? 0);
        return [{ key: '0', value: firstVal }];
    }, [isChart, historyPoints, kpi.value, kpi.visualizationType, latestPoint?.value]);

    const [entries, setEntries] = useState<ValueEntry[]>(initialEntries);
    const [notes, setNotes] = useState(kpi.notes || '');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const buildUpdates = (): Partial<KPI> => {
        if (isChart) {
            const valueRecord: Record<string, number> = {};
            entries.forEach(e => {
                const num = typeof e.value === 'number' ? e.value : parseFloat(String(e.value)) || 0;
                valueRecord[e.key] = num;
            });
            const dataPoints = entries.map(e => ({
                date: e.key,
                value: typeof e.value === 'number' ? e.value : parseFloat(String(e.value)) || 0
            }));
            return {
                value: valueRecord,
                metrics: dataPoints,
                dataPoints,
                notes: notes || undefined,
                date: date ? new Date(date).toISOString() : new Date().toISOString(),
            };
        }

        if (kpi.visualizationType === 'text') {
            return {
                value: { '0': entries[0]?.value ?? '' },
                notes: notes || undefined,
                date: date ? new Date(date).toISOString() : new Date().toISOString(),
            };
        }

        const num = parseFloat(String(entries[0]?.value ?? 0));
        const safeNum = isNaN(num) ? 0 : num;

        return {
            value: { '0': safeNum },
            trendValue: safeNum,
            notes: notes || undefined,
            metrics: [{ date: date ? new Date(date).toISOString() : new Date().toISOString(), value: safeNum }],
            dataPoints: [{ date: date ? new Date(date).toISOString() : new Date().toISOString(), value: safeNum }],
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
        };
    };

    const submit = async () => {
        if (!kpi.updateToken) {
            setError('Missing update token for this KPI.');
            return;
        }
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await onUpdate(buildUpdates());
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch {
            setError('Failed to save update.');
        } finally {
            setSaving(false);
        }
    };

    const subtitleText = kpi.subtitle || '—';
    const truncatedSubtitle = subtitleText.length > 25 ? `${subtitleText.slice(0, 25)}...` : subtitleText;

    return (
        <tr className="align-top">
            <td className="px-3 py-2">
                <div className="font-semibold text-industrial-100">{kpi.name}</div>
            </td>
            <td className="px-3 py-2">
                <div
                    className="text-xs text-industrial-500 whitespace-nowrap overflow-hidden text-ellipsis w-[160px]"
                    title={subtitleText}
                >
                    {truncatedSubtitle}
                </div>
            </td>
            <td className="px-3 py-2">
                <div className="text-xs text-industrial-300">{kpi.date ? new Date(kpi.date).toLocaleString() : '—'}</div>
            </td>
            <td className="px-4 py-3">
                <div className="space-y-2">
                    {isChart ? (
                        <div className="space-y-2">
                            {entries.map((entry, idx) => (
                                <div key={entry.key || idx} className="flex items-center gap-2">
                                    <span className="text-[11px] text-industrial-500 w-24 truncate">{entry.key}</span>
                                    <input
                                        type="number"
                                        step="any"
                                        className="input w-full font-mono"
                                        value={entry.value}
                                        onChange={(e) => {
                                            const next = [...entries];
                                            next[idx] = { ...entry, value: e.target.value };
                                            setEntries(next);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : kpi.visualizationType === 'text' ? (
                        <textarea
                            className="input w-full min-h-[70px]"
                            value={entries[0]?.value as string}
                            onChange={(e) => setEntries([{ ...entries[0], value: e.target.value }])}
                            placeholder="Enter text"
                        />
                    ) : (
                        <input
                            type="number"
                            step="any"
                            className="input w-full font-mono"
                            value={entries[0]?.value as number | string}
                            onChange={(e) => setEntries([{ ...entries[0], value: e.target.value }])}
                            placeholder="Enter value"
                        />
                    )}
                    {!isChart && (
                        <input
                            type="date"
                            className="input w-full"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    )}
                </div>
            </td>
            <td className="px-4 py-3">
                <textarea
                    className="input w-full min-h-[70px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes"
                />
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-col gap-2 items-stretch">
                    <button
                        type="button"
                        onClick={submit}
                        disabled={saving}
                        className="btn btn-primary btn-sm flex items-center justify-center gap-2"
                    >
                        {saving ? 'Saving...' : (
                            <>
                                <Save size={14} />
                                Save
                            </>
                        )}
                    </button>
                    {error && <div className="text-[10px] text-red-400">{error}</div>}
                    {success && <div className="text-[10px] text-verdigris-400">Saved</div>}
                </div>
            </td>
        </tr>
    );
}
