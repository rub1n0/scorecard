'use client';

import React, { useState } from 'react';
import { Scorecard } from '@/types';
import { BarChart3, Trash2, ArrowRight, Edit2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ScorecardCardProps {
    scorecard: Scorecard;
    onDelete: () => void;
    onUpdate: (updates: Partial<Scorecard>) => void;
}

export default function ScorecardCard({ scorecard, onDelete, onUpdate }: ScorecardCardProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(scorecard.name);
    const [editDescription, setEditDescription] = useState(scorecard.description || '');

    const handleClick = () => {
        if (!isEditing) {
            router.push(`/scorecard/${scorecard.id}`);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${scorecard.name}"?`)) {
            onDelete();
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({
            name: editName,
            description: editDescription || undefined,
        });
        setIsEditing(false);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditName(scorecard.name);
        setEditDescription(scorecard.description || '');
        setIsEditing(false);
    };

    return (
        <div
            className={`glass-card p-5 relative overflow-hidden transition-all ${isEditing ? 'ring-2 ring-industrial-500' : 'glass-hover cursor-pointer'
                } group`}
            onClick={handleClick}
        >
            {/* Visual Preview Background - Semi-transparent mini scorecard with sections */}
            {!isEditing && scorecard.kpis.length > 0 && (
                <div className="absolute inset-0 opacity-[0.10] group-hover:opacity-[0.10] transition-opacity pointer-events-none overflow-hidden flex justify-end">
                    <div className="space-y-2 w-1/2 h-full pr-2 py-2 flex flex-col">
                        {/* Show sections with their KPIs */}
                        {scorecard.sections && scorecard.sections.length > 0 ? (
                            scorecard.sections.slice(0, 4).map((section) => {
                                const sectionKpis = scorecard.kpis.filter(k => k.sectionId === section.id).slice(0, 6);
                                if (sectionKpis.length === 0) return null;

                                return (
                                    <div key={section.id} className="space-y-1">
                                        {/* Section Header */}
                                        <div className="text-[8px] font-bold uppercase text-industrial-400 px-1 py-0.5 bg-industrial-800/50 border-l-2 border-industrial-600">
                                            {section.name}
                                        </div>
                                        {/* Section KPIs */}
                                        <div className="grid grid-cols-3 gap-1">
                                            {sectionKpis.map((kpi, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-industrial-700/50 rounded-sm border border-industrial-600/50 p-1.5 h-12 flex flex-col justify-between"
                                                >
                                                    <div className="text-[5px] font-bold uppercase truncate text-industrial-400">
                                                        {kpi.name}
                                                    </div>
                                                    <div className="flex items-end justify-between">
                                                        {kpi.visualizationType === 'number' && (
                                                            <div className="text-[9px] font-bold text-industrial-300">
                                                                {typeof kpi.value === 'object' ? Object.values(kpi.value)[0] : kpi.value}
                                                            </div>
                                                        )}
                                                        {kpi.visualizationType === 'chart' && (
                                                            <div className="w-full h-4 flex items-end justify-center">
                                                                {/* Different chart type representations */}
                                                                {kpi.chartType === 'line' && (
                                                                    <svg className="w-full h-full" viewBox="0 0 20 10">
                                                                        <polyline
                                                                            points="0,8 5,5 10,6 15,3 20,4"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeWidth="0.5"
                                                                            className="text-industrial-500"
                                                                        />
                                                                    </svg>
                                                                )}
                                                                {(kpi.chartType === 'bar' || kpi.chartType === 'radialBar') && (
                                                                    <div className="flex gap-[1px] items-end h-full w-full justify-center">
                                                                        {[60, 80, 50, 90].map((h, i) => (
                                                                            <div
                                                                                key={i}
                                                                                className="w-1 bg-industrial-500/70 rounded-t-sm"
                                                                                style={{ height: `${h}%` }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {(kpi.chartType === 'pie' || kpi.chartType === 'donut') && (
                                                                    <svg className="w-3 h-3" viewBox="0 0 20 20">
                                                                        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="4" className="text-industrial-600" strokeDasharray="15 35" />
                                                                        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="4" className="text-industrial-500" strokeDasharray="20 30" strokeDashoffset="-15" />
                                                                    </svg>
                                                                )}
                                                                {kpi.chartType === 'radar' && (
                                                                    <svg className="w-3 h-3" viewBox="0 0 20 20">
                                                                        <polygon
                                                                            points="10,2 17,7 15,15 5,15 3,7"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeWidth="0.5"
                                                                            className="text-industrial-600"
                                                                        />
                                                                        <polygon
                                                                            points="10,4 14,8 13,13 7,13 6,8"
                                                                            fill="currentColor"
                                                                            className="text-industrial-500/30"
                                                                            stroke="currentColor"
                                                                            strokeWidth="0.5"
                                                                        />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            /* If no sections, show ungrouped KPIs */
                            <div className="grid grid-cols-3 gap-1">
                                {scorecard.kpis.slice(0, 12).map((kpi, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-industrial-700/50 rounded-sm border border-industrial-600/50 p-1.5 h-12 flex flex-col justify-between"
                                    >
                                        <div className="text-[5px] font-bold uppercase truncate text-industrial-400">
                                            {kpi.name}
                                        </div>
                                        <div className="flex items-end justify-between">
                                            {kpi.visualizationType === 'number' && (
                                                <div className="text-[9px] font-bold text-industrial-300">
                                                    {typeof kpi.value === 'object' ? Object.values(kpi.value)[0] : kpi.value}
                                                </div>
                                            )}
                                            {kpi.visualizationType === 'chart' && (
                                                <div className="w-full h-4 flex items-end justify-center">
                                                    {/* Different chart type representations */}
                                                    {kpi.chartType === 'line' && (
                                                        <svg className="w-full h-full" viewBox="0 0 20 10">
                                                            <polyline
                                                                points="0,8 5,5 10,6 15,3 20,4"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="0.5"
                                                                className="text-industrial-500"
                                                            />
                                                        </svg>
                                                    )}
                                                    {(kpi.chartType === 'bar' || kpi.chartType === 'radialBar') && (
                                                        <div className="flex gap-[1px] items-end h-full w-full justify-center">
                                                            {[60, 80, 50, 90].map((h, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="w-1 bg-industrial-500/70 rounded-t-sm"
                                                                    style={{ height: `${h}%` }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {(kpi.chartType === 'pie' || kpi.chartType === 'donut') && (
                                                        <svg className="w-3 h-3" viewBox="0 0 20 20">
                                                            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="4" className="text-industrial-600" strokeDasharray="15 35" />
                                                            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="4" className="text-industrial-500" strokeDasharray="20 30" strokeDashoffset="-15" />
                                                        </svg>
                                                    )}
                                                    {kpi.chartType === 'radar' && (
                                                        <svg className="w-3 h-3" viewBox="0 0 20 20">
                                                            <polygon
                                                                points="10,2 17,7 15,15 5,15 3,7"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="0.5"
                                                                className="text-industrial-600"
                                                            />
                                                            <polygon
                                                                points="10,4 14,8 13,13 7,13 6,8"
                                                                fill="currentColor"
                                                                className="text-industrial-500/30"
                                                                stroke="currentColor"
                                                                strokeWidth="0.5"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Content Layer */}
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-industrial-800 border border-industrial-700 text-industrial-300 group-hover:text-industrial-100 group-hover:border-industrial-500 transition-colors">
                        <BarChart3 size={20} />
                    </div>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="btn btn-icon btn-secondary"
                                    aria-label="Cancel editing"
                                >
                                    <X size={16} />
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn btn-icon btn-primary"
                                    aria-label="Save changes"
                                >
                                    <Save size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleEdit}
                                    className="btn btn-icon btn-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Edit scorecard"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="btn btn-icon btn-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Delete scorecard"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div>
                            <label className="text-xs text-industrial-400 uppercase tracking-wider mb-1 block">Name</label>
                            <input
                                type="text"
                                className="input w-full text-lg font-bold"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs text-industrial-400 uppercase tracking-wider mb-1 block">Description</label>
                            <textarea
                                className="input w-full text-xs font-mono h-16 resize-none"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Optional description..."
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <h3 className="text-lg font-bold text-industrial-100 mb-1 tracking-tight">{scorecard.name}</h3>

                        {scorecard.description && (
                            <p className="text-industrial-500 text-xs mb-4 line-clamp-2 font-mono">{scorecard.description}</p>
                        )}
                    </>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-industrial-800 mt-auto">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-industrial-200">{scorecard.kpis.length}</span>
                        <span className="text-xs text-industrial-500 uppercase tracking-wider font-semibold">KPIs</span>
                    </div>
                    <div className="flex items-center gap-2 text-industrial-600 group-hover:text-industrial-300 transition-colors">
                        <span className="text-xs font-mono">{new Date(scorecard.updatedAt).toLocaleDateString()}</span>
                        {!isEditing && (
                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
