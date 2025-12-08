'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useScorecards } from '@/context/ScorecardContext';
import { Scorecard, KPI } from '@/types';
import KPIUpdateForm from '@/components/KPIUpdateForm';
import { LayoutDashboard, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AssigneeUpdatePage() {
    const params = useParams();
    const token = params.token as string;
    const {
        scorecards,
        getKPIsByAssigneeToken,
        getKPIByToken,
        updateKPIByToken,
        refreshScorecards,
        loading: contextLoading
    } = useScorecards();
    const [refreshed, setRefreshed] = useState(false);

    const data = useMemo<{ scorecard: Scorecard; kpis: KPI[]; assigneeEmail: string } | null>(() => {
        if (contextLoading || !token) return null;
        const byAssignee = getKPIsByAssigneeToken(token);
        if (byAssignee) return byAssignee;

        const kpiMatch = getKPIByToken(token);
        if (kpiMatch) {
            const email = kpiMatch.kpi.assignee || kpiMatch.kpi.assignees?.[0] || 'Assignee';
            return { scorecard: kpiMatch.scorecard, kpis: [kpiMatch.kpi], assigneeEmail: email };
        }
        return null;
    }, [contextLoading, getKPIsByAssigneeToken, getKPIByToken, token, scorecards]);

    useEffect(() => {
        if (!contextLoading && !data && !refreshed) {
            setRefreshed(true);
            refreshScorecards();
        }
    }, [contextLoading, data, refreshed, refreshScorecards]);

    const loading = contextLoading;
    const error = !contextLoading && token && !data ? 'Invalid or expired assignment token.' : '';

    if (loading) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-industrial-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-industrial-900 border border-red-900/40 rounded-lg p-6 text-center shadow-lg shadow-red-900/10">
                    <div className="mx-auto w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-3">
                        <AlertTriangle size={24} className="text-red-500" />
                    </div>
                    <h1 className="text-lg font-bold text-red-500 mb-1">Access Denied</h1>
                    <p className="text-industrial-400 text-sm">{error || 'Unable to load assignment data.'}</p>
                </div>
            </div>
        );
    }

    const { scorecard, kpis, assigneeEmail } = data;

    return (
        <div className="min-h-screen bg-industrial-950 pb-10">
            {/* Header */}
            <header className="border-b border-industrial-800 bg-industrial-900/60 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-industrial-850 rounded border border-industrial-700">
                            <LayoutDashboard size={18} className="text-industrial-100" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-industrial-100 leading-tight">{scorecard.name}</div>
                            <div className="text-[11px] text-industrial-500 font-mono uppercase tracking-wider">Update Portal</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-mono text-industrial-400">{assigneeEmail}</div>
                        <div className="text-[11px] text-industrial-500">
                            {kpis.length} metric{kpis.length !== 1 ? 's' : ''} assigned
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-5 py-6 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    {kpis.map(kpi => (
                        <div key={kpi.id} className="border border-industrial-800 bg-industrial-900/40 rounded-lg shadow-sm shadow-black/10">
                            <div className="px-4 py-3 border-b border-industrial-800 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-industrial-100 truncate">{kpi.name}</div>
                                    {kpi.subtitle && (
                                        <div className="text-[11px] text-industrial-500 truncate">{kpi.subtitle}</div>
                                    )}
                                </div>
                                <span className="text-[10px] font-mono text-industrial-500 px-2 py-1 rounded border border-industrial-700 bg-industrial-900/60">
                                    {kpi.updateToken ? 'LINKED' : 'MANUAL'}
                                </span>
                            </div>
                            <div className="p-4">
                                <KPIUpdateForm
                                    kpi={kpi}
                                    onUpdate={async (updates) => {
                                        if (kpi.updateToken) {
                                            await updateKPIByToken(kpi.updateToken, updates, assigneeEmail);
                                        } else {
                                            console.error('KPI missing update token');
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {kpis.length === 0 && (
                    <div className="text-center py-10 border border-industrial-800 bg-industrial-900/30 rounded-lg">
                        <CheckCircle2 size={36} className="mx-auto text-industrial-700 mb-2" />
                        <h3 className="text-lg font-medium text-industrial-300">All caught up</h3>
                        <p className="text-industrial-500 text-sm">You have no metrics assigned to update.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
