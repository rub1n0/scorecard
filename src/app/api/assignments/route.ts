import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { canEditScorecard, getScorecardRole } from '@/lib/scorecardAuth';
import {
    assignments,
    assignmentAssignees,
    kpis,
    sections,
    scorecards,
    users,
} from '../../../../db/schema';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

async function loadAssignments(ids?: string[]) {
    const base = ids && ids.length > 0
        ? await db.select().from(assignments).where(inArray(assignments.id, ids))
        : await db.select().from(assignments);

    const assignees = await db
        .select({
            assignmentId: assignmentAssignees.assignmentId,
            user: users,
        })
        .from(assignmentAssignees)
        .leftJoin(users, eq(assignmentAssignees.userId, users.id));

    const assigneesByAssignment = new Map<string, typeof assignees>();
    assignees.forEach((row) => {
        const list = assigneesByAssignment.get(row.assignmentId) || [];
        list.push(row);
        assigneesByAssignment.set(row.assignmentId, list);
    });

    const kpiIds = base.map(a => a.kpiId);
    const kpiRows = kpiIds.length
        ? await db
            .select({ kpi: kpis, section: sections, scorecard: scorecards })
            .from(kpis)
            .leftJoin(sections, eq(kpis.sectionId, sections.id))
            .leftJoin(scorecards, eq(kpis.scorecardId, scorecards.id))
            .where(inArray(kpis.id, kpiIds))
        : [];

    const kpisById = new Map<string, typeof kpiRows[number]>();
    kpiRows.forEach(row => kpisById.set(row.kpi.id, row));

    return base.map((assignment) => {
        const assigneeRows = assigneesByAssignment.get(assignment.id) || [];
        const kpiRow = kpisById.get(assignment.kpiId);
        return {
            ...assignment,
            kpi: kpiRow?.kpi || null,
            section: kpiRow?.section || null,
            scorecard: kpiRow?.scorecard || null,
            assignees: assigneeRows.map(r => r.user).filter(Boolean),
        };
    });
}

export async function GET(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const data = await loadAssignments();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[assignments][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        const body = await req.json();
        const kpiId = body?.kpiId as string;
        if (!kpiId) return badRequest('kpiId is required');
        const sectionId = body?.sectionId ?? null;
        const assigneeIds = Array.isArray(body?.assigneeIds) ? body.assigneeIds.filter(Boolean) : [];

        const [kpiRow] = await db.select().from(kpis).where(eq(kpis.id, kpiId));
        if (!kpiRow) return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const id = crypto.randomUUID();
        const now = new Date();

        await db.transaction(async (tx) => {
            await tx.insert(assignments).values({
                id,
                kpiId,
                sectionId,
                createdAt: now,
                updatedAt: now,
            });

            for (const userId of assigneeIds) {
                await tx
                    .insert(assignmentAssignees)
                    .values({
                        id: crypto.randomUUID(),
                        assignmentId: id,
                        userId,
                    })
                    .onDuplicateKeyUpdate({
                        set: { userId },
                    });
            }
        });

        const [result] = await loadAssignments([id]);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('[assignments][POST]', error);
        return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        const body = await req.json();
        const id = body?.id as string;
        if (!id) return badRequest('id is required');

        const [existing] = await db.select().from(assignments).where(eq(assignments.id, id));
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const [kpiRow] = await db.select().from(kpis).where(eq(kpis.id, existing.kpiId));
        if (!kpiRow) return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const update = {
            sectionId: body?.sectionId ?? null,
            updatedAt: new Date(),
        };

        await db.transaction(async (tx) => {
            await tx.update(assignments).set(update).where(eq(assignments.id, id));

            if (Array.isArray(body?.assigneeIds)) {
                // replace assignees
                await tx.delete(assignmentAssignees).where(eq(assignmentAssignees.assignmentId, id));
                for (const userId of body.assigneeIds.filter(Boolean)) {
                    await tx.insert(assignmentAssignees).values({
                        id: crypto.randomUUID(),
                        assignmentId: id,
                        userId,
                    });
                }
            }
        });

        const [result] = await loadAssignments([id]);
        return result ? NextResponse.json(result) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[assignments][PUT]', error);
        return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        const body = await req.json();
        const id = body?.id as string;
        if (!id) return badRequest('id is required');

        const [existing] = await db.select().from(assignments).where(eq(assignments.id, id));
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const [kpiRow] = await db.select().from(kpis).where(eq(kpis.id, existing.kpiId));
        if (!kpiRow) return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await db.transaction(async (tx) => {
            await tx.delete(assignmentAssignees).where(eq(assignmentAssignees.assignmentId, id));
            await tx.delete(assignments).where(eq(assignments.id, id));
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[assignments][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }
}
