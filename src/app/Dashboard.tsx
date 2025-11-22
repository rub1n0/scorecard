'use client';

import { useState } from 'react';
import { useScorecards } from '@/context/ScorecardContext';
import ScorecardCard from '@/components/ScorecardCard';
import ScorecardForm from '@/components/ScorecardForm';
import { Plus, BarChart3, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
    const { scorecards, addScorecard, deleteScorecard, updateScorecard } = useScorecards();
    const [showForm, setShowForm] = useState(false);

    const handleCreateScorecard = (name: string, description: string) => {
        addScorecard({
            name,
            description,
            kpis: [],
        });
        setShowForm(false);
    };

    return (
        <div className="min-h-screen bg-industrial-950">
            {/* Industrial Header */}
            <header className="border-b border-industrial-800 bg-industrial-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-industrial-800 rounded-md border border-industrial-700">
                            <LayoutDashboard size={20} className="text-industrial-100" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-industrial-100 tracking-tight leading-none">
                                SCORECARD MANAGER
                            </h1>
                            <p className="text-xs text-industrial-500 font-mono uppercase tracking-wider">
                                System v2.0
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
                        <Plus size={16} />
                        New Scorecard
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-semibold text-industrial-400 uppercase tracking-wider">
                        Active Dashboards ({scorecards.length})
                    </h2>
                </div>

                {scorecards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {scorecards.map((scorecard) => (
                            <ScorecardCard
                                key={scorecard.id}
                                scorecard={scorecard}
                                onDelete={() => deleteScorecard(scorecard.id)}
                                onUpdate={(updates) => updateScorecard(scorecard.id, updates)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="glass-card p-12 text-center animate-fade-in flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 border-industrial-800 bg-transparent">
                        <div className="p-4 bg-industrial-900 rounded-full border border-industrial-800 mb-6">
                            <BarChart3 size={32} className="text-industrial-600" />
                        </div>
                        <h3 className="text-lg font-medium text-industrial-200 mb-2">No Data Streams</h3>
                        <p className="text-industrial-500 mb-8 max-w-md text-sm">
                            Initialize a new scorecard to begin tracking key performance indicators.
                        </p>
                        <button onClick={() => setShowForm(true)} className="btn btn-primary">
                            <Plus size={16} />
                            Initialize Scorecard
                        </button>
                    </div>
                )}
            </main>

            {showForm && (
                <ScorecardForm onSave={handleCreateScorecard} onCancel={() => setShowForm(false)} />
            )}
        </div>
    );
}
