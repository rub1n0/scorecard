'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useScorecards } from '@/context/ScorecardContext';
import { KPI, Scorecard } from '@/types';
import KPIUpdateForm from '@/components/KPIUpdateForm';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function UpdateKPIPage() {
    const params = useParams();
    const token = params.token as string;
    const { getKPIByToken, updateKPIByToken, loading } = useScorecards();

    const [kpiData, setKpiData] = useState<{ scorecard: Scorecard; kpi: KPI } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && token) {
            const result = getKPIByToken(token);
            if (result) {
                setKpiData(result);
                setError(null);
            } else {
                setError('Invalid or expired update token.');
            }
        }
    }, [loading, token, getKPIByToken]);

    const handleUpdate = async (updates: Partial<KPI>) => {
        if (!token) return;
        await updateKPIByToken(token, updates, kpiData?.kpi.assignee);

        // Refresh local data
        const result = getKPIByToken(token);
        if (result) {
            setKpiData(result);
        }
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
        <div className="min-h-screen bg-industrial-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-industrial-100">Update KPI</h1>
                    <p className="text-industrial-400 mt-2">
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
    );
}
