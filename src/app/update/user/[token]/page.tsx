'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useScorecards } from '@/context/ScorecardContext';
import { Scorecard, KPI } from '@/types';
import { LayoutDashboard, AlertTriangle, CheckCircle2, Save, ArrowLeft } from 'lucide-react';

type MetricUpdateRowProps = {
    kpi: KPI;
    onUpdate: (updates: Partial<KPI>) => Promise<void>;
};

function MetricUpdateRow({ kpi, onUpdate }: MetricUpdateRowProps) {
    const historyPoints = useMemo(() => {
        const fromDataPoints = (kpi.metrics || kpi.dataPoints || []).map(dp => ({
            date: dp.date,
            value: dp.value,
        }));

        if (fromDataPoints.length > 0) {
            return fromDataPoints.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        // Fallback: derive from value record if dataPoints are missing
        const fromValue = Object.entries(kpi.value || {}).map(([key, val]) => ({
            date: key,
            value: val as number | string,
        }));

        return fromValue.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [kpi.metrics, kpi.dataPoints, kpi.value]);

    const latestPoint = historyPoints[0];

    const isChart = kpi.visualizationType === 'chart';
    type ValueEntry = { key: string; value: number | string };

    // Helper to normalize array values to single number
    const normalizeValue = (v: number | string | number[] | undefined): number | string => {
        if (Array.isArray(v)) return v[0] ?? 0;
        return v ?? 0;
    };

    const initialEntries: ValueEntry[] = useMemo(() => {
        if (isChart) {
            const base: { key: string; value: number | string | number[] }[] = historyPoints.length
                ? historyPoints.map(({ date, value }) => ({ key: date, value }))
                : Object.entries(kpi.value || {}).map(([key, val]) => ({ key, value: val as number | string }));
            return base.map(dp => ({
                key: dp.key || 'Value',
                value: typeof dp.value === 'number'
                    ? dp.value
                    : Array.isArray(dp.value)
                        ? (dp.value[0] ?? 0)
                        : Number(dp.value) || 0
            }));
        }
        if (kpi.visualizationType === 'text') {
            const entry = Object.values(kpi.value || {})[0];
            return [{ key: '0', value: typeof entry === 'string' ? entry : '' }];
        }
        const numeric = kpi.value?.['0'];
        const firstVal = typeof numeric === 'number'
            ? numeric
            : normalizeValue(latestPoint?.value ?? Object.values(kpi.value || {}).find(v => typeof v === 'number') ?? 0);
        return [{ key: '0', value: firstVal }];
    }, [isChart, historyPoints, kpi.value, kpi.visualizationType, latestPoint?.value]);

    const [entries, setEntries] = useState<ValueEntry[]>(initialEntries);
    const [notes, setNotes] = useState(kpi.notes || '');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const subtitleFull = kpi.subtitle || '—';
    const subtitle = subtitleFull.length > 25 ? `${subtitleFull.slice(0, 25)}...` : subtitleFull;

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

    return (
        <React.Fragment key={kpi.id}>
            <tr className="align-top border-t border-industrial-800/60">
                <td className="px-4 py-3">
                    <div className="font-semibold text-industrial-100">{kpi.name}</div>
                </td>
            <td className="px-4 py-3">
                <div
                    className="text-xs text-industrial-500 whitespace-nowrap overflow-hidden text-ellipsis w-[160px]"
                    title={subtitleFull}
                >
                    {subtitle}
                </div>
            </td>
                <td className="px-4 py-3">
                    <div className="text-xs text-industrial-300">{kpi.date ? new Date(kpi.date).toLocaleString() : '—'}</div>
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3">
                    <div className="flex flex-col gap-2 items-stretch">
                        <button
                            type="button"
                            onClick={submit}
                            disabled={saving}
                            className="btn btn-secondary btn-sm flex items-center justify-center gap-2"
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
            <tr>
                <td colSpan={3} className="px-4 py-3" />
                <td className="px-4 py-3 w-[320px]">
                    <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                            <p className="text-[11px] uppercase tracking-wider text-industrial-400 font-semibold">Values</p>
                            {isChart && (
                                <span className="text-[11px] text-verdigris-400 font-mono tracking-wide">multi-value</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            {(isChart ? entries : entries.slice(0, 1)).map((entry, idx) => (
                                <div
                                    key={entry.key || idx}
                                    className="grid grid-cols-[140px_1fr] gap-3 items-center"
                                >
                                    <span className="text-[11px] text-industrial-500">{entry.key || `Value ${idx + 1}`}</span>
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
                            {!isChart && (
                                <>
                                    <input
                                        type="date"
                                        className="input w-full"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                    <p className="text-[10px] text-industrial-500">Adjust the date if this value is for a different day.</p>
                                </>
                            )}
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3 w-[320px]">
                    <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider text-industrial-400 font-semibold">Notes</p>
                        <textarea
                            className="input w-full min-h-[70px]"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes"
                        />
                    </div>
                </td>
                <td className="px-4 py-3" />
            </tr>
        </React.Fragment>
    );
}

export default function AssigneeUpdatePage() {
    const router = useRouter();
    const params = useParams();
    const token = params.token as string;
    const {
        getKPIsByAssigneeToken,
        getKPIByToken,
        updateKPIByToken,
        refreshScorecards,
        loading: contextLoading
    } = useScorecards();
    const refreshAttempted = React.useRef(false);

    const data = useMemo<{ scorecard: Scorecard; kpis: KPI[]; assigneeEmail: string } | null>(() => {
        if (contextLoading || !token) return null;
        const byAssignee = getKPIsByAssigneeToken(token);
        if (byAssignee) return byAssignee;

        const kpiMatch = getKPIByToken(token);
        if (kpiMatch) {
            const email = kpiMatch.kpi.assignee || kpiMatch.kpi.assignees?.[0] || 'Assignee';
            return { scorecard: kpiMatch.scorecard, kpis: [kpiMatch.kpi], assigneeEmail: email };
        }
        return null;
    }, [contextLoading, getKPIsByAssigneeToken, getKPIByToken, token]);

    useEffect(() => {
        if (!contextLoading && !data && !refreshAttempted.current) {
            refreshAttempted.current = true;
            refreshScorecards();
        }
    }, [contextLoading, data, refreshScorecards]);

    const loading = contextLoading;
    const error = !contextLoading && token && !data ? 'Invalid or expired assignment token.' : '';

    if (loading) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-industrial-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-industrial-900 border border-red-900/40 rounded-lg p-6 text-center shadow-lg shadow-red-900/10">
                    <div className="mx-auto w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-3">
                        <AlertTriangle size={24} className="text-red-500" />
                    </div>
                    <h1 className="text-lg font-bold text-red-500 mb-1">Access Denied</h1>
                    <p className="text-industrial-400 text-sm">{error || 'Unable to load assignment data.'}</p>
                </div>
            </div>
        );
    }

    const { scorecard, kpis, assigneeEmail } = data;

    return (
        <div className="min-h-screen bg-industrial-950 pb-10">
            {/* Header */}
            <header className="border-b border-industrial-800 bg-industrial-900/60 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="btn btn-ghost btn-sm flex items-center gap-2"
                        >
                            <ArrowLeft size={14} />
                            Scorecard Manager
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-industrial-850 rounded border border-industrial-700">
                                <LayoutDashboard size={18} className="text-industrial-100" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-industrial-100 leading-tight">{scorecard.name}</div>
                                <div className="text-[11px] text-industrial-500 font-mono uppercase tracking-wider">Update Portal</div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-mono text-industrial-400">{assigneeEmail}</div>
                        <div className="text-[11px] text-industrial-500">
                            {kpis.length} metric{kpis.length !== 1 ? 's' : ''} assigned
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-5 py-6 space-y-4">
                <div className="border border-industrial-800 rounded-lg overflow-hidden bg-industrial-900/40">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm table-fixed">
                            <colgroup>
                                <col className="w-[14%]" />
                                <col className="w-[16%]" />
                                <col className="w-[14%]" />
                                <col className="w-[20%]" />
                                <col className="w-[24%]" />
                                <col className="w-[12%]" />
                            </colgroup>
                            <thead className="bg-industrial-900/70 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">KPI</th>
                                    <th className="px-4 py-3 text-left">Subtitle</th>
                                    <th className="px-4 py-3 text-left">Last Updated</th>
                                    <th className="px-4 py-3 text-left">Value</th>
                                    <th className="px-4 py-3 text-left">Notes</th>
                                    <th className="px-4 py-3 text-left">Save</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {kpis.map(kpi => (
                                    <MetricUpdateRow
                                        key={kpi.id}
                                        kpi={kpi}
                                        onUpdate={async (updates) => {
                                            if (kpi.updateToken) {
                                                await updateKPIByToken(kpi.updateToken, updates, assigneeEmail);
                                            } else {
                                                console.error('KPI missing update token');
                                            }
                                        }}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {kpis.length === 0 && (
                    <div className="text-center py-10 border border-industrial-800 bg-industrial-900/30 rounded-lg">
                        <CheckCircle2 size={36} className="mx-auto text-industrial-700 mb-2" />
                        <h3 className="text-lg font-medium text-industrial-300">All caught up</h3>
                        <p className="text-industrial-500 text-sm">You have no metrics assigned to update.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
