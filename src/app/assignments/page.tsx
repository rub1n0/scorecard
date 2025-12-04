'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Copy, Filter, Loader2, Plus, Search, UserPlus, X, Users } from 'lucide-react';
import { useScorecards } from '@/context/ScorecardContext';
import PageHeader from '@/components/PageHeader';

type DbUser = { id: string; name: string | null; email: string | null };
type DbSection = { id: string; name: string | null; scorecardId: string };
type DbMetric = { id: string; name: string; sectionId: string | null; scorecardId: string; updateToken?: string | null };
type DbScorecard = { id: string; name: string };
type AssignmentRow = {
    id: string;
    metricId: string;
    sectionId: string | null;
    assignees: DbUser[];
    metric?: DbMetric | null;
    section?: DbSection | null;
    scorecard?: DbScorecard | null;
};

type DrawerMode = { type: 'create' } | { type: 'edit'; assignment: AssignmentRow } | { type: 'bulk' };

const chip = 'px-2 py-1 rounded-full bg-industrial-900 border border-industrial-700 text-industrial-200 text-xs';

function AssignmentDashboardInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { scorecards, generateAssigneeToken, refreshScorecards } = useScorecards();

    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [sections, setSections] = useState<DbSection[]>([]);
    const [metrics, setMetrics] = useState<DbMetric[]>([]);
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

    // Drawer form state
    const [selectedMetricId, setSelectedMetricId] = useState('');
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
            try {
                setLoading(true);
                const [aRes, sRes, mRes, uRes] = await Promise.all([
                    fetch('/api/assignments'),
                    fetch('/api/sections'),
                    fetch('/api/metrics'),
                    fetch('/api/users'),
                ]);
                const [aData, sData, mData, uData] = await Promise.all([
                    aRes.json(),
                    sRes.json(),
                    mRes.json(),
                    uRes.json(),
                ]);
                setAssignments(aData as AssignmentRow[]);
                setSections(sData as DbSection[]);
                const normalizedMetrics: DbMetric[] = (mData as Array<DbMetric | { metric: DbMetric }>).map((row) =>
                    'metric' in row && row.metric ? row.metric : (row as DbMetric)
                );
                setMetrics(normalizedMetrics);
                setUsers(uData as DbUser[]);
            } catch (error) {
                console.error('Failed to load assignments dashboard', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const resetDrawerState = () => {
        setSelectedMetricId('');
        setSelectedSectionId('');
        setSelectedUserIds([]);
    };

    const openDrawer = (mode: DrawerMode) => {
        setDrawer(mode);
        resetDrawerState();
        if (mode.type === 'edit') {
            setSelectedMetricId(mode.assignment.metricId);
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

    const filteredMetrics = useMemo(
        () => metrics.filter(m => scorecardFilter === 'all' || m.scorecardId === scorecardFilter),
        [metrics, scorecardFilter]
    );

    const filtered = useMemo(() => {
        return assignments
            .filter(a => {
                const metricName = a.metric?.name?.toLowerCase?.() || '';
                const sectionName = a.section?.name?.toLowerCase?.() || '';
                const scorecardName = a.scorecard?.name?.toLowerCase?.() || '';
                const q = search.toLowerCase();
                if (q && !metricName.includes(q) && !sectionName.includes(q) && !scorecardName.includes(q)) {
                    return false;
                }

                if (scorecardFilter !== 'all' && a.scorecard?.id !== scorecardFilter) return false;
                if (sectionFilter !== 'all' && a.sectionId !== sectionFilter) return false;

                const assigneeIds = a.assignees.map(u => u.id);
                if (userFilter !== 'all' && !assigneeIds.includes(userFilter)) return false;

                if (showUnassigned && a.assignees.length > 0) return false;
                if (showMultiAssigned && a.assignees.length <= 1) return false;
                return true;
            })
            .sort((a, b) => (a.metric?.name || '').localeCompare(b.metric?.name || ''));
    }, [assignments, search, sectionFilter, userFilter, showUnassigned, showMultiAssigned]);

    const toggleUser = (id: string) => {
        setSelectedUserIds(prev => (prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]));
    };

    const saveAssignment = async () => {
        if (!selectedMetricId || selectedUserIds.length === 0) return;
        setSaving(true);
        try {
            if (drawer?.type === 'edit') {
                await fetch('/api/assignments', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: drawer.assignment.id,
                        sectionId: selectedSectionId || null,
                        assigneeIds: selectedUserIds,
                    }),
                });
            } else {
                await fetch('/api/assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        metricId: selectedMetricId,
                        sectionId: selectedSectionId || null,
                        assigneeIds: selectedUserIds,
                    }),
                });
            }
            // Refresh assignments list
            const res = await fetch('/api/assignments');
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
            const targets = metrics.filter(m => (m.sectionId || '') === selectedSectionId);
            const existingByMetric = new Map(assignments.map(a => [a.metricId, a]));

            for (const metric of targets) {
                const existing = existingByMetric.get(metric.id);
                if (existing) {
                    await fetch('/api/assignments', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: existing.id,
                            sectionId: selectedSectionId,
                            assigneeIds: Array.from(new Set([...existing.assignees.map(u => u.id), ...selectedUserIds])),
                        }),
                    });
                } else {
                    await fetch('/api/assignments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            metricId: metric.id,
                            sectionId: selectedSectionId,
                            assigneeIds: selectedUserIds,
                        }),
                    });
                }
            }

            const res = await fetch('/api/assignments');
            setAssignments(await res.json());
            closeDrawer();
        } catch (error) {
            console.error('Bulk assign failed', error);
        } finally {
            setSaving(false);
        }
    };

    const deleteAssignment = async (id: string) => {
        await fetch('/api/assignments', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        setAssignments(prev => prev.filter(a => a.id !== id));
    };

    const copyLink = async (row: AssignmentRow, user: DbUser) => {
        try {
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
            const url = `${window.location.origin}/update/user/${token}`;
            await navigator.clipboard.writeText(url);
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
                            <label className="text-xs text-industrial-400">Metric</label>
                            <select
                                className="input w-full"
                                value={selectedMetricId}
                                onChange={e => setSelectedMetricId(e.target.value)}
                            >
                                <option value="">Select a metric</option>
                                {filteredMetrics.map(m => (
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
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => toggleUser(u.id)}
                                    className={`${chip} ${selectedUserIds.includes(u.id) ? 'border-verdigris text-verdigris' : ''}`}
                                >
                                    {u.name || u.email || 'Unnamed'}
                                </button>
                            ))}
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
                        <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={() => openDrawer({ type: 'bulk' })}>
                            <Filter size={16} />
                            Bulk assign by section
                        </button>
                        <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => openDrawer({ type: 'create' })}>
                            <Plus size={16} />
                            Add Assignment
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
                                placeholder="Search metrics, sections, scorecards..."
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
                                    <th className="px-4 py-3 text-left">Metric</th>
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
                                            No assignments match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(row => (
                                        <tr key={row.id} className="hover:bg-industrial-900/40">
                                            <td className="px-4 py-3 text-industrial-100">{row.metric?.name || 'Unknown metric'}</td>
                                            <td className="px-4 py-3 text-industrial-300">
                                                {row.section?.name || 'Unassigned'}
                                            </td>
                                            <td className="px-4 py-3 text-industrial-400">{row.scorecard?.name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {row.assignees.length === 0 && <span className="text-industrial-500 text-xs">None</span>}
                                                    {row.assignees.map(user => (
                                                        <span key={user.id} className={chip}>
                                                            {user.name || user.email || 'Unnamed'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
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
                                                    {row.assignees.map(user => (
                                                        <button
                                                            key={user.id}
                                                            className="btn btn-xs btn-ghost flex items-center gap-1"
                                                            onClick={() => copyLink(row, user)}
                                                        >
                                                            {copyState === (user.email || user.name) ? <Check size={12} /> : <Copy size={12} />}
                                                            Link
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
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
