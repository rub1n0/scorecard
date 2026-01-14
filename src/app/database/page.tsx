'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { Database, Layers, ListChecks, RefreshCw, Table2, Users } from 'lucide-react';
import { KPI, Scorecard, ScorecardRole } from '@/types';
import { useRouter } from 'next/navigation';
import { fetchWithScorecardRole, getScorecardRole } from '@/utils/scorecardClient';

type DbUser = { id: string; name: string | null; email: string | null };
type DbSection = { id: string; name: string | null; scorecardId: string; displayOrder?: number | null; color?: string | null; opacity?: number | null };
type AssignmentRow = {
    id: string;
    kpiId: string;
    sectionId: string | null;
    assignees: DbUser[];
    kpi?: { id: string; name: string; scorecardId: string; sectionId: string | null };
    scorecard?: { id: string; name: string };
    section?: { id: string; name: string | null };
};
type KpiRow = KPI & {
    scorecardName: string;
    sectionName: string;
    dataPointCount: number;
    valueKeyCount: number;
    latestDataPoint?: { date: string; value: number | number[]; valueArray?: number[]; color?: string };
    metrics: KPI['metrics'];
};

async function fetchJSON<T>(url: string): Promise<T> {
    const res = await fetchWithScorecardRole(url, { cache: 'no-store' });
    if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
}

export default function DatabasePage() {
    const router = useRouter();
    const [scorecards, setScorecards] = useState<Scorecard[]>([]);
    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [users, setUsers] = useState<DbUser[]>([]);
    const [sections, setSections] = useState<DbSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scorecardName, setScorecardName] = useState('');
    const [scorecardDescription, setScorecardDescription] = useState('');
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [sectionName, setSectionName] = useState('');
    const [sectionScorecardId, setSectionScorecardId] = useState('');
    const [busy, setBusy] = useState(false);
    const [role, setRole] = useState<ScorecardRole>('update');
    const canEdit = role === 'edit';

    const canManageScorecard = (scorecardId?: string | null) => {
        if (!scorecardId) return false;
        return canEdit;
    };

    const loadData = async () => {
        if (!canEdit) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [sc, asg, usr, sec] = await Promise.all([
                fetchJSON<Scorecard[]>('/api/scorecards'),
                fetchJSON<AssignmentRow[]>('/api/assignments'),
                fetchJSON<DbUser[]>('/api/users'),
                fetchJSON<DbSection[]>('/api/sections'),
            ]);
            setScorecards(sc);
            setAssignments(asg);
            setUsers(usr);
            setSections(sec);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load database view');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const stored = getScorecardRole();
        if (stored) setRole(stored);
    }, []);

    useEffect(() => {
        void loadData();
    }, [canEdit]);

    const request = async (url: string, init?: RequestInit) => {
        const res = await fetchWithScorecardRole(url, {
            ...init,
            headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed: ${res.status}`);
        }
        return res.json().catch(() => ({}));
    };

    const handleCreateScorecard = async () => {
        if (!scorecardName.trim()) return;
        setBusy(true);
        try {
            await request('/api/scorecards', {
                method: 'POST',
                body: JSON.stringify({ name: scorecardName.trim(), description: scorecardDescription || '' })
            });
            setScorecardName('');
            setScorecardDescription('');
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create scorecard');
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteScorecard = async (id: string) => {
        if (!confirm('Delete this scorecard? This removes all kpis.')) return;
        setBusy(true);
        try {
            await request(`/api/scorecards/${id}`, { method: 'DELETE', body: JSON.stringify({ id }) });
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete scorecard');
        } finally {
            setBusy(false);
        }
    };

    const handleCreateUser = async () => {
        if (!userEmail.trim() && !userName.trim()) return;
        setBusy(true);
        try {
            await request('/api/users', { method: 'POST', body: JSON.stringify({ name: userName || null, email: userEmail || null }) });
            setUserName('');
            setUserEmail('');
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create user');
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Delete this user?')) return;
        setBusy(true);
        try {
            await request('/api/users', { method: 'DELETE', body: JSON.stringify({ id }) });
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete user');
        } finally {
            setBusy(false);
        }
    };

    const handleCreateSection = async () => {
        if (!sectionName.trim() || !sectionScorecardId) return;
        setBusy(true);
        try {
            await request('/api/sections', {
                method: 'POST',
                body: JSON.stringify({ name: sectionName.trim(), scorecardId: sectionScorecardId })
            });
            setSectionName('');
            setSectionScorecardId('');
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create section');
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteSection = async (id: string) => {
        if (!confirm('Delete this section?')) return;
        setBusy(true);
        try {
            await request('/api/sections', { method: 'DELETE', body: JSON.stringify({ id }) });
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete section');
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteAssignment = async (id: string) => {
        if (!confirm('Delete this assignment?')) return;
        setBusy(true);
        try {
            await request('/api/assignments', { method: 'DELETE', body: JSON.stringify({ id }) });
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete assignment');
        } finally {
            setBusy(false);
        }
    };

    const kpis = useMemo<KpiRow[]>(() => {
        const sectionsById = new Map<string, string>();
        sections.forEach(s => sectionsById.set(s.id, s.name || ''));

        return scorecards.flatMap(sc =>
            (sc.kpis || []).map((kpi: KPI) => {
                const dataPoints = kpi.metrics || kpi.dataPoints || [];
                const latestDataPoint = dataPoints.length ? dataPoints[dataPoints.length - 1] : undefined;

                return {
                    ...kpi,
                    scorecardName: sc.name,
                    sectionName: kpi.sectionId ? (sc.sections?.find(s => s.id === kpi.sectionId)?.name || sectionsById.get(kpi.sectionId) || 'General') : 'General',
                    dataPointCount: dataPoints.length,
                    valueKeyCount: Object.keys(kpi.value || {}).length,
                    latestDataPoint,
                    metrics: dataPoints,
                };
            })
        );
    }, [scorecards, sections]);

    const summary = useMemo(
        () => [
            { label: 'Scorecards', value: scorecards.length, icon: <Table2 size={16} />, tone: 'text-verdigris-300' },
            { label: 'KPIs', value: kpis.length, icon: <Layers size={16} />, tone: 'text-tuscan-sun-300' },
            { label: 'Sections', value: sections.length, icon: <ListChecks size={16} />, tone: 'text-industrial-200' },
            { label: 'Assignments', value: assignments.length, icon: <Database size={16} />, tone: 'text-industrial-200' },
            { label: 'Users', value: users.length, icon: <Users size={16} />, tone: 'text-industrial-200' },
        ],
        [assignments.length, kpis.length, scorecards.length, sections.length, users.length]
    );

    const formatValue = (kpi: KpiRow) => {
        if (kpi.latestDataPoint) {
            const v = Array.isArray(kpi.latestDataPoint.value) ? kpi.latestDataPoint.value : kpi.latestDataPoint.valueArray;
            if (Array.isArray(v)) return `${kpi.prefix || ''}${v.join(', ')}${kpi.suffix || ''}`;
        }
        const primary = kpi.value?.["0"] ?? Object.values(kpi.value || {})[0];
        if (primary === undefined) return '—';
        return `${kpi.prefix || ''}${primary}${kpi.suffix || ''}`;
    };

    const formatDataPointSummary = (kpi: KpiRow) => {
        const history = kpi.metrics || kpi.dataPoints || [];
        if (history.length === 0) return 'No metrics';
        const list = history.slice(-3).map((dp) => {
            const rendered = Array.isArray(dp.value)
                ? dp.value.join(', ')
                : Array.isArray(dp.valueArray)
                    ? dp.valueArray.join(', ')
                    : dp.value;
            return `${dp.date}: ${rendered}`;
        });
        const suffix = history.length > 3 ? `… (+${history.length - 3} more)` : '';
        return `${list.join(' • ')} ${suffix}`.trim();
    };

    if (!loading && !canEdit) {
        return (
            <div className="min-h-screen bg-industrial-950">
                <PageHeader
                    label="Database"
                    title="DATABASE SNAPSHOT"
                    subtitle="Edit role required"
                    icon={<Database size={18} className="text-industrial-100" />}
                    rightContent={
                        <button onClick={() => router.push('/')} className="btn btn-secondary btn-sm">
                            Back to Scorecards
                        </button>
                    }
                />
                <main className="max-w-6xl mx-auto px-6 py-12">
                    <div className="glass-card p-8 text-center text-industrial-300">
                        Database management is only available to the edit role.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-industrial-950">
            <PageHeader
                onBack={() => router.push('/')}
                title="Database View"
                subtitle="Live data pulled from API endpoints"
                label="DATA OPS"
                icon={<Database size={20} className="text-verdigris-400" />}
                rightContent={
                    <button
                        onClick={() => void loadData()}
                        className="btn btn-secondary btn-sm flex items-center gap-2"
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                }
            />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {error && (
                    <div className="border border-red-900/60 bg-red-900/10 text-red-400 px-4 py-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {summary.map(card => (
                        <div key={card.label} className="border border-industrial-800 bg-industrial-900/40 rounded-lg p-4">
                            <div className="flex items-center justify-between text-industrial-400 text-xs uppercase tracking-wide">
                                <span>{card.label}</span>
                                {card.icon}
                            </div>
                            <div className={`text-3xl font-semibold mt-2 ${card.tone}`}>{card.value}</div>
                        </div>
                    ))}
                </div>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-industrial-800 bg-industrial-900/40 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-industrial-200 uppercase tracking-wider">New Scorecard</h3>
                        </div>
                        <input
                            className="input w-full text-sm"
                            placeholder="Name"
                            value={scorecardName}
                            onChange={(e) => setScorecardName(e.target.value)}
                        />
                        <input
                            className="input w-full text-sm"
                            placeholder="Description"
                            value={scorecardDescription}
                            onChange={(e) => setScorecardDescription(e.target.value)}
                        />
                        <button
                            className="btn btn-primary btn-sm w-full"
                            onClick={() => void handleCreateScorecard()}
                            disabled={busy}
                        >
                            Create Scorecard
                        </button>
                    </div>
                    <div className="border border-industrial-800 bg-industrial-900/40 rounded-lg p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-industrial-200 uppercase tracking-wider">New User</h3>
                        <input
                            className="input w-full text-sm"
                            placeholder="Name"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                        <input
                            className="input w-full text-sm"
                            placeholder="Email"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                        />
                        <button
                            className="btn btn-secondary btn-sm w-full"
                            onClick={() => void handleCreateUser()}
                            disabled={busy}
                        >
                            Create User
                        </button>
                    </div>
                    <div className="border border-industrial-800 bg-industrial-900/40 rounded-lg p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-industrial-200 uppercase tracking-wider">New Section</h3>
                        <select
                            className="select w-full text-sm"
                            value={sectionScorecardId}
                            onChange={(e) => setSectionScorecardId(e.target.value)}
                        >
                            <option value="">Select Scorecard</option>
                            {scorecards.filter(sc => canManageScorecard(sc.id)).map(sc => (
                                <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                        </select>
                        <input
                            className="input w-full text-sm"
                            placeholder="Section Name"
                            value={sectionName}
                            onChange={(e) => setSectionName(e.target.value)}
                        />
                        <button
                            className="btn btn-secondary btn-sm w-full"
                            onClick={() => void handleCreateSection()}
                            disabled={busy}
                        >
                            Create Section
                        </button>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-industrial-200 uppercase tracking-wider">Scorecards</h2>
                            <p className="text-xs text-industrial-500">With nested kpis and sections</p>
                        </div>
                        <span className="text-xs text-industrial-500">Showing {scorecards.length}</span>
                    </div>
                    <div className="border border-industrial-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Sections</th>
                                    <th className="px-4 py-3 text-left">Metrics</th>
                                    <th className="px-4 py-3 text-left">Updated</th>
                                    <th className="px-4 py-3 text-left w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {scorecards.map(sc => (
                                    <tr key={sc.id} className="hover:bg-industrial-900/30">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-industrial-100">{sc.name}</div>
                                            <div className="text-xs text-industrial-500">{sc.description || 'No description'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-industrial-200">{sc.sections?.length ?? 0}</td>
                                        <td className="px-4 py-3 text-industrial-200">{sc.kpis?.length ?? 0}</td>
                                        <td className="px-4 py-3 text-industrial-400 text-xs">
                                            {sc.updatedAt ? new Date(sc.updatedAt).toLocaleString() : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {canManageScorecard(sc.id) && (
                                                <button
                                                    className="text-red-400 text-xs hover:underline"
                                                    onClick={() => void handleDeleteScorecard(sc.id)}
                                                    disabled={busy}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {scorecards.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-industrial-500 text-sm">
                                            {loading ? 'Loading scorecards…' : 'No scorecards found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-industrial-200 uppercase tracking-wider">Metrics</h2>
                            <p className="text-xs text-industrial-500">Flattened from scorecards</p>
                        </div>
                        <span className="text-xs text-industrial-500">Showing {Math.min(kpis.length, 50)} of {kpis.length}</span>
                    </div>
                    <div className="border border-industrial-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Metric</th>
                                    <th className="px-4 py-3 text-left">Scorecard</th>
                                    <th className="px-4 py-3 text-left">Section</th>
                                    <th className="px-4 py-3 text-left">Type</th>
                                    <th className="px-4 py-3 text-left">Assignment</th>
                                    <th className="px-4 py-3 text-left">Latest Value</th>
                                    <th className="px-4 py-3 text-left">Data Points</th>
                                    <th className="px-4 py-3 text-left">Visual</th>
                                    <th className="px-4 py-3 text-left">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {kpis.slice(0, 50).map(kpi => (
                                    <tr key={kpi.id} className="hover:bg-industrial-900/30">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-industrial-100">{kpi.kpiName || kpi.name}</div>
                                            <div className="text-xs text-industrial-500">{kpi.subtitle || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-industrial-200">{kpi.scorecardName}</td>
                                        <td className="px-4 py-3 text-industrial-200">{kpi.sectionName}</td>
                                        <td className="px-4 py-3 text-industrial-300">
                                            {kpi.visualizationType}{kpi.chartType ? ` • ${kpi.chartType}` : ''}
                                            {kpi.reverseTrend ? ' • reverse trend' : ''}
                                        </td>
                                        <td className="px-4 py-3 text-industrial-200">{kpi.assignment || '—'}</td>
                                        <td className="px-4 py-3 text-industrial-200">{formatValue(kpi)}</td>
                                        <td className="px-4 py-3 text-industrial-200">{formatDataPointSummary(kpi)}</td>
                                        <td className="px-4 py-3 text-industrial-200 text-xs">
                                            <div>Stroke: {kpi.strokeColor || '—'} {kpi.strokeWidth ? `(${kpi.strokeWidth}px)` : ''}</div>
                                            <div>Legend: {kpi.showLegend ? 'On' : 'Off'} • Grid: {(kpi.showGridLines ?? false) ? 'On' : 'Off'} • Labels: {kpi.showDataLabels ? 'On' : 'Off'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-industrial-400 text-xs">
                                            {kpi.date ? new Date(kpi.date).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {kpis.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-6 text-center text-industrial-500 text-sm">
                                            {loading ? 'Loading kpis…' : 'No kpis found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-industrial-200 uppercase tracking-wider">Assignments</h2>
                            <p className="text-xs text-industrial-500">Metric-to-user relationships</p>
                        </div>
                        <span className="text-xs text-industrial-500">Showing {Math.min(assignments.length, 50)} of {assignments.length}</span>
                    </div>
                    <div className="border border-industrial-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Metric</th>
                                    <th className="px-4 py-3 text-left">Scorecard</th>
                                    <th className="px-4 py-3 text-left">Section</th>
                                    <th className="px-4 py-3 text-left">Assignees</th>
                                    <th className="px-4 py-3 text-left w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {assignments.slice(0, 50).map(row => {
                                    const rowScorecardId = row.scorecard?.id || row.kpi?.scorecardId || null;
                                    const canManageRow = canManageScorecard(rowScorecardId);
                                    return (
                                    <tr key={row.id} className="hover:bg-industrial-900/30">
                                        <td className="px-4 py-3 text-industrial-100">{row.kpi?.name || row.kpiId}</td>
                                        <td className="px-4 py-3 text-industrial-200">{row.scorecard?.name || '—'}</td>
                                        <td className="px-4 py-3 text-industrial-200">{row.section?.name || 'General'}</td>
                                        <td className="px-4 py-3 text-industrial-300">
                                            {row.assignees && row.assignees.length > 0
                                                ? row.assignees.map(a => a.email || a.name || '—').join(', ')
                                                : 'Unassigned'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {canManageRow && (
                                                <button
                                                    className="text-red-400 text-xs hover:underline"
                                                    onClick={() => void handleDeleteAssignment(row.id)}
                                                    disabled={busy}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                                {assignments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-industrial-500 text-sm">
                                            {loading ? 'Loading assignments…' : 'No assignments found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-industrial-200 uppercase tracking-wider">Sections</h2>
                            <p className="text-xs text-industrial-500">Across all scorecards</p>
                        </div>
                        <span className="text-xs text-industrial-500">Showing {sections.length}</span>
                    </div>
                    <div className="border border-industrial-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Scorecard</th>
                                    <th className="px-4 py-3 text-left w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {sections.map(section => {
                                    const parent = scorecards.find(sc => sc.id === section.scorecardId);
                                    const canManageSection = canManageScorecard(section.scorecardId);
                                    return (
                                        <tr key={section.id} className="hover:bg-industrial-900/30">
                                            <td className="px-4 py-3 text-industrial-100">{section.name || 'Untitled'}</td>
                                            <td className="px-4 py-3 text-industrial-200">{parent?.name || section.scorecardId}</td>
                                            <td className="px-4 py-3 text-right">
                                                {canManageSection && (
                                                    <button
                                                        className="text-red-400 text-xs hover:underline"
                                                        onClick={() => void handleDeleteSection(section.id)}
                                                        disabled={busy}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sections.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-6 text-center text-industrial-500 text-sm">
                                            {loading ? 'Loading sections…' : 'No sections found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-industrial-200 uppercase tracking-wider">Users</h2>
                            <p className="text-xs text-industrial-500">Accounts linked to assignments</p>
                        </div>
                        <span className="text-xs text-industrial-500">Showing {users.length}</span>
                    </div>
                    <div className="border border-industrial-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-industrial-900/60 text-industrial-400 uppercase text-[11px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-800">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-industrial-900/30">
                                        <td className="px-4 py-3 text-industrial-100">{user.name || '—'}</td>
                                        <td className="px-4 py-3 text-industrial-200">{user.email || '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                className="text-red-400 text-xs hover:underline"
                                                onClick={() => void handleDeleteUser(user.id)}
                                                disabled={busy}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-6 text-center text-industrial-500 text-sm">
                                            {loading ? 'Loading users…' : 'No users found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}
