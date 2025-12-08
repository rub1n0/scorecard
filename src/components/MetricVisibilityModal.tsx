'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Scorecard } from '@/types';
import { useScorecards } from '@/context/ScorecardContext';
import Modal from './Modal';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface MetricVisibilityModalProps {
    scorecard: Scorecard;
    onClose: () => void;
}

export default function MetricVisibilityModal({ scorecard, onClose }: MetricVisibilityModalProps) {
    const { updateKPI } = useScorecards();
    const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initial: Record<string, boolean> = {};
        scorecard.kpis.forEach(kpi => {
            initial[kpi.id] = kpi.visible !== false;
        });
        setVisibilityMap(initial);
    }, [scorecard.kpis]);

    const orderedSections = useMemo(
        () => [...(scorecard.sections || [])].sort((a, b) => a.order - b.order),
        [scorecard.sections]
    );

    const kpis = useMemo(
        () => [...scorecard.kpis].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
        [scorecard.kpis]
    );

    const handleToggle = async (kpiId: string, nextVisible: boolean) => {
        setError(null);
        setVisibilityMap(prev => ({ ...prev, [kpiId]: nextVisible }));
        setPendingId(kpiId);

        try {
            await updateKPI(scorecard.id, kpiId, { visible: nextVisible });
        } catch {
            setError('Unable to update visibility. Please try again.');
            setVisibilityMap(prev => ({ ...prev, [kpiId]: !nextVisible }));
        } finally {
            setPendingId(null);
        }
    };

    const sectionLabel = (sectionId?: string) => {
        if (!sectionId) return 'General';
        const section = orderedSections.find(s => s.id === sectionId);
        return section?.name || 'General';
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Metric Visibility"
            maxWidth="max-w-3xl"
        >
            <div className="space-y-4">
                <p className="text-sm text-industrial-400">
                    Check a metric to show it on the scorecard. Unchecking hides it from the Scorecard view without deleting it.
                </p>

                <div className="border border-industrial-800 rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                            <tr>
                                <th className="px-4 py-3 text-left">Metric</th>
                                <th className="px-4 py-3 text-left">Section</th>
                                <th className="px-4 py-3 text-left w-36">Visible</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-800">
                            {kpis.map(kpi => {
                                const isVisible = visibilityMap[kpi.id] ?? true;
                                const isSaving = pendingId === kpi.id;

                                return (
                                    <tr key={kpi.id} className="hover:bg-industrial-900/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-industrial-100">{kpi.name}</div>
                                            <div className="text-xs text-industrial-500">{kpi.subtitle || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-industrial-200">
                                            {sectionLabel(kpi.sectionId)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                                                    checked={isVisible}
                                                    disabled={isSaving}
                                                    onChange={(e) => handleToggle(kpi.id, e.target.checked)}
                                                />
                                                {isVisible ? (
                                                    <span className="flex items-center gap-1 text-xs text-verdigris-300">
                                                        <Eye size={14} />
                                                        Shown
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-industrial-400">
                                                        <EyeOff size={14} />
                                                        Hidden
                                                    </span>
                                                )}
                                                {isSaving && <Loader2 size={14} className="animate-spin text-industrial-400" />}
                                            </label>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {error && (
                    <div className="text-sm text-red-400">
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    );
}
