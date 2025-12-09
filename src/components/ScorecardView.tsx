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
import { Plus, Upload, BarChart3, Settings, ChevronDown, Layout, User, Download, Link2, Copy, Check, Eye } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from './PageHeader';
import Modal from './Modal';
import MetricVisibilityModal from './MetricVisibilityModal';
import { v4 as uuidv4 } from 'uuid';



interface ScorecardViewProps {
    scorecard: Scorecard;
}

const generateId = () => (typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : uuidv4());

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addKPI, addKPIs, updateKPI, deleteKPI, refreshScorecards, updateScorecard, generateAssigneeToken } = useScorecards();
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
    const [assigneeLinks, setAssigneeLinks] = useState<{ email: string; token: string; count: number }[]>([]);
    const [sectionLinks, setSectionLinks] = useState<{ label: string; token: string; key: string }[]>([]);
    const [copyState, setCopyState] = useState<string>('');

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

            const response = await fetch('/api/metrics/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scorecardId: scorecard.id,
                    metrics: kpisWithSections,
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

    const assigneeEmails = useMemo(() => {
        const emails = new Set<string>();
        scorecard.kpis.forEach(kpi => {
            if (kpi.assignee) emails.add(kpi.assignee);
            (kpi.assignees || []).forEach(e => emails.add(e));
        });
        return Array.from(emails);
    }, [scorecard.kpis]);

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
            const rows: { email: string; token: string; count: number }[] = [];
            for (const email of assigneeEmails) {
                let token = scorecard.assignees?.[email];
                if (!token) {
                    token = await generateAssigneeToken(scorecard.id, email);
                }
                const count = scorecard.kpis.filter(kpi => {
                    const list = new Set([...(kpi.assignees || []), ...(kpi.assignee ? [kpi.assignee] : [])]);
                    return list.has(email);
                }).length;
                rows.push({ email, token, count });
            }
            setAssigneeLinks(rows);

            const allSections: (Section | null)[] = [...(scorecard.sections || []).sort((a, b) => a.order - b.order), null];
            const sectionRows: { label: string; token: string; key: string }[] = [];
            for (const sec of allSections) {
                const key = sec?.id || 'unassigned';
                const pseudoEmail = `__section__:${key}`;
                const label = sec ? sec.name || 'Untitled Section' : 'Unassigned';
                let token = scorecard.assignees?.[pseudoEmail];
                if (!token) {
                    token = await generateAssigneeToken(scorecard.id, pseudoEmail);
                }
                sectionRows.push({ label, token, key });
            }
            setSectionLinks(sectionRows);
        } finally {
            setLinksLoading(false);
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
                            className="btn btn-primary btn-sm"
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
                <MetricVisibilityModal
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
    setCopyState
}: {
    onClose: () => void;
    sectionLinks: { label: string; token: string; key: string }[];
    assigneeLinks: { email: string; token: string; count: number }[];
    loading: boolean;
    copyState: string;
    copyToClipboard: (text: string) => Promise<void>;
    setCopyState: (v: string) => void;
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
                                    <th className="px-4 py-2 text-right">Copy Link</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {sectionLinks.map(link => {
                                    const fullLink = `${window.location.origin}/update/user/${link.token}`;
                                    return (
                                        <tr key={link.key}>
                                            <td className="px-4 py-2 text-industrial-100">{link.label}</td>
                                            <td className="px-4 py-2 text-right">
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
                                    <th className="px-4 py-2 text-right">Copy Link</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-4 text-center text-industrial-500">
                                            Loading links...
                                        </td>
                                    </tr>
                                ) : assigneeLinks.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-4 text-center text-industrial-500">
                                            No assignees found.
                                        </td>
                                    </tr>
                                ) : (
                                    assigneeLinks.map(row => {
                                        const link = `${window.location.origin}/update/user/${row.token}`;
                                        return (
                                            <tr key={row.email}>
                                                <td className="px-4 py-2 text-industrial-100">{row.email}</td>
                                                <td className="px-4 py-2 text-industrial-400">{row.count}</td>
                                                <td className="px-4 py-2 text-right">
                                                    <button
                                                        className="btn btn-xs btn-ghost"
                                                        onClick={async () => {
                                                            await copyToClipboard(link);
                                                            setCopyState(row.email);
                                                            setTimeout(() => setCopyState(''), 1500);
                                                        }}
                                                    >
                                                        {copyState === row.email ? <Check size={12} /> : <Copy size={12} />} Copy
                                                    </button>
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
