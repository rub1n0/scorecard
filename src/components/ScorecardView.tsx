'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Scorecard, KPI, Section } from '@/types';
import { ParsedKPI } from '@/utils/csvParser';
import { useScorecards } from '@/context/ScorecardContext';
import KPITile from './KPITile';
import KPIForm from './KPIForm';
import CSVImport from './CSVImport';
import SectionManagementModal from './SectionManagementModal';
import AssignmentManager from './AssignmentManager';
import { Plus, Upload, BarChart3, Settings, ChevronDown, Layout, User, Download, Link2, Copy, Check, Eye, RefreshCcw, Trash2, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from './PageHeader';
import Modal from './Modal';
import KPIVisibilityModal from './KPIVisibilityModal';
import { v4 as uuidv4 } from 'uuid';



interface ScorecardViewProps {
    scorecard: Scorecard;
}

type AssigneeLinkRow = {
    email: string;
    token: string | null;
    count: number;
};

type SectionLinkRow = {
    label: string;
    token: string | null;
    key: string;
    email: string;
};

const generateId = () => (typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : uuidv4());

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        addKPI,
        addKPIs,
        updateKPI,
        deleteKPI,
        refreshScorecards,
        updateScorecard,
        regenerateAssigneeToken,
        deleteAssigneeToken,
    } = useScorecards();
    const [showKPIForm, setShowKPIForm] = useState(false);
    const [showCSVImport, setShowCSVImport] = useState(false);
    const [showSectionManagement, setShowSectionManagement] = useState(false);
    const [showAssignmentManager, setShowAssignmentManager] = useState(false);
    const [showMetricVisibility, setShowMetricVisibility] = useState(false);
    const [showLinksModal, setShowLinksModal] = useState(false);
    const [linksLoading, setLinksLoading] = useState(false);
    const [showManageDropdown, setShowManageDropdown] = useState(false);
    const [editingKPI, setEditingKPI] = useState<KPI | undefined>();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [assigneeLinks, setAssigneeLinks] = useState<AssigneeLinkRow[]>([]);
    const [sectionLinks, setSectionLinks] = useState<SectionLinkRow[]>([]);
    const [copyState, setCopyState] = useState<string>('');
    const [rowActionLoading, setRowActionLoading] = useState<Record<string, boolean>>({});

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowManageDropdown(false);
            }
        };

        if (showManageDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showManageDropdown]);

    useEffect(() => {
        if (!showLinksModal) {
            setRowActionLoading({});
        }
    }, [showLinksModal]);

    const handleAddKPI = (kpiData: Omit<KPI, 'id'>) => {
        addKPI(scorecard.id, kpiData);
        setShowKPIForm(false);
    };

    const handleEditKPI = (kpi: KPI) => {
        setEditingKPI(kpi);
        setShowKPIForm(true);
    };

    const handleUpdateKPI = (kpiData: Omit<KPI, 'id'>) => {
        if (editingKPI) {
            updateKPI(scorecard.id, editingKPI.id, kpiData);
            setShowKPIForm(false);
            setEditingKPI(undefined);
        }
    };

    const handleDeleteKPI = (kpiId: string) => {
        if (confirm('Are you sure you want to delete this KPI?')) {
            deleteKPI(scorecard.id, kpiId);
        }
    };

    const handleCloseForm = () => {
        setShowKPIForm(false);
        setEditingKPI(undefined);
    };

    const handleCSVImport = async (kpis: ParsedKPI[]) => {
        try {
            // Extract unique section names from KPIs
            const sectionNames = new Set<string>();
            kpis.forEach(kpi => {
                if (kpi.sectionName) {
                    sectionNames.add(kpi.sectionName);
                }
            });

            // Create sections that don't exist and build a name->id map
            const sectionNameToId = new Map<string, string>();

            // Add existing sections to the map
            const existingSections = scorecard.sections || [];
            existingSections.forEach(section => {
                sectionNameToId.set(section.name, section.id);
            });

            // Define colors for new sections (cycle through available colors)
            const availableColors = ['verdigris', 'tuscan-sun', 'sandy-brown', 'burnt-peach', 'charcoal-blue'];
            let colorIndex = existingSections.length % availableColors.length;

            // Prepare new sections
            const newSections: Section[] = [];
            for (const sectionName of sectionNames) {
                if (!sectionNameToId.has(sectionName)) {
                    const newSectionId = generateId();
                    const newSection: Section = {
                        id: newSectionId,
                        name: sectionName,
                        color: availableColors[colorIndex],
                        order: existingSections.length + newSections.length,
                    };
                    newSections.push(newSection);
                    sectionNameToId.set(sectionName, newSectionId);
                    colorIndex = (colorIndex + 1) % availableColors.length;
                }
            }

            // Batch update sections if needed
            if (newSections.length > 0) {
                const allSections = [...existingSections, ...newSections];
                await updateScorecard(scorecard.id, { sections: allSections });
                await refreshScorecards();
            }

            // Map KPIs to their sections and prepare for import
            const kpisWithSections = kpis.map(kpi => {
                const { sectionName, ...kpiData } = kpi;
                const sectionId = sectionName ? sectionNameToId.get(sectionName) : undefined;

                return {
                    ...kpiData,
                    sectionId,
                    sectionName,
                };
            });

            const response = await fetch('/api/kpis/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scorecardId: scorecard.id,
                    kpis: kpisWithSections,
                }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to import CSV');
            }

            await refreshScorecards();
            setShowCSVImport(false);
        } catch (error) {
            alert(`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleExportBackup = () => {
        const backup = {
            name: scorecard.name,
            description: scorecard.description,
            kpis: scorecard.kpis,
            sections: scorecard.sections,
            assignees: scorecard.assignees,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${scorecard.name.replace(/[^a-z0-9]/gi, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setShowManageDropdown(false);
    };

    const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            // Validate backup structure
            if (!backup.kpis || !Array.isArray(backup.kpis)) {
                throw new Error('Invalid backup file: missing KPIs data');
            }

            // Confirm with user
            const confirmed = confirm(
                `Import backup from ${new Date(backup.exportedAt).toLocaleDateString()}?\n\n` +
                `This will add ${backup.kpis.length} metrics and ${backup.sections?.length || 0} sections to this scorecard.`
            );

            if (!confirmed) return;

            // Import sections if present
            if (backup.sections && Array.isArray(backup.sections)) {
                const existingSections = scorecard.sections || [];
                const newSections = backup.sections.map((s: Section) => ({
                    ...s,
                    id: generateId(), // Generate new IDs
                    order: existingSections.length + backup.sections.indexOf(s)
                }));

                await updateScorecard(scorecard.id, {
                    sections: [...existingSections, ...newSections]
                });
                await refreshScorecards();
            }

            // Import KPIs (strip IDs, assign new ones)
            const kpisToImport = backup.kpis.map((kpi: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id: _id, ...rest } = kpi;
                return rest;
            });
            await addKPIs(scorecard.id, kpisToImport);

            alert('Backup imported successfully!');
        } catch (error) {
            alert(`Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Reset file input
        if (e.target) {
            e.target.value = '';
        }
    };

    const visibleKPIs = useMemo(() => scorecard.kpis.filter(kpi => kpi.visible !== false), [scorecard.kpis]);

    // Grouping Logic with Section Support
    const groupedKPIs = useMemo(() => {
        const groups: Map<string | null, { section: Section | null; kpis: KPI[] }> = new Map();

        // Initialize groups for defined sections
        (scorecard.sections || []).forEach(section => {
            groups.set(section.id, { section, kpis: [] });
        });

        // Add unassigned/general group
        groups.set(null, { section: null, kpis: [] });

        // Assign KPIs to groups
        visibleKPIs.forEach(kpi => {
            const sectionId = kpi.sectionId || null;
            const group = groups.get(sectionId);
            if (group) {
                group.kpis.push(kpi);
            } else {
                // If section doesn't exist, put in unassigned
                const unassignedGroup = groups.get(null);
                if (unassignedGroup) unassignedGroup.kpis.push(kpi);
            }
        });

        return groups;
    }, [visibleKPIs, scorecard.sections]);

    const selectedSectionParam = searchParams?.get('section') || null;
    const sortedSections = useMemo(() => {
        const defined = (scorecard.sections || []).sort((a, b) => a.order - b.order);
        const all = [...defined, null]; // null represents unassigned
        if (!selectedSectionParam) return all;
        if (selectedSectionParam === 'unassigned') return [null];
        return all.filter(sec => (sec ? sec.id === selectedSectionParam : false));
    }, [scorecard.sections, selectedSectionParam]);

    const buildActionKey = (type: 'assignee' | 'section', identifier: string) => `${type}:${identifier}`;
    const setActionLoading = (key: string, value: boolean) => {
        setRowActionLoading(prev => ({ ...prev, [key]: value }));
    };
    const isActionLoading = (key: string) => Boolean(rowActionLoading[key]);

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

    const loadLinks = async () => {
        setLinksLoading(true);
        try {
            const response = await fetch(`/api/scorecards/${scorecard.id}`);
            if (!response.ok) {
                throw new Error('Failed to load scorecard data');
            }
            const latest: Scorecard = await response.json();
            const assigneeMap = latest.assignees || {};

            const emailSet = new Set<string>();
            latest.kpis.forEach(kpi => {
                if (kpi.assignee) emailSet.add(kpi.assignee);
                (kpi.assignees || []).forEach(email => {
                    if (email) emailSet.add(email);
                });
            });

            const updatedAssigneeLinks: AssigneeLinkRow[] = Array.from(emailSet).map(email => {
                const count = latest.kpis.filter(kpi => {
                    const list = new Set([
                        ...(kpi.assignees || []),
                        ...(kpi.assignee ? [kpi.assignee] : []),
                    ]);
                    return list.has(email);
                }).length;
                return {
                    email,
                    count,
                    token: assigneeMap[email] ?? null,
                };
            });
            setAssigneeLinks(updatedAssigneeLinks);

            const orderedSections = [...(latest.sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const allSections: (Section | null)[] = [...orderedSections, null];
            const sectionRows: SectionLinkRow[] = allSections.map(sec => {
                const key = sec?.id || 'unassigned';
                const pseudoEmail = `__section__:${key}`;
                return {
                    label: sec ? sec.name || 'Untitled Section' : 'Unassigned',
                    token: assigneeMap[pseudoEmail] ?? null,
                    key,
                    email: pseudoEmail,
                };
            });
            setSectionLinks(sectionRows);
        } catch (error) {
            console.error('Failed to load links:', error);
        } finally {
            setLinksLoading(false);
        }
    };

    const handleRegenerateLink = async (
        type: 'assignee' | 'section',
        identifier: string,
        email: string
    ) => {
        const key = buildActionKey(type, identifier);
        setActionLoading(key, true);
        try {
            await regenerateAssigneeToken(scorecard.id, email);
            await loadLinks();
        } catch (error) {
            console.error('Failed to regenerate link:', error);
        } finally {
            setActionLoading(key, false);
        }
    };

    const handleDeleteLink = async (
        type: 'assignee' | 'section',
        identifier: string,
        email: string
    ) => {
        const key = buildActionKey(type, identifier);
        setActionLoading(key, true);
        try {
            await deleteAssigneeToken(scorecard.id, email);
            if (copyState === email) {
                setCopyState('');
            }
            await loadLinks();
        } catch (error) {
            console.error('Failed to delete link:', error);
        } finally {
            setActionLoading(key, false);
        }
    };

    const getColorVariable = (colorName: string) => {
        const colorMap: Record<string, string> = {
            'verdigris': 'var(--color-verdigris-500)',
            'tuscan-sun': 'var(--color-tuscan-sun-500)',
            'sandy-brown': 'var(--color-sandy-brown-500)',
            'burnt-peach': 'var(--color-burnt-peach-500)',
            'charcoal-blue': 'var(--color-charcoal-blue-500)',
        };
        return colorMap[colorName] || 'var(--color-industrial-500)';
    };

    return (
        <div className="min-h-screen bg-industrial-950">
            <PageHeader
                onBack={() => router.push('/')}
                icon={<BarChart3 size={18} className="text-industrial-100" />}
                label="Scorecard"
                title={scorecard.name}
                subtitle={`${visibleKPIs.length} Visible Metrics • Updated ${new Date(scorecard.updatedAt).toLocaleDateString()}`}
                rightContent={
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowManageDropdown(!showManageDropdown)}
                            className="btn btn-secondary btn-sm"
                        >
                            <Settings size={16} />
                            Manage Scorecard
                            <ChevronDown size={16} />
                        </button>

                        {showManageDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-industrial-900 border border-industrial-700 rounded-md shadow-lg z-10 animate-fade-in">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setShowManageDropdown(false);
                                            router.push(`/assignments?scorecard=${scorecard.id}`);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                                    >
                                        <User size={14} />
                                        Assignments
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowManageDropdown(false);
                                            setShowLinksModal(true);
                                            loadLinks();
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                                    >
                                        <Link2 size={14} />
                                        Links
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowSectionManagement(true);
                                            setShowManageDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                                    >
                                        <Layout size={14} />
                                        Sections
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMetricVisibility(true);
                                            setShowManageDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                                    >
                                        <Eye size={14} />
                                        Metrics
                                    </button>
                                    <div className="border-t border-industrial-800 my-1"></div>
                                    <button
                                        onClick={() => {
                                            setShowManageDropdown(false);
                                            handleExportBackup();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-industrial-300 hover:bg-industrial-800 hover:text-industrial-100 flex items-center gap-2 transition-colors"
                                    >
                                        <Download size={14} />
                                        Backup
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowManageDropdown(false);
                                            fileInputRef.current?.click();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-industrial-300 hover:bg-industrial-800 hover:text-industrial-100 flex items-center gap-2 transition-colors"
                                    >
                                        <Upload size={14} />
                                        Restore
                                    </button>
                                    <div className="border-t border-industrial-800 my-1"></div>
                                    <button
                                        onClick={() => {
                                            setShowCSVImport(true);
                                            setShowManageDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                                    >
                                        <Upload size={14} />
                                        Import CSV
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowKPIForm(true);
                                            setShowManageDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                                    >
                                        <Plus size={14} />
                                        Add Metric
                                    </button>
                                </div>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportBackup}
                        />
                    </div>
                }
            />

            <main className="max-w-7xl mx-auto px-6 py-8">
                {scorecard.description && (
                    <div className="mb-8 p-4 border border-industrial-800 bg-industrial-900/30 rounded-md">
                        <p className="text-sm text-industrial-400 font-mono">{scorecard.description}</p>
                    </div>
                )}

                {/* KPI Grid */}
                {visibleKPIs.length > 0 ? (
                    <div className="space-y-10">
                        {sortedSections.map((sectionOrNull) => {
                            const sectionId = sectionOrNull?.id || null;
                            const group = groupedKPIs.get(sectionId);
                            if (!group || group.kpis.length === 0) return null;

                            const sectionKPIs = group.kpis.sort((a, b) => (a.order || 0) - (b.order || 0));
                            const section = group.section;
                            const showHeader = sortedSections.length > 1 || section !== null;

                            return (
                                <div key={sectionId || 'unassigned'} className="animate-fade-in">
                                    {showHeader && (
                                        <div className="mb-6">
                                            {section && (
                                                <div className="h-24 rounded mb-4 flex items-center bg-transparent">
                                                    <h2
                                                        className="text-7xl font-extrabold uppercase tracking-wider"
                                                        style={{ color: getColorVariable(section.color) }}
                                                    >
                                                        {section.name}
                                                    </h2>
                                                </div>
                                            )}
                                            {!section && (
                                                <h2 className="text-2xl font-bold text-industrial-200 uppercase tracking-wider mb-4">
                                                    General
                                                </h2>
                                            )}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {sectionKPIs.map((kpi) => (
                                            <KPITile
                                                key={kpi.id}
                                                kpi={kpi}
                                                onEdit={() => handleEditKPI(kpi)}
                                                onDelete={() => handleDeleteKPI(kpi.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="glass-card p-12 text-center animate-fade-in flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 border-industrial-800 bg-transparent">
                        <div className="p-4 bg-industrial-900 rounded-full border border-industrial-800 mb-6">
                            <BarChart3 size={32} className="text-industrial-600" />
                        </div>
                        <h3 className="text-lg font-medium text-industrial-200 mb-2">No Metrics Visible</h3>
                        <p className="text-industrial-500 mb-8 max-w-md text-sm">
                            Add metrics manually, import data, or toggle existing metrics on from Manage Scorecard &gt; Metrics to show them here.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowCSVImport(true)} className="btn btn-secondary">
                                <Upload size={16} />
                                Import Data
                            </button>
                            <button onClick={() => setShowKPIForm(true)} className="btn btn-primary">
                                <Plus size={16} />
                                Add Metric
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {showKPIForm && (
                <KPIForm
                    kpi={editingKPI}
                    sections={scorecard.sections}
                    onSave={editingKPI ? handleUpdateKPI : handleAddKPI}
                    onCancel={handleCloseForm}
                />
            )}

            {showCSVImport && (
                <CSVImport
                    onImport={handleCSVImport}
                    onCancel={() => setShowCSVImport(false)}
                    existingKPIs={scorecard.kpis}
                />
            )}

            {showSectionManagement && (
                <SectionManagementModal
                    scorecard={scorecard}
                    onClose={() => setShowSectionManagement(false)}
                />
            )}

            {showMetricVisibility && (
                <KPIVisibilityModal
                    scorecard={scorecard}
                    onClose={() => setShowMetricVisibility(false)}
                />
            )}

            {showAssignmentManager && (
                <AssignmentManager
                    scorecard={scorecard}
                    onClose={() => setShowAssignmentManager(false)}
                />
            )}

            {showLinksModal && (
                <LinksModal
                    onClose={() => setShowLinksModal(false)}
                    sectionLinks={sectionLinks}
                    assigneeLinks={assigneeLinks}
                    loading={linksLoading}
                    copyState={copyState}
                    copyToClipboard={copyToClipboard}
                    setCopyState={setCopyState}
                    buildActionKey={buildActionKey}
                    isActionLoading={isActionLoading}
                    handleRegenerateLink={handleRegenerateLink}
                    handleDeleteLink={handleDeleteLink}
                />
            )}
        </div>
    );
}

function LinksModal({
    onClose,
    sectionLinks,
    assigneeLinks,
    loading,
    copyState,
    copyToClipboard,
    setCopyState,
    buildActionKey,
    isActionLoading,
    handleRegenerateLink,
    handleDeleteLink,
}: {
    onClose: () => void;
    sectionLinks: SectionLinkRow[];
    assigneeLinks: AssigneeLinkRow[];
    loading: boolean;
    copyState: string;
    copyToClipboard: (text: string) => Promise<void>;
    setCopyState: (v: string) => void;
    buildActionKey: (type: 'assignee' | 'section', identifier: string) => string;
    isActionLoading: (key: string) => boolean;
    handleRegenerateLink: (type: 'assignee' | 'section', identifier: string, email: string) => Promise<void>;
    handleDeleteLink: (type: 'assignee' | 'section', identifier: string, email: string) => Promise<void>;
}) {

    return (
        <Modal isOpen={true} onClose={onClose} title="Share Links" maxWidth="max-w-3xl">
            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-semibold text-industrial-200 mb-2">Section Links</h4>
                    <div className="border border-industrial-800 rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-2 text-left">Section</th>
                                    <th className="px-4 py-2 text-left">Copy Link</th>
                                    <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {sectionLinks.map(link => {
                                    const sectionKey = buildActionKey('section', link.key);
                                    const actionLoading = isActionLoading(sectionKey);
                                    const fullLink = link.token ? `${window.location.origin}/update/user/${link.token}` : '';
                                    return (
                                        <tr key={link.key}>
                                            <td className="px-4 py-2 text-industrial-100">{link.label}</td>
                                            <td className="px-4 py-2 text-left">
                                                {link.token ? (
                                                    <button
                                                        className="btn btn-xs btn-ghost"
                                                        onClick={async () => {
                                                            await copyToClipboard(fullLink);
                                                            setCopyState(link.key);
                                                            setTimeout(() => setCopyState(''), 1500);
                                                        }}
                                                    >
                                                        {copyState === link.key ? <Check size={12} /> : <Copy size={12} />} Copy
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-red-400">Link removed</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-ghost"
                                                        disabled={loading || actionLoading}
                                                        onClick={() => handleRegenerateLink('section', link.key, link.email)}
                                                        title="Generate section link"
                                                    >
                                                        {actionLoading ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <RefreshCcw size={12} />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-ghost text-red-400 hover:text-red-300"
                                                        disabled={loading || actionLoading || !link.token}
                                                        onClick={() => handleDeleteLink('section', link.key, link.email)}
                                                        title="Remove section link"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-semibold text-industrial-200 mb-2">Assignee Links</h4>
                    <div className="border border-industrial-800 rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-2 text-left">Assignee</th>
                                    <th className="px-4 py-2 text-left">Metrics</th>
                                    <th className="px-4 py-2 text-left">Copy Link</th>
                                    <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-4 text-center text-industrial-500">
                                            Loading links...
                                        </td>
                                    </tr>
                                ) : assigneeLinks.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-4 text-center text-industrial-500">
                                            No assignees found.
                                        </td>
                                    </tr>
                                ) : (
                                    assigneeLinks.map(row => {
                                        const actionKey = buildActionKey('assignee', row.email);
                                        const actionLoading = isActionLoading(actionKey);
                                        const fullLink = row.token ? `${window.location.origin}/update/user/${row.token}` : '';
                                        return (
                                            <tr key={row.email}>
                                                <td className="px-4 py-2 text-industrial-100">{row.email}</td>
                                                <td className="px-4 py-2 text-industrial-400">{row.count}</td>
                                                <td className="px-4 py-2 text-left">
                                                    {row.token ? (
                                                        <button
                                                            className="btn btn-xs btn-ghost"
                                                            onClick={async () => {
                                                                await copyToClipboard(fullLink);
                                                                setCopyState(row.email);
                                                                setTimeout(() => setCopyState(''), 1500);
                                                            }}
                                                        >
                                                            {copyState === row.email ? <Check size={12} /> : <Copy size={12} />} Copy
                                                        </button>
                                                    ) : (
                                                        <span className="text-[11px] text-red-400">Link removed</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-ghost"
                                                            disabled={loading || actionLoading}
                                                            onClick={() => handleRegenerateLink('assignee', row.email, row.email)}
                                                            title="Regenerate link"
                                                        >
                                                            {actionLoading ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <RefreshCcw size={12} />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-ghost text-red-400 hover:text-red-300"
                                                            disabled={loading || actionLoading || !row.token}
                                                            onClick={() => handleDeleteLink('assignee', row.email, row.email)}
                                                            title="Remove link"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
