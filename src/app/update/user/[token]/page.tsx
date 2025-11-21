'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useScorecards } from '@/context/ScorecardContext';
import { Scorecard, KPI } from '@/types';
import KPIUpdateForm from '@/components/KPIUpdateForm';
import { LayoutDashboard, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AssigneeUpdatePage() {
    const params = useParams();
    const token = params.token as string;
    const { getKPIsByAssigneeToken, updateKPIByToken } = useScorecards();

    const [data, setData] = useState<{ scorecard: Scorecard; kpis: KPI[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            const result = getKPIsByAssigneeToken(token);
            if (result) {
                setData(result);
            } else {
                setError('Invalid or expired assignment token.');
            }
            setLoading(false);
        }
    }, [token, getKPIsByAssigneeToken]);

    if (loading) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-industrial-500"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-industrial-900 border border-red-900/50 rounded-lg p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
                    <p className="text-industrial-400">{error || 'Unable to load assignment data.'}</p>
                </div>
            </div>
        );
    }

    const { scorecard, kpis } = data;

    return (
        <div className="min-h-screen bg-industrial-950 pb-12">
            {/* Header */}
            <header className="border-b border-industrial-800 bg-industrial-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-industrial-800 rounded-md border border-industrial-700">
                            <LayoutDashboard size={20} className="text-industrial-100" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-industrial-100 tracking-tight leading-none">
                                {scorecard.name}
                            </h1>
                            <p className="text-xs text-industrial-500 font-mono uppercase tracking-wider">
                                Assignment Update Portal
                            </p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-sm text-industrial-300 font-medium">
                            {kpis.length} Metric{kpis.length !== 1 ? 's' : ''} Assigned
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {kpis.map(kpi => (
                    <div key={kpi.id} className="bg-industrial-900/30 border border-industrial-800 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-industrial-800 bg-industrial-900/50 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-industrial-100">{kpi.name}</h2>
                            <span className="text-xs font-mono text-industrial-500 bg-industrial-900 px-2 py-1 rounded border border-industrial-800">
                                {kpi.updateToken ? 'Linked' : 'Manual'}
                            </span>
                        </div>
                        <div className="p-6">
                            <KPIUpdateForm
                                kpi={kpi}
                                onUpdate={async (updates) => {
                                    // We use the individual KPI token for the update if available, 
                                    // but we are authenticated via the assignee token.
                                    // The context's updateKPIByToken expects a KPI token.
                                    // However, we have the assignee token which grants access to ALL.
                                    // Wait, updateKPIByToken finds KPI by token.
                                    // If we use the assignee token, it won't find a specific KPI.
                                    // We need a new method `updateKPIByAssignee` or we need to ensure
                                    // each KPI has its own token (which they do) and use that.

                                    if (kpi.updateToken) {
                                        await updateKPIByToken(kpi.updateToken, updates, kpi.assignee);
                                        // Refresh local data? The context updates, but we need to force re-render or refetch
                                        // Since we use getKPIsByAssigneeToken in render, it reads from context state.
                                        // But getKPIsByAssigneeToken is a function, not a hook.
                                        // We need to trigger a re-fetch.
                                        const refreshed = getKPIsByAssigneeToken(token);
                                        if (refreshed) setData(refreshed);
                                    } else {
                                        console.error("KPI missing update token");
                                    }
                                }}
                            />
                        </div>
                    </div>
                ))}

                {kpis.length === 0 && (
                    <div className="text-center py-12">
                        <CheckCircle2 size={48} className="mx-auto text-industrial-700 mb-4" />
                        <h3 className="text-xl font-medium text-industrial-300">All Caught Up!</h3>
                        <p className="text-industrial-500 mt-2">You have no metrics assigned to update.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
