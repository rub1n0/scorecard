'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Scorecard, KPI, Section } from '@/types';

const clientFetch = (...args: Parameters<typeof fetch>) => globalThis.fetch(...args);
const newId = () => (typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : uuidv4());
const slugify = (name: string) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
const buildSlug = (name: string, id: string) => {
    const base = slugify(name || 'scorecard');
    return `${base}-${id.slice(0, 8)}`;
};

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
    addSection: (scorecardId: string, section: Omit<Section, 'id'>) => Promise<string | undefined>;
    updateSection: (scorecardId: string, sectionId: string, updates: Partial<Section>) => Promise<void>;
    deleteSection: (scorecardId: string, sectionId: string) => Promise<void>;
    assignKPIToSection: (scorecardId: string, kpiId: string, sectionId: string | null, order?: number) => Promise<void>;
    reorderKPIsInSection: (scorecardId: string, sectionId: string | null, kpiIds: string[]) => Promise<void>;
    reorderSections: (scorecardId: string, sectionIds: string[]) => Promise<void>;
    // Collaborative updates
    assignKPIToUser: (scorecardId: string, kpiId: string, email: string) => Promise<void>;
    bulkAssignKPIs: (scorecardId: string, kpiIds: string[], emails: string[]) => Promise<void>;
    updateKPIByToken: (
        token: string,
        updates: Partial<KPI>,
        updatedBy?: string,
        kpiId?: string
    ) => Promise<void>;
    getKPIByToken: (token: string) => { scorecard: Scorecard; kpi: KPI } | null;
    getKPIsByAssigneeToken: (token: string) => { scorecard: Scorecard; kpis: KPI[]; assigneeEmail: string } | null;
    generateAssigneeToken: (scorecardId: string, email: string) => Promise<string>;
    regenerateAssigneeToken: (scorecardId: string, email: string) => Promise<string>;
    deleteAssigneeToken: (scorecardId: string, email: string) => Promise<void>;
}

const ScorecardContext = createContext<ScorecardContextType | undefined>(undefined);

export function ScorecardProvider({ children }: { children: ReactNode }) {
    const [scorecards, setScorecards] = useState<Scorecard[]>([]);
    const [loading, setLoading] = useState(true);

    const combineAssignees = (assignee?: string, assignees?: string[]) => {
        const combined = [
            ...(assignees || []),
            ...(assignee ? [assignee] : []),
        ].filter(Boolean) as string[];

        return Array.from(new Set(combined));
    };

    const normalizeKPIAssignees = (kpi: KPI) => combineAssignees(kpi.assignee, kpi.assignees);

    const fetchScorecards = useCallback(async () => {
        try {
            const response = await clientFetch('/api/scorecards');
            if (response.ok) {
                const data = await response.json();
                setScorecards(
                    data.map((sc: Scorecard) => ({
                        ...sc,
                        slug: sc.slug || buildSlug(sc.name, sc.id),
                    }))
                );
            }
        } catch (error) {
            console.error('Failed to fetch scorecards:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchScorecardById = useCallback(async (scorecardId: string): Promise<Scorecard | null> => {
        try {
            const response = await clientFetch(`/api/scorecards/${scorecardId}`);
            if (!response.ok) return null;
            const updated = await response.json();
            setScorecards(prev => {
                const existingIndex = prev.findIndex(sc => sc.id === updated.id);
                if (existingIndex === -1) {
                    return [...prev, updated];
                }
                const next = [...prev];
                next[existingIndex] = updated;
                return next;
            });
            return updated;
        } catch (error) {
            console.error(`Failed to fetch scorecard ${scorecardId}:`, error);
            return null;
        }
    }, []);

    useEffect(() => {
        fetchScorecards();
    }, [fetchScorecards]);

    const addScorecard = async (scorecard: Omit<Scorecard, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const response = await clientFetch('/api/scorecards', {
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
            const response = await clientFetch(`/api/scorecards/${id}`, {
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

    const persistAssigneeToken = async (scorecardId: string, email: string, token: string | null) => {
        await updateScorecard(scorecardId, {
            assignees: {
                [email]: token,
            },
        });
    };

    const deleteScorecard = async (id: string) => {
        try {
            const response = await clientFetch(`/api/scorecards/${id}`, {
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
        return scorecards.find(sc => sc.id === id || sc.slug === id);
    };

    const addKPI = async (scorecardId: string, kpi: Omit<KPI, 'id'>) => {
        const { generateUpdateToken } = await import('@/utils/tokenUtils');
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const assigneeList = combineAssignees(kpi.assignee, kpi.assignees);

        const newKPI: KPI = {
            ...kpi,
            id: newId(),
            assignees: assigneeList.length ? assigneeList : undefined,
            assignee: assigneeList[0],
            updateToken: assigneeList.length > 0 && !kpi.updateToken ? generateUpdateToken() : kpi.updateToken,
            visible: kpi.visible ?? true,
        };

        const updatedKPIs = [...scorecard.kpis, newKPI];
        await updateScorecard(scorecardId, { kpis: updatedKPIs });
    };

    const addKPIs = async (scorecardId: string, kpis: Omit<KPI, 'id'>[]) => {
        try {
            const { generateUpdateToken } = await import('@/utils/tokenUtils');
            // Fetch the latest scorecard data from the API to avoid stale state
            const response = await clientFetch(`/api/scorecards/${scorecardId}`);
            if (!response.ok) return;

            const scorecard: Scorecard = await response.json();

            // Create a Set of existing KPI keys (name + date) for deduplication
            const existingKeys = new Set(
                scorecard.kpis.map(kpi => `${kpi.name}|${kpi.date}`)
            );

            // Filter out duplicates and add IDs to new KPIs
            const newKPIs: KPI[] = kpis
                .filter(kpi => !existingKeys.has(`${kpi.name}|${kpi.date}`))
                .map(kpi => {
                    const assigneeList = combineAssignees(kpi.assignee, kpi.assignees);
                    return {
                        ...kpi,
                        id: newId(),
                        assignees: assigneeList.length ? assigneeList : undefined,
                        assignee: assigneeList[0],
                        updateToken: assigneeList.length > 0 && !kpi.updateToken ? generateUpdateToken() : kpi.updateToken,
                        visible: kpi.visible ?? true,
                    };
                });

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
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const currentKPI = scorecard.kpis.find(kpi => kpi.id === kpiId);
        if (!currentKPI) return;

        const nextVisible = updates.visible ?? currentKPI.visible ?? true;
        const hasTargetValue = Object.prototype.hasOwnProperty.call(updates, 'targetValue');
        const hasTargetColor = Object.prototype.hasOwnProperty.call(updates, 'targetColor');
        const payload: Partial<KPI> = {
            ...currentKPI,
            ...updates,
            prefix: updates.prefix ?? currentKPI.prefix,
            prefixOpacity: updates.prefixOpacity ?? currentKPI.prefixOpacity,
            suffix: updates.suffix ?? currentKPI.suffix,
            suffixOpacity: updates.suffixOpacity ?? currentKPI.suffixOpacity,
            targetValue: hasTargetValue ? updates.targetValue : currentKPI.targetValue,
            targetColor: hasTargetColor ? updates.targetColor : currentKPI.targetColor,
            metrics: updates.metrics ?? updates.dataPoints ?? currentKPI.metrics ?? currentKPI.dataPoints ?? [],
            dataPoints: updates.dataPoints ?? updates.metrics ?? currentKPI.dataPoints ?? currentKPI.metrics ?? [],
            chartType: updates.chartType ?? currentKPI.chartType,
            visualizationType: updates.visualizationType ?? currentKPI.visualizationType,
            visible: nextVisible,
        };

        const response = await clientFetch(`/api/kpis/${kpiId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Failed to update KPI', await response.text());
            return;
        }

        await fetchScorecards();
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
            id: newId(),
        };

        const updatedSections = [...(scorecard.sections || []), newSection];
        await updateScorecard(scorecardId, { sections: updatedSections });
        return newSection.id;
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

    const reorderSections = async (
        scorecardId: string,
        sectionIds: string[]
    ) => {
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const updatedSections = (scorecard.sections || []).map(section => {
            const newOrder = sectionIds.indexOf(section.id);
            return { ...section, order: newOrder >= 0 ? newOrder : section.order };
        });

        await updateScorecard(scorecardId, { sections: updatedSections });
    };

    // Collaborative update methods
    const assignKPIToUser = async (
        scorecardId: string,
        kpiId: string,
        email: string
    ) => {
        await bulkAssignKPIs(scorecardId, [kpiId], [email]);
    };

    const bulkAssignKPIs = async (
        scorecardId: string,
        kpiIds: string[],
        emails: string[]
    ) => {
        const { generateUpdateToken } = await import('@/utils/tokenUtils');
        const scorecard = getScorecard(scorecardId);
        if (!scorecard) return;

        const targetEmails = Array.from(
            new Set(emails.map(email => email.trim()).filter(Boolean))
        );

        if (targetEmails.length === 0) return;

        const newAssignees = { ...(scorecard.assignees || {}) };

        targetEmails.forEach(email => {
            if (!newAssignees[email]) {
                newAssignees[email] = generateUpdateToken(); // Reuse same token generator for simplicity
            }
        });

        const updatedKPIs = scorecard.kpis.map(kpi => {
            if (!kpiIds.includes(kpi.id)) return kpi;

            const mergedAssignees = Array.from(
                new Set([...normalizeKPIAssignees(kpi), ...targetEmails])
            );

            return {
                ...kpi,
                assignees: mergedAssignees.length ? mergedAssignees : undefined,
                assignee: mergedAssignees[0],
                updateToken: kpi.updateToken || generateUpdateToken(),
            };
        });

        await updateScorecard(scorecardId, {
            kpis: updatedKPIs,
            assignees: newAssignees
        });
    };

    const updateKPIByToken = async (
        token: string,
        updates: Partial<KPI>,
        updatedBy?: string,
        kpiId?: string
    ) => {
        // Find KPI by token across all scorecards
        for (const scorecard of scorecards) {
            let kpi = scorecard.kpis.find(k => k.updateToken === token);

            // If not found by KPI token, try to resolve via assignee token and explicit KPI id
            if (!kpi && kpiId) {
                const email = Object.entries(scorecard.assignees || {}).find(([, t]) => t === token)?.[0];
                if (email) {
                    const candidate = scorecard.kpis.find(k => k.id === kpiId);
                    if (candidate) {
                        kpi = candidate;
                    }
                }
            }

            if (!kpi) continue;

            const nextVisible = updates.visible ?? kpi.visible ?? true;
            const hasTargetValue = Object.prototype.hasOwnProperty.call(updates, 'targetValue');
            const hasTargetColor = Object.prototype.hasOwnProperty.call(updates, 'targetColor');
            const payload = {
                // Keep immutable identity fields
                id: kpi.id,
                sectionId: kpi.sectionId,
                // Preserve chart metadata so metric normalization works server-side
                chartType: updates.chartType ?? kpi.chartType,
                visualizationType: updates.visualizationType ?? kpi.visualizationType,
                // Apply caller updates
                ...updates,
                prefix: updates.prefix ?? kpi.prefix,
                prefixOpacity: updates.prefixOpacity ?? kpi.prefixOpacity,
                suffix: updates.suffix ?? kpi.suffix,
                suffixOpacity: updates.suffixOpacity ?? kpi.suffixOpacity,
                targetValue: hasTargetValue ? updates.targetValue : kpi.targetValue,
                targetColor: hasTargetColor ? updates.targetColor : kpi.targetColor,
                // Ensure metrics/dataPoints are present for replacement
                metrics: updates.metrics ?? updates.dataPoints ?? kpi.metrics ?? kpi.dataPoints ?? [],
                dataPoints: updates.dataPoints ?? updates.metrics ?? kpi.dataPoints ?? kpi.metrics ?? [],
                // Housekeeping
                visible: nextVisible,
                lastUpdatedBy: updatedBy,
                date: new Date().toISOString(),
            };

            const response = await clientFetch(`/api/kpis/${kpi.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error('Failed to update KPI by token', await response.text());
                throw new Error('Failed to update KPI');
            }

            await fetchScorecards();
            return;
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

    const getKPIsByAssigneeToken = (token: string): { scorecard: Scorecard; kpis: KPI[]; assigneeEmail: string } | null => {
        for (const scorecard of scorecards) {
            // Find email associated with this token
            const email = Object.entries(scorecard.assignees || {}).find(([, t]) => t === token)?.[0];

            if (email) {
                // Special pseudo-assignee for section links: __section__:<id|unassigned>
                if (email.startsWith('__section__:')) {
                    const sectionKey = email.replace('__section__:', '');
                    const targetSectionId = sectionKey === 'unassigned' ? null : sectionKey;
                    const kpis = scorecard.kpis.filter(k => (k.sectionId || null) === targetSectionId);
                    return { scorecard, kpis, assigneeEmail: email };
                }

                // Find all visible KPIs assigned to this email
                const kpis = scorecard.kpis.filter(k => {
                    const isVisible = k.visible !== false;
                    return isVisible && normalizeKPIAssignees(k).includes(email);
                });
                return { scorecard, kpis, assigneeEmail: email };
            }
        }
        return null;
    };

    const generateAssigneeToken = async (scorecardId: string, email: string): Promise<string> => {
        let scorecard = getScorecard(scorecardId);
        if (!scorecard) {
            const fetched = await fetchScorecardById(scorecardId);
            if (fetched) scorecard = fetched;
        }
        if (!scorecard) throw new Error('Scorecard not found');

        if (scorecard.assignees?.[email]) {
            return scorecard.assignees[email];
        }

        const refreshed = await fetchScorecardById(scorecardId);
        if (refreshed && refreshed.assignees?.[email]) {
            return refreshed.assignees[email];
        }

        const { generateUpdateToken } = await import('@/utils/tokenUtils');
        const newToken = generateUpdateToken();
        await persistAssigneeToken(scorecardId, email, newToken);
        return newToken;
    };

    const regenerateAssigneeToken = async (scorecardId: string, email: string): Promise<string> => {
        const { generateUpdateToken } = await import('@/utils/tokenUtils');
        const newToken = generateUpdateToken();
        await persistAssigneeToken(scorecardId, email, newToken);
        return newToken;
    };

    const deleteAssigneeToken = async (scorecardId: string, email: string): Promise<void> => {
        await persistAssigneeToken(scorecardId, email, null);
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
                reorderSections,
                assignKPIToUser,
                bulkAssignKPIs,
                updateKPIByToken,
                getKPIByToken,
                getKPIsByAssigneeToken,
                generateAssigneeToken,
                regenerateAssigneeToken,
                deleteAssigneeToken,
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
