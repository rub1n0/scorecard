
'use client';

import React, { useState } from 'react';
import { KPI } from '@/types';
import { Edit2, Trash2, Link as LinkIcon, Check } from 'lucide-react';
import { ChartVisualization, NumberVisualization, SankeyVisualization, TextVisualization } from './visualizations';
import MarkdownContent from './MarkdownContent';


interface KPITileProps {
    kpi: KPI;
    onEdit: () => void;
    onDelete: () => void;
    isDragging?: boolean;
}

export default function KPITile({ kpi, onEdit, onDelete, isDragging }: KPITileProps) {
    const hasNotes = Boolean(kpi.notes);
    const useSubtitleStyleOnName = !kpi.subtitle && kpi.chartSettings?.useSubtitleStyleOnName;

    const renderVisualization = () => {
        if (isDragging) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-industrial-500 font-mono text-sm">Moving...</div>
                </div>
            );
        }

        if (kpi.visualizationType === 'sankey' || kpi.chartType === 'sankey') {
            return (
                <SankeyVisualization
                    value={kpi.value}
                    settings={kpi.sankeySettings}
                    height={320}
                />
            );
        }

        if (kpi.visualizationType === 'text') {
            const textValue = String(kpi.value["0"] || Object.values(kpi.value)[0] || '');
            const matchesTarget =
                kpi.targetValue !== undefined &&
                kpi.targetValue !== null &&
                textValue.trim() === String(kpi.targetValue).trim();
            return (
                <TextVisualization
                    value={textValue}
                    style={matchesTarget && kpi.targetColor ? { color: kpi.targetColor } : undefined}
                />
            );
        }

        if (kpi.visualizationType === 'number') {
            const rawValue = kpi.value["0"] || Object.values(kpi.value)[0] || 0;
            const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0;
            const trend = kpi.trendValue || 0;
            const matchesTarget =
                kpi.targetValue !== undefined &&
                kpi.targetValue !== null &&
                Number.isFinite(Number(kpi.targetValue)) &&
                ((kpi.reverseTrend ? numValue <= Number(kpi.targetValue) : numValue >= Number(kpi.targetValue)));

            return (
                <NumberVisualization
                    name={kpi.name}
                    value={numValue}
                    trendValue={trend}
                    reverseTrend={kpi.reverseTrend}
                    prefix={kpi.prefix}
                    prefixOpacity={kpi.prefixOpacity}
                    suffix={kpi.suffix}
                    suffixOpacity={kpi.suffixOpacity}
                    chartSettings={kpi.chartSettings}
                    dataPoints={kpi.dataPoints}
                    style={matchesTarget && kpi.targetColor ? { color: kpi.targetColor } : undefined}
                />
            );
        }

        if (kpi.visualizationType === 'chart' && kpi.dataPoints && kpi.dataPoints.length > 0) {
            const chartType = kpi.chartType || 'line';
            return (
                <ChartVisualization
                    name={kpi.name}
                    chartType={chartType}
                    dataPoints={kpi.dataPoints}
                    chartSettings={kpi.chartSettings}
                />
            );
        }

        return <div className="py-12 text-center text-industrial-600 text-xs font-mono uppercase tracking-wider">No Data Stream</div>;
    };

    const [showCopied, setShowCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    };

    const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (kpi.updateToken) {
            const url = `${window.location.origin}/update/${kpi.updateToken}`;
            await copyToClipboard(url);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        }
    };

    return (
        <div className={`glass-card p-6 h-full group min-h-[320px] md:min-h-[360px] ${hasNotes ? 'md:col-span-2' : ''}`}>
            <div className={`h-full flex ${hasNotes ? 'flex-col md:flex-row gap-6' : 'flex-col'}`}>
                <div className={`${hasNotes ? 'md:w-1/2' : 'w-full'} flex flex-col flex-1`}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                            <h3
                                className={
                                    useSubtitleStyleOnName
                                        ? "text-xl font-semibold text-industrial-200 mb-0.5 uppercase tracking-wide truncate"
                                        : "text-sm text-industrial-400 mb-1 truncate"
                                }
                            >
                                {kpi.name}
                            </h3>
                            {kpi.subtitle && (
                                <p className="text-xl font-semibold text-industrial-200 mb-0.5 uppercase tracking-wide">
                                    {kpi.subtitle}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {kpi.updateToken && (
                                <button
                                    onClick={handleCopyLink}
                                    className="btn btn-icon p-1.5 text-industrial-500 hover:text-blue-400 hover:bg-blue-900/20 rounded relative"
                                    aria-label="Copy Update Link"
                                    title="Copy Update Link"
                                >
                                    {showCopied ? <Check size={14} className="text-green-500" /> : <LinkIcon size={14} />}
                                </button>
                            )}
                            <button onClick={onEdit} className="btn btn-icon p-1.5 text-industrial-500 hover:text-industrial-200 hover:bg-industrial-800 rounded" aria-label="Edit KPI">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={onDelete} className="btn btn-icon p-1.5 text-industrial-500 hover:text-red-400 hover:bg-red-900/20 rounded" aria-label="Delete KPI">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {renderVisualization()}
                    </div>
                </div>

                {/* Notes */}
                {hasNotes && (
                    <div className="md:w-1/2 flex flex-col flex-1 border-t md:border-t-0 md:border-l border-industrial-800 pt-4 md:pt-0 md:pl-6">
                        <span className="text-xs uppercase tracking-wide text-industrial-500 mb-2">Notes</span>
                        <MarkdownContent content={kpi.notes || ''} size={kpi.commentTextSize ?? 'small'} />
                    </div>
                )}
            </div>
        </div>
    );
}
