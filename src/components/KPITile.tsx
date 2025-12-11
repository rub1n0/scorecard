
'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { KPI } from '@/types';
import { Edit2, Trash2, Link as LinkIcon, Check } from 'lucide-react';
import ChartErrorBoundary from './ChartErrorBoundary';
import TrendBadge from './TrendBadge';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });


interface KPITileProps {
    kpi: KPI;
    onEdit: () => void;
    onDelete: () => void;
    isDragging?: boolean;
}

export default function KPITile({ kpi, onEdit, onDelete, isDragging }: KPITileProps) {
    const hasNotes = Boolean(kpi.notes);

    const renderVisualization = () => {
        // Skip rendering complex visualizations while dragging for performance and to avoid errors
        if (isDragging) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-industrial-500 font-mono text-sm">Moving...</div>
                </div>
            );
        }

        // Also skip chart rendering for ANY visualization if dragging
        // (ApexCharts seems to fail even on non-dragged tiles)
        if (isDragging && kpi.visualizationType === 'chart') {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-industrial-500 font-mono text-sm">Moving...</div>
                </div>
            );
        }


        if (kpi.visualizationType === 'text') {
            // For text KPIs, value is stored as {"0": "actual text"}
            const textValue = String(kpi.value["0"] || Object.values(kpi.value)[0] || '');
            const textLength = textValue.length;

            // Dynamic font sizing for text
            let fontSizeClass = 'text-8xl';
            if (textLength > 20) fontSizeClass = 'text-3xl';
            else if (textLength > 15) fontSizeClass = 'text-4xl';
            else if (textLength > 10) fontSizeClass = 'text-5xl';
            else if (textLength > 7) fontSizeClass = 'text-6xl';
            else if (textLength > 4) fontSizeClass = 'text-7xl';

            return (
                <div className="flex flex-col justify-center h-full py-4">
                    <div className="flex items-center justify-center w-full">
                        <p className={`${fontSizeClass} font-bold text-industrial-100 font-mono tracking-tight text-center leading-none break-words max-w-full px-2`}>
                            {textValue}
                        </p>
                    </div>
                </div>
            );
        }

        if (kpi.visualizationType === 'number') {
            // For number KPIs, value is stored as {"0": actualNumber}
            const rawValue = kpi.value["0"] || Object.values(kpi.value)[0] || 0;
            const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue as string);
            const trend = kpi.trendValue || 0;
            const isPositive = trend >= 0;
            const isGood = kpi.reverseTrend ? !isPositive : isPositive;

            const formattedValue = numValue.toLocaleString();
            const valueLength = formattedValue.length;

            // Larger font sizes for better visibility
            // Amplify value size for desktop readability
            let fontSizeClass = 'text-[12rem]';
            if (valueLength > 11) fontSizeClass = 'text-6xl';
            else if (valueLength > 9) fontSizeClass = 'text-7xl';
            else if (valueLength > 6) fontSizeClass = 'text-8xl';
            else if (valueLength > 4) fontSizeClass = 'text-9xl';

            return (
                <div className="flex flex-col h-full py-4">
                    {/* Number and trend - takes up most of the space */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-baseline gap-1">
                                {kpi.prefix && (
                                    <span className="text-sm text-industrial-300 font-mono" style={{ opacity: kpi.prefixOpacity ?? 0.5 }}>
                                        {kpi.prefix}
                                    </span>
                                )}
                                <span className={`${fontSizeClass} font-bold text-industrial-100 font-mono tracking-tighter leading-none`}>
                                    {formattedValue}
                                </span>
                                {kpi.suffix && (
                                    <span className="text-sm text-industrial-300 font-mono" style={{ opacity: kpi.suffixOpacity ?? 0.5 }}>
                                        {kpi.suffix}
                                    </span>
                                )}
                            </div>
                            {trend !== 0 && (
                                <TrendBadge trend={trend} isPositive={isPositive} isGood={isGood} />
                            )}
                        </div>
                    </div>


                    {/* Sparkline - pegged to bottom */}
                    {kpi.dataPoints && kpi.dataPoints.length > 0 && (() => {
                        // Validate sparkline data points
                        const validSparklineData = kpi.dataPoints
                            .map(dp => {
                                const val = typeof dp.value === 'number' ? dp.value : parseFloat(dp.value as any);
                                return !isNaN(val) && isFinite(val) ? val : null;
                            })
                            .filter((val): val is number => val !== null);

                        // Only render if we have valid data
                        if (validSparklineData.length === 0) {
                            return null;
                        }

                        return (
                            <div className="-mx-2 mt-2">
                                <ChartErrorBoundary>
                                    <Chart
                                        options={{
                                            chart: {
                                                type: 'line',
                                                sparkline: { enabled: true },
                                                animations: {
                                                    enabled: true,
                                                    speed: 800,
                                                },
                                            },
                                            stroke: {
                                                curve: 'smooth',
                                                width: kpi.chartSettings?.strokeWidth ?? 2,
                                                colors: kpi.chartSettings?.strokeColor ? [kpi.chartSettings.strokeColor] : undefined,
                                            },
                                            colors: kpi.chartSettings?.strokeColor
                                                ? [kpi.chartSettings.strokeColor]
                                                : ['#457B9D'],
                                            tooltip: {
                                                enabled: true,
                                                theme: 'dark',
                                                x: { show: false },
                                                fixed: { enabled: false },
                                                style: {
                                fontSize: '14px',
                                                    fontFamily: 'monospace',
                                                },
                                            },
                                        }}
                                        series={[
                                            {
                                                name: kpi.name,
                                                data: validSparklineData,
                                            },
                                        ]}
                                        type="area"
                                        height={60}
                                    />
                                </ChartErrorBoundary>
                            </div>
                        );
                    })()}
                </div>
            );
        }

        if (kpi.visualizationType === 'chart' && kpi.dataPoints && kpi.dataPoints.length > 0) {
            const chartType = kpi.chartType || 'line';
            const dataPoints = kpi.dataPoints;

            const normalizeArrayValues = (vals?: Array<number | string>) =>
                (vals || [])
                    .map(v => (typeof v === 'number' ? v : parseFloat(v)))
                    .filter((v): v is number => Number.isFinite(v));

            // Multi-value datapoints (stored as arrays) support for categorical charts
            const arrayPoint = [...dataPoints].reverse().find(dp => Array.isArray(dp.value) || Array.isArray(dp.valueArray));
            if (arrayPoint) {
                const values = normalizeArrayValues((arrayPoint.valueArray as Array<number | string>) ?? (arrayPoint.value as Array<number | string>));

                if (values.length > 0) {
                    let categories = values.map((_, idx) => `Value ${idx + 1}`);
                    let distinctColors: string[] | undefined;

                    // Use labeledValues for categories if available
                    if (arrayPoint.labeledValues && arrayPoint.labeledValues.length > 0) {
                        // Ensure lengths match or just use labels
                        if (arrayPoint.labeledValues.length === values.length) {
                            categories = arrayPoint.labeledValues.map(lv => lv.label);
                            if (arrayPoint.labeledValues.some(lv => !!lv.color)) {
                                // Only apply distinct colors for supported types (Radar doesn't support distributed colors well)
                                if (['bar', 'pie', 'donut', 'radialBar'].includes(chartType)) {
                                    distinctColors = arrayPoint.labeledValues.map(lv => lv.color || '#5094af');
                                }
                            }
                        }
                    }
                    const fillOptions: any = {
                        type: 'solid',
                        opacity: 0.8,
                    };

                    const chartOptions: any = {
                        chart: {
                            type: chartType,
                            background: 'transparent',
                            foreColor: '#71717a',
                            toolbar: { show: false },
                            animations: { enabled: true, speed: 800 },
                            fontFamily: 'monospace',
                        },
                        theme: { mode: 'dark', palette: 'palette1' },
                        dataLabels: {
                            enabled: kpi.chartSettings?.showDataLabels ?? false,
                            style: {
                                fontSize: '17px',
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                            },
                        },
                        stroke: {
                            curve: 'smooth',
                            width: kpi.chartSettings?.strokeWidth ?? 2,
                            opacity: kpi.chartSettings?.strokeOpacity ?? 1.0,
                            colors: kpi.chartSettings?.strokeColor ? [kpi.chartSettings.strokeColor] : undefined,
                        },
                        grid: {
                            borderColor: '#27272a',
                            xaxis: { lines: { show: kpi.chartSettings?.showGridLines ?? false } },
                            yaxis: { lines: { show: kpi.chartSettings?.showGridLines ?? true } },
                        },
                        tooltip: {
                            theme: 'dark',
                            style: { fontSize: '12px', fontFamily: 'monospace' },
                            y: { formatter: (val: number) => val.toLocaleString() },
                            marker: { show: true },
                        },
                        colors: distinctColors || ['#5094af', '#36c9b8', '#dea821', '#ee7411', '#e0451f'],
                        fill: fillOptions,
                    };

                    if (chartType === 'pie' || chartType === 'donut' || chartType === 'radialBar') {
                        chartOptions.labels = categories;
                        chartOptions.legend = {
                            show: kpi.chartSettings?.showLegend ?? true,
                            position: 'bottom',
                            fontSize: '18px',
                            fontFamily: 'monospace',
                            labels: { colors: '#d4d4d8' },
                        };
                        chartOptions.stroke = {
                            show: true,
                            width: kpi.chartSettings?.strokeWidth ?? 2,
                            colors: kpi.chartSettings?.strokeColor ? [kpi.chartSettings.strokeColor] : ['#18181b'],
                        };
                        chartOptions.fill = {
                            type: 'solid',
                            opacity: 0.8,
                        };
                        if (chartType === 'donut') {
                            chartOptions.plotOptions = {
                                pie: {
                                    donut: {
                                        size: '65%',
                                        labels: {
                                            show: true,
                                            name: { show: true, fontSize: '18px', fontFamily: 'monospace', color: '#a1a1aa' },
                                            value: { show: true, fontSize: '24px', fontFamily: 'monospace', fontWeight: 'bold', color: '#f4f4f5' },
                                            total: {
                                                show: true,
                                                label: 'Total',
                                                fontSize: '16px',
                                                fontFamily: 'monospace',
                                                color: '#71717a',
                                                formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toFixed(0),
                                            },
                                        },
                                    },
                                },
                            };
                        }
                    } else if (chartType === 'bar') {
                        chartOptions.xaxis = {
                            categories,
                            labels: {
                                style: { colors: Array(categories.length).fill('#71717a'), fontSize: '16px', fontFamily: 'monospace' },
                            },
                        };
                        chartOptions.plotOptions = {
                            bar: {
                                distributed: true,
                            },
                        };
                        chartOptions.legend = { show: kpi.chartSettings?.showLegend ?? false };
                        chartOptions.colors = (kpi.chartSettings?.strokeColor && !distinctColors) ? [kpi.chartSettings.strokeColor] : chartOptions.colors;
                    } else if (chartType === 'radar') {
                        chartOptions.xaxis = {
                            categories,
                            labels: {
                                style: { colors: Array(categories.length).fill('#a1a1aa'), fontSize: '16px', fontFamily: 'monospace' },
                            },
                        };
                        chartOptions.yaxis = { show: false };
                        chartOptions.markers = { size: 3 };
                    }

                    const chartHeight = chartType === 'radar' || chartType === 'pie' || chartType === 'donut' ? 320 : 280;
                    return (
                        <div className="kpi-chart-display -ml-2">
                            <ChartErrorBoundary>
                                <Chart
                                    options={chartOptions}
                                    series={
                                        chartType === 'pie' || chartType === 'donut' || chartType === 'radialBar'
                                            ? values
                                            : [{ name: kpi.name, data: values }]
                                    }
                                    type={chartType === 'column' ? 'bar' : chartType as any}
                                    height={chartHeight}
                                />
                            </ChartErrorBoundary>
                        </div>
                    );
                }
            }

            // Validate and sanitize data points - filter out invalid values (supporting both scalar and array values)
            const withNumeric = dataPoints.map(dp => {
                const pick = () => {
                    if (typeof dp.value === 'number') return dp.value;
                    if (Array.isArray(dp.value)) {
                        const first = dp.value.find(v => Number.isFinite(typeof v === 'number' ? v : parseFloat(v as any)));
                        return first !== undefined ? (typeof first === 'number' ? first : parseFloat(first as any)) : undefined;
                    }
                    if (Array.isArray(dp.valueArray)) {
                        const first = dp.valueArray.find(v => Number.isFinite(typeof v === 'number' ? v : parseFloat(v as any)));
                        return first !== undefined ? (typeof first === 'number' ? first : parseFloat(first as any)) : undefined;
                    }
                    const parsed = parseFloat(dp.value as any);
                    return Number.isFinite(parsed) ? parsed : undefined;
                };
                const numericValue = pick();
                return { ...dp, numericValue };
            });

            const validDataPoints = withNumeric.filter(dp => dp.numericValue !== undefined && !isNaN(dp.numericValue) && isFinite(dp.numericValue) && dp.date);

            // If no valid data points remain, show error message
            if (validDataPoints.length === 0) {
                return <div className="py-12 text-center text-red-500 text-xs font-mono uppercase tracking-wider">Invalid Chart Data</div>;
            }

            const strokeOptions: any = {
                curve: 'smooth',
                width: kpi.chartSettings?.strokeWidth ?? 2,
                opacity: kpi.chartSettings?.strokeOpacity ?? 1.0,
            };

            if (kpi.chartSettings?.strokeColor) {
                strokeOptions.colors = [kpi.chartSettings.strokeColor];
            }

            const fillOptions: any = {
                type: 'solid',
                opacity: 0.8,
            };
            const chartOptions: any = {
                chart: {
                    type: chartType,
                    background: 'transparent',
                    foreColor: '#71717a', // zinc-500
                    toolbar: {
                        show: false,
                    },
                    animations: {
                        enabled: true,
                        speed: 800,
                    },
                    fontFamily: 'monospace',
                },
                theme: {
                    mode: 'dark',
                    palette: 'palette1',
                },
                dataLabels: {
                    enabled: kpi.chartSettings?.showDataLabels ?? false,
                    style: {
                        fontSize: '17px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        colors: ['#f4f4f5'],
                    },
                },
                stroke: strokeOptions,
                grid: {
                    borderColor: '#27272a', // zinc-800
                    strokeDashArray: 0,
                    xaxis: {
                        lines: {
                            show: kpi.chartSettings?.showGridLines ?? false
                        }
                    },
                    yaxis: {
                        lines: {
                            show: kpi.chartSettings?.showGridLines ?? true
                        }
                    },
                },
                xaxis: {
                    categories: (chartType === 'line' || chartType === 'area')
                        ? validDataPoints.map(dp => {
                            try {
                                const parsedDate = new Date(dp.date);
                                if (!isNaN(parsedDate.getTime())) {
                                    return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                }
                                return dp.date;
                            } catch {
                                return dp.date;
                            }
                        })
                        : validDataPoints.map(dp => dp.date),
                    labels: {
                        style: {
                            colors: '#71717a',
                            fontSize: '16px',
                            fontFamily: 'monospace',
                        },
                    },
                    axisBorder: {
                        show: false,
                    },
                    axisTicks: {
                        show: false,
                    },
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: '#71717a',
                            fontSize: '16px',
                            fontFamily: 'monospace',
                        },
                        formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0),
                    },
                },
                tooltip: {
                    theme: 'dark',
                    style: {
                        fontSize: '12px',
                        fontFamily: 'monospace',
                    },
                    y: {
                        formatter: (val: number) => val.toLocaleString(),
                    },
                    marker: {
                        show: true,
                    },
                },
                colors: (chartType === 'pie' || chartType === 'donut' || chartType === 'radialBar')
                    ? ['#5094af', '#36c9b8', '#dea821', '#ee7411', '#e0451f'] // Always use palette for these types by default
                    : (kpi.chartSettings?.strokeColor ? [kpi.chartSettings.strokeColor] : ['#457B9D']),
                fill: fillOptions,
            };

            // Specific options for different chart types
            if (chartType === 'pie' || chartType === 'donut' || chartType === 'radialBar') {
                chartOptions.labels = validDataPoints.map(dp => dp.date);

                // Use custom colors if available
                const customColors = validDataPoints.map(dp => dp.color).filter(Boolean);
                if (customColors.length === validDataPoints.length) {
                    chartOptions.colors = customColors;
                }

                // Enable data labels for better readability
                chartOptions.dataLabels = {
                    enabled: true,
                    formatter: function (_val: number, opts: any) {
                        const series = opts?.w?.globals?.series;
                        const raw = Array.isArray(series) ? series[opts.seriesIndex] : null;
                        return typeof raw === 'number' ? raw.toLocaleString() : raw !== null && raw !== undefined ? String(raw) : '';
                    },
                    style: {
                        fontSize: '18px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        colors: ['#ffffff']
                    },
                    dropShadow: {
                        enabled: true,
                        top: 1,
                        left: 1,
                        blur: 1,
                        color: '#000',
                        opacity: 0.7
                    }
                };

                chartOptions.legend = {
                    show: kpi.chartSettings?.showLegend ?? true,
                    position: 'bottom',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    labels: {
                        colors: '#d4d4d8', // Brighter zinc-300
                    },
                    markers: {
                        width: 10,
                        height: 10,
                        radius: 2,
                    },
                };

                // Add stroke between slices - use chartSettings if configured
                chartOptions.stroke = {
                    show: true,
                    width: kpi.chartSettings?.strokeWidth ?? 2,
                    colors: kpi.chartSettings?.strokeColor ? [kpi.chartSettings.strokeColor] : ['#18181b']
                };

                chartOptions.fill = {
                    type: 'solid',
                    opacity: 0.8
                };

                // Add plotOptions for better spacing in donut charts
                if (chartType === 'donut') {
                    chartOptions.plotOptions = {
                        pie: {
                            donut: {
                                size: '65%',
                                labels: {
                                    show: true,
                                    name: {
                                        show: true,
                                        fontSize: '18px',
                                        fontFamily: 'monospace',
                                        color: '#a1a1aa'
                                    },
                                    value: {
                                        show: true,
                                        fontSize: '22px',
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold',
                                        color: '#f4f4f5'
                                    },
                                        total: {
                                            show: true,
                                            label: 'Total',
                                            fontSize: '16px',
                                            fontFamily: 'monospace',
                                            color: '#71717a',
                                            formatter: function (w: any) {
                                                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toFixed(0);
                                            }
                                    }
                                }
                            }
                        }
                    };
                }
            }

            if (chartType === 'bar') {
                // Use custom colors if available for bars
                const customColors = validDataPoints.map(dp => dp.color).filter(Boolean);
                if (customColors.length === validDataPoints.length) {
                    chartOptions.colors = customColors;
                    chartOptions.plotOptions = {
                        bar: {
                            distributed: true
                        }
                    };
                    // Hide legend for distributed bars as x-axis labels are sufficient (unless explicitly enabled)
                    chartOptions.legend = {
                        show: kpi.chartSettings?.showLegend ?? false
                    };
                } else if (chartOptions.colors.length > 1) {
                    // If using default palette (multiple colors), enable distributed to show them
                    chartOptions.plotOptions = {
                        bar: {
                            distributed: true
                        }
                    };
                    chartOptions.legend = {
                        show: kpi.chartSettings?.showLegend ?? false
                    };
                }

                chartOptions.fill = {
                    type: 'solid',
                    opacity: 0.8
                };
            }

            if (chartType === 'radar') {
                chartOptions.xaxis = {
                    categories: validDataPoints.map(dp => dp.date),
                    labels: {
                        style: {
                            colors: Array(validDataPoints.length).fill('#a1a1aa'),
                            fontSize: '16px',
                            fontFamily: 'monospace',
                        },
                    },
                };
                chartOptions.yaxis = {
                    show: false,
                };
                chartOptions.markers = {
                    size: 3,
                    colors: ['#18181b'],
                    strokeColors: '#3b82f6',
                    strokeWidth: 2,
                };
            }

            const chartHeight = chartType === 'radar' || chartType === 'pie' || chartType === 'donut' ? 320 : 280;

            return (
                <div className="kpi-chart-display -ml-2">
                    <ChartErrorBoundary>
                        <Chart
                            options={chartOptions}
                            series={
                                chartType === 'pie' || chartType === 'donut'
                                    ? validDataPoints.map(dp => dp.numericValue as number)
                                    : [
                                        {
                                            name: kpi.name,
                                            data: validDataPoints.map(dp => dp.numericValue as number),
                                        },
                                    ]
                            }
                            type={chartType === 'column' ? 'bar' : chartType as any}
                            height={chartHeight}
                        />
                    </ChartErrorBoundary>
                </div>
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
                            <h3 className="text-sm text-industrial-400 mb-1 truncate">{kpi.name}</h3>
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
                                    code: ({ node, inline, ...props }) =>
                                        inline ? (
                                            <code className="bg-industrial-900 px-1.5 py-0.5 rounded text-xs text-amber-300" {...props} />
                                        ) : (
                                            <code className="block bg-industrial-900 p-3 rounded text-xs text-amber-300 overflow-x-auto" {...props} />
                                        ),
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                                }}
                            >
                                {kpi.notes || ''}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
