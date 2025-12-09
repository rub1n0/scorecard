'use client';

import React, { useState, useMemo } from 'react';
import { Scorecard, Section } from '@/types';
import { useScorecards } from '@/context/ScorecardContext';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit2, Check, Eye, EyeOff } from 'lucide-react';
import Modal from './Modal';

interface SectionManagementModalProps {
    scorecard: Scorecard;
    onClose: () => void;
}

const AVAILABLE_COLORS = [
    { name: 'verdigris', label: 'Verdigris', value: '#36c9b8' },
    { name: 'tuscan-sun', label: 'Tuscan Sun', value: '#dea821' },
    { name: 'sandy-brown', label: 'Sandy Brown', value: '#ee7411' },
    { name: 'burnt-peach', label: 'Burnt Peach', value: '#e0451f' },
    { name: 'charcoal-blue', label: 'Charcoal Blue', value: '#5094af' },
];

export default function SectionManagementModal({ scorecard, onClose }: SectionManagementModalProps) {
    const { addSection, updateSection, deleteSection, assignKPIToSection, reorderKPIsInSection, reorderSections, updateKPI } = useScorecards();
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [isCreatingSection, setIsCreatingSection] = useState(false);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [pendingSectionEdits, setPendingSectionEdits] = useState<Record<string, Partial<Section>>>({});
    const [newSectionName, setNewSectionName] = useState('');
    const [newSectionColor, setNewSectionColor] = useState('verdigris');
    const [newSectionOpacity, setNewSectionOpacity] = useState(1);

    // Get sections sorted by order
    const sections = useMemo(() => {
        const definedSections = (scorecard.sections || []).sort((a, b) => a.order - b.order);
        return definedSections;
    }, [scorecard.sections]);

    // Get KPIs for selected section
    const sectionKPIs = useMemo(() => {
        const kpis = scorecard.kpis.filter(kpi => {
            const kpiSectionId = kpi.sectionId || null;
            return kpiSectionId === selectedSectionId;
        });
        return kpis.sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [scorecard.kpis, selectedSectionId]);

    // Get unassigned KPIs
    const unassignedKPIs = useMemo(() => {
        const sectionIds = new Set(sections.map(s => s.id));
        return scorecard.kpis
            .filter(kpi => !kpi.sectionId || !sectionIds.has(kpi.sectionId))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [scorecard.kpis, sections]);

    const handleCreateSection = async () => {
        if (!newSectionName.trim()) return;

        const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) : -1;
        await addSection(scorecard.id, {
            name: newSectionName.trim(),
            color: newSectionColor,
            opacity: newSectionOpacity,
            order: maxOrder + 1,
        });

        setNewSectionName('');
        setNewSectionColor('verdigris');
        setNewSectionOpacity(1);
        setIsCreatingSection(false);
    };

    const handleUpdateSection = async (sectionId: string, updates: Partial<Section>) => {
        await updateSection(scorecard.id, sectionId, updates);
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (confirm('Are you sure? KPIs in this section will be moved to unassigned.')) {
            await deleteSection(scorecard.id, sectionId);
            if (selectedSectionId === sectionId) {
                setSelectedSectionId(null);
            }
        }
    };

    const handleAssignKPI = async (kpiId: string, targetSectionId: string | null) => {
        await assignKPIToSection(scorecard.id, kpiId, targetSectionId);
    };

    const handleMoveKPI = async (kpiId: string, direction: 'up' | 'down') => {
        const currentIndex = sectionKPIs.findIndex(kpi => kpi.id === kpiId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= sectionKPIs.length) return;

        const reorderedKPIs = [...sectionKPIs];
        [reorderedKPIs[currentIndex], reorderedKPIs[newIndex]] = [reorderedKPIs[newIndex], reorderedKPIs[currentIndex]];

        await reorderKPIsInSection(
            scorecard.id,
            selectedSectionId,
            reorderedKPIs.map(kpi => kpi.id)
        );
    };

    const handleToggleVisibility = async (kpiId: string, currentVisible: boolean) => {
        const nextVisible = !currentVisible;

        // Optimistic update
        await updateKPI(scorecard.id, kpiId, { visible: nextVisible });

        // If hiding, move to bottom of section
        if (!nextVisible && selectedSectionId) {
            const reorderedKPIs = [...sectionKPIs];
            const kpiIndex = reorderedKPIs.findIndex(k => k.id === kpiId);

            if (kpiIndex !== -1 && kpiIndex < reorderedKPIs.length - 1) {
                const [kpi] = reorderedKPIs.splice(kpiIndex, 1);
                reorderedKPIs.push(kpi);

                await reorderKPIsInSection(
                    scorecard.id,
                    selectedSectionId,
                    reorderedKPIs.map(k => k.id)
                );
            }
        }
    };

    const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
        const currentIndex = sections.findIndex(s => s.id === sectionId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= sections.length) return;

        const reorderedSections = [...sections];
        [reorderedSections[currentIndex], reorderedSections[newIndex]] = [reorderedSections[newIndex], reorderedSections[currentIndex]];

        await reorderSections(
            scorecard.id,
            reorderedSections.map(s => s.id)
        );
    };

    const getColorVariable = (colorName: string) => {
        return AVAILABLE_COLORS.find(c => c.name === colorName)?.value || '#36c9b8';
    };

    const truncate = (value: string, length = 25) => (value.length > length ? `${value.slice(0, length)}...` : value);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Manage Sections"
            maxWidth="max-w-6xl"
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel: Section List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="form-label mb-0">Sections</h3>
                        <button
                            onClick={() => setIsCreatingSection(true)}
                            className="btn btn-primary btn-sm"
                        >
                            <Plus size={14} />
                            Add Section
                        </button>
                    </div>

                    <div className="space-y-2">
                        {/* Unassigned/General Section */}
                        <div
                            onClick={() => setSelectedSectionId(null)}
                            className={`w-full p-4 rounded-md border transition-all cursor-pointer ${selectedSectionId === null
                                ? 'border-industrial-500 bg-industrial-800'
                                : 'border-industrial-800 bg-industrial-950 hover:border-industrial-700'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-industrial-700 flex items-center justify-center text-xs font-mono text-industrial-400">
                                    ?
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-industrial-200">
                                        Unassigned
                                    </div>
                                    <div className="text-xs text-industrial-500">
                                        {unassignedKPIs.length} KPIs
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Defined Sections */}
                        {sections.map((section, index) => (
                            <div
                                key={section.id}
                                className={`p-4 rounded-md border transition-all ${selectedSectionId === section.id
                                    ? 'border-industrial-500 bg-industrial-800'
                                    : 'border-industrial-800 bg-industrial-950'
                                    }`}
                            >
                                {editingSectionId === section.id ? (
                                    <div className="space-y-3">
                                        {(() => {
                                            const draft = pendingSectionEdits[section.id] || {
                                                name: section.name,
                                                color: section.color,
                                                opacity: section.opacity ?? 1,
                                            };
                                            return (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={draft.name}
                                                        onChange={(e) =>
                                                            setPendingSectionEdits(prev => ({
                                                                ...prev,
                                                                [section.id]: {
                                                                    ...draft,
                                                                    name: e.target.value
                                                                }
                                                            }))
                                                        }
                                                        className="input text-sm"
                                                        placeholder="Section name"
                                                    />
                                                    <div className="flex gap-2">
                                                        {AVAILABLE_COLORS.map((color) => (
                                                            <button
                                                                key={color.name}
                                                                onClick={() =>
                                                                    setPendingSectionEdits(prev => ({
                                                                        ...prev,
                                                                        [section.id]: {
                                                                            ...draft,
                                                                            color: color.name
                                                                        }
                                                                    }))
                                                                }
                                                                className={`w-8 h-8 rounded border-2 transition-all ${draft.color === color.name
                                                                    ? 'border-white scale-110'
                                                                    : 'border-transparent'
                                                                    }`}
                                                                style={{ backgroundColor: color.value }}
                                                                title={color.label}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="mt-2">
                                                        <label className="text-xs text-industrial-400 block mb-1">Opacity: {Math.round((draft.opacity ?? 1) * 100)}%</label>
                                                        <input
                                                            type="range"
                                                            min="0.1"
                                                            max="1"
                                                            step="0.1"
                                                            value={draft.opacity ?? 1}
                                                            onChange={(e) => setPendingSectionEdits(prev => ({
                                                                ...prev,
                                                                [section.id]: {
                                                                    ...draft,
                                                                    opacity: parseFloat(e.target.value)
                                                                }
                                                            }))}
                                                            className="w-full accent-industrial-500"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            await handleUpdateSection(section.id, draft);
                                                            setEditingSectionId(null);
                                                            setPendingSectionEdits(prev => {
                                                                const next = { ...prev };
                                                                delete next[section.id];
                                                                return next;
                                                            });
                                                        }}
                                                        className="btn btn-secondary btn-sm w-full mt-2"
                                                    >
                                                        <Check size={14} />
                                                        Done
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setSelectedSectionId(section.id)}
                                        className="w-full cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1 mr-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMoveSection(section.id, 'up');
                                                    }}
                                                    disabled={index === 0}
                                                    className="btn-icon p-0.5 disabled:opacity-30 hover:bg-industrial-700 rounded"
                                                >
                                                    <ChevronUp size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMoveSection(section.id, 'down');
                                                    }}
                                                    disabled={index === sections.length - 1}
                                                    className="btn-icon p-0.5 disabled:opacity-30 hover:bg-industrial-700 rounded"
                                                >
                                                    <ChevronDown size={12} />
                                                </button>
                                            </div>
                                            <div
                                                className="w-8 h-8 rounded flex-shrink-0"
                                                style={{ backgroundColor: getColorVariable(section.color) }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-industrial-200 truncate">
                                                    {section.name}
                                                </div>
                                                <div className="text-xs text-industrial-500">
                                                    {scorecard.kpis.filter(kpi => kpi.sectionId === section.id).length} KPIs
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPendingSectionEdits(prev => ({
                                                            ...prev,
                                                            [section.id]: {
                                                                name: section.name,
                                                                color: section.color,
                                                                opacity: section.opacity ?? 1,
                                                            }
                                                        }));
                                                        setEditingSectionId(section.id);
                                                    }}
                                                    className="btn-icon p-1"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteSection(section.id);
                                                    }}
                                                    className="btn-icon p-1 text-red-500 hover:text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Create Section Form */}
                        {isCreatingSection && (
                            <div className="p-4 rounded-md border border-industrial-700 bg-industrial-900 space-y-3">
                                <input
                                    type="text"
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    className="input text-sm"
                                    placeholder="Section name"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    {AVAILABLE_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => setNewSectionColor(color.name)}
                                            className={`w-8 h-8 rounded border-2 transition-all ${newSectionColor === color.name
                                                ? 'border-white scale-110'
                                                : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <label className="text-xs text-industrial-400 block mb-1">Opacity: {Math.round(newSectionOpacity * 100)}%</label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.1"
                                        value={newSectionOpacity}
                                        onChange={(e) => setNewSectionOpacity(parseFloat(e.target.value))}
                                        className="w-full accent-industrial-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreateSection}
                                        className="btn btn-primary btn-sm flex-1"
                                        disabled={!newSectionName.trim()}
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreatingSection(false);
                                            setNewSectionName('');
                                            setNewSectionColor('verdigris');
                                        }}
                                        className="btn btn-secondary btn-sm flex-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: KPI Assignment */}
                <div className="space-y-4">
                    <h3 className="form-label mb-0">
                        {selectedSectionId === null
                            ? 'Unassigned KPIs'
                            : `KPIs in ${sections.find(s => s.id === selectedSectionId)?.name || 'Section'}`}
                    </h3>

                    {selectedSectionId === null ? (
                        /* Show unassigned KPIs */
                        <div className="space-y-1">
                            {unassignedKPIs.length === 0 ? (
                                <p className="text-sm text-industrial-500 p-4 text-center">
                                    No unassigned KPIs
                                </p>
                            ) : (
                                unassignedKPIs.map((kpi) => (
                                    <div
                                        key={kpi.id}
                                        className="p-2 rounded-md border border-industrial-800 bg-industrial-950"
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div >
                                                    <a className="text-sm text-industrial-200 font-mono truncate" title={kpi.name}>{kpi.name} </a>
                                                    <a className="text-xs text-industrial-500 font-mono truncate" title={kpi.subtitle || kpi.name}>{kpi.subtitle ? truncate(kpi.subtitle, 25) : truncate(kpi.name, 25)}</a>
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-auto">
                                                <select
                                                    onChange={(e) => handleAssignKPI(kpi.id, e.target.value || null)}
                                                    className="select text-xs py-1 px-2 w-full sm:w-40"
                                                    defaultValue=""
                                                >
                                                    <option value="">Assign to...</option>
                                                    {sections.map((section) => (
                                                        <option key={section.id} value={section.id}>
                                                            {section.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        /* Show KPIs in selected section with reordering */
                        <div className="space-y-2">
                            {sectionKPIs.length === 0 ? (
                                <p className="text-sm text-industrial-500 p-4 text-center">
                                    No KPIs in this section
                                </p>
                            ) : (
                                sectionKPIs.map((kpi, index) => (
                                    <div
                                        key={kpi.id}
                                        className="p-3 rounded-md border border-industrial-800 bg-industrial-950"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleMoveKPI(kpi.id, 'up')}
                                                    disabled={index === 0}
                                                    className="btn-icon p-1 disabled:opacity-30"
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveKPI(kpi.id, 'down')}
                                                    disabled={index === sectionKPIs.length - 1}
                                                    className="btn-icon p-1 disabled:opacity-30"
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-mono truncate ${kpi.visible === false ? 'text-industrial-500' : 'text-industrial-200'}`}>
                                                        {kpi.name}
                                                    </span>
                                                    {kpi.visible === false && (
                                                        <span className="text-[10px] text-industrial-500 border border-industrial-800 px-1 rounded">Hidden</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleVisibility(kpi.id, kpi.visible !== false)}
                                                className={`btn-icon p-1.5 ${kpi.visible === false ? 'text-industrial-600 hover:text-industrial-400' : 'text-industrial-400 hover:text-verdigris-400'}`}
                                                title={kpi.visible !== false ? "Hide metric" : "Show metric"}
                                            >
                                                {kpi.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                                            </button>
                                            <button
                                                onClick={() => handleAssignKPI(kpi.id, null)}
                                                className="btn btn-secondary btn-sm text-xs"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
