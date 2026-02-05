'use client';

import { useEffect, useRef, useState } from 'react';
import { useScorecards } from '@/context/ScorecardContext';
import ScorecardCard from '@/components/ScorecardCard';
import ScorecardForm from '@/components/ScorecardForm';
import PageHeader from '@/components/PageHeader';
import { Plus, BarChart3, LayoutDashboard, ChevronDown, UserCog, ClipboardList, PanelLeft, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { applyRoleChange, getScorecardRole } from '@/utils/scorecardClient';
import { ScorecardRole } from '@/types';

export default function Dashboard() {
    const { scorecards, addScorecard, deleteScorecard, updateScorecard } = useScorecards();
    const [showForm, setShowForm] = useState(false);
    const [showNavMenu, setShowNavMenu] = useState(false);
    const navMenuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [currentRole, setCurrentRole] = useState<ScorecardRole>(() => {
        if (typeof window === 'undefined') return 'update';
        return getScorecardRole() ?? 'update';
    });
    const canEdit = currentRole === 'edit';

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
                setShowNavMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleRoleChange = (nextRole: ScorecardRole) => {
        if (nextRole === currentRole) return;
        setCurrentRole(nextRole);
        applyRoleChange(nextRole);
    };

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
            <PageHeader
                label="Scorecards"
                title="SCORECARD MANAGER"
                subtitle="System v2.0"
                icon={<LayoutDashboard size={20} className="text-industrial-100" />}
                rightContent={
                    <div className="flex items-center gap-2" ref={navMenuRef}>
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn btn-primary btn-sm border-0"
                            disabled={!canEdit}
                        >
                            <Plus size={16} />
                            New Scorecard
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowNavMenu(!showNavMenu)}
                                className="btn btn-secondary btn-sm flex items-center gap-2"
                                title="People & Assignments"
                            >
                                <PanelLeft size={16} />
                                Manage
                                <ChevronDown size={14} />
                            </button>
                            {showNavMenu && (
                                <div className="absolute right-0 mt-2 w-52 bg-industrial-900 border border-industrial-700 rounded-md shadow-lg z-20">
                                    <div className="py-2">
                                        <div className="px-4 pb-2">
                                            <div className="text-[11px] uppercase tracking-wider text-industrial-500 mb-1">
                                                Current Role
                                            </div>
                                            <select
                                                className="input w-full text-xs"
                                                value={currentRole}
                                                onChange={(e) => handleRoleChange(e.target.value as ScorecardRole)}
                                            >
                                                <option value="edit">Edit</option>
                                                <option value="update">Update</option>
                                            </select>
                                        </div>
                                        <div className="border-t border-industrial-800 my-1"></div>
                                        <button
                                            onClick={() => {
                                                if (!canEdit) return;
                                                router.push('/assignments');
                                                setShowNavMenu(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${canEdit ? 'text-industrial-200 hover:bg-industrial-800' : 'text-industrial-600 cursor-not-allowed'}`}
                                        >
                                            <ClipboardList size={14} />
                                            Assignments
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!canEdit) return;
                                                router.push('/users');
                                                setShowNavMenu(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${canEdit ? 'text-industrial-200 hover:bg-industrial-800' : 'text-industrial-600 cursor-not-allowed'}`}
                                        >
                                            <UserCog size={14} />
                                            Users
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!canEdit) return;
                                                router.push('/database');
                                                setShowNavMenu(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${canEdit ? 'text-industrial-200 hover:bg-industrial-800' : 'text-industrial-600 cursor-not-allowed'}`}
                                        >
                                            <Database size={14} />
                                            Database
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                }
            />

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
                        <button onClick={() => setShowForm(true)} className="btn btn-primary" disabled={!canEdit}>
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
