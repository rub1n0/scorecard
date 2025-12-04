'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Scorecard, KPI } from '@/types';
import { useScorecards } from '@/context/ScorecardContext';
import { Check, Copy, ExternalLink, Search, UserPlus, Link as LinkIcon, Trash2 } from 'lucide-react';
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
    const [assigneeLinks, setAssigneeLinks] = useState<Record<string, string>>({});

    const getAssigneeList = (kpi: KPI) => {
        const combined = [
            ...(kpi.assignees || []),
            ...(kpi.assignee ? [kpi.assignee] : []),
        ].filter(Boolean) as string[];

        return Array.from(new Set(combined));
    };

    type KPIWithAssignees = KPI & { assigneeList: string[] };

    const kpisWithAssignees = useMemo<KPIWithAssignees[]>(() =>
        scorecard.kpis.map(kpi => ({
            ...kpi,
            assigneeList: getAssigneeList(kpi),
        })), [scorecard.kpis]);

    const { assignedGroups, unassignedCount } = useMemo(() => {
        const groups = new Map<string, KPIWithAssignees[]>();
        let unassigned = 0;

        kpisWithAssignees.forEach(kpi => {
            if (kpi.assigneeList.length === 0) {
                unassigned += 1;
                return;
            }

            kpi.assigneeList.forEach(email => {
                const existing = groups.get(email) || [];
                groups.set(email, [...existing, kpi]);
            });
        });

        return { assignedGroups: groups, unassignedCount: unassigned };
    }, [kpisWithAssignees]);

    const filteredKPIs = useMemo(() => {
        if (!searchQuery) return kpisWithAssignees;
        const query = searchQuery.toLowerCase();
        return kpisWithAssignees.filter(kpi =>
            kpi.name.toLowerCase().includes(query) ||
            kpi.subtitle?.toLowerCase().includes(query)
        );
    }, [kpisWithAssignees, searchQuery]);

    // Prefill link cache from existing tokens
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const origin = window.location.origin;
        const baseLinks: Record<string, string> = {};

        Object.entries(scorecard.assignees || {}).forEach(([email, token]) => {
            baseLinks[email] = `${origin}/update/user/${token}`;
        });

        if (Object.keys(baseLinks).length > 0) {
            setAssigneeLinks(prev => ({ ...baseLinks, ...prev }));
        }
    }, [scorecard.assignees]);

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
        if (selectedKPIs.size === filteredKPIs.length) {
            setSelectedKPIs(new Set());
        } else {
            setSelectedKPIs(new Set(filteredKPIs.map(kpi => kpi.id)));
        }
    };

    const handleAssign = async () => {
        const emails = assigneeEmail
            .split(/[,;\s]+/)
            .map(email => email.trim())
            .filter(Boolean);

        if (selectedKPIs.size === 0 || emails.length === 0) return;

        setIsAssigning(true);

        // Capture the current selection before async operations
        const kpisToAssign = Array.from(selectedKPIs);

        try {
            // Use bulk assignment to prevent race conditions
            await bulkAssignKPIs(scorecard.id, kpisToAssign, emails);

            // Clear selection and email
            setSelectedKPIs(new Set());
            setAssigneeEmail('');
        } catch (error) {
            console.error('[AssignmentManager] Failed to assign KPIs:', error);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleUnassign = async (kpiId: string, email: string) => {
        try {
            const kpi = scorecard.kpis.find(item => item.id === kpiId);
            if (!kpi) return;

            const remainingAssignees = getAssigneeList(kpi).filter(a => a !== email);

            await updateKPI(scorecard.id, kpiId, {
                assignees: remainingAssignees,
                assignee: remainingAssignees[0],
                updateToken: remainingAssignees.length === 0 ? undefined : kpi.updateToken
            });
        } catch (error) {
            console.error('Failed to unassign KPI:', error);
        }
    };

    const handleCopyLink = async (email: string) => {
        try {
            let url = assigneeLinks[email];

            if (!url) {
                const token = await generateAssigneeToken(scorecard.id, email);
                if (typeof window === 'undefined') return;
                url = `${window.location.origin}/update/user/${token}`;
                setAssigneeLinks(prev => ({ ...prev, [email]: url }));
            }

            if (typeof navigator === 'undefined' || !navigator.clipboard) return;
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
            {/* Metric Selection */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-industrial-300 uppercase tracking-wider">
                            Metrics ({filteredKPIs.length} shown)
                        </h3>
                        <p className="text-xs text-industrial-500 mt-1">
                            {unassignedCount} unassigned
                        </p>
                    </div>
                    {filteredKPIs.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            className="text-xs text-industrial-400 hover:text-industrial-200 transition-colors"
                        >
                            {selectedKPIs.size === filteredKPIs.length && filteredKPIs.length > 0
                                ? 'Deselect All'
                                : 'Select All'}
                        </button>
                    )}
                </div>

                {/* Search */}
                {kpisWithAssignees.length > 5 && (
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

                {/* KPI List Grouped by Section */}
                {filteredKPIs.length > 0 ? (
                    <div className="space-y-6 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        {(() => {
                            // Group filtered KPIs by section
                            const sectionsMap = new Map<string | null, KPIWithAssignees[]>();

                            // Initialize with defined sections in order
                            (scorecard.sections || []).forEach(section => {
                                sectionsMap.set(section.id, []);
                            });
                            // Add unassigned group
                            sectionsMap.set(null, []);

                            // Populate groups
                            filteredKPIs.forEach(kpi => {
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
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {kpi.assigneeList.length > 0 ? (
                                                                kpi.assigneeList.map(email => (
                                                                    <span
                                                                        key={email}
                                                                        className="px-2 py-0.5 bg-industrial-800 text-industrial-300 rounded text-[11px] border border-industrial-700"
                                                                    >
                                                                        {email}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-industrial-500">Unassigned</span>
                                                            )}
                                                        </div>
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
                        {searchQuery ? 'No metrics match your search' : 'No metrics available'}
                    </div>
                )}

                {/* Bulk Assignment Controls */}
                {selectedKPIs.size > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-industrial-800">
                        <div className="flex-1">
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="Enter one or more emails (comma or space separated)..."
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
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-industrial-300 uppercase tracking-wider">
                            Assigned Metrics
                        </h3>
                        <span className="text-xs text-industrial-500">{assignedGroups.size} assignees</span>
                    </div>

                    <div className="border border-industrial-800 rounded-lg overflow-hidden bg-industrial-900/30">
                        <div className="p-3 border-b border-industrial-800/60">
                            <p className="text-sm text-industrial-200 font-medium">Assignee Links</p>
                            <p className="text-xs text-industrial-500">One link per person, covering all assigned metrics.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-industrial-400 uppercase text-[11px] bg-industrial-900/60">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Person</th>
                                        <th className="px-4 py-2 text-left">Metrics</th>
                                        <th className="px-4 py-2 text-left">Link</th>
                                        <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-industrial-800/60">
                                    {Array.from(assignedGroups.entries()).map(([email, kpis]) => {
                                        const link = assigneeLinks[email];

                                        return (
                                            <tr key={email} className="hover:bg-industrial-800/30">
                                                <td className="px-4 py-2 text-industrial-100 break-all">{email}</td>
                                                <td className="px-4 py-2 text-industrial-300">{kpis.length}</td>
                                                <td className="px-4 py-2 text-industrial-400">
                                                    {link ? (
                                                        <span className="block truncate max-w-xs sm:max-w-sm">{link}</span>
                                                    ) : (
                                                        <span className="text-industrial-600">Generating...</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleCopyLink(email)}
                                                            className="btn btn-xs btn-secondary flex items-center gap-1"
                                                        >
                                                            {copiedEmail === email ? (
                                                                <>
                                                                    <Check size={12} className="text-emerald-400" />
                                                                    <span className="text-emerald-400">Copied</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={12} />
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                        {link && (
                                                            <a
                                                                href={link}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-xs btn-ghost flex items-center gap-1"
                                                            >
                                                                <ExternalLink size={12} />
                                                                <span>Open</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

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
                                                    onClick={() => handleUnassign(kpi.id, email)}
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
