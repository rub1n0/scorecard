'use client';

import React, { useState, useMemo } from 'react';
import { Scorecard, KPI } from '@/types';
import { useScorecards } from '@/context/ScorecardContext';
import { X, Copy, Check, User, Link as LinkIcon, ChevronRight, ChevronDown } from 'lucide-react';

interface AssignmentManagerProps {
    scorecard: Scorecard;
    onClose: () => void;
}

export default function AssignmentManager({ scorecard, onClose }: AssignmentManagerProps) {
    const { generateAssigneeToken } = useScorecards();
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
    const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

    const groupedKPIs = useMemo(() => {
        const groups = new Map<string, KPI[]>();
        const unassigned: KPI[] = [];

        scorecard.kpis.forEach(kpi => {
            if (kpi.assignee) {
                const existing = groups.get(kpi.assignee) || [];
                groups.set(kpi.assignee, [...existing, kpi]);
            } else {
                unassigned.push(kpi);
            }
        });

        return { groups, unassigned };
    }, [scorecard.kpis]);

    const handleCopyLink = async (email: string) => {
        try {
            const token = await generateAssigneeToken(scorecard.id, email);
            const url = `${window.location.origin}/update/user/${token}`;
            await navigator.clipboard.writeText(url);
            setCopiedEmail(email);
            setTimeout(() => setCopiedEmail(null), 2000);
        } catch (error) {
            console.error('Failed to generate/copy link:', error);
        }
    };

    const toggleExpand = (email: string) => {
        const newExpanded = new Set(expandedEmails);
        if (newExpanded.has(email)) {
            newExpanded.delete(email);
        } else {
            newExpanded.add(email);
        }
        setExpandedEmails(newExpanded);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal max-w-3xl" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-industrial-800 rounded-md border border-industrial-700">
                            <User size={20} className="text-industrial-100" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-industrial-100">Assignment Manager</h2>
                            <p className="text-xs text-industrial-400 font-mono uppercase tracking-wider">
                                {groupedKPIs.groups.size} Assignees • {scorecard.kpis.length} Total Metrics
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-icon btn-secondary">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Assigned Users List */}
                    {groupedKPIs.groups.size > 0 ? (
                        <div className="space-y-4">
                            {Array.from(groupedKPIs.groups.entries()).map(([email, kpis]) => (
                                <div key={email} className="border border-industrial-800 rounded-lg bg-industrial-900/30 overflow-hidden">
                                    <div
                                        className="p-4 flex items-center justify-between hover:bg-industrial-800/50 transition-colors cursor-pointer"
                                        onClick={() => toggleExpand(email)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <button className="text-industrial-400">
                                                {expandedEmails.has(email) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            </button>
                                            <div>
                                                <h3 className="text-industrial-100 font-medium">{email}</h3>
                                                <p className="text-xs text-industrial-500 font-mono mt-0.5">
                                                    {kpis.length} Metric{kpis.length !== 1 ? 's' : ''} Assigned
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyLink(email);
                                                }}
                                                className="btn btn-sm btn-secondary flex items-center gap-2"
                                                title="Copy Master Update Link"
                                            >
                                                {copiedEmail === email ? (
                                                    <>
                                                        <Check size={14} className="text-emerald-400" />
                                                        <span className="text-emerald-400">Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <LinkIcon size={14} />
                                                        <span>Copy Link</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded KPI List */}
                                    {expandedEmails.has(email) && (
                                        <div className="border-t border-industrial-800 bg-industrial-950/30 p-4">
                                            <ul className="space-y-2">
                                                {kpis.map(kpi => (
                                                    <li key={kpi.id} className="flex items-center justify-between text-sm text-industrial-300 pl-8">
                                                        <span>{kpi.name}</span>
                                                        <span className="font-mono text-industrial-500">{kpi.value}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-industrial-800 rounded-lg">
                            <User size={32} className="mx-auto text-industrial-600 mb-3" />
                            <p className="text-industrial-400">No active assignments found.</p>
                            <p className="text-sm text-industrial-500 mt-1">Assign KPIs to users in the KPI editor to see them here.</p>
                        </div>
                    )}

                    {/* Unassigned Summary */}
                    {groupedKPIs.unassigned.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-industrial-800">
                            <h3 className="text-sm font-semibold text-industrial-400 uppercase tracking-wider mb-4">
                                Unassigned Metrics ({groupedKPIs.unassigned.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {groupedKPIs.unassigned.map(kpi => (
                                    <div key={kpi.id} className="p-3 bg-industrial-900/50 border border-industrial-800 rounded text-sm text-industrial-300">
                                        {kpi.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-primary w-full">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
