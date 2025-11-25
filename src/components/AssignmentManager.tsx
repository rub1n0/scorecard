'use client';

import React, { useState, useMemo } from 'react';
import { Scorecard, KPI } from '@/types';
import { useScorecards } from '@/context/ScorecardContext';
import { Check, X, Mail, Copy, ExternalLink, ChevronDown, ChevronRight, Search, UserPlus, Link as LinkIcon, Trash2 } from 'lucide-react';
import { getDisplayValue } from '@/utils/kpiValueUtils';
import Modal from './Modal';

interface AssignmentManagerProps {
    scorecard: Scorecard;
    onClose: () => void;
}

export default function AssignmentManager({ scorecard, onClose }: AssignmentManagerProps) {
    const { updateKPI, bulkAssignKPIs, generateAssigneeToken } = useScorecards();
    const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(new Set());
    const [assigneeEmail, setAssigneeEmail] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);

    // Group KPIs by assignee
    const { assignedGroups, unassignedKPIs } = useMemo(() => {
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

        return { assignedGroups: groups, unassignedKPIs: unassigned };
    }, [scorecard.kpis]);

    // Filter unassigned KPIs by search query
    const filteredUnassigned = useMemo(() => {
        if (!searchQuery) return unassignedKPIs;
        const query = searchQuery.toLowerCase();
        return unassignedKPIs.filter(kpi =>
            kpi.name.toLowerCase().includes(query) ||
            kpi.subtitle?.toLowerCase().includes(query)
        );
    }, [unassignedKPIs, searchQuery]);

    const handleToggleKPI = (kpiId: string) => {
        const newSelected = new Set(selectedKPIs);
        if (newSelected.has(kpiId)) {
            newSelected.delete(kpiId);
        } else {
            newSelected.add(kpiId);
        }
        setSelectedKPIs(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedKPIs.size === filteredUnassigned.length) {
            setSelectedKPIs(new Set());
        } else {
            setSelectedKPIs(new Set(filteredUnassigned.map(kpi => kpi.id)));
        }
    };

    const handleAssign = async () => {
        if (selectedKPIs.size === 0 || !assigneeEmail.trim()) return;

        setIsAssigning(true);

        // Capture the current selection before async operations
        const kpisToAssign = Array.from(selectedKPIs);
        const emailTo = assigneeEmail.trim();

        try {
            // Use bulk assignment to prevent race conditions
            await bulkAssignKPIs(scorecard.id, kpisToAssign, emailTo);

            // Clear selection and email
            setSelectedKPIs(new Set());
            setAssigneeEmail('');
        } catch (error) {
            console.error('[AssignmentManager] Failed to assign KPIs:', error);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleUnassign = async (kpiId: string) => {
        try {
            // Use updateKPI to clear assignee and updateToken
            await updateKPI(scorecard.id, kpiId, {
                assignee: undefined,
                updateToken: undefined
            });
        } catch (error) {
            console.error('Failed to unassign KPI:', error);
        }
    };

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

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Assignment Manager"
            subtitle={`${assignedGroups.size} Assignees • ${scorecard.kpis.length} Total Metrics`}
            maxWidth="max-w-4xl"
            footer={
                <button onClick={onClose} className="btn btn-primary w-full">
                    Done
                </button>
            }
        >
            {/* Unassigned Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-industrial-300 uppercase tracking-wider">
                        Unassigned Metrics ({unassignedKPIs.length})
                    </h3>
                    {unassignedKPIs.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            className="text-xs text-industrial-400 hover:text-industrial-200 transition-colors"
                        >
                            {selectedKPIs.size === filteredUnassigned.length && filteredUnassigned.length > 0
                                ? 'Deselect All'
                                : 'Select All'}
                        </button>
                    )}
                </div>

                {/* Search */}
                {unassignedKPIs.length > 5 && (
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" />
                        <input
                            type="text"
                            className="input pl-10 w-full"
                            placeholder="Search metrics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}

                {/* Unassigned KPI List Grouped by Section */}
                {filteredUnassigned.length > 0 ? (
                    <div className="space-y-6 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        {(() => {
                            // Group filtered KPIs by section
                            const sectionsMap = new Map<string | null, KPI[]>();

                            // Initialize with defined sections in order
                            (scorecard.sections || []).forEach(section => {
                                sectionsMap.set(section.id, []);
                            });
                            // Add unassigned group
                            sectionsMap.set(null, []);

                            // Populate groups
                            filteredUnassigned.forEach(kpi => {
                                const sectionId = kpi.sectionId || null;
                                if (sectionsMap.has(sectionId)) {
                                    sectionsMap.get(sectionId)?.push(kpi);
                                } else {
                                    // Fallback for deleted sections
                                    sectionsMap.get(null)?.push(kpi);
                                }
                            });

                            return Array.from(sectionsMap.entries()).map(([sectionId, kpis]) => {
                                if (kpis.length === 0) return null;

                                const section = scorecard.sections?.find(s => s.id === sectionId);
                                const sectionName = section ? section.name : 'General / Unassigned';
                                const allSelected = kpis.every(k => selectedKPIs.has(k.id));

                                const handleToggleSection = () => {
                                    const newSelected = new Set(selectedKPIs);
                                    if (allSelected) {
                                        kpis.forEach(k => newSelected.delete(k.id));
                                    } else {
                                        kpis.forEach(k => newSelected.add(k.id));
                                    }
                                    setSelectedKPIs(newSelected);
                                };

                                return (
                                    <div key={sectionId || 'unassigned'} className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <h4 className="text-xs font-bold text-industrial-400 uppercase tracking-wider">
                                                {sectionName}
                                            </h4>
                                            <button
                                                onClick={handleToggleSection}
                                                className="text-xs text-industrial-500 hover:text-industrial-300 transition-colors"
                                            >
                                                {allSelected ? 'Deselect Section' : 'Select Section'}
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {kpis.map(kpi => (
                                                <label
                                                    key={kpi.id}
                                                    className="flex items-start gap-3 p-3 bg-industrial-900/30 border border-industrial-800 rounded hover:bg-industrial-800/50 cursor-pointer transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="mt-0.5 form-checkbox rounded bg-industrial-900 border-industrial-700 text-industrial-500 focus:ring-industrial-500"
                                                        checked={selectedKPIs.has(kpi.id)}
                                                        onChange={() => handleToggleKPI(kpi.id)}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-industrial-100">{kpi.name}</div>
                                                        {kpi.subtitle && (
                                                            <div className="text-xs text-industrial-500 mt-0.5">{kpi.subtitle}</div>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-sm text-industrial-400">{getDisplayValue(kpi.value)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                ) : (
                    <div className="text-center py-8 text-industrial-500 text-sm">
                        {searchQuery ? 'No metrics match your search' : 'All metrics are assigned'}
                    </div>
                )}

                {/* Bulk Assignment Controls */}
                {selectedKPIs.size > 0 && (
                    <div className="flex gap-3 pt-4 border-t border-industrial-800">
                        <div className="flex-1">
                            <input
                                type="email"
                                className="input w-full"
                                placeholder="Enter email address..."
                                value={assigneeEmail}
                                onChange={(e) => setAssigneeEmail(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && assigneeEmail.trim()) {
                                        e.preventDefault();
                                        handleAssign();
                                    }
                                }}
                            />
                        </div>
                        <button
                            onClick={handleAssign}
                            disabled={!assigneeEmail.trim() || isAssigning}
                            className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                            <UserPlus size={16} />
                            Assign {selectedKPIs.size} Metric{selectedKPIs.size !== 1 ? 's' : ''}
                        </button>
                    </div>
                )}
            </div>

            {/* Assigned Section */}
            {assignedGroups.size > 0 && (
                <div className="space-y-4 pt-6 border-t-2 border-industrial-800">
                    <h3 className="text-sm font-semibold text-industrial-300 uppercase tracking-wider">
                        Assigned Metrics
                    </h3>

                    <div className="space-y-3">
                        {Array.from(assignedGroups.entries()).map(([email, kpis]) => (
                            <div key={email} className="border border-industrial-800 rounded-lg bg-industrial-900/30 overflow-hidden">
                                <div className="p-4 flex items-center justify-between bg-industrial-900/50">
                                    <div>
                                        <h4 className="text-industrial-100 font-medium">{email}</h4>
                                        <p className="text-xs text-industrial-500 font-mono mt-0.5">
                                            {kpis.length} Metric{kpis.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCopyLink(email)}
                                        className="btn btn-sm btn-secondary flex items-center gap-2"
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
                                <div className="divide-y divide-industrial-800/50">
                                    {kpis.map(kpi => (
                                        <div key={kpi.id} className="flex items-center justify-between p-3 hover:bg-industrial-800/30 transition-colors">
                                            <div className="flex-1">
                                                <div className="text-sm text-industrial-200">{kpi.name}</div>
                                                {kpi.subtitle && (
                                                    <div className="text-xs text-industrial-500 mt-0.5">{kpi.subtitle}</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm text-industrial-400">{getDisplayValue(kpi.value)}</span>
                                                <button
                                                    onClick={() => handleUnassign(kpi.id)}
                                                    className="text-industrial-500 hover:text-red-400 transition-colors"
                                                    title="Unassign"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
}
