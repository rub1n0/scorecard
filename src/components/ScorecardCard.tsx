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
    );
}
