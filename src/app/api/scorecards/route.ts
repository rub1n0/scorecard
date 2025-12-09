/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import {
    assignments,
    assignmentAssignees,
    metrics,
    metricDataPoints,
    scorecardAssigneeTokens,
    scorecards,
    sections,
    users,
} from '../../../../db/schema';
import { buildChartSettings, extractChartSettingColumns, mapDataPointValue, normalizeDateOnly, normalizeValueForChartType } from '@/utils/metricNormalization';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

const buildScorecard = async (sc: typeof scorecards.$inferSelect) => {
    const sectionRows = await db.select().from(sections).where(eq(sections.scorecardId, sc.id)).orderBy(sections.displayOrder);
    const metricRows = await db.select().from(metrics).where(eq(metrics.scorecardId, sc.id));
    const metricIds = metricRows.map(m => m.id);
    const dataPoints = metricIds.length
        ? await db.select().from(metricDataPoints).where(inArray(metricDataPoints.metricId, metricIds))
        : [];
    const dataPointsByMetric = new Map<string, typeof dataPoints>();
    dataPoints.forEach(dp => {
        const list = dataPointsByMetric.get(dp.metricId) || [];
        list.push(dp);
        dataPointsByMetric.set(dp.metricId, list);
    });

    const assignmentRows = metricIds.length
        ? await db
            .select({
                assignment: assignments,
                assignmentId: assignments.id,
                metricId: assignments.metricId,
                user: users,
            })
            .from(assignments)
            .leftJoin(assignmentAssignees, eq(assignments.id, assignmentAssignees.assignmentId))
            .leftJoin(users, eq(assignmentAssignees.userId, users.id))
            .where(inArray(assignments.metricId, metricIds))
        : [];

    const assigneesByMetric = new Map<string, string[]>();
    assignmentRows.forEach(row => {
        const key = row.metricId;
        const list = assigneesByMetric.get(key) || [];
        if (row.user) {
            list.push(row.user.email || row.user.name || '');
        }
        assigneesByMetric.set(key, list.filter(Boolean));
    });

    const tokens = await db
        .select()
        .from(scorecardAssigneeTokens)
        .where(eq(scorecardAssigneeTokens.scorecardId, sc.id));

    const assigneesMap: Record<string, string> = {};
    tokens.forEach(t => {
        assigneesMap[t.email] = t.token;
    });

    const kpis = metricRows.map(m => {
        const chartSettings = buildChartSettings(m);
        const dataPointsForMetric = dataPointsByMetric.get(m.id) || [];

        return {
            id: m.id,
            name: m.kpiName || m.name,
            kpiName: m.kpiName || m.name,
            subtitle: m.subtitle || undefined,
            visualizationType: m.visualizationType as any,
            chartType: m.chartType || undefined,
            reverseTrend: m.reverseTrend,
            updateToken: m.updateToken || undefined,
            assignment: m.assignment || undefined,
            date: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
            prefix: m.prefix || undefined,
            suffix: m.suffix || undefined,
            trendValue: m.trendValue ?? undefined,
            value: (m.valueJson as any) || {},
            notes: m.notes || undefined,
            chartSettings,
            strokeWidth: m.strokeWidth ?? chartSettings.strokeWidth,
            strokeColor: m.strokeColor ?? chartSettings.strokeColor,
            strokeOpacity: m.strokeOpacity ?? chartSettings.strokeOpacity,
            showLegend: typeof m.showLegend === 'number' ? Boolean(m.showLegend) : m.showLegend ?? chartSettings.showLegend,
            showGridlines:
                typeof m.showGridlines === 'number'
                    ? Boolean(m.showGridlines)
                    : m.showGridlines ?? (chartSettings as any).showGridLines ?? (chartSettings as any).showGridlines,
            showDataLabels: typeof m.showDataLabels === 'number' ? Boolean(m.showDataLabels) : m.showDataLabels ?? chartSettings.showDataLabels,
            order: m.order ?? undefined,
            lastUpdatedBy: m.lastUpdatedBy || undefined,
            sectionId: m.sectionId || undefined,
            visible: m.visible ?? true,
            assignees: assigneesByMetric.get(m.id) || [],
            dataPoints: dataPointsForMetric.map(dp => mapDataPointValue(m.chartType, dp.date, dp.value, dp.color)),
        };
    });

    return {
        id: sc.id,
        name: sc.name,
        description: sc.description || '',
        kpis,
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
                const metricIds = (await tx.select({ id: metrics.id }).from(metrics).where(eq(metrics.scorecardId, id))).map(m => m.id);
                if (metricIds.length) {
                    const assignmentIds = (await tx.select({ id: assignments.id }).from(assignments).where(inArray(assignments.metricId, metricIds))).map(a => a.id);
                    if (assignmentIds.length) {
                        await tx.delete(assignmentAssignees).where(inArray(assignmentAssignees.assignmentId, assignmentIds));
                        await tx.delete(assignments).where(inArray(assignments.id, assignmentIds));
                    }
                    await tx.delete(metricDataPoints).where(inArray(metricDataPoints.metricId, metricIds));
                    await tx.delete(metrics).where(eq(metrics.scorecardId, id));
                }

                const metricValues = body.kpis.map((kpi: any, idx: number) => {
                    const chartSettingsCols = extractChartSettingColumns(kpi.chartSettings);
                    const normalizedDate = normalizeDateOnly(kpi.date);
                    const dateValue = new Date(`${normalizedDate}T00:00:00.000Z`);
                    const name = kpi.name || kpi.kpiName || `KPI ${idx + 1}`;

                    return {
                        id: kpi.id || crypto.randomUUID(),
                        scorecardId: id,
                        sectionId: kpi.sectionId || null,
                        name,
                        kpiName: kpi.kpiName || name,
                        subtitle: kpi.subtitle || null,
                        assignment: kpi.assignment || null,
                        visualizationType: kpi.visualizationType || 'number',
                        chartType: kpi.chartType || null,
                        reverseTrend: Boolean(kpi.reverseTrend),
                        updateToken: kpi.updateToken || null,
                        date: dateValue,
                        prefix: kpi.prefix || null,
                        suffix: kpi.suffix || null,
                        strokeWidth: chartSettingsCols.strokeWidth ?? null,
                        strokeColor: chartSettingsCols.strokeColor ?? null,
                        strokeOpacity: chartSettingsCols.strokeOpacity ?? null,
                        showLegend: chartSettingsCols.showLegend ?? (kpi.chartSettings?.showLegend ?? true),
                        showGridlines:
                            chartSettingsCols.showGridlines ??
                            (kpi.chartSettings as any)?.showGridLines ??
                            (kpi.chartSettings as any)?.showGridlines ??
                            true,
                        showDataLabels: chartSettingsCols.showDataLabels ?? (kpi.chartSettings?.showDataLabels ?? false),
                        trendValue: kpi.trendValue ?? null,
                        valueJson: kpi.value || {},
                        notes: kpi.notes || null,
                        chartSettings: kpi.chartSettings || null,
                        order: kpi.order ?? idx,
                        lastUpdatedBy: kpi.lastUpdatedBy || null,
                        visible: kpi.visible ?? true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                });

                if (metricValues.length) {
                    await tx.insert(metrics).values(metricValues);

                    for (const m of metricValues) {
                        const kpiSource = body.kpis.find((k: any) => (k.id || m.id) === m.id);

                        // Insert dataPoints for ALL metrics (before assignee check)
                        const points = (kpiSource?.dataPoints || []).map((dp: any) => {
                            const normalizedDate = normalizeDateOnly(dp.date);
                            const value = normalizeValueForChartType(kpiSource?.chartType || m.chartType, dp.labeledValues ?? dp.valueArray ?? dp.value);
                            return {
                                metricId: m.id,
                                date: new Date(`${normalizedDate}T00:00:00.000Z`),
                                value,
                                color: dp.color || null,
                            };
                        });
                        if (points.length) {
                            await tx
                                .insert(metricDataPoints)
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
                            metricId: m.id,
                            sectionId: m.sectionId,
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
        const metricIds = (await db.select({ id: metrics.id }).from(metrics).where(eq(metrics.scorecardId, id))).map(m => m.id);
        if (metricIds.length) {
            const assignmentIds = (await db.select({ id: assignments.id }).from(assignments).where(inArray(assignments.metricId, metricIds))).map(a => a.id);
            if (assignmentIds.length) {
                await db.delete(assignmentAssignees).where(inArray(assignmentAssignees.assignmentId, assignmentIds));
                await db.delete(assignments).where(inArray(assignments.id, assignmentIds));
            }
            await db.delete(metrics).where(eq(metrics.scorecardId, id));
        }
        await db.delete(scorecardAssigneeTokens).where(eq(scorecardAssigneeTokens.scorecardId, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[scorecards][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete scorecard' }, { status: 500 });
    }
}
