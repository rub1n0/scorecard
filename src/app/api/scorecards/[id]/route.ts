/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
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
} from '../../../../../db/schema';

const buildScorecard = async (id: string) => {
    const [sc] = await db.select().from(scorecards).where(eq(scorecards.id, id));
    if (!sc) return null;

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
            .select({ assignment: assignments, assignmentId: assignments.id, metricId: assignments.metricId, user: users })
            .from(assignments)
            .leftJoin(assignmentAssignees, eq(assignments.id, assignmentAssignees.assignmentId))
            .leftJoin(users, eq(assignmentAssignees.userId, users.id))
            .where(inArray(assignments.metricId, metricIds))
        : [];

    const assigneesByMetric = new Map<string, string[]>();
    assignmentRows.forEach(row => {
        const list = assigneesByMetric.get(row.metricId) || [];
        if (row.user) list.push(row.user.email || row.user.name || '');
        assigneesByMetric.set(row.metricId, list.filter(Boolean));
    });

    const tokens = await db
        .select()
        .from(scorecardAssigneeTokens)
        .where(eq(scorecardAssigneeTokens.scorecardId, sc.id));
    const assigneesMap: Record<string, string> = {};
    tokens.forEach(t => { assigneesMap[t.email] = t.token; });

    const kpis = metricRows.map(m => ({
        id: m.id,
        name: m.name,
        subtitle: m.subtitle || undefined,
        visualizationType: m.visualizationType as any,
        chartType: m.chartType || undefined,
        reverseTrend: m.reverseTrend,
        updateToken: m.updateToken || undefined,
        date: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
        prefix: m.prefix || undefined,
        suffix: m.suffix || undefined,
        trendValue: m.trendValue ?? undefined,
        value: (m.valueJson as any) || {},
        notes: m.notes || undefined,
        chartSettings: (m.chartSettings as any) || undefined,
        order: m.order ?? undefined,
        lastUpdatedBy: m.lastUpdatedBy || undefined,
        sectionId: m.sectionId || undefined,
        assignees: assigneesByMetric.get(m.id) || [],
        dataPoints: (dataPointsByMetric.get(m.id) || []).map(dp => ({
            date: dp.date,
            value: dp.value,
            color: dp.color || undefined,
        })),
    }));

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
            // Update basic fields
            await tx.update(scorecards).set({ name: body?.name, description: body?.description, updatedAt: now }).where(eq(scorecards.id, id));

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

                const metricValues = body.kpis.map((kpi: any, idx: number) => ({
                    id: kpi.id,
                    scorecardId: id,
                    sectionId: kpi.sectionId || null,
                    name: kpi.name,
                    subtitle: kpi.subtitle || null,
                    visualizationType: kpi.visualizationType || 'number',
                    chartType: kpi.chartType || null,
                    reverseTrend: Boolean(kpi.reverseTrend),
                    updateToken: kpi.updateToken || null,
                    date: kpi.date ? new Date(kpi.date) : now,
                    prefix: kpi.prefix || null,
                    suffix: kpi.suffix || null,
                    trendValue: kpi.trendValue ?? null,
                    latestValue: kpi.latestValue ?? null,
                    valueJson: kpi.value || kpi.valueJson || {},
                    notes: kpi.notes || null,
                    chartSettings: kpi.chartSettings || null,
                    order: kpi.order ?? idx,
                    lastUpdatedBy: kpi.lastUpdatedBy || null,
                    createdAt: now,
                    updatedAt: now,
                }));

                if (metricValues.length) {
                    await tx.insert(metrics).values(metricValues);

                    for (const m of metricValues) {
                        const kpi = body.kpis.find((k: any) => k.id === m.id || k.id === m.name);
                        const assigneesList: string[] = Array.from(new Set([...(kpi?.assignees || []), kpi?.assignee].filter(Boolean)));
                        if (assigneesList.length === 0) continue;

                        const assignmentId = crypto.randomUUID();
                        await tx.insert(assignments).values({
                            id: assignmentId,
                            metricId: m.id,
                            sectionId: m.sectionId,
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

                        const points = (kpi?.dataPoints || []).map((dp: any) => ({
                            metricId: m.id,
                            date: dp.date,
                            value: Number(dp.value) || 0,
                            color: dp.color || null,
                        }));
                        if (points.length) {
                            await tx.insert(metricDataPoints).values(points);
                        }
                    }
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
        console.error('[scorecards/:id][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete scorecard' }, { status: 500 });
    }
}
