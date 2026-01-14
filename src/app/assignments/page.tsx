'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Copy, Filter, Loader2, Plus, Search, UserPlus, X, Users } from 'lucide-react';
import { useScorecards } from '@/context/ScorecardContext';
import PageHeader from '@/components/PageHeader';
import { fetchWithScorecardRole, getScorecardRole } from '@/utils/scorecardClient';
import { ScorecardRole } from '@/types';

type DbUser = { id: string; name: string | null; email: string | null };
type DbSection = { id: string; name: string | null; scorecardId: string };
type DbKPI = { id: string; name: string; subtitle?: string | null; sectionId: string | null; scorecardId: string; updateToken?: string | null; section?: DbSection | null; scorecard?: DbScorecard | null };
type DbScorecard = { id: string; name: string };
type AssignmentRow = {
    id: string;
    kpiId: string;
    sectionId: string | null;
    assignees: DbUser[];
    kpi?: DbKPI | null;
    section?: DbSection | null;
    scorecard?: DbScorecard | null;
    _virtual?: boolean;
};

type DrawerMode = { type: 'create' } | { type: 'edit'; assignment: AssignmentRow } | { type: 'bulk' };

const chip = 'px-2 py-1 rounded-full bg-industrial-900 border border-industrial-700 text-industrial-200 text-xs';

function AssignmentDashboardInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { scorecards, generateAssigneeToken, refreshScorecards } = useScorecards();

    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [sections, setSections] = useState<DbSection[]>([]);
    const [kpis, setKPIs] = useState<DbKPI[]>([]);
    const [users, setUsers] = useState<DbUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawer, setDrawer] = useState<DrawerMode | null>(null);

    const [search, setSearch] = useState('');
    const [sectionFilter, setSectionFilter] = useState<string | 'all'>('all');
    const [scorecardFilter, setScorecardFilter] = useState<string | 'all'>('all');
    const [userFilter, setUserFilter] = useState<string | 'all'>('all');
    const [showUnassigned, setShowUnassigned] = useState(false);
    const [showMultiAssigned, setShowMultiAssigned] = useState(false);
    const [copyState, setCopyState] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [role, setRole] = useState<ScorecardRole>('update');
    const canEdit = role === 'edit';

    useEffect(() => {
        const stored = getScorecardRole();
        if (stored) setRole(stored);
    }, []);

    const canManageScorecard = (scorecardId?: string | null) => {
        if (!scorecardId) return false;
        return canEdit;
    };

    // Drawer form state
    const [selectedKPIId, setSelectedKPIId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    useEffect(() => {
        const userParam = searchParams.get('user');
        const sectionParam = searchParams.get('section');
        const scorecardParam = searchParams.get('scorecard');
        if (userParam) setUserFilter(userParam);
        if (sectionParam) setSectionFilter(sectionParam);
        if (scorecardParam) setScorecardFilter(scorecardParam);
    }, [searchParams]);

    useEffect(() => {
        const load = async () => {
            if (!canEdit) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const [aRes, sRes, mRes, uRes] = await Promise.all([
                    fetchWithScorecardRole('/api/assignments'),
                    fetchWithScorecardRole('/api/sections'),
                    fetchWithScorecardRole('/api/kpis'),
                    fetchWithScorecardRole('/api/users'),
                ]);
                const [aData, sData, mData, uData] = await Promise.all([
                    aRes.json(),
                    sRes.json(),
                    mRes.json(),
                    uRes.json(),
                ]);
                setAssignments(aData as AssignmentRow[]);
                setSections(sData as DbSection[]);
                const normalizedKPIs: DbKPI[] = (mData as Array<DbKPI | { kpi: DbKPI }>).map((row) =>
                    'kpi' in row && row.kpi ? row.kpi : (row as DbKPI)
                );
                setKPIs(normalizedKPIs);
                setUsers(uData as DbUser[]);
            } catch (error) {
                console.error('Failed to load assignments dashboard', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [canEdit]);

    const resetDrawerState = () => {
        setSelectedKPIId('');
        setSelectedSectionId('');
        setSelectedUserIds([]);
    };

    const openCreateForKPI = (kpi: DbKPI) => {
        if (!canManageScorecard(kpi.scorecardId)) return;
        setDrawer({ type: 'create' });
        setSelectedKPIId(kpi.id);
        setSelectedSectionId(kpi.sectionId || '');
        setSelectedUserIds([]);
    };

    const openDrawer = (mode: DrawerMode) => {
        if (mode.type === 'edit') {
            const scorecardId = mode.assignment.scorecard?.id || mode.assignment.kpi?.scorecardId || null;
            if (!canManageScorecard(scorecardId)) return;
        }
        if (mode.type === 'bulk' && !canEdit) return;
        setDrawer(mode);
        resetDrawerState();
        if (mode.type === 'edit') {
            setSelectedKPIId(mode.assignment.kpiId);
            setSelectedSectionId(mode.assignment.sectionId || '');
            setSelectedUserIds(mode.assignment.assignees.map(a => a.id));
        }
    };

    const closeDrawer = () => {
        setDrawer(null);
        resetDrawerState();
    };

    const filteredSections = useMemo(
        () => sections.filter(s => scorecardFilter === 'all' || s.scorecardId === scorecardFilter),
        [sections, scorecardFilter]
    );

    const filteredKPIs = useMemo(
        () => kpis.filter(m => scorecardFilter === 'all' || m.scorecardId === scorecardFilter),
        [kpis, scorecardFilter]
    );

    const combinedRows = useMemo(() => {
        const sectionById = new Map(sections.map(s => [s.id, s]));
        const scorecardById = new Map(scorecards.map(sc => [sc.id, sc]));
        const assignedKPIIds = new Set(assignments.map(a => a.kpiId));

        const normalizedAssignments = assignments.map(a => {
            const kpi = a.kpi || kpis.find(m => m.id === a.kpiId) || null;
            const section = a.section || (kpi?.sectionId ? sectionById.get(kpi.sectionId) || null : null);
            const scorecard = a.scorecard || (kpi ? scorecardById.get(kpi.scorecardId) || null : null);
            return { ...a, kpi, section, scorecard, _virtual: false } as AssignmentRow;
        });

        const virtuals: AssignmentRow[] = kpis
            .filter(m => !assignedKPIIds.has(m.id))
            .map(m => ({
                id: `virtual-${m.id}`,
                kpiId: m.id,
                sectionId: m.sectionId,
                assignees: [],
                kpi: m,
                section: m.section || (m.sectionId ? sectionById.get(m.sectionId) || null : null),
                scorecard: m.scorecard || scorecardById.get(m.scorecardId) || null,
                _virtual: true,
            }));

        return [...normalizedAssignments, ...virtuals];
    }, [assignments, kpis, sections, scorecards]);

    const filtered = useMemo(() => {
        return combinedRows
            .filter(a => {
                const kpiName = a.kpi?.name?.toLowerCase?.() || '';
                const sectionName = a.section?.name?.toLowerCase?.() || '';
                const scorecardName = a.scorecard?.name?.toLowerCase?.() || '';
                const q = search.toLowerCase();
                if (q && !kpiName.includes(q) && !sectionName.includes(q) && !scorecardName.includes(q)) {
                    return false;
                }

                const assignmentScorecardId = a.scorecard?.id || a.kpi?.scorecardId || null;
                if (scorecardFilter !== 'all' && assignmentScorecardId !== scorecardFilter) return false;
                if (sectionFilter !== 'all' && a.sectionId !== sectionFilter) return false;

                const assigneeIds = a.assignees.map(u => u.id);
                if (userFilter !== 'all' && !assigneeIds.includes(userFilter)) return false;

                if (showUnassigned && a.assignees.length > 0) return false;
                if (showMultiAssigned && a.assignees.length <= 1) return false;
                return true;
            })
            .sort((a, b) => (a.kpi?.name || '').localeCompare(b.kpi?.name || ''));
    }, [combinedRows, search, sectionFilter, userFilter, showUnassigned, showMultiAssigned, scorecardFilter]);

    const toggleUser = (id: string) => {
        setSelectedUserIds(prev => (prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]));
    };

    const saveAssignment = async () => {
        if (!selectedKPIId) return;
        const isEdit = drawer?.type === 'edit';
        if (!isEdit && selectedUserIds.length === 0) return; // require assignee for new rows but allow clearing on edit
        setSaving(true);
        try {
            if (isEdit) {
                await fetchWithScorecardRole('/api/assignments', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: drawer.assignment.id,
                        sectionId: selectedSectionId || null,
                        assigneeIds: selectedUserIds,
                    }),
                });
            } else {
                await fetchWithScorecardRole('/api/assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        kpiId: selectedKPIId,
                        sectionId: selectedSectionId || null,
                        assigneeIds: selectedUserIds,
                    }),
                });
            }
            // Refresh assignments list
            const res = await fetchWithScorecardRole('/api/assignments');
            setAssignments(await res.json());
            closeDrawer();
        } catch (error) {
            console.error('Failed to save assignment', error);
        } finally {
            setSaving(false);
        }
    };

    const bulkAssign = async () => {
        if (!selectedSectionId || selectedUserIds.length === 0) return;
        setSaving(true);
        try {
            const targets = kpis.filter(m => (m.sectionId || '') === selectedSectionId);
            const existingByKPI = new Map(assignments.map(a => [a.kpiId, a]));

            for (const kpi of targets) {
                const existing = existingByKPI.get(kpi.id);
                if (existing) {
                    await fetchWithScorecardRole('/api/assignments', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: existing.id,
                            sectionId: selectedSectionId,
                            assigneeIds: Array.from(new Set([...existing.assignees.map(u => u.id), ...selectedUserIds])),
                        }),
                    });
                } else {
                    await fetchWithScorecardRole('/api/assignments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            kpiId: kpi.id,
                            sectionId: selectedSectionId,
                            assigneeIds: selectedUserIds,
                        }),
                    });
                }
            }

            const res = await fetchWithScorecardRole('/api/assignments');
            setAssignments(await res.json());
            closeDrawer();
        } catch (error) {
            console.error('Bulk assign failed', error);
        } finally {
            setSaving(false);
        }
    };

    const deleteAssignment = async (id: string) => {
        await fetchWithScorecardRole('/api/assignments', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        setAssignments(prev => prev.filter(a => a.id !== id));
    };

    const copyToClipboard = async (text: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        // Fallback for environments without clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    };

    const copyLink = async (row: AssignmentRow, user: DbUser) => {
        try {
            const scorecardId = row.scorecard?.id || row.kpi?.scorecardId || null;
            if (!canManageScorecard(scorecardId)) return;
            const scorecard = scorecards.find(s => s.id === row.scorecard?.id);
            if (!scorecard) {
                await refreshScorecards();
            }
            const sc = scorecard || scorecards.find(s => s.id === row.scorecard?.id);
            if (!sc) throw new Error('Scorecard not loaded');

            const email = user.email || user.name || '';
            if (!email) throw new Error('User missing email/name');

            let token = sc.assignees?.[email];
            if (!token) {
                token = await generateAssigneeToken(sc.id, email);
            }

            // Fallback to KPI token if no assignee token exists (single kpi)
            if (!token) {
                const kpi = sc.kpis.find(k => k.id === row.kpiId);
                token = kpi?.updateToken;
            }

            if (!token) throw new Error('Unable to generate link token');

            const url = `${window.location.origin}/update/user/${token}`;
            await copyToClipboard(url);
            setCopyState(email);
            setTimeout(() => setCopyState(''), 1500);
        } catch (error) {
            console.error('Failed to copy link', error);
        }
    };

    const renderDrawer = () => {
        if (!drawer) return null;
        const isBulk = drawer.type === 'bulk';
        const heading = drawer.type === 'edit' ? 'Edit Assignment' : isBulk ? 'Bulk Assign by Section' : 'Add Assignment';
        const action = drawer.type === 'edit' ? saveAssignment : isBulk ? bulkAssign : saveAssignment;

        return (
            <div className="fixed inset-0 z-40 flex">
                <div className="bg-black/50 backdrop-blur-sm flex-1" onClick={closeDrawer} />
                <div className="w-full max-w-md bg-industrial-950 border-l border-industrial-800 p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs uppercase text-industrial-500">Assignments</p>
                            <h2 className="text-lg font-semibold text-industrial-100">{heading}</h2>
                        </div>
                        <button onClick={closeDrawer} className="text-industrial-500 hover:text-industrial-200">
                            <X size={18} />
                        </button>
                    </div>

                    {!isBulk && (
                        <div className="space-y-2 mb-4">
                            <label className="text-xs text-industrial-400">KPI</label>
                            <select
                                className="input w-full"
                                value={selectedKPIId}
                                onChange={e => setSelectedKPIId(e.target.value)}
                            >
                                <option value="">Select a kpi</option>
                                {filteredKPIs.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2 mb-4">
                        <label className="text-xs text-industrial-400">Section</label>
                        <select
                            className="input w-full"
                            value={selectedSectionId}
                            onChange={e => setSelectedSectionId(e.target.value)}
                        >
                            <option value="">(none)</option>
                            {filteredSections.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name || 'Untitled Section'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2 mb-4">
                        <label className="text-xs text-industrial-400">Assignees</label>
                        <div className="flex flex-wrap gap-2">
                            {users.map(u => {
                                const checked = selectedUserIds.includes(u.id);
                                return (
                                    <label
                                        key={u.id}
                                        className={`flex items-center gap-2 px-2 py-1 rounded border text-xs cursor-pointer transition-colors ${checked ? 'border-verdigris text-verdigris bg-industrial-900' : 'border-industrial-700 text-industrial-200 hover:border-industrial-500'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="form-checkbox rounded bg-industrial-900 border-industrial-700 text-verdigris focus:ring-verdigris"
                                            checked={checked}
                                            onChange={() => toggleUser(u.id)}
                                        />
                                        <span className="truncate max-w-[200px]">{u.name || u.email || 'Unnamed'}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 text-[11px] text-industrial-400">
                            <button type="button" className="underline" onClick={() => setSelectedUserIds(users.map(u => u.id))}>
                                Select all
                            </button>
                            <span>•</span>
                            <button type="button" className="underline" onClick={() => setSelectedUserIds([])}>
                                Clear
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={action}
                        disabled={saving}
                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {drawer.type === 'edit' ? 'Save Changes' : isBulk ? 'Assign Section' : 'Create Assignment'}
                    </button>
                </div>
            </div>
        );
    };

    if (!loading && !canEdit) {
        return (
            <div className="min-h-screen bg-industrial-950">
                <PageHeader
                    label="Assignments"
                    title="ASSIGNMENT HUB"
                    subtitle="Edit role required"
                    icon={<Users size={18} className="text-industrial-100" />}
                    rightContent={
                        <button onClick={() => router.push('/')} className="btn btn-secondary btn-sm">
                            Back to Scorecards
                        </button>
                    }
                />
                <main className="max-w-6xl mx-auto px-6 py-12">
                    <div className="glass-card p-8 text-center text-industrial-300">
                        Assignments are only available to the edit role.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-industrial-950">
            <PageHeader
                onBack={() => router.push('/')}
                icon={<Users size={18} className="text-industrial-100" />}
                label="Assignments"
                title="Assignment Dashboard"
                subtitle={`${assignments.length} assignments • ${users.length} collaborators`}
                rightContent={
                    <>
                        <button
                            className="btn btn-secondary btn-sm flex items-center gap-2"
                            onClick={() => openDrawer({ type: 'bulk' })}
                            disabled={!canEdit}
                            title={!canEdit ? 'Edit role required' : undefined}
                        >
                            <Filter size={16} />
                            Bulk assign by section
                        </button>
                    </>
                }
            />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <div className="glass-card p-4 border border-industrial-800/60 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="relative md:w-1/3">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" />
                            <input
                                className="input pl-10 w-full"
                                placeholder="Search kpis, sections, scorecards..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <select
                                className="input"
                                value={scorecardFilter}
                                onChange={e => setScorecardFilter(e.target.value === 'all' ? 'all' : e.target.value)}
                            >
                                <option value="all">All scorecards</option>
                                {scorecards.map(sc => (
                                    <option key={sc.id} value={sc.id}>
                                        {sc.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="input"
                                value={sectionFilter}
                                onChange={e => setSectionFilter(e.target.value === 'all' ? 'all' : e.target.value)}
                            >
                                <option value="all">All sections</option>
                                {filteredSections.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name || 'Untitled'}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="input"
                                value={userFilter}
                                onChange={e => setUserFilter(e.target.value === 'all' ? 'all' : e.target.value)}
                            >
                                <option value="all">All users</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name || u.email || 'Unnamed'}
                                    </option>
                                ))}
                            </select>
                            <label className="flex items-center gap-2 text-sm text-industrial-300">
                                <input type="checkbox" checked={showUnassigned} onChange={e => setShowUnassigned(e.target.checked)} />
                                Unassigned
                            </label>
                            <label className="flex items-center gap-2 text-sm text-industrial-300">
                                <input type="checkbox" checked={showMultiAssigned} onChange={e => setShowMultiAssigned(e.target.checked)} />
                                Multi-assigned
                            </label>
                        </div>
                    </div>
                </div>

                <div className="glass-card border border-industrial-800/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">KPI</th>
                                    <th className="px-4 py-3 text-left">Section</th>
                                    <th className="px-4 py-3 text-left">Scorecard</th>
                                    <th className="px-4 py-3 text-left">Assignees</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-industrial-500">
                                            <Loader2 size={18} className="inline animate-spin mr-2" />
                                            Loading assignments...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-industrial-500">
                                            No kpis or assignments match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(row => {
                                        const isVirtual = !!row._virtual;
                                        const scorecardId = row.scorecard?.id || row.kpi?.scorecardId || null;
                                        const canManageRow = canManageScorecard(scorecardId);
                                        return (
                                            <tr key={row.id} className="hover:bg-industrial-900/40">
                                                <td className="px-4 py-3 text-industrial-100">{row.kpi?.name || 'Unknown kpi'}</td>
                                                <td className="px-4 py-3 text-industrial-300">
                                                    {row.section?.name || 'Unassigned'}
                                                </td>
                                                <td className="px-4 py-3 text-industrial-400">{row.scorecard?.name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {row.assignees.length === 0 && <span className="text-industrial-500 text-xs">None</span>}
                                                    {row.assignees.map(user => (
                                                        <span key={user.id} className={`${chip} flex items-center gap-1`}>
                                                            {user.name || user.email || 'Unnamed'}
                                                            {canManageRow && (
                                                                <button
                                                                    className="text-industrial-400 hover:text-industrial-100"
                                                                    onClick={() => copyLink(row, user)}
                                                                    title="Copy update link"
                                                                >
                                                                    {copyState === (user.email || user.name) ? <Check size={12} /> : <Copy size={12} />}
                                                                </button>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    {!canManageRow ? (
                                                        <span className="text-xs text-industrial-500">View only</span>
                                                    ) : isVirtual ? (
                                                        <button
                                                            className="btn btn-xs btn-primary flex items-center gap-1"
                                                            onClick={() => row.kpi && openCreateForKPI(row.kpi)}
                                                        >
                                                            <Plus size={12} />
                                                            Assign
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="btn btn-xs btn-secondary flex items-center gap-1"
                                                                onClick={() => openDrawer({ type: 'edit', assignment: row })}
                                                            >
                                                                <UserPlus size={12} />
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn btn-xs btn-ghost flex items-center gap-1"
                                                                onClick={() => deleteAssignment(row.id)}
                                                            >
                                                                <X size={12} />
                                                                Remove
                                                            </button>
                                                        </>
                                                    )}
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
            </main>

            {renderDrawer()}
        </div>
    );
}

export default function AssignmentDashboardPage() {
    return (
        <Suspense fallback={<div className="px-4 py-8 text-industrial-400">Loading assignments...</div>}>
            <AssignmentDashboardInner />
        </Suspense>
    );
}
