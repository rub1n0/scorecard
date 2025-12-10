'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useScorecards } from '@/context/ScorecardContext';
import { KPI, Scorecard } from '@/types';
import KPIUpdateForm from '@/components/KPIUpdateForm';
import { Loader2, AlertTriangle, BarChart3 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default function UpdateKPIPage() {
    const router = useRouter();
    const params = useParams();
    const token = params.token as string;
    const { getKPIByToken, updateKPIByToken, loading } = useScorecards();

    const kpiData = useMemo<{ scorecard: Scorecard; kpi: KPI } | null>(() => {
        if (loading || !token) return null;
        return getKPIByToken(token);
    }, [getKPIByToken, loading, token]);

    const error = !loading && token && !kpiData ? 'Invalid or expired update token.' : null;

    const handleUpdate = async (updates: Partial<KPI>) => {
        if (!token) return;
        const updatedBy = kpiData?.kpi.assignees?.[0] || kpiData?.kpi.assignee;
        await updateKPIByToken(token, updates, updatedBy);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center text-industrial-400">
                <Loader2 className="animate-spin mr-2" />
                Loading...
            </div>
        );
    }

    if (error || !kpiData) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center p-4">
                <div className="bg-industrial-900 border border-industrial-800 p-8 rounded-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <AlertTriangle size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-industrial-100 mb-2">Access Denied</h1>
                    <p className="text-industrial-400">{error || 'KPI not found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-industrial-950">
            <PageHeader
                onBack={() => router.push('/')}
                icon={<BarChart3 size={18} className="text-industrial-100" />}
                title={kpiData.kpi.name}
                subtitle={kpiData.scorecard.name}
                label="Secure update"
            />
            <div className="py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-4 text-center">
                        <p className="text-sm text-industrial-400">
                            Updating <span className="text-verdigris-400 font-semibold">{kpiData.kpi.name}</span> in {kpiData.scorecard.name}
                        </p>
                    </div>

                    <div className="bg-industrial-900/50 border border-industrial-800 rounded-xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                        <KPIUpdateForm
                            kpi={kpiData.kpi}
                            onUpdate={handleUpdate}
                        />
                    </div>

                    <div className="mt-8 text-center text-xs text-industrial-600">
                        &copy; {new Date().getFullYear()} Scorecard Manager. Secure update link.
                    </div>
                </div>
            </div>
        </div>
    );
}
