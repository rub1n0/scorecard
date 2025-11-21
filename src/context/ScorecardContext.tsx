'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Scorecard, KPI, Section } from '@/types';

interface ScorecardContextType {
    scorecards: Scorecard[];
    loading: boolean;
    addScorecard: (scorecard: Omit<Scorecard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateScorecard: (id: string, updates: Partial<Scorecard>) => Promise<void>;
    deleteScorecard: (id: string) => Promise<void>;
    getScorecard: (id: string) => Scorecard | undefined;
    addKPI: (scorecardId: string, kpi: Omit<KPI, 'id'>) => Promise<void>;
    addKPIs: (scorecardId: string, kpis: Omit<KPI, 'id'>[]) => Promise<void>;
    updateKPI: (scorecardId: string, kpiId: string, updates: Partial<KPI>) => Promise<void>;
    deleteKPI: (scorecardId: string, kpiId: string) => Promise<void>;
    refreshScorecards: () => Promise<void>;
    // Section management
    addSection: (scorecardId: string, section: Omit<Section, 'id'>) => Promise<void>;
    updateSection: (scorecardId: string, sectionId: string, updates: Partial<Section>) => Promise<void>;
    deleteSection: (scorecardId: string, sectionId: string) => Promise<void>;
    assignKPIToSection: (scorecardId: string, kpiId: string, sectionId: string | null, order?: number) => Promise<void>;
    reorderKPIsInSection: (scorecardId: string, sectionId: string | null, kpiIds: string[]) => Promise<void>;
    // Collaborative updates
    assignKPIToUser: (scorecardId: string, kpiId: string, email: string) => Promise<void>;
    updateKPIByToken: (token: string, updates: Partial<KPI>, updatedBy?: string) => Promise<void>;
    getKPIByToken: (token: string) => { scorecard: Scorecard; kpi: KPI } | null;
    getKPIsByAssigneeToken: (token: string) => { scorecard: Scorecard; kpis: KPI[] } | null;
    generateAssigneeToken: (scorecardId: string, email: string) => Promise<string>;
}

const ScorecardContext = createContext<ScorecardContextType | undefined>(undefined);

export function ScorecardProvider({ children }: { children: ReactNode }) {
    const [scorecards, setScorecards] = useState<Scorecard[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchScorecards = async () => {
        try {
            const response = await fetch('/api/scorecards');
            if (response.ok) {
                const data = await response.json();
                setScorecards(data);
            }
        } catch (error) {
            console.error('Failed to fetch scorecards:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScorecards();
    }, []);

    const addScorecard = async (scorecard: Omit<Scorecard, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const response = await fetch('/api/scorecards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scorecard),
            });
            if (response.ok) {
                await fetchScorecards();
            }
        } catch (error) {
            console.error('Failed to add scorecard:', error);
        }
    };

    const updateScorecard = async (id: string, updates: Partial<Scorecard>) => {
        try {
            const response = await fetch(`/api/scorecards/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (response.ok) {
                await fetchScorecards();
            }
        } catch (error) {
            console.error('Failed to update scorecard:', error);
        }
    };

    const deleteScorecard = async (id: string) => {
        try {
            const response = await fetch(`/api/scorecards/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                await fetchScorecards();
            }
        } catch (error) {
            console.error('Failed to delete scorecard:', error);
        }
    };

    const getScorecard = (id: string) => {
        return scorecards.find(sc => sc.id === id);
    };

    const addKPI = async (scorecardId: string, kpi: Omit<KPI, 'id'>) => {
        const { generateUpdateToken } = await import('@/utils/tokenUtils');
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const newKPI: KPI = {
            ...kpi,
            id: crypto.randomUUID(),
            updateToken: kpi.assignee && !kpi.updateToken ? generateUpdateToken() : kpi.updateToken,
        };

        const updatedKPIs = [...scorecard.kpis, newKPI];
        await updateScorecard(scorecardId, { kpis: updatedKPIs });
    };

    const addKPIs = async (scorecardId: string, kpis: Omit<KPI, 'id'>[]) => {
        try {
            // Fetch the latest scorecard data from the API to avoid stale state
            const response = await fetch(`/api/scorecards/${scorecardId}`);
            if (!response.ok) return;

            const scorecard: Scorecard = await response.json();

            // Create a Set of existing KPI keys (name + date) for deduplication
            const existingKeys = new Set(
                scorecard.kpis.map(kpi => `${kpi.name}|${kpi.date}`)
            );

            // Filter out duplicates and add IDs to new KPIs
            const newKPIs: KPI[] = kpis
                .filter(kpi => !existingKeys.has(`${kpi.name}|${kpi.date}`))
                .map(kpi => ({
                    ...kpi,
                    id: crypto.randomUUID(),
                }));

            if (newKPIs.length === 0) {
                console.log('No new KPIs to add (all duplicates)');
                return;
            }

            // Batch update with all new KPIs
            const updatedKPIs = [...scorecard.kpis, ...newKPIs];
            await updateScorecard(scorecardId, { kpis: updatedKPIs });
        } catch (error) {
            console.error('Failed to add KPIs:', error);
        }
    };

    const updateKPI = async (scorecardId: string, kpiId: string, updates: Partial<KPI>) => {
        const { generateUpdateToken } = await import('@/utils/tokenUtils');
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const updatedKPIs = scorecard.kpis.map(kpi => {
            if (kpi.id === kpiId) {
                const updatedKPI = { ...kpi, ...updates };
                // Generate token if assignee exists but token doesn't
                if (updatedKPI.assignee && !updatedKPI.updateToken) {
                    updatedKPI.updateToken = generateUpdateToken();
                }
                return updatedKPI;
            }
            return kpi;
        });

        await updateScorecard(scorecardId, { kpis: updatedKPIs });
    };

    const deleteKPI = async (scorecardId: string, kpiId: string) => {
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const updatedKPIs = scorecard.kpis.filter(kpi => kpi.id !== kpiId);
        await updateScorecard(scorecardId, { kpis: updatedKPIs });
    };

    // Section Management
    const addSection = async (scorecardId: string, section: Omit<Section, 'id'>) => {
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const newSection: Section = {
            ...section,
            id: crypto.randomUUID(),
        };

        const updatedSections = [...(scorecard.sections || []), newSection];
        await updateScorecard(scorecardId, { sections: updatedSections });
    };

    const updateSection = async (scorecardId: string, sectionId: string, updates: Partial<Section>) => {
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const updatedSections = (scorecard.sections || []).map(section =>
            section.id === sectionId ? { ...section, ...updates } : section
        );
        await updateScorecard(scorecardId, { sections: updatedSections });
    };

    const deleteSection = async (scorecardId: string, sectionId: string) => {
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        // Remove the section
        const updatedSections = (scorecard.sections || []).filter(section => section.id !== sectionId);

        // Move KPIs from deleted section to null (General section)
        const updatedKPIs = scorecard.kpis.map(kpi =>
            kpi.sectionId === sectionId ? { ...kpi, sectionId: undefined } : kpi
        );

        await updateScorecard(scorecardId, { sections: updatedSections, kpis: updatedKPIs });
    };

    const assignKPIToSection = async (
        scorecardId: string,
        kpiId: string,
        sectionId: string | null,
        order?: number
    ) => {
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const updatedKPIs = scorecard.kpis.map(kpi => {
            if (kpi.id === kpiId) {
                return {
                    ...kpi,
                    sectionId: sectionId || undefined,
                    order: order !== undefined ? order : kpi.order,
                };
            }
            return kpi;
        });

        await updateScorecard(scorecardId, { kpis: updatedKPIs });
    };

    const reorderKPIsInSection = async (
        scorecardId: string,
        sectionId: string | null,
        kpiIds: string[]
    ) => {
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const updatedKPIs = scorecard.kpis.map(kpi => {
            const kpiSectionId = kpi.sectionId || null;
            if (kpiSectionId === sectionId) {
                const newOrder = kpiIds.indexOf(kpi.id);
                return { ...kpi, order: newOrder >= 0 ? newOrder : kpi.order };
            }
            return kpi;
        });

        await updateScorecard(scorecardId, { kpis: updatedKPIs });
    };

    // Collaborative update methods
    const assignKPIToUser = async (
        scorecardId: string,
        kpiId: string,
        email: string
    ) => {
        const { generateUpdateToken } = await import('@/utils/tokenUtils');
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        // Generate assignee token if it doesn't exist for this user
        let assigneeToken = scorecard.assignees?.[email];
        let newAssignees = { ...(scorecard.assignees || {}) };

        if (!assigneeToken) {
            assigneeToken = generateUpdateToken(); // Reuse same token generator for simplicity
            newAssignees[email] = assigneeToken;
        }

        const updatedKPIs = scorecard.kpis.map(kpi =>
            kpi.id === kpiId
                ? { ...kpi, assignee: email, updateToken: generateUpdateToken() }
                : kpi
        );

        await updateScorecard(scorecardId, {
            kpis: updatedKPIs,
            assignees: newAssignees
        });
    };

    const updateKPIByToken = async (
        token: string,
        updates: Partial<KPI>,
        updatedBy?: string
    ) => {
        // Find KPI by token across all scorecards
        for (const scorecard of scorecards) {
            const kpi = scorecard.kpis.find(k => k.updateToken === token);
            if (kpi) {
                const updatedKPIs = scorecard.kpis.map(k =>
                    k.id === kpi.id
                        ? { ...k, ...updates, lastUpdatedBy: updatedBy, date: new Date().toISOString() }
                        : k
                );
                await updateScorecard(scorecard.id, { kpis: updatedKPIs });
                return;
            }
        }
        throw new Error('Invalid update token');
    };

    const getKPIByToken = (token: string): { scorecard: Scorecard; kpi: KPI } | null => {
        for (const scorecard of scorecards) {
            const kpi = scorecard.kpis.find(k => k.updateToken === token);
            if (kpi) {
                return { scorecard, kpi };
            }
        }
        return null;
    };

    const getKPIsByAssigneeToken = (token: string): { scorecard: Scorecard; kpis: KPI[] } | null => {
        for (const scorecard of scorecards) {
            // Find email associated with this token
            const email = Object.entries(scorecard.assignees || {}).find(([_, t]) => t === token)?.[0];

            if (email) {
                // Find all KPIs assigned to this email
                const kpis = scorecard.kpis.filter(k => k.assignee === email);
                return { scorecard, kpis };
            }
        }
        return null;
    };

    const generateAssigneeToken = async (scorecardId: string, email: string): Promise<string> => {
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) throw new Error('Scorecard not found');

        if (scorecard.assignees?.[email]) {
            return scorecard.assignees[email];
        }

        const { generateUpdateToken } = await import('@/utils/tokenUtils');
        const newToken = generateUpdateToken();

        const newAssignees = {
            ...(scorecard.assignees || {}),
            [email]: newToken
        };

        await updateScorecard(scorecardId, { assignees: newAssignees });
        return newToken;
    };

    return (
        <ScorecardContext.Provider
            value={{
                scorecards,
                loading,
                addScorecard,
                updateScorecard,
                deleteScorecard,
                getScorecard,
                addKPI,
                addKPIs,
                updateKPI,
                deleteKPI,
                addSection,
                updateSection,
                deleteSection,
                assignKPIToSection,
                reorderKPIsInSection,
                assignKPIToUser,
                updateKPIByToken,
                getKPIByToken,
                getKPIsByAssigneeToken,
                generateAssigneeToken,
                refreshScorecards: fetchScorecards,
            }}
        >
            {children}
        </ScorecardContext.Provider>
    );
}

export function useScorecards() {
    const context = useContext(ScorecardContext);
    if (context === undefined) {
        throw new Error('useScorecards must be used within a ScorecardProvider');
    }
    return context;
}
