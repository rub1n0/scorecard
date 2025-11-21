'use client';

import { use } from 'react';
import { useScorecards } from '@/context/ScorecardContext';
import ScorecardView from '@/components/ScorecardView';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function ScorecardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { getScorecard, loading } = useScorecards();
    const router = useRouter();
    const scorecard = getScorecard(id);

    if (loading) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="text-industrial-400 animate-spin" />
                    <p className="text-sm text-industrial-500 font-mono uppercase tracking-wider">Loading...</p>
                </div>
            </div>
        );
    }

    if (!scorecard) {
        return (
            <div className="min-h-screen bg-industrial-950 flex items-center justify-center">
                <div className="glass-card p-12 text-center max-w-md">
                    <h1 className="text-xl font-bold text-industrial-100 mb-4">Scorecard Not Found</h1>
                    <p className="text-industrial-500 mb-8 text-sm">
                        The scorecard you're looking for doesn't exist or has been deleted.
                    </p>
                    <button onClick={() => router.push('/')} className="btn btn-primary">
                        <ArrowLeft size={20} />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return <ScorecardView scorecard={scorecard} />;
}
