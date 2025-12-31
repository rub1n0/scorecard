/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq, inArray, sql, asc } from 'drizzle-orm';
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
} from '../../../../db/schema';
import { buildChartSettings, extractChartSettingColumns, mapMetricValue, normalizeDateOnly, resolveVisualizationType } from '@/utils/metricNormalization';
import { buildPersistedMetrics } from '@/utils/metricPersistence';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

const buildScorecard = async (sc: typeof scorecards.$inferSelect) => {
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
            .select({
                assignment: assignments,
                assignmentId: assignments.id,
                kpiId: assignments.kpiId,
                user: users,
            })
            .from(assignments)
            .leftJoin(assignmentAssignees, eq(assignments.id, assignmentAssignees.assignmentId))
            .leftJoin(users, eq(assignmentAssignees.userId, users.id))
            .where(inArray(assignments.kpiId, kpiIds))
        : [];

    const assigneesByKpi = new Map<string, string[]>();
    assignmentRows.forEach(row => {
        const key = row.kpiId;
        const list = assigneesByKpi.get(key) || [];
        if (row.user) {
            list.push(row.user.email || row.user.name || '');
        }
        assigneesByKpi.set(key, list.filter(Boolean));
    });

    const tokens = await db
        .select()
        .from(scorecardAssigneeTokens)
        .where(eq(scorecardAssigneeTokens.scorecardId, sc.id));

    const assigneesMap: Record<string, string> = {};
    tokens.forEach(t => {
        assigneesMap[t.email] = t.token;
    });

    const kpisPayload = kpiRows.map(kpi => {
        const chartSettings = buildChartSettings(kpi);
        const resolvedVisualizationType = resolveVisualizationType(kpi.visualizationType, kpi.chartType);
        const metricEntries = metricsByKpi.get(kpi.id) || [];

        return {
            id: kpi.id,
            name: kpi.kpiName || kpi.name,
            kpiName: kpi.kpiName || kpi.name,
            subtitle: kpi.subtitle || undefined,
            visualizationType: resolvedVisualizationType,
            chartType: kpi.chartType || undefined,
            reverseTrend: kpi.reverseTrend,
            updateToken: kpi.updateToken || undefined,
            assignment: kpi.assignment || undefined,
            date: kpi.date ? new Date(kpi.date).toISOString() : new Date().toISOString(),
            updatedAt: kpi.updatedAt ? new Date(kpi.updatedAt).toISOString() : undefined,
            prefix: kpi.prefix || undefined,
            suffix: kpi.suffix || undefined,
            trendValue: kpi.trendValue ?? undefined,
            value: (kpi.valueJson as any) || {},
            targetValue: (kpi as any).targetValue ?? undefined,
            targetColor: (kpi as any).targetColor ?? undefined,
            notes: kpi.notes || undefined,
            chartSettings,
            sankeySettings: (kpi as any).sankeySettings || undefined,
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
            metrics: metricEntries.map(dp => mapMetricValue(kpi.chartType, dp.date, dp.value, dp.color)),
            dataPoints: metricEntries.map(dp => mapMetricValue(kpi.chartType, dp.date, dp.value, dp.color)),
        };
    });

    return {
        id: sc.id,
        name: sc.name,
        description: sc.description || '',
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

export async function GET() {
    try {
        const rows = await db.select().from(scorecards);
        const result = await Promise.all(rows.map(buildScorecard));
        return NextResponse.json(result);
    } catch (error) {
        console.error('[scorecards][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch scorecards' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const name = (body?.name || '').trim();
        const description = body?.description ?? '';
        if (!name) return badRequest('name is required');

        const id = crypto.randomUUID();
        const now = new Date();
        await db.insert(scorecards).values({
            id,
            name,
            description,
            createdAt: now,
            updatedAt: now,
        });

        const sc = await buildScorecard({
            id,
            name,
            description,
            createdAt: now,
            updatedAt: now,
        });
        return NextResponse.json(sc, { status: 201 });
    } catch (error) {
        console.error('[scorecards][POST]', error);
        return NextResponse.json({ error: 'Failed to create scorecard' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const id = body?.id as string;
        if (!id) return badRequest('id is required');

        const updates: any = {};
        if (body?.name !== undefined) updates.name = body.name;
        if (body?.description !== undefined) updates.description = body.description;
        updates.updatedAt = new Date();

        await db.transaction(async (tx) => {
            if (Object.keys(updates).length) {
                await tx.update(scorecards).set(updates).where(eq(scorecards.id, id));
            }

            if (Array.isArray(body?.sections)) {
                await tx.delete(sections).where(eq(sections.scorecardId, id));
                const sectionValues = body.sections.map((s: any, idx: number) => ({
                    id: s.id || crypto.randomUUID(),
                    scorecardId: id,
                    name: s.name || '',
                    displayOrder: s.order ?? idx,
                    color: s.color || 'charcoal-blue',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }));
                if (sectionValues.length) {
                    await tx.insert(sections).values(sectionValues);
                }
            }

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
                        targetValue: kpi.targetValue ?? null,
                        targetColor: kpi.targetColor ?? null,
                        valueJson: kpi.value || {},
                        sankeySettings: kpi.sankeySettings || null,
                        notes: kpi.notes || null,
                        chartSettings: kpi.chartSettings || null,
                        order: kpi.order ?? idx,
                        lastUpdatedBy: kpi.lastUpdatedBy || null,
                        visible: kpi.visible ?? true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                });

                if (kpiDefinitions.length) {
                    await tx.insert(kpis).values(kpiDefinitions);

                    for (const definition of kpiDefinitions) {
                        const kpiSource = body.kpis.find((k: any) => (k.id || definition.id) === definition.id);

                        const chartTypeCandidate = kpiSource?.chartType || definition.chartType;
                        const rawVisualizationType = kpiSource?.visualizationType || definition.visualizationType;
                        const resolvedVisualizationType = resolveVisualizationType(rawVisualizationType, chartTypeCandidate);
                        const chartTypeForMetrics = resolvedVisualizationType === 'chart' ? chartTypeCandidate : null;

                        // Insert metrics for ALL KPIs (before assignee check)
                        const sourceMetrics = (kpiSource?.metrics && kpiSource.metrics.length ? kpiSource.metrics : kpiSource?.dataPoints) || [];
                        const { points } = buildPersistedMetrics(definition.id, chartTypeForMetrics, sourceMetrics);

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
                        const assigneesList: string[] = Array.from(new Set([...(kpiSource?.assignees || []), kpiSource?.assignee].filter(Boolean)));
                        if (assigneesList.length === 0) continue;

                        const assignmentId = crypto.randomUUID();
                        await tx.insert(assignments).values({
                            id: assignmentId,
                            kpiId: definition.id,
                            sectionId: definition.sectionId,
                            createdAt: new Date(),
                            updatedAt: new Date(),
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
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
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
                await tx.delete(scorecardAssigneeTokens).where(eq(scorecardAssigneeTokens.scorecardId, id));
                const rows = Object.entries(body.assignees).map(([email, token]) => ({
                    scorecardId: id,
                    email,
                    token: String(token),
                }));
                if (rows.length) await tx.insert(scorecardAssigneeTokens).values(rows);
            }
        });

        const [updated] = await db.select().from(scorecards).where(eq(scorecards.id, id));
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const sc = await buildScorecard(updated);
        return NextResponse.json(sc);
    } catch (error) {
        console.error('[scorecards][PUT]', error);
        return NextResponse.json({ error: 'Failed to update scorecard' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const id = body?.id as string;
        if (!id) return badRequest('id is required');

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
        console.error('[scorecards][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete scorecard' }, { status: 500 });
    }
}
