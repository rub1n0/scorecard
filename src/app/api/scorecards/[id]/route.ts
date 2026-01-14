/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { and, eq, inArray, sql, asc } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import {
    assignments,
    assignmentAssignees,
    kpis,
    metrics,
    scorecardAssigneeTokens,
    scorecards,
    sections,
    users,
} from '../../../../../db/schema';
import { buildChartSettings, extractChartSettingColumns, mapMetricValue, normalizeDateOnly, normalizeValueForChartType, resolveVisualizationType } from '@/utils/metricNormalization';

const computeTrendFromMetrics = (metricsForKpi: Array<{ date: string; value: number | unknown }>) => {
    if (metricsForKpi.length < 2) return undefined;
    const sorted = [...metricsForKpi].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (typeof latest.value !== 'number' || typeof prev.value !== 'number') return undefined;
    return latest.value - prev.value;
};

const buildScorecard = async (id: string) => {
    const [sc] = await db.select().from(scorecards).where(eq(scorecards.id, id));
    if (!sc) return null;

    const sectionRows = await db.select().from(sections).where(eq(sections.scorecardId, sc.id)).orderBy(sections.displayOrder);
    const kpiRows = await db.select().from(kpis).where(eq(kpis.scorecardId, sc.id));
    const kpiIds = kpiRows.map(k => k.id);
    const metricRows = kpiIds.length
        ? await db.select().from(metrics).where(inArray(metrics.kpiId, kpiIds)).orderBy(asc(metrics.date))
        : [];
    const metricsByKpi = new Map<string, typeof metricRows>();
    metricRows.forEach(mt => {
        const list = metricsByKpi.get(mt.kpiId) || [];
        list.push(mt);
        metricsByKpi.set(mt.kpiId, list);
    });
    const assignmentRows = kpiIds.length
        ? await db
            .select({ assignment: assignments, assignmentId: assignments.id, kpiId: assignments.kpiId, user: users })
            .from(assignments)
            .leftJoin(assignmentAssignees, eq(assignments.id, assignmentAssignees.assignmentId))
            .leftJoin(users, eq(assignmentAssignees.userId, users.id))
            .where(inArray(assignments.kpiId, kpiIds))
        : [];

    const assigneesByKpi = new Map<string, string[]>();
    assignmentRows.forEach(row => {
        const list = assigneesByKpi.get(row.kpiId) || [];
        if (row.user) list.push(row.user.email || row.user.name || '');
        assigneesByKpi.set(row.kpiId, list.filter(Boolean));
    });

    const tokens = await db
        .select()
        .from(scorecardAssigneeTokens)
        .where(eq(scorecardAssigneeTokens.scorecardId, sc.id));
    const assigneesMap: Record<string, string> = {};
    tokens.forEach(t => { assigneesMap[t.email] = t.token; });

    const kpisPayload = kpiRows.map(kpi => {
        const chartSettings = buildChartSettings(kpi);
        const resolvedVisualizationType = resolveVisualizationType(kpi.visualizationType, kpi.chartType);
        const metricsForKpi = metricsByKpi.get(kpi.id) || [];
        const mappedMetrics = metricsForKpi.map(dp => mapMetricValue(kpi.chartType, dp.date, dp.value, dp.color));
        const computedTrend = computeTrendFromMetrics(mappedMetrics);

        return {
            id: kpi.id,
            name: kpi.kpiName || kpi.name,
            kpiName: kpi.kpiName || kpi.name,
            subtitle: kpi.subtitle || undefined,
            bannerStatus: kpi.bannerStatus || undefined,
            visualizationType: resolvedVisualizationType,
            chartType: kpi.chartType || undefined,
            reverseTrend: kpi.reverseTrend,
            updateToken: kpi.updateToken || undefined,
            assignment: kpi.assignment || undefined,
            date: kpi.date ? new Date(kpi.date).toISOString() : new Date().toISOString(),
            updatedAt: kpi.updatedAt ? new Date(kpi.updatedAt).toISOString() : undefined,
            prefix: kpi.prefix || undefined,
            suffix: kpi.suffix || undefined,
            trendValue: computedTrend ?? kpi.trendValue ?? undefined,
            value: (kpi.valueJson as any) || {},
            targetValue: (kpi as any).targetValue ?? undefined,
            targetColor: (kpi as any).targetColor ?? undefined,
            notes: kpi.notes || undefined,
            commentTextSize: (kpi as any).commentTextSize || undefined,
            chartSettings,
            strokeWidth: kpi.strokeWidth ?? chartSettings.strokeWidth,
            strokeColor: kpi.strokeColor ?? chartSettings.strokeColor,
            strokeOpacity: kpi.strokeOpacity ?? chartSettings.strokeOpacity,
            showLegend: typeof kpi.showLegend === 'number' ? Boolean(kpi.showLegend) : kpi.showLegend ?? chartSettings.showLegend,
            showGridLines: chartSettings.showGridLines ?? true,
            showDataLabels: typeof kpi.showDataLabels === 'number' ? Boolean(kpi.showDataLabels) : kpi.showDataLabels ?? chartSettings.showDataLabels,
            order: kpi.order ?? undefined,
            lastUpdatedBy: kpi.lastUpdatedBy || undefined,
            sectionId: kpi.sectionId || undefined,
            visible: kpi.visible ?? true,
            assignees: assigneesByKpi.get(kpi.id) || [],
            metrics: mappedMetrics,
            dataPoints: mappedMetrics,
        };
    });

    return {
        id: sc.id,
        name: sc.name,
        description: sc.description || '',
        bannerConfig: sc.bannerConfig ?? null,
        kpis: kpisPayload,
        sections: sectionRows.map(s => ({
            id: s.id,
            name: s.name || '',
            color: s.color || 'charcoal-blue',
            order: s.displayOrder,
            opacity: s.opacity ?? 1,
        })),
        assignees: assigneesMap,
        createdAt: sc.createdAt?.toISOString?.() || '',
        updatedAt: sc.updatedAt?.toISOString?.() || '',
    };
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const sc = await buildScorecard(id);
        return sc ? NextResponse.json(sc) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[scorecards/:id][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch scorecard' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const now = new Date();

        await db.transaction(async (tx) => {
            // Update basic fields (only when provided)
            const updateFields: Partial<typeof scorecards.$inferInsert> = { updatedAt: now };
            if (body?.name !== undefined) updateFields.name = body.name;
            if (body?.description !== undefined) updateFields.description = body.description;
            if (body?.bannerConfig !== undefined) updateFields.bannerConfig = body.bannerConfig;
            await tx.update(scorecards).set(updateFields).where(eq(scorecards.id, id));

            // Replace sections if provided
            if (Array.isArray(body?.sections)) {
                await tx.delete(sections).where(eq(sections.scorecardId, id));
                const sectionValues = body.sections.map((s: any, idx: number) => ({
                    id: s.id,
                    scorecardId: id,
                    name: s.name || '',
                    displayOrder: s.order ?? idx,
                    color: s.color || null,
                    opacity: s.opacity ?? 1,
                    createdAt: now,
                    updatedAt: now,
                }));
                if (sectionValues.length) {
                    await tx.insert(sections).values(sectionValues);
                }
            }

            // Replace kpis/metrics if provided (for completeness with section edits)
            if (Array.isArray(body?.kpis)) {
                const kpiIds = (await tx.select({ id: kpis.id }).from(kpis).where(eq(kpis.scorecardId, id))).map(m => m.id);
                if (kpiIds.length) {
                    const assignmentIds = (await tx.select({ id: assignments.id }).from(assignments).where(inArray(assignments.kpiId, kpiIds))).map(a => a.id);
                    if (assignmentIds.length) {
                        await tx.delete(assignmentAssignees).where(inArray(assignmentAssignees.assignmentId, assignmentIds));
                        await tx.delete(assignments).where(inArray(assignments.id, assignmentIds));
                    }
                    await tx.delete(metrics).where(inArray(metrics.kpiId, kpiIds));
                    await tx.delete(kpis).where(eq(kpis.scorecardId, id));
                }

                const normalizeStrokeColor = (value: unknown) => {
                    if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
                    if (typeof value === 'string') return value;
                    return null;
                };

                const kpiDefinitions = body.kpis.map((kpi: any, idx: number) => {
                    const chartSettingsCols = extractChartSettingColumns(kpi.chartSettings);
                    const normalizedDate = normalizeDateOnly(kpi.date);
                    const dateValue = new Date(`${normalizedDate}T00:00:00.000Z`);
                    const name = kpi.name || kpi.kpiName || `KPI ${idx + 1}`;
                    const resolvedVisualizationType = resolveVisualizationType(kpi.visualizationType, kpi.chartType);

                    return {
                        id: kpi.id || crypto.randomUUID(),
                        scorecardId: id,
                        sectionId: kpi.sectionId || null,
                        name,
                        kpiName: kpi.kpiName || name,
                        subtitle: kpi.subtitle || null,
                        bannerStatus: kpi.bannerStatus || null,
                        assignment: kpi.assignment || null,
                        visualizationType: resolvedVisualizationType,
                        chartType: kpi.chartType || null,
                        reverseTrend: Boolean(kpi.reverseTrend),
                        updateToken: kpi.updateToken || null,
                        date: dateValue,
                        prefix: kpi.prefix || null,
                        suffix: kpi.suffix || null,
                        strokeWidth: chartSettingsCols.strokeWidth ?? null,
                        strokeColor: chartSettingsCols.strokeColor ?? normalizeStrokeColor(kpi.strokeColor) ?? null,
                        strokeOpacity: chartSettingsCols.strokeOpacity ?? null,
                        showLegend: chartSettingsCols.showLegend ?? (kpi.chartSettings?.showLegend ?? true),
                        showGridlines:
                            chartSettingsCols.showGridlines ??
                            (kpi.chartSettings as any)?.showGridLines ??
                            (kpi.chartSettings as any)?.showGridlines ??
                            true,
                        showDataLabels: chartSettingsCols.showDataLabels ?? (kpi.chartSettings?.showDataLabels ?? false),
                        trendValue: kpi.trendValue ?? null,
                        latestValue: kpi.latestValue ?? null,
                        targetValue: kpi.targetValue ?? null,
                        targetColor: kpi.targetColor ?? null,
                        valueJson: kpi.value || kpi.valueJson || {},
                        notes: kpi.notes || null,
                        commentTextSize: kpi.commentTextSize || null,
                        chartSettings: kpi.chartSettings || null,
                        order: kpi.order ?? idx,
                        lastUpdatedBy: kpi.lastUpdatedBy || null,
                        visible: kpi.visible ?? true,
                        createdAt: now,
                        updatedAt: now,
                    };
                });

                if (kpiDefinitions.length) {
                    await tx.insert(kpis).values(kpiDefinitions);

                    for (const definition of kpiDefinitions) {
                        const kpi = body.kpis.find((k: any) => k.id === definition.id);

                        const chartTypeCandidate = kpi?.chartType || definition.chartType;
                        const rawVisualizationType = kpi?.visualizationType || definition.visualizationType;
                        const resolvedVisualizationType = resolveVisualizationType(rawVisualizationType, chartTypeCandidate);
                        const chartTypeForMetrics = resolvedVisualizationType === 'chart' ? chartTypeCandidate : null;

                        // Insert metrics for ALL KPIs (before assignee check)
                        const points = ((kpi?.metrics && kpi.metrics.length ? kpi.metrics : kpi?.dataPoints) || []).map((dp: any) => {
                            const normalizedDate = normalizeDateOnly(dp.date);
                            const value = normalizeValueForChartType(chartTypeForMetrics, dp.labeledValues ?? dp.valueArray ?? dp.value);
                            return {
                                kpiId: definition.id,
                                date: new Date(`${normalizedDate}T00:00:00.000Z`),
                                value,
                                color: dp.color || null,
                            };
                        });
                        if (points.length) {
                            await tx
                                .insert(metrics)
                                .values(points)
                                .onDuplicateKeyUpdate({
                                    set: {
                                        value: sql`VALUES(value)`,
                                        color: sql`VALUES(color)`,
                                    },
                                });
                        }

                        // Handle assignees (only if present)
                        const assigneesList: string[] = Array.from(new Set([...(kpi?.assignees || []), kpi?.assignee].filter(Boolean)));
                        if (assigneesList.length === 0) continue;

                        const assignmentId = crypto.randomUUID();
                        await tx.insert(assignments).values({
                            id: assignmentId,
                            kpiId: definition.id,
                            sectionId: definition.sectionId,
                            createdAt: now,
                            updatedAt: now,
                        });

                        for (const name of assigneesList) {
                            const userName = String(name);
                            const [existing] = await tx.select().from(users).where(eq(users.name, userName)).limit(1);
                            const userId = existing?.id || crypto.randomUUID();
                            if (!existing) {
                                await tx.insert(users).values({
                                    id: userId,
                                    name: userName,
                                    email: null,
                                    createdAt: now,
                                    updatedAt: now,
                                });
                            }
                            await tx.insert(assignmentAssignees).values({
                                id: crypto.randomUUID(),
                                assignmentId,
                                userId,
                            });
                        }
                    }
                }
            }

            if (body?.assignees && typeof body.assignees === 'object') {
                const removals = Object.entries(body.assignees)
                    .filter(([, token]) => token === null || token === undefined)
                    .map(([email]) => email);

                if (removals.length) {
                    await tx
                        .delete(scorecardAssigneeTokens)
                        .where(and(
                            eq(scorecardAssigneeTokens.scorecardId, id),
                            inArray(scorecardAssigneeTokens.email, removals)
                        ));
                }

                const rows = Object.entries(body.assignees)
                    .filter(([, token]) => token !== null && token !== undefined)
                    .map(([email, token]) => ({
                        scorecardId: id,
                        email,
                        token: String(token),
                    }));

                if (rows.length) {
                    await tx
                        .insert(scorecardAssigneeTokens)
                        .values(rows)
                        .onDuplicateKeyUpdate({
                            set: {
                                token: sql`VALUES(token)`,
                            },
                        });
                }
            }
        });

        const sc = await buildScorecard(id);
        return sc ? NextResponse.json(sc) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[scorecards/:id][PUT]', error);
        return NextResponse.json({ error: 'Failed to update scorecard' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await db.delete(scorecards).where(eq(scorecards.id, id));
        await db.delete(sections).where(eq(sections.scorecardId, id));
        const kpiIds = (await db.select({ id: kpis.id }).from(kpis).where(eq(kpis.scorecardId, id))).map(m => m.id);
        if (kpiIds.length) {
            const assignmentIds = (await db.select({ id: assignments.id }).from(assignments).where(inArray(assignments.kpiId, kpiIds))).map(a => a.id);
            if (assignmentIds.length) {
                await db.delete(assignmentAssignees).where(inArray(assignmentAssignees.assignmentId, assignmentIds));
                await db.delete(assignments).where(inArray(assignments.id, assignmentIds));
            }
            await db.delete(metrics).where(inArray(metrics.kpiId, kpiIds));
            await db.delete(kpis).where(eq(kpis.scorecardId, id));
        }
        await db.delete(scorecardAssigneeTokens).where(eq(scorecardAssigneeTokens.scorecardId, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[scorecards/:id][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete scorecard' }, { status: 500 });
    }
}
