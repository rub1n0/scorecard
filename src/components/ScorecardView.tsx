'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Scorecard, KPI, Section } from '@/types';
import { ParsedKPI } from '@/utils/csvParser';
import { useScorecards } from '@/context/ScorecardContext';
import KPITile from './KPITile';
import KPIForm from './KPIForm';
import CSVImport from './CSVImport';
import SectionManagementModal from './SectionManagementModal';
import AssignmentManager from './AssignmentManager';
import { Plus, ArrowLeft, Upload, BarChart3, Settings, ChevronDown, Layout, User } from 'lucide-react';
import { useRouter } from 'next/navigation';



interface ScorecardViewProps {
    scorecard: Scorecard;
}

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
    const router = useRouter();
    const { addKPI, addKPIs, updateKPI, deleteKPI } = useScorecards();
    const [showKPIForm, setShowKPIForm] = useState(false);
    const [showCSVImport, setShowCSVImport] = useState(false);
    const [showSectionManagement, setShowSectionManagement] = useState(false);
    const [showAssignmentManager, setShowAssignmentManager] = useState(false);
    const [showManageDropdown, setShowManageDropdown] = useState(false);
    const [editingKPI, setEditingKPI] = useState<KPI | undefined>();
    const dropdownRef = useRef<HTMLDivElement>(null);

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
        await addKPIs(scorecard.id, kpis);
        setShowCSVImport(false);
    };

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
        scorecard.kpis.forEach(kpi => {
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
    }, [scorecard.kpis, scorecard.sections]);

    const sortedSections = useMemo(() => {
        const defined = (scorecard.sections || []).sort((a, b) => a.order - b.order);
        return [...defined, null]; // null represents unassigned
    }, [scorecard.sections]);

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
            {/* Industrial Header */}
            <header className="border-b border-industrial-800 bg-industrial-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="btn btn-icon btn-secondary" aria-label="Back to Dashboard">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="h-8 w-px bg-industrial-800"></div>
                        <div>
                            <h1 className="text-lg font-bold text-industrial-100 tracking-tight leading-none">
                                {scorecard.name}
                            </h1>
                            <p className="text-xs text-industrial-500 font-mono uppercase tracking-wider mt-0.5">
                                {scorecard.kpis.length} Metrics • Updated {new Date(scorecard.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
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
                                            setShowAssignmentManager(true);
                                            setShowManageDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                                    >
                                        <User size={14} />
                                        Manage Assignments
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowSectionManagement(true);
                                            setShowManageDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                                    >
                                        <Layout size={14} />
                                        Manage Sections
                                    </button>
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
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {scorecard.description && (
                    <div className="mb-8 p-4 border border-industrial-800 bg-industrial-900/30 rounded-md">
                        <p className="text-sm text-industrial-400 font-mono">{scorecard.description}</p>
                    </div>
                )}

                {/* KPI Grid */}
                {scorecard.kpis.length > 0 ? (
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
                                                <div
                                                    className="h-24 rounded mb-4 flex items-center px-6"
                                                    style={{
                                                        backgroundColor: getColorVariable(section.color),
                                                        opacity: section.opacity ?? 1
                                                    }}
                                                >
                                                    <h2 className="text-4xl font-bold text-industrial-950 uppercase tracking-wider">
                                                        {section.name}
                                                    </h2>
                                                </div>
                                            )}
                                            {!section && (
                                                <h2 className="text-lg font-bold text-industrial-200 uppercase tracking-wider mb-4">
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
                        <h3 className="text-lg font-medium text-industrial-200 mb-2">No Metrics Configured</h3>
                        <p className="text-industrial-500 mb-8 max-w-md text-sm">
                            This scorecard is currently empty. Add metrics manually or import data to begin tracking.
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
                    onSave={editingKPI ? handleUpdateKPI : handleAddKPI}
                    onCancel={handleCloseForm}
                />
            )}

            {showCSVImport && (
                <CSVImport
                    onImport={handleCSVImport}
                    onCancel={() => setShowCSVImport(false)}
                />
            )}

            {showSectionManagement && (
                <SectionManagementModal
                    scorecard={scorecard}
                    onClose={() => setShowSectionManagement(false)}
                />
            )}

            {showAssignmentManager && (
                <AssignmentManager
                    scorecard={scorecard}
                    onClose={() => setShowAssignmentManager(false)}
                />
            )}
        </div>
    );
}
