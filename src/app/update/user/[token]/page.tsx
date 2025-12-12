'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useScorecards } from '@/context/ScorecardContext';
import { Scorecard, KPI } from '@/types';
import { LayoutDashboard, AlertTriangle, CheckCircle2, Save, ArrowLeft, Trash2 } from 'lucide-react';
import { getChartDefinition, isMultiValueChartType } from '@/components/visualizations/chartConfig';
import ColorPicker from '@/components/ColorPicker';

type SankeyNode = { id: string; title: string; color?: string };
type SankeyLink = { source: string; target: string; value: number };
const sankeyPalette = ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'];
const chartPalette = ['#5094af', '#36c9b8', '#dea821', '#ee7411', '#e0451f'];

const parseSankeyValue = (value: Record<string, number | string>) => {
    const raw = value?.['0'] ?? Object.values(value || {})[0];
    let parsed: Record<string, unknown> = {};

    try {
        const candidate = typeof raw === 'string' ? JSON.parse(raw) : raw;
        parsed = typeof candidate === 'object' && candidate !== null ? (candidate as Record<string, unknown>) : {};
    } catch {
        parsed = {};
    }

    const nodesInput = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const linksInput = Array.isArray(parsed.links)
        ? parsed.links
        : Array.isArray(parsed.edges)
            ? parsed.edges
            : [];

    const nodesMap = new Map<string, SankeyNode>();
    nodesInput.forEach((node, idx) => {
        if (typeof node !== 'object' || node === null) return;
        const record = node as Record<string, unknown>;
        const id = typeof record.id === 'string' ? record.id : `node-${idx + 1}`;
        const title =
            typeof record.title === 'string' && record.title.trim() ? record.title : id;
        const color = typeof record.color === 'string' ? (record.color as string) : undefined;
        nodesMap.set(id, { id, title, color });
    });

    const links: SankeyLink[] = linksInput
        .map((link) => {
            if (typeof link !== 'object' || link === null) return null;
            const record = link as Record<string, unknown>;
            const source = typeof record.source === 'string' ? record.source : '';
            const target = typeof record.target === 'string' ? record.target : '';
            const value = Number(record.value);
            if (!source || !target || !Number.isFinite(value)) return null;
            return { source, target, value };
        })
        .filter(Boolean) as SankeyLink[];

    links.forEach((link) => {
        if (!nodesMap.has(link.source)) {
            nodesMap.set(link.source, { id: link.source, title: link.source });
        }
        if (!nodesMap.has(link.target)) {
            nodesMap.set(link.target, { id: link.target, title: link.target });
        }
    });

    const nodes = Array.from(nodesMap.values()).map((node, idx) => ({
        ...node,
        color: node.color || sankeyPalette[idx % sankeyPalette.length],
    }));

    return { nodes, links };
};

type MetricUpdateRowProps = {
    kpi: KPI;
    onUpdate: (updates: Partial<KPI>) => Promise<void>;
    registerSubmit?: (id: string, submitFn?: () => Promise<boolean>) => void;
    onDirtyChange?: (id: string, dirty: boolean) => void;
    fallbackToken?: string;
    rowIndex?: number;
};

function MetricUpdateRow({ kpi, onUpdate, registerSubmit, onDirtyChange, fallbackToken, rowIndex = 0 }: MetricUpdateRowProps) {
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
    const isSankey = kpi.visualizationType === 'sankey' || kpi.chartType === 'sankey';
    const isChart = kpi.visualizationType === 'chart';
    const chartDefinition = useMemo(
        () => getChartDefinition(kpi.chartType || 'line'),
        [kpi.chartType]
    );
    const isCategoryChart = isChart && isMultiValueChartType(kpi.chartType || 'line');
    type ValueEntry = { key: string; value: number | string; color?: string };

    const markDirty = useCallback(() => {
        setDirty(true);
        onDirtyChange?.(kpi.id, true);
    }, [kpi.id, onDirtyChange]);

    // Helper to normalize array values to single number
    const normalizeValue = (v: number | string | number[] | undefined): number | string => {
        if (Array.isArray(v)) return v[0] ?? 0;
        return v ?? 0;
    };

    const initialEntries: ValueEntry[] = useMemo(() => {
        if (isSankey) {
            return [];
        }
        if (isChart) {
            const metricSource = (kpi.metrics && kpi.metrics.length ? kpi.metrics : kpi.dataPoints) || [];
            const fromMetrics =
                metricSource.length > 0
                    ? [...metricSource]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((dp, idx) => ({
                            key: dp.date,
                            value: Array.isArray(dp.value) ? dp.value[0] ?? 0 : dp.value,
                            color: dp.color || chartPalette[idx % chartPalette.length],
                        }))
                    : [];

            const base: { key: string; value: number | string | number[]; color?: string }[] = fromMetrics.length
                ? fromMetrics
                : (historyPoints.length
                    ? historyPoints.map(({ date, value }, idx) => ({
                        key: date,
                        value,
                        color: chartPalette[idx % chartPalette.length],
                    }))
                    : Object.entries(kpi.value || {}).map(([key, val], idx) => ({
                        key,
                        value: val as number | string,
                        color: chartPalette[idx % chartPalette.length],
                    })));
            return base.map(dp => ({
                key: dp.key || 'Value',
                value: typeof dp.value === 'number'
                    ? dp.value
                    : Array.isArray(dp.value)
                        ? (dp.value[0] ?? 0)
                        : Number(dp.value) || 0,
                color: dp.color,
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
    }, [isChart, isSankey, historyPoints, kpi.value, kpi.visualizationType, latestPoint?.value]);

    const [entries, setEntries] = useState<ValueEntry[]>(initialEntries);
    const initialSankey = useMemo(() => parseSankeyValue(kpi.value), [kpi.value]);
    const [sankeyNodes, setSankeyNodes] = useState<SankeyNode[]>(initialSankey.nodes);
    const [sankeyLinks, setSankeyLinks] = useState<SankeyLink[]>(initialSankey.links);
    const [notes, setNotes] = useState(kpi.notes || '');
    const notesRef = useRef<HTMLTextAreaElement | null>(null);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [reverseTrend, setReverseTrend] = useState(kpi.reverseTrend ?? false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [dirty, setDirty] = useState(false);
    const subtitleFull = kpi.subtitle || '';
    const formattedUpdated = kpi.date
        ? `Updated ${new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(kpi.date))}`
        : 'Not updated yet';

    useEffect(() => {
        const el = notesRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
    }, [notes]);

    const rowBg = rowIndex % 2 === 0 ? 'bg-industrial-950' : 'bg-industrial-900/40';

    const updateEntry = (index: number, field: 'key' | 'value' | 'color', nextValue: string) => {
        markDirty();
        setEntries((prev) =>
            prev.map((entry, idx) => (idx === index ? { ...entry, [field]: nextValue } : entry))
        );
    };

    const addEntry = () => {
        const baseLabel = chartDefinition.defaultDimensionValue || 'Value';
        markDirty();
        setEntries((prev) => [
            ...prev,
            {
                key: `${baseLabel} ${prev.length + 1}`,
                value: 0,
                color: chartDefinition.requiresColor
                    ? chartPalette[prev.length % chartPalette.length]
                    : undefined,
            },
        ]);
    };

    const removeEntry = (index: number) => {
        markDirty();
        setEntries((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const addNode = () => {
        const nextIndex = sankeyNodes.length + 1;
        markDirty();
        setSankeyNodes((prev) => [
            ...prev,
            {
                id: `node-${nextIndex}`,
                title: `Node ${nextIndex}`,
                color: sankeyPalette[prev.length % sankeyPalette.length],
            },
        ]);
    };

    const updateNode = (id: string, field: 'title' | 'color', value: string) => {
        markDirty();
        setSankeyNodes((prev) =>
            prev.map((node) => (node.id === id ? { ...node, [field]: value } : node))
        );
    };

    const removeNode = (id: string) => {
        markDirty();
        setSankeyNodes((prev) => prev.filter((node) => node.id !== id));
        setSankeyLinks((prev) => prev.filter((link) => link.source !== id && link.target !== id));
    };

    const addLink = () => {
        const source = sankeyNodes[0]?.id || 'source';
        const target = sankeyNodes[1]?.id || source;
        markDirty();
        setSankeyLinks((prev) => [...prev, { source, target, value: 10 }]);
    };

    const updateLink = (index: number, field: 'source' | 'target' | 'value', value: string) => {
        markDirty();
        setSankeyLinks((prev) => {
            const next = [...prev];
            if (field === 'value') {
                next[index].value = Number(value) || 0;
            } else {
                next[index][field] = value;
            }
            return next;
        });
    };

    const removeLink = (index: number) => {
        markDirty();
        setSankeyLinks((prev) => prev.filter((_, idx) => idx !== index));
    };

    const buildUpdates = (): Partial<KPI> => {
        if (isSankey) {
            const nodesForSave = (sankeyNodes.length ? sankeyNodes : [{ id: 'node-1', title: 'Node 1' }]).map(
                (node, idx) => ({
                    id: node.id || `node-${idx + 1}`,
                    title: node.title || node.id || `Node ${idx + 1}`,
                    color: node.color || sankeyPalette[idx % sankeyPalette.length],
                })
            );
            const linksForSave = (sankeyLinks.length ? sankeyLinks : []).filter(
                (link) => link.source && link.target
            );

            return {
                value: { '0': JSON.stringify({ nodes: nodesForSave, links: linksForSave }) },
                notes: notes ?? '',
                date: new Date().toISOString(),
                sankeySettings: kpi.sankeySettings,
                dataPoints: [],
                metrics: [],
            };
        }

        if (isChart) {
            const valueRecord: Record<string, number> = {};
            const needsColor = chartDefinition.requiresColor;
            entries.forEach(e => {
                const num = typeof e.value === 'number' ? e.value : parseFloat(String(e.value)) || 0;
                valueRecord[e.key] = num;
            });
            const dataPoints = entries.map((e, idx) => {
                const num = typeof e.value === 'number' ? e.value : parseFloat(String(e.value)) || 0;
                const color = needsColor ? e.color || chartPalette[idx % chartPalette.length] : undefined;
                return {
                    date: e.key,
                    value: num,
                    ...(color ? { color } : {}),
                };
            });
            return {
                value: valueRecord,
                metrics: dataPoints,
                dataPoints,
                // Preserve clearing notes
                notes: notes ?? '',
                date: date ? new Date(date).toISOString() : new Date().toISOString(),
            };
        }

        if (kpi.visualizationType === 'text') {
            return {
                value: { '0': entries[0]?.value ?? '' },
                notes: notes ?? '',
                date: date ? new Date(date).toISOString() : new Date().toISOString(),
            };
        }

        const num = parseFloat(String(entries[0]?.value ?? 0));
        const safeNum = isNaN(num) ? 0 : num;

        return {
            value: { '0': safeNum },
            trendValue: safeNum,
            reverseTrend,
            // Allow blank notes to clear existing text
            notes: notes ?? '',
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
        };
    };

    const submit = useCallback(async (): Promise<boolean> => {
        const tokenToUse = kpi.updateToken || fallbackToken;
        if (!tokenToUse) {
            setError('Missing update token for this KPI.');
            return false;
        }
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await onUpdate(buildUpdates());
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
            setDirty(false);
            onDirtyChange?.(kpi.id, false);
            return true;
        } catch {
            setError('Failed to save update.');
            return false;
        } finally {
            setSaving(false);
        }
    }, [buildUpdates, kpi.id, onDirtyChange, kpi.updateToken, onUpdate]);

    useEffect(() => {
        registerSubmit?.(kpi.id, submit);
        onDirtyChange?.(kpi.id, dirty);
        return () => registerSubmit?.(kpi.id, undefined);
    }, [dirty, kpi.id, onDirtyChange, registerSubmit, submit]);

    const renderValueInputs = () => {
        if (isSankey) {
            return (
                <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1">
                    <div className="min-w-[320px] shrink-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-industrial-500">
                            <span>Nodes</span>
                            <button
                                type="button"
                                className="btn btn-secondary btn-ghost btn-sm px-2"
                                onClick={addNode}
                            >
                                + Node
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {sankeyNodes.length === 0 && (
                                <span className="text-xs text-industrial-600">Add at least two nodes.</span>
                            )}
                            {sankeyNodes.map((node, idx) => (
                                <div
                                    key={node.id}
                                    className="flex items-center gap-2 rounded-md border border-industrial-800 bg-industrial-900/40 px-2 py-1"
                                >
                                    <input
                                        type="text"
                                        className="input h-9 text-sm px-2 min-w-[120px]"
                                        value={node.title}
                                        onChange={(e) => updateNode(node.id, 'title', e.target.value)}
                                        placeholder={`Node ${idx + 1}`}
                                    />
                                    <ColorPicker
                                        value={node.color || sankeyPalette[idx % sankeyPalette.length]}
                                        onChange={(color) => updateNode(node.id, 'color', color)}
                                        align="right"
                                    />
                                    {sankeyNodes.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeNode(node.id)}
                                            className="btn btn-ghost btn-sm text-industrial-500 hover:text-red-400"
                                            title="Remove node"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="min-w-[360px] shrink-0 flex-[1.2] space-y-2">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-industrial-500">
                            <span>Links</span>
                            <button
                                type="button"
                                className="btn btn-secondary btn-ghost btn-sm px-2"
                                onClick={addLink}
                                disabled={sankeyNodes.length === 0}
                            >
                                + Link
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {sankeyLinks.length === 0 && (
                                <span className="text-xs text-industrial-600">Add flows by connecting nodes.</span>
                            )}
                            {sankeyLinks.map((link, idx) => (
                                <div
                                    key={idx}
                                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-md border border-industrial-800 bg-industrial-900/40 p-1"
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] uppercase tracking-wide text-industrial-500">Source</span>
                                        <select
                                            className="select h-9 text-xs p-1 w-full"
                                            value={link.source}
                                            onChange={(e) => updateLink(idx, 'source', e.target.value)}
                                        >
                                            <option value="">Select</option>
                                            {sankeyNodes.map((node) => (
                                                <option key={node.id} value={node.id}>
                                                    {node.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] uppercase tracking-wide text-industrial-500">Target</span>
                                        <select
                                            className="select h-9 text-xs p-1 w-full"
                                            value={link.target}
                                            onChange={(e) => updateLink(idx, 'target', e.target.value)}
                                        >
                                            <option value="">Select</option>
                                            {sankeyNodes.map((node) => (
                                                <option key={node.id} value={node.id}>
                                                    {node.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] uppercase tracking-wide text-industrial-500">Value</span>
                                        <input
                                            type="number"
                                            step="any"
                                            className="input h-9 text-xs p-1 w-full"
                                            value={link.value}
                                            onChange={(e) => updateLink(idx, 'value', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeLink(idx)}
                                        className="btn btn-ghost btn-sm text-industrial-500 hover:text-red-400"
                                        title="Remove link"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (isChart) {
            return (
                <div className="flex flex-wrap items-end gap-2">
                    {entries.map((entry, idx) => (
                        <div
                            key={idx}
                            className="flex items-end gap-2 rounded-md border border-industrial-800 bg-industrial-900/40 px-3 py-2"
                        >
                            <div className="flex flex-col min-w-[140px]">
                                <span className="text-[10px] uppercase tracking-wide text-industrial-500">
                                    {chartDefinition.dimensionLabel}
                                </span>
                                <input
                                    type="text"
                                    className="input h-10 text-sm px-3"
                                    value={entry.key}
                                    onChange={(e) => updateEntry(idx, 'key', e.target.value)}
                                    placeholder={chartDefinition.defaultDimensionValue}
                                />
                            </div>
                            <div className="flex flex-col min-w-[120px]">
                                <span className="text-[10px] uppercase tracking-wide text-industrial-500">
                                    {chartDefinition.valueLabel}
                                </span>
                                <input
                                    type="number"
                                    step="any"
                                    className="input h-10 text-sm font-mono px-3"
                                    value={entry.value}
                                    onChange={(e) => updateEntry(idx, 'value', e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            {chartDefinition.requiresColor && (
                                <div className="flex flex-col min-w-[110px]">
                                    <span className="text-[10px] uppercase tracking-wide text-industrial-500">
                                        Color
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <ColorPicker
                                            value={entry.color || chartPalette[idx % chartPalette.length]}
                                            onChange={(color) => updateEntry(idx, 'color', color)}
                                            align="right"
                                        />
                                        <input
                                            type="text"
                                            className="input h-9 text-sm font-mono px-2"
                                            value={entry.color || ''}
                                            onChange={(e) => updateEntry(idx, 'color', e.target.value)}
                                            placeholder="#RRGGBB"
                                        />
                                    </div>
                                </div>
                            )}
                            {entries.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeEntry(idx)}
                                    className="btn btn-ghost btn-sm text-industrial-500 hover:text-red-400"
                                    title="Remove value"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addEntry}
                        className="btn btn-secondary btn-sm h-10 px-3"
                        title={isCategoryChart ? 'Add another segment' : 'Add another point'}
                    >
                        + Value
                    </button>
                </div>
            );
        }

        if (kpi.visualizationType === 'text') {
            return (
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[240px]">
                        <span className="text-[10px] uppercase tracking-wide text-industrial-500">Text</span>
                        <input
                            type="text"
                            className="input h-10 text-sm"
                            value={entries[0]?.value ?? ''}
                            onChange={(e) => updateEntry(0, 'value', e.target.value)}
                            placeholder="Enter text value"
                        />
                    </div>
                    <div className="w-[150px]">
                        <span className="text-[10px] uppercase tracking-wide text-industrial-500">Date</span>
                        <input
                            type="date"
                            className="input h-10 text-sm"
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                markDirty();
                            }}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col min-w-[140px]">
                    <span className="text-[10px] uppercase tracking-wide text-industrial-500">
                        {chartDefinition.valueLabel || 'Value'}
                    </span>
                    <input
                        type="number"
                        step="any"
                        className="input h-10 text-sm font-mono"
                        value={entries[0]?.value ?? 0}
                        onChange={(e) => updateEntry(0, 'value', e.target.value)}
                        placeholder="0"
                    />
                </div>
                <div className="flex flex-col w-[150px]">
                    <span className="text-[10px] uppercase tracking-wide text-industrial-500">Date</span>
                    <input
                        type="date"
                        className="input h-10 text-sm"
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            markDirty();
                        }}
                    />
                </div>
                <label className="flex items-center gap-2 text-xs text-industrial-400 whitespace-nowrap">
                    <input
                        type="checkbox"
                        className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                        checked={reverseTrend}
                        onChange={(e) => {
                            setReverseTrend(e.target.checked);
                            markDirty();
                        }}
                    />
                    <span>Down trend is positive</span>
                </label>
            </div>
        );
    };

    const renderNotes = () => (
        <div className="flex flex-col gap-2 h-full">
            <textarea
                ref={notesRef}
                className="input w-full min-h-[120px] resize-none text-sm"
                rows={3}
                value={notes}
                onChange={(e) => {
                    setNotes(e.target.value);
                    markDirty();
                }}
                placeholder="Context or follow-ups"
            />
        </div>
    );

    return (
        <React.Fragment key={kpi.id}>
            {/* Line 1: compact metadata bar and save action */}
            <tr className={`align-top border-t border-industrial-850/60 ${rowBg}`}>
                <td className="px-4 py-2" colSpan={3}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-industrial-100 truncate">{kpi.name}</span>
                        {subtitleFull && (
                            <span
                                className="text-sm text-industrial-500 truncate max-w-[240px] whitespace-nowrap"
                                title={subtitleFull}
                            >
                                {subtitleFull}
                            </span>
                        )}
                        {subtitleFull && <span className="text-industrial-700">·</span>}
                        <span className="text-xs text-industrial-500 whitespace-nowrap">{formattedUpdated}</span>
                    </div>
                </td>
                <td className="px-4 py-2 text-right align-middle">
                    <div className="flex items-center justify-end gap-3">
                        {error && (
                            <span className="text-[11px] text-red-400 flex items-center gap-1 whitespace-nowrap max-w-[140px] truncate">
                                <AlertTriangle size={12} />
                                {error}
                            </span>
                        )}
                        {!error && success && (
                            <span className="text-[11px] text-verdigris-400 flex items-center gap-1 whitespace-nowrap max-w-[120px] truncate">
                                <CheckCircle2 size={12} />
                                Saved
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={submit}
                            disabled={saving}
                            className={`btn btn-secondary btn-sm flex items-center gap-2 ${dirty ? 'bg-verdigris-600 hover:bg-verdigris-500 text-industrial-950' : ''}`}
                        >
                            {saving ? 'Saving...' : (
                                <>
                                    <Save size={14} />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                </td>
            </tr>
            {/* Line 2: chart-type-aware inputs plus compact notes rail */}
            <tr className={`border-b border-industrial-850/60 align-top ${rowBg}`}>
                <td className="px-4 pb-3 pt-0 h-full" colSpan={2}>
                    {renderValueInputs()}
                </td>
                <td className="px-4 pb-3 pt-0 align-top h-full" colSpan={2}>
                    {renderNotes()}
                </td>
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
    const submittersRef = useRef<Map<string, () => Promise<boolean>>>(new Map());
    const [savingAll, setSavingAll] = useState(false);
    const [saveAllStatus, setSaveAllStatus] = useState<'success' | 'error' | null>(null);
    const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});

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

    const registerSubmit = useCallback((id: string, submitFn?: () => Promise<boolean>) => {
        const map = submittersRef.current;
        if (submitFn) {
            map.set(id, submitFn);
        } else {
            map.delete(id);
        }
    }, []);

    const handleDirtyChange = useCallback((id: string, isDirty: boolean) => {
        setDirtyMap((prev) => {
            if (prev[id] === isDirty) return prev;
            return { ...prev, [id]: isDirty };
        });
    }, []);

    const hasDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

    const handleSaveAll = useCallback(async () => {
        if (savingAll) return;
        const submitters = Array.from(submittersRef.current.values());
        if (!submitters.length) return;
        setSavingAll(true);
        setSaveAllStatus(null);

        let failed = false;
        for (const submit of submitters) {
            const ok = await submit();
            if (!ok) failed = true;
        }

        setSaveAllStatus(failed ? 'error' : 'success');
        setSavingAll(false);
        setTimeout(() => setSaveAllStatus(null), 2500);
    }, [savingAll]);

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
                    <div className="flex flex-1 justify-end items-center gap-4 text-right">
                        <div className="text-right">
                            <div className="text-xs font-mono text-industrial-400">{assigneeEmail}</div>
                            <div className="text-[11px] text-industrial-500">
                                {kpis.length} metric{kpis.length !== 1 ? 's' : ''} assigned
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {saveAllStatus === 'success' && (
                                <span className="text-[11px] text-verdigris-400 whitespace-nowrap">All saved</span>
                            )}
                            {saveAllStatus === 'error' && (
                                <span className="text-[11px] text-red-400 whitespace-nowrap">Some saves failed</span>
                            )}
                            <button
                                type="button"
                                onClick={handleSaveAll}
                                disabled={savingAll}
                                className={`btn btn-secondary btn-sm flex items-center gap-2 ${hasDirty ? 'bg-verdigris-600 hover:bg-verdigris-500 text-industrial-950' : ''}`}
                            >
                                {savingAll ? (
                                    'Saving…'
                                ) : (
                                    <>
                                        <Save size={14} />
                                        Save All
                                    </>
                                )}
                            </button>
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
                                <col className="w-[38%]" />
                                <col className="w-[34%]" />
                                <col className="w-[20%]" />
                                <col className="w-[8%]" />
                            </colgroup>
                            <thead className="bg-industrial-900/70 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-2 text-left"></th>
                                    <th className="px-4 py-2 text-left"></th>
                                    <th className="px-4 py-2 text-left"></th>
                                    <th className="px-4 py-2 text-left"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-industrial-950">
                                {kpis.map((kpi, idx) => (
                                    <MetricUpdateRow
                                        key={kpi.id}
                                        kpi={kpi}
                                        onUpdate={async (updates) => {
                                            const tokenToUse = kpi.updateToken || token;
                            if (tokenToUse) {
                                await updateKPIByToken(tokenToUse, updates, assigneeEmail, kpi.id);
                            } else {
                                console.error('KPI missing update token');
                            }
                        }}
                                        registerSubmit={registerSubmit}
                                        onDirtyChange={handleDirtyChange}
                                        fallbackToken={token}
                                        rowIndex={idx}
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
