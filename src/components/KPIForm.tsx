'use client';

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { KPI, VisualizationType, ChartType, DataPoint, Section } from '@/types';
import Modal from './Modal';
import ColorPicker from './ColorPicker';
import { chartTypeConfig, getChartDefinition } from './visualizations/chartConfig';
import { validateVisualizationData } from '@/utils/chartValidation';
import { Plus, Trash2 } from 'lucide-react';

type VisualizationSelection = 'number_trend' | 'text' | 'chart';

type SankeyNode = { id: string; label: string; color?: string };
type SankeyLink = { source: string; target: string; value: number };

interface KPIFormProps {
    kpi?: KPI;
    sections?: Section[];
    onSave: (kpi: Omit<KPI, 'id'>) => void | Promise<void>;
    onCancel: () => void;
}

const standardPalette = ['#5094af', '#36c9b8', '#dea821', '#ee7411', '#e0451f'];
const sankeyPalette = ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'];
const colorChartTypes: ChartType[] = ['bar', 'pie', 'donut', 'radialBar'];

const today = () => new Date().toISOString().split('T')[0];
const asRecord = (input: unknown): Record<string, unknown> | null =>
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : null;

const normalizeTextValue = (kpi?: KPI) => {
    if (kpi?.visualizationType !== 'text') return '';
    const raw =
        (kpi.value && (kpi.value as Record<string, unknown>)['0']) ??
        Object.values(kpi?.value || {})[0];
    if (typeof raw === 'string') return raw;
    if (raw === undefined || raw === null) return '';
    return String(raw);
};

const hydrateDataPoints = (kpi?: KPI): DataPoint[] => {
    if (!kpi) return [];
    if (kpi.dataPoints && kpi.dataPoints.length > 0) {
        // Expand labeledValues rows (stored as a single metric) into individual entries for editing
        const expanded: DataPoint[] = [];
        kpi.dataPoints.forEach((dp) => {
            if (dp.labeledValues && dp.labeledValues.length > 0) {
                dp.labeledValues.forEach((lv) => {
                    expanded.push({
                        date: lv.label || dp.date,
                        value: lv.value,
                        color: lv.color || dp.color,
                    });
                });
            } else {
                expanded.push({ ...dp });
            }
        });
        return expanded;
    }
    const entries = Object.entries(kpi.value || {});
    if (entries.length === 0) return [];
    const fallbackDate = kpi.date ? new Date(kpi.date).toISOString().split('T')[0] : today();
    return entries.map(([key, val]) => ({
        date: key === '0' ? fallbackDate : key,
        value: typeof val === 'number' ? val : parseFloat(String(val)) || 0,
    }));
};

const getSankeySettingsFromValue = (kpi?: KPI) => {
    try {
        const raw = (kpi?.value as Record<string, unknown>)?.['__sankeySettings'];
        if (typeof raw === 'string') {
            return JSON.parse(raw) as { showLegend?: boolean; showLabels?: boolean };
        }
    } catch {
        // ignore
    }
    return {};
};

const parseSankeyFromValue = (kpi?: KPI) => {
    let raw: unknown = {};
    if (kpi) {
        raw = (kpi.value ?? {})['0'] ?? Object.values(kpi.value || {})[0] ?? {};
    }
    try {
        raw = typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};
    } catch {
        raw = {};
    }
    const payloadRecord = asRecord(raw) || {};

    const nodeMap = new Map<string, SankeyNode>();
    const baseNodes = Array.isArray(payloadRecord.nodes) ? payloadRecord.nodes : [];
    baseNodes.forEach((node, idx) => {
        const nodeRecord = asRecord(node);
        if (!nodeRecord) return;
        const id = typeof nodeRecord.id === 'string' ? nodeRecord.id : `node-${idx + 1}`;
        const title =
            typeof nodeRecord.title === 'string' && nodeRecord.title.trim()
                ? nodeRecord.title
                : id;
        const color = typeof nodeRecord.color === 'string' ? nodeRecord.color : undefined;
        nodeMap.set(id, { id, label: title, color });
    });

    const rawLinks = Array.isArray(payloadRecord.links)
        ? payloadRecord.links
        : Array.isArray(payloadRecord.edges)
            ? payloadRecord.edges
            : [];

    const links: SankeyLink[] = rawLinks
        .map((link) => {
            const linkRecord = asRecord(link);
            if (!linkRecord) return null;
            const source = typeof linkRecord.source === 'string' ? linkRecord.source : '';
            const target = typeof linkRecord.target === 'string' ? linkRecord.target : '';
            const value = Number(linkRecord.value);
            if (!source || !target || !Number.isFinite(value)) return null;
            return { source, target, value };
        })
        .filter((link): link is SankeyLink => Boolean(link));

    links.forEach((link) => {
        if (!nodeMap.has(link.source)) {
            nodeMap.set(link.source, { id: link.source, label: link.source });
        }
        if (!nodeMap.has(link.target)) {
            nodeMap.set(link.target, { id: link.target, label: link.target });
        }
    });

    const nodes = Array.from(nodeMap.values()).map((node, idx) => ({
        ...node,
        color: node.color || sankeyPalette[idx % sankeyPalette.length],
    }));

    return { nodes, links };
};

const sortDataPoints = (points: DataPoint[]) =>
    [...points].sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
            return aTime - bTime;
        }
        return (a.date || '').localeCompare(b.date || '');
    });

const toNumber = (value: string | number) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export default function KPIForm({ kpi, sections = [], onSave, onCancel }: KPIFormProps) {
    const initialSelection: VisualizationSelection = kpi
        ? kpi.visualizationType === 'text'
            ? 'text'
            : kpi.visualizationType === 'chart' || kpi.visualizationType === 'sankey'
                ? 'chart'
                : 'number_trend'
        : 'number_trend';

    const initialChartType: ChartType =
        (kpi?.chartType as ChartType) ||
        (kpi?.visualizationType === 'sankey' ? 'sankey' : 'line');

    const parsedSankey = useMemo(() => parseSankeyFromValue(kpi), [kpi]);
    const sankeySettingsFromValue = useMemo(() => getSankeySettingsFromValue(kpi), [kpi]);

    const [kpiName, setKpiName] = useState(kpi?.kpiName ?? kpi?.name ?? '');
    const [subtitle, setSubtitle] = useState(kpi?.subtitle ?? '');
    const [sectionId, setSectionId] = useState<string>(kpi?.sectionId || '');
    const [visible, setVisible] = useState(kpi?.visible !== false);
    const [prefix, setPrefix] = useState(kpi?.prefix ?? '');
    const [suffix, setSuffix] = useState(kpi?.suffix ?? '');
    const [prefixOpacity, setPrefixOpacity] = useState(kpi?.prefixOpacity ?? 0.5);
    const [suffixOpacity, setSuffixOpacity] = useState(kpi?.suffixOpacity ?? 0.5);
    const [lastUpdated, setLastUpdated] = useState(
        kpi?.date ? new Date(kpi.date).toISOString().split('T')[0] : today()
    );
    const [notes, setNotes] = useState(kpi?.notes ?? '');
    const [textValue, setTextValue] = useState(normalizeTextValue(kpi));
    const [visualizationSelection, setVisualizationSelection] =
        useState<VisualizationSelection>(initialSelection);
    const [chartType, setChartType] = useState<ChartType>(initialChartType);
    const [reverseTrend, setReverseTrend] = useState(kpi?.reverseTrend ?? false);
    const [targetValue, setTargetValue] = useState<string>(
        kpi?.targetValue !== undefined && kpi?.targetValue !== null ? String(kpi.targetValue) : ''
    );
    const [targetColor, setTargetColor] = useState<string>(kpi?.targetColor || standardPalette[0]);

    const [strokeWidth, setStrokeWidth] = useState(
        kpi?.chartSettings?.strokeWidth ?? kpi?.strokeWidth ?? 2
    );
    const [strokeOpacity, setStrokeOpacity] = useState(
        kpi?.chartSettings?.strokeOpacity ?? kpi?.strokeOpacity ?? 1
    );
    const [strokeColor, setStrokeColor] = useState(() => {
        const raw = kpi?.chartSettings?.strokeColor ?? kpi?.strokeColor;
        if (Array.isArray(raw)) return raw[0] ?? standardPalette[0];
        if (typeof raw === 'string' && raw.trim()) return raw;
        return standardPalette[0];
    });
    const [secondaryStrokeColor, setSecondaryStrokeColor] = useState(() => {
        const raw = kpi?.chartSettings?.strokeColor;
        if (Array.isArray(raw)) return raw[1] ?? standardPalette[1];
        return standardPalette[1];
    });
    const [primaryLabel, setPrimaryLabel] = useState(() => {
        const current = (kpi?.chartSettings as { primaryLabel?: string } | undefined)?.primaryLabel;
        return current || 'Value 1';
    });
    const [secondaryLabel, setSecondaryLabel] = useState(() => {
        const current = (kpi?.chartSettings as { secondaryLabel?: string } | undefined)?.secondaryLabel;
        return current || 'Value 2';
    });
    const [fillOpacity, setFillOpacity] = useState(kpi?.chartSettings?.fillOpacity ?? 0.8);
    const [showLegend, setShowLegend] = useState(kpi?.chartSettings?.showLegend ?? true);
    const [showGridlines, setShowGridlines] = useState(
        kpi?.chartSettings?.showGridLines ?? true
    );
    const [showDataLabels, setShowDataLabels] = useState(
        kpi?.chartSettings?.showDataLabels ?? false
    );
    const [syncAxisScales, setSyncAxisScales] = useState(
        kpi?.chartSettings?.syncAxisScales ?? false
    );

    const [dataPoints, setDataPoints] = useState<DataPoint[]>(() => {
        const basePoints = hydrateDataPoints(kpi);
        if (colorChartTypes.includes(initialChartType)) {
            return basePoints.map((dp, idx) => ({
                ...dp,
                color: dp.color || standardPalette[idx % standardPalette.length],
            }));
        }
        return basePoints;
    });
    const [metricDate, setMetricDate] = useState(() => lastUpdated);
    const [metricLabel, setMetricLabel] = useState('');
    const [metricValue, setMetricValue] = useState('');
    const [metricSecondValue, setMetricSecondValue] = useState('');
    const [metricColor, setMetricColor] = useState(standardPalette[0]);

    const [sankeyNodes, setSankeyNodes] = useState<SankeyNode[]>(() => parsedSankey.nodes);
    const [sankeyLinks, setSankeyLinks] = useState<SankeyLink[]>(() => parsedSankey.links);
    const [showSankeyLegend, setShowSankeyLegend] = useState(
        kpi?.sankeySettings?.showLegend ?? sankeySettingsFromValue.showLegend ?? true
    );
    const [showSankeyLabels, setShowSankeyLabels] = useState(
        kpi?.sankeySettings?.showLabels ?? sankeySettingsFromValue.showLabels ?? true
    );

    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const chartDefinition = useMemo(
        () => (chartType !== 'sankey' ? getChartDefinition(chartType) : null),
        [chartType]
    );

    const isChart = visualizationSelection === 'chart';
    const isNumberTrend = visualizationSelection === 'number_trend';
    const isSankeyChart = isChart && chartType === 'sankey';
    const isMultiAxisLine = isChart && chartType === 'multiAxisLine';
    const usesTimeSeries = isNumberTrend || (isChart && (chartType === 'line' || chartType === 'area' || chartType === 'multiAxisLine'));
    const requiresColorPerRow = isChart && colorChartTypes.includes(chartType);
    const showFillControl = isChart && ['area', 'bar', 'pie', 'donut', 'radar', 'radialBar', 'sankey'].includes(chartType);
    const dimensionLabel = usesTimeSeries ? 'Date' : chartDefinition?.dimensionLabel ?? 'Label';
    const valueLabel = isMultiAxisLine ? primaryLabel : chartDefinition?.valueLabel ?? 'Value';
    const secondaryValueLabel = isMultiAxisLine ? secondaryLabel : chartDefinition?.secondaryValueLabel ?? 'Value B';

    const handleChartTypeChange = (nextType: ChartType) => {
        setChartType(nextType);
        if (nextType === 'sankey' && showDataLabels) {
            setShowDataLabels(false);
        }
        if (colorChartTypes.includes(nextType)) {
            setDataPoints((prev) =>
                prev.map((dp, idx) => ({
                    ...dp,
                    color: dp.color || standardPalette[idx % standardPalette.length],
                }))
            );
        }
        if (nextType !== 'multiAxisLine') {
            setSecondaryStrokeColor(standardPalette[1]);
            setSyncAxisScales(false);
        }
    };

    const handleAddDataPoint = () => {
        if (usesTimeSeries) {
            const primaryVal = toNumber(metricValue || 0);
            const secondaryVal = isMultiAxisLine ? toNumber(metricSecondValue || 0) : undefined;
            const newPoint: DataPoint = {
                date: metricDate || today(),
                value: primaryVal,
                valueArray: isMultiAxisLine ? [primaryVal, secondaryVal ?? 0] : undefined,
            };
            const updated = sortDataPoints([...dataPoints, newPoint]);
            setDataPoints(updated);
        } else if (!isSankeyChart) {
            const label = metricLabel?.trim() || chartDefinition?.defaultDimensionValue || 'Label';
            const newPoint: DataPoint = {
                date: label,
                value: toNumber(metricValue || 0),
                color: requiresColorPerRow
                    ? metricColor || standardPalette[dataPoints.length % standardPalette.length]
                    : undefined,
            };
            setDataPoints([...dataPoints, newPoint]);
            setMetricLabel('');
        }
        setMetricValue('');
        setMetricSecondValue('');
        setMetricColor(standardPalette[(dataPoints.length + 1) % standardPalette.length]);
    };

    const handleDataPointChange = (index: number, field: 'date' | 'value' | 'valueB' | 'color', newValue: string) => {
        setDataPoints((prev) => {
            const next = [...prev];
            if (field === 'date') next[index].date = newValue;
            if (field === 'value') {
                next[index].value = toNumber(newValue);
                if (isMultiAxisLine) {
                    const existing = Array.isArray(next[index].valueArray) ? next[index].valueArray : [];
                    next[index].valueArray = [toNumber(newValue), existing[1] ?? 0];
                }
            }
            if (field === 'valueB' && isMultiAxisLine) {
                const existing = Array.isArray(next[index].valueArray) ? next[index].valueArray : [toNumber(String(next[index].value)), 0];
                existing[1] = toNumber(newValue);
                next[index].valueArray = existing;
            }
            if (field === 'color') next[index].color = newValue;
            return next;
        });
    };

    const handleRemoveDataPoint = (index: number) => {
        setDataPoints((prev) => prev.filter((_, i) => i !== index));
    };

    const handleAddNode = () => {
        const nextIndex = sankeyNodes.length + 1;
        setSankeyNodes([
            ...sankeyNodes,
            {
                id: `node-${nextIndex}`,
                label: `Node ${nextIndex}`,
                color: sankeyPalette[sankeyNodes.length % sankeyPalette.length],
            },
        ]);
    };

    const handleRemoveNode = (id: string) => {
        setSankeyNodes((prev) => prev.filter((node) => node.id !== id));
        setSankeyLinks((prev) => prev.filter((link) => link.source !== id && link.target !== id));
    };

    const handleAddLink = () => {
        setSankeyLinks((prev) => [
            ...prev,
            {
                source: sankeyNodes[0]?.id ?? '',
                target: sankeyNodes[1]?.id ?? '',
                value: 10,
            },
        ]);
    };

    const handleLinkChange = (
        index: number,
        field: 'source' | 'target' | 'value',
        value: string
    ) => {
        setSankeyLinks((prev) => {
            const next = [...prev];
            if (field === 'value') {
                next[index].value = toNumber(value);
            } else {
                next[index][field] = value;
            }
            return next;
        });
    };

    const chartTypeOptions: ChartType[] = ['line', 'area', 'multiAxisLine', 'bar', 'pie', 'donut', 'radar', 'radialBar', 'sankey'];
    if (!chartTypeOptions.includes(chartType)) {
        chartTypeOptions.push(chartType);
    }

    const renderMetricsTable = () => {
        if (!dataPoints.length) {
            return (
                <p className="text-sm text-industrial-500">
                    No datapoints yet. Add at least one to populate the metrics table.
                </p>
            );
        }

        const gridCols = isMultiAxisLine
            ? 'grid-cols-[1fr_1fr_1fr_auto]'
            : requiresColorPerRow
            ? 'grid-cols-[1fr_1fr_auto_auto]'
            : 'grid-cols-[1fr_1fr_auto]';

        return (
            <div className="space-y-2">
                <div className={`grid ${gridCols} gap-2 text-xs uppercase tracking-wide text-industrial-500`}>
                    <div>{dimensionLabel}</div>
                    <div>{valueLabel}</div>
                    {isMultiAxisLine && <div>{secondaryValueLabel}</div>}
                    {requiresColorPerRow && !isMultiAxisLine && <div className="text-center">Color</div>}
                    <div />
                </div>
                {dataPoints.map((dp, idx) => {
                    const primaryVal =
                        typeof dp.value === 'number' ? dp.value : toNumber(String(dp.value));
                    const secondaryVal = Array.isArray(dp.valueArray) ? dp.valueArray[1] ?? 0 : '';

                    return (
                        <div key={idx} className={`grid ${gridCols} gap-2 items-center`}>
                            <input
                                type={usesTimeSeries ? 'date' : 'text'}
                                className="input"
                                value={dp.date}
                                onChange={(e) => handleDataPointChange(idx, 'date', e.target.value)}
                                placeholder={dimensionLabel}
                            />
                            <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={primaryVal}
                                onChange={(e) => handleDataPointChange(idx, 'value', e.target.value)}
                                placeholder={valueLabel}
                            />
                            {isMultiAxisLine && (
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    value={secondaryVal}
                                    onChange={(e) => handleDataPointChange(idx, 'valueB', e.target.value)}
                                    placeholder={secondaryValueLabel}
                                />
                            )}
                        {requiresColorPerRow && !isMultiAxisLine && (
                            <ColorPicker
                                value={dp.color || standardPalette[idx % standardPalette.length]}
                                onChange={(color) => handleDataPointChange(idx, 'color', color)}
                                align="right"
                            />
                        )}
                            <button
                                type="button"
                                onClick={() => handleRemoveDataPoint(idx)}
                                className="btn btn-icon btn-danger"
                                title="Remove datapoint"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSankeyEditor = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <label className="form-label">Stroke Opacity ({Math.round(strokeOpacity * 100)}%)</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        className="w-full accent-industrial-500"
                        value={strokeOpacity}
                        onChange={(e) => setStrokeOpacity(parseFloat(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Fill Opacity ({Math.round(fillOpacity * 100)}%)</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        className="w-full accent-industrial-500"
                        value={fillOpacity}
                        onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                        checked={showSankeyLegend}
                        onChange={(e) => setShowSankeyLegend(e.target.checked)}
                    />
                    <span className="text-sm text-industrial-300">Show Legend</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                        checked={showSankeyLabels}
                        onChange={(e) => setShowSankeyLabels(e.target.checked)}
                    />
                    <span className="text-sm text-industrial-300">Show Labels Above Nodes</span>
                </label>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="form-label mb-0">Nodes</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddNode}>
                        <Plus size={14} /> Add Node
                    </button>
                </div>
                {sankeyNodes.length === 0 ? (
                    <p className="text-sm text-industrial-500">Add nodes to define your flow map.</p>
                ) : (
                    <div className="space-y-2">
                        {sankeyNodes.map((node, idx) => (
                            <div key={node.id} className="flex items-center gap-2">
                                <input
                                    className="input w-1/3"
                                    value={node.label}
                                    onChange={(e) => {
                                        const next = [...sankeyNodes];
                                        next[idx] = { ...node, label: e.target.value };
                                        setSankeyNodes(next);
                                    }}
                                    placeholder="Node label"
                                />
                                <ColorPicker
                                    value={node.color || sankeyPalette[idx % sankeyPalette.length]}
                                    onChange={(color) => {
                                        const next = [...sankeyNodes];
                                        next[idx] = { ...node, color };
                                        setSankeyNodes(next);
                                    }}
                                    align="right"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveNode(node.id)}
                                    className="btn btn-icon btn-danger"
                                    title="Remove node"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="form-label mb-0">Links</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLink}>
                        <Plus size={14} /> Add Link
                    </button>
                </div>
                {sankeyLinks.length === 0 ? (
                    <p className="text-sm text-industrial-500">Connect nodes with at least one link.</p>
                ) : (
                    <div className="space-y-2">
                        {sankeyLinks.map((link, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <select
                                    className="select flex-1"
                                    value={link.source}
                                    onChange={(e) => handleLinkChange(idx, 'source', e.target.value)}
                                >
                                    <option value="">Source</option>
                                    {sankeyNodes.map((node) => (
                                        <option key={node.id} value={node.id}>
                                            {node.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-industrial-500">→</span>
                                <select
                                    className="select flex-1"
                                    value={link.target}
                                    onChange={(e) => handleLinkChange(idx, 'target', e.target.value)}
                                >
                                    <option value="">Target</option>
                                    {sankeyNodes.map((node) => (
                                        <option key={node.id} value={node.id}>
                                            {node.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    className="input w-28"
                                    value={link.value}
                                    onChange={(e) => handleLinkChange(idx, 'value', e.target.value)}
                                    placeholder="Value"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSankeyLinks((prev) => prev.filter((_, linkIdx) => linkIdx !== idx))
                                    }
                                    className="btn btn-icon btn-danger"
                                    title="Remove link"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationErrors([]);
        setSubmitError(null);

        const resolvedVisualization: VisualizationType =
            visualizationSelection === 'number_trend'
                ? 'number'
                : visualizationSelection === 'text'
                    ? 'text'
                    : chartType === 'sankey'
                        ? 'sankey'
                        : 'chart';

        const sortedPoints = sortDataPoints(dataPoints);
        if (resolvedVisualization === 'chart') {
            const { isValid, errors } = validateVisualizationData('chart', chartType, sortedPoints);
            if (!isValid) {
                setValidationErrors(errors);
                return;
            }
        }

        if (resolvedVisualization === 'sankey') {
            const sankeyErrors: string[] = [];
            if (!sankeyNodes.length) sankeyErrors.push('Add at least one node.');
            if (!sankeyLinks.length) sankeyErrors.push('Add at least one link.');
            if (sankeyLinks.some((link) => !link.source || !link.target)) {
                sankeyErrors.push('Each link needs both a source and a target node.');
            }
            if (sankeyErrors.length) {
                setValidationErrors(sankeyErrors);
                return;
            }
        }

        let valueRecord: Record<string, number | string> = {};
        let trendValue = kpi?.trendValue ?? 0;

        if (resolvedVisualization === 'text') {
            valueRecord = { '0': textValue };
        } else if (resolvedVisualization === 'number') {
            const points = sortedPoints.length
                ? sortedPoints
                : [{ date: lastUpdated, value: toNumber(metricValue || 0) }];
            const lastPoint = points[points.length - 1];
            const prevPoint = points.length > 1 ? points[points.length - 2] : undefined;
            const finalValue =
                typeof lastPoint.value === 'number' ? lastPoint.value : toNumber(String(lastPoint.value));
            trendValue =
                prevPoint !== undefined
                    ? finalValue -
                    (typeof prevPoint.value === 'number'
                        ? prevPoint.value
                        : toNumber(String(prevPoint.value)))
                    : 0;
            valueRecord = { '0': finalValue };
        } else if (resolvedVisualization === 'chart') {
            sortedPoints.forEach((dp) => {
                valueRecord[dp.date || dimensionLabel] =
                    typeof dp.value === 'number' ? dp.value : toNumber(String(dp.value));
            });
        } else if (resolvedVisualization === 'sankey') {
            const nodesForSave = sankeyNodes.map((node, idx) => ({
                id: node.id || `node-${idx + 1}`,
                title: node.label || node.id || `Node ${idx + 1}`,
                color: node.color || sankeyPalette[idx % sankeyPalette.length],
            }));
            const linksForSave = sankeyLinks.map((link) => ({
                source: link.source,
                target: link.target,
                value: link.value,
            }));
            valueRecord = {
                '0': JSON.stringify({ nodes: nodesForSave, links: linksForSave }),
            };
        }

        const rawTarget = targetValue.trim();
        const normalizedTarget =
            resolvedVisualization === 'number'
                ? rawTarget === ''
                    ? null
                    : Number.isFinite(parseFloat(rawTarget))
                        ? parseFloat(rawTarget)
                        : null
                : resolvedVisualization === 'text'
                    ? rawTarget === ''
                        ? null
                        : rawTarget
                    : undefined;
        const normalizedTargetColor =
            normalizedTarget === null || normalizedTarget === undefined
                ? null
                : targetColor || undefined;

        const kpiData: Omit<KPI, 'id'> = {
            name: kpiName,
            kpiName: kpiName,
            subtitle: subtitle || undefined,
            value: valueRecord,
            date: lastUpdated,
            notes: notes ?? '',
            visualizationType: resolvedVisualization,
            chartType: resolvedVisualization === 'chart' || resolvedVisualization === 'sankey' ? chartType : undefined,
            trendValue: resolvedVisualization === 'number' ? trendValue : undefined,
            chartSettings:
                resolvedVisualization === 'chart' || resolvedVisualization === 'sankey'
                    ? {
                        strokeWidth,
                        strokeColor: isMultiAxisLine ? [strokeColor, secondaryStrokeColor] : strokeColor,
                        strokeOpacity,
                        fillOpacity,
                        showLegend: isSankeyChart ? undefined : showLegend,
                        showGridLines: showGridlines,
                        showDataLabels: isSankeyChart ? undefined : showDataLabels,
                        primaryLabel: isMultiAxisLine ? primaryLabel : undefined,
                        secondaryLabel: isMultiAxisLine ? secondaryLabel : undefined,
                        syncAxisScales: isMultiAxisLine ? syncAxisScales : undefined,
                    }
                    : undefined,
            sankeySettings:
                resolvedVisualization === 'sankey'
                    ? {
                        showLegend: showSankeyLegend,
                        showLabels: showSankeyLabels,
                    }
                    : undefined,
            dataPoints: resolvedVisualization === 'text' ? undefined : sortedPoints,
            metrics: resolvedVisualization === 'text' ? undefined : sortedPoints,
            sectionId: sectionId || undefined,
            visible,
            reverseTrend: resolvedVisualization === 'number' ? reverseTrend : undefined,
            prefix: prefix === '' ? '' : prefix,
            prefixOpacity,
            suffix: suffix === '' ? '' : suffix,
            suffixOpacity,
            targetValue: normalizedTarget,
            targetColor:
                resolvedVisualization === 'number' || resolvedVisualization === 'text'
                    ? normalizedTargetColor
                    : undefined,
        };

        try {
            setIsSaving(true);
            await Promise.resolve(onSave(kpiData));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save KPI.';
            setSubmitError(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title={kpi ? 'EDIT KPI' : 'NEW KPI'}
            className="kpi-form-modal"
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                        <label className="form-label">KPI Name</label>
                        <input
                            type="text"
                            value={kpiName}
                            onChange={(e) => setKpiName(e.target.value)}
                            className="input"
                            placeholder="e.g. Monthly Revenue"
                            autoFocus
                        />
                    </div>
                    <div>
                        <div className="flex items-start justify-between gap-3">
                            <label className="form-label">Subtitle</label>
                        </div>
                        <input
                            type="text"
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            className="input"
                            placeholder="Optional context under the KPI name"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Section</label>
                        <select
                            value={sectionId}
                            onChange={(e) => setSectionId(e.target.value)}
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
                    <div>
                        <label className="form-label">Last Updated</label>
                        <input
                            type="date"
                            className="input"
                            value={lastUpdated}
                            onChange={(e) => setLastUpdated(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="form-label flex justify-between">
                            <span>Prefix</span>
                            <span className="text-xs text-industrial-500 font-mono">
                                Opacity: {Math.round(prefixOpacity * 100)}%
                            </span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input flex-1"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                                placeholder="e.g., $"
                            />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                className="w-28 accent-industrial-500"
                                value={prefixOpacity}
                                onChange={(e) => setPrefixOpacity(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label flex justify-between">
                            <span>Suffix</span>
                            <span className="text-xs text-industrial-500 font-mono">
                                Opacity: {Math.round(suffixOpacity * 100)}%
                            </span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input flex-1"
                                value={suffix}
                                onChange={(e) => setSuffix(e.target.value)}
                                placeholder="e.g., %, ms, GB"
                            />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                className="w-28 accent-industrial-500"
                                value={suffixOpacity}
                                onChange={(e) => setSuffixOpacity(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={visible}
                            onChange={(e) => setVisible(e.target.checked)}
                            className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                        />
                        <span className="text-sm text-industrial-200 whitespace-nowrap">Visible on Scorecard</span>
                    </label>
                </div>


                <div className="form-group border-t border-industrial-800 pt-4">
                    <div className="flex items-center justify-between">
                        <label className="form-label">Notes</label>
                        <span className="text-[11px] uppercase tracking-wide text-industrial-500">Markdown supported</span>
                    </div>
                    <textarea
                        className="textarea"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes or context..."
                    />
                    {notes && (
                        <div className="mt-3 border border-industrial-800 rounded-md bg-industrial-950/60 p-3">
                            <div className="text-[11px] uppercase tracking-wide text-industrial-500 mb-2">
                                Preview
                            </div>
                            <div className="text-sm text-industrial-200 leading-relaxed space-y-2">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: (props) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: (props) => <ul className="list-disc ml-5 space-y-1" {...props} />,
                                        ol: (props) => <ol className="list-decimal ml-5 space-y-1" {...props} />,
                                        li: (props) => <li className="text-industrial-200" {...props} />,
                                        strong: (props) => <strong className="font-semibold text-white" {...props} />,
                                    }}
                                >
                                    {notes}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Visualization Type</label>
                    <select
                        className="select"
                        value={visualizationSelection}
                        onChange={(e) => setVisualizationSelection(e.target.value as VisualizationSelection)}
                    >
                        <option value="number_trend">Number with Trend</option>
                        <option value="text">Text</option>
                        <option value="chart">Chart</option>
                    </select>
                </div>

                {isNumberTrend && (
                    <div className="space-y-4 border-t border-industrial-800 pt-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                                checked={reverseTrend}
                                onChange={(e) => setReverseTrend(e.target.checked)}
                            />
                            <span className="text-sm text-industrial-300">Reverse Trend (down is good)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Target</label>
                                <div className="flex items-end gap-2">
                                    <input
                                        type="number"
                                        className="input"
                                        value={targetValue}
                                        onChange={(e) => setTargetValue(e.target.value)}
                                        placeholder="Enter target value"
                                        style={
                                            targetValue && Number(metricValue || 0) === Number(targetValue)
                                                ? { color: targetColor }
                                                : undefined
                                        }
                                    />
                                    <ColorPicker value={targetColor} onChange={setTargetColor} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-3 items-end">
                            <div>
                                <label className="form-label">{dimensionLabel}</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={metricDate}
                                    onChange={(e) => setMetricDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="form-label">{valueLabel}</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={metricValue}
                                    onChange={(e) => setMetricValue(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <button type="button" className="btn btn-secondary h-10" onClick={handleAddDataPoint}>
                                <Plus size={14} /> Add Metric
                            </button>
                        </div>

                        {renderMetricsTable()}
                    </div>
                )}

                {visualizationSelection === 'text' && (
                    <div className="form-group border-t border-industrial-800 pt-4 space-y-4">
                        <label className="form-label">Value</label>
                        <input
                            type="text"
                            className="input"
                            value={textValue}
                            onChange={(e) => setTextValue(e.target.value)}
                            placeholder="Enter text value"
                            style={
                                targetValue && textValue.trim() === targetValue.trim()
                                    ? { color: targetColor }
                                    : undefined
                            }
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Target</label>
                                <div className="flex items-end gap-2">
                                    <input
                                        type="text"
                                        className="input"
                                        value={targetValue}
                                        onChange={(e) => setTargetValue(e.target.value)}
                                        placeholder="Enter target text"
                                    />
                                    <ColorPicker value={targetColor} onChange={setTargetColor} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isChart && (
                    <div className="space-y-4 border-t border-industrial-800 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Chart Type</label>
                                <select
                                    className="select"
                                    value={chartType}
                                    onChange={(e) => handleChartTypeChange(e.target.value as ChartType)}
                                >
                                    {chartTypeOptions.map((type) => (
                                        <option key={type} value={type}>
                                            {chartTypeConfig[type]?.displayName || type}
                                        </option>
                                    ))}
                                </select>
                                {chartDefinition && (
                                    <p className="text-xs text-industrial-500 mt-2">
                                        {chartDefinition.description}
                                    </p>
                                )}
                            </div>
                            {!isSankeyChart && (
                                <div className="form-group">
                                    <label className="form-label mb-1">Display</label>
                                    <div className="flex flex-wrap gap-4">
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
                                                checked={showGridlines}
                                                onChange={(e) => setShowGridlines(e.target.checked)}
                                            />
                                            <span className="text-sm text-industrial-300">Show Gridlines</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                                                checked={showDataLabels}
                                                onChange={(e) => setShowDataLabels(e.target.checked)}
                                                disabled={isSankeyChart}
                                            />
                                            <span className="text-sm text-industrial-300">Show Data Labels</span>
                                        </label>
                                        {isMultiAxisLine && (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                                                    checked={syncAxisScales}
                                                    onChange={(e) => setSyncAxisScales(e.target.checked)}
                                                />
                                                <span className="text-sm text-industrial-300">Sync axes</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isSankeyChart && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <label className="form-label">Stroke Opacity ({Math.round(strokeOpacity * 100)}%)</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        className="w-full accent-industrial-500"
                                        value={strokeOpacity}
                                        onChange={(e) => setStrokeOpacity(parseFloat(e.target.value))}
                                    />
                                </div>
                                {showFillControl && (
                                    <div className="form-group">
                                        <label className="form-label">Fill Opacity ({Math.round(fillOpacity * 100)}%)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            className="w-full accent-industrial-500"
                                            value={fillOpacity}
                                            onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {!isSankeyChart && (chartType === 'line' || chartType === 'area' || chartType === 'radar' || chartType === 'multiAxisLine') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    {isMultiAxisLine && (
                                        <>
                                            <label className="form-label">Primary Label</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={primaryLabel}
                                                onChange={(e) => setPrimaryLabel(e.target.value || 'Value 1')}
                                                placeholder="Value 1"
                                            />
                                        </>
                                    )}
                                    <div className="mt-3">
                                        <label className="form-label">Color (Value 1)</label>
                                        <ColorPicker value={strokeColor} onChange={setStrokeColor} />
                                    </div>
                                </div>
                                {isMultiAxisLine && (
                                    <div className="form-group">
                                        <label className="form-label">Secondary Label</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={secondaryLabel}
                                            onChange={(e) => setSecondaryLabel(e.target.value || 'Value 2')}
                                            placeholder="Value 2"
                                        />
                                        <div className="mt-3">
                                            <label className="form-label">Color (Value 2)</label>
                                            <ColorPicker value={secondaryStrokeColor} onChange={setSecondaryStrokeColor} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isSankeyChart ? (
                            renderSankeyEditor()
                        ) : (
                            <div className="space-y-4">
                                <div className={`grid grid-cols-1 ${isMultiAxisLine ? 'md:grid-cols-[1.2fr_1fr_1fr_auto]' : 'md:grid-cols-[1.2fr_1fr_auto]'} gap-3 items-end`}>
                                    <div>
                                        <label className="form-label">{dimensionLabel}</label>
                                        <input
                                            type={usesTimeSeries ? 'date' : 'text'}
                                            className="input"
                                            value={usesTimeSeries ? metricDate : metricLabel}
                                            onChange={(e) =>
                                                usesTimeSeries
                                                    ? setMetricDate(e.target.value)
                                                    : setMetricLabel(e.target.value)
                                            }
                                            placeholder={dimensionLabel}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">{valueLabel}</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={metricValue}
                                            onChange={(e) => setMetricValue(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    {isMultiAxisLine && (
                                        <div>
                                            <label className="form-label">{secondaryValueLabel}</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={metricSecondValue}
                                                onChange={(e) => setMetricSecondValue(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                    )}
                                    {requiresColorPerRow ? (
                                        <div className="flex items-end gap-2">
                                            <ColorPicker value={metricColor} onChange={setMetricColor} align="right" />
                                            <button type="button" className="btn btn-secondary h-10" onClick={handleAddDataPoint}>
                                                <Plus size={14} /> Add Entry
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" className="btn btn-secondary h-10" onClick={handleAddDataPoint}>
                                            <Plus size={14} /> Add Entry
                                        </button>
                                    )}
                                </div>

                                {renderMetricsTable()}
                            </div>
                        )}
                    </div>
                )}

                {validationErrors.length > 0 && (
                    <div className="border border-red-700/70 bg-red-900/20 text-red-200 rounded-md p-3 text-sm space-y-1">
                        {validationErrors.map((err, idx) => (
                            <div key={idx}>• {err}</div>
                        ))}
                    </div>
                )}
                {submitError && (
                    <div className="border border-red-700/70 bg-red-900/20 text-red-200 rounded-md p-3 text-sm">
                        {submitError}
                    </div>
                )}

                <div className="form-actions">
                    <button type="button" onClick={onCancel} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Saving...' : kpi ? 'Update KPI' : 'Create KPI'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
