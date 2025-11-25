
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { KPI } from '@/types';
import { Edit2, Trash2, TrendingUp, TrendingDown, MoreHorizontal, Link as LinkIcon, Check } from 'lucide-react';
import ChartErrorBoundary from './ChartErrorBoundary';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });


interface KPITileProps {
    kpi: KPI;
    onEdit: () => void;
    onDelete: () => void;
    isDragging?: boolean;
}

export default function KPITile({ kpi, onEdit, onDelete, isDragging }: KPITileProps) {
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
            let fontSizeClass = 'text-8xl';
            if (valueLength > 11) fontSizeClass = 'text-4xl';
            else if (valueLength > 9) fontSizeClass = 'text-5xl';
            else if (valueLength > 6) fontSizeClass = 'text-6xl';
            else if (valueLength > 4) fontSizeClass = 'text-7xl';

            return (
                <div className="flex flex-col h-full py-4">
                    {/* Number and trend - takes up most of the space */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-baseline gap-1">
                                {kpi.prefix && (
                                    <span className="text-3xl font-semibold text-industrial-300 font-mono">
                                        {kpi.prefix}
                                    </span>
                                )}
                                <span className={`${fontSizeClass} font-bold text-industrial-100 font-mono tracking-tighter leading-none`}>
                                    {formattedValue}
                                </span>
                                {kpi.suffix && (
                                    <span className="text-3xl font-semibold text-industrial-300 font-mono">
                                        {kpi.suffix}
                                    </span>
                                )}
                            </div>
                            {trend !== 0 && (
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xl font-mono font-medium whitespace-nowrap ${isGood ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'}`}>
                                    {isPositive ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                                    <span>{Math.abs(trend).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                                </div>
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
                                                    fontSize: '12px',
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

            // Validate and sanitize data points - filter out invalid values
            const validDataPoints = kpi.dataPoints.filter(dp => {
                // Ensure value is a valid finite number
                const val = typeof dp.value === 'number' ? dp.value : parseFloat(dp.value as any);
                return !isNaN(val) && isFinite(val) && dp.date;
            });

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
                opacity: (chartType === 'bar' || chartType === 'pie' || chartType === 'donut' || chartType === 'radialBar')
                    ? 1.0
                    : Math.max(0.2, kpi.chartSettings?.strokeOpacity ? kpi.chartSettings.strokeOpacity * 0.2 : 0.2),
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
                                // Check if date is valid
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
                            fontSize: '10px',
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
                            fontSize: '10px',
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
                    formatter: function (val: number) {
                        return val.toFixed(1) + '%';
                    },
                    style: {
                        fontSize: '12px',
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
                    fontSize: '12px',
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

                // Override fill opacity to be 75% of stroke opacity for better visibility
                chartOptions.fill = {
                    type: 'solid',
                    opacity: (kpi.chartSettings?.strokeOpacity ?? 1.0) * 0.75
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
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                        color: '#a1a1aa'
                                    },
                                    value: {
                                        show: true,
                                        fontSize: '20px',
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold',
                                        color: '#f4f4f5'
                                    },
                                    total: {
                                        show: true,
                                        label: 'Total',
                                        fontSize: '12px',
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

                // Override fill opacity to be 75% of stroke opacity for better visibility
                chartOptions.fill = {
                    type: 'solid',
                    opacity: (kpi.chartSettings?.strokeOpacity ?? 1.0) * 0.75
                };
            }

            if (chartType === 'radar') {
                chartOptions.xaxis = {
                    categories: validDataPoints.map(dp => dp.date),
                    labels: {
                        style: {
                            colors: Array(validDataPoints.length).fill('#a1a1aa'),
                            fontSize: '10px',
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
                                    ? validDataPoints.map(dp => {
                                        const val = typeof dp.value === 'number' ? dp.value : parseFloat(dp.value as any);
                                        return val;
                                    })
                                    : [
                                        {
                                            name: kpi.name,
                                            data: validDataPoints.map(dp => {
                                                const val = typeof dp.value === 'number' ? dp.value : parseFloat(dp.value as any);
                                                return val;
                                            }),
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

    const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (kpi.updateToken) {
            const url = `${window.location.origin}/update/${kpi.updateToken}`;
            await navigator.clipboard.writeText(url);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        }
    };

    return (
        <div className="glass-card p-5 h-full flex flex-col group">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-semibold text-industrial-200 mb-0.5 truncate uppercase tracking-wide">{kpi.name}</h3>
                    {kpi.subtitle && (
                        <p className="text-sm text-industrial-400 mb-1 truncate">{kpi.subtitle}</p>
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

            {/* Notes */}
            {kpi.notes && (
                <div className="mt-4 pt-3 border-t border-industrial-800">
                    <p className="text-xs text-industrial-500 font-mono line-clamp-2">{kpi.notes}</p>
                </div>
            )}
        </div>
    );
}
