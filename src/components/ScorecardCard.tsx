'use client';

import React from 'react';
import { Scorecard } from '@/types';
import { BarChart3, Trash2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ScorecardCardProps {
    scorecard: Scorecard;
    onDelete: () => void;
}

export default function ScorecardCard({ scorecard, onDelete }: ScorecardCardProps) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/scorecard/${scorecard.id}`);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${scorecard.name}"?`)) {
            onDelete();
        }
    };

    return (
        <div
            className="glass-card glass-hover p-5 cursor-pointer group relative overflow-hidden"
            onClick={handleClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-industrial-800 border border-industrial-700 text-industrial-300 group-hover:text-industrial-100 group-hover:border-industrial-500 transition-colors">
                    <BarChart3 size={20} />
                </div>
                <button
                    onClick={handleDelete}
                    className="btn btn-icon btn-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete scorecard"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <h3 className="text-lg font-bold text-industrial-100 mb-1 tracking-tight">{scorecard.name}</h3>

            {scorecard.description && (
                <p className="text-industrial-500 text-xs mb-4 line-clamp-2 font-mono">{scorecard.description}</p>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-industrial-800 mt-auto">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-industrial-200">{scorecard.kpis.length}</span>
                    <span className="text-xs text-industrial-500 uppercase tracking-wider font-semibold">KPIs</span>
                </div>
                <div className="flex items-center gap-2 text-industrial-600 group-hover:text-industrial-300 transition-colors">
                    <span className="text-xs font-mono">{new Date(scorecard.updatedAt).toLocaleDateString()}</span>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300" />
                </div>
            </div>
        </div>
    );
}
