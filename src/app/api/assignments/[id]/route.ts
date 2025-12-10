import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/mysql';
import { assignments, assignmentAssignees, kpis, scorecards, sections, users } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

const notFound = NextResponse.json({ error: 'Not found' }, { status: 404 });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
        if (!assignment) return notFound;

        const [kpiRow] = await db
            .select({ kpi: kpis, section: sections, scorecard: scorecards })
            .from(kpis)
            .leftJoin(sections, eq(kpis.sectionId, sections.id))
            .leftJoin(scorecards, eq(kpis.scorecardId, scorecards.id))
            .where(eq(kpis.id, assignment.kpiId));

        const assignees = await db
            .select({ user: users })
            .from(assignmentAssignees)
            .leftJoin(users, eq(assignmentAssignees.userId, users.id))
            .where(eq(assignmentAssignees.assignmentId, id));

        return NextResponse.json({
            ...assignment,
            kpi: kpiRow?.kpi || null,
            section: kpiRow?.section || null,
            scorecard: kpiRow?.scorecard || null,
            assignees: assignees.map(a => a.user).filter(Boolean),
        });
    } catch (error) {
        console.error('[assignments/:id][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        await db.update(assignments).set({ sectionId: body?.sectionId ?? null, updatedAt: new Date() }).where(eq(assignments.id, id));

        if (Array.isArray(body?.assigneeIds)) {
            await db.transaction(async (tx) => {
                await tx.delete(assignmentAssignees).where(eq(assignmentAssignees.assignmentId, id));
                for (const userId of body.assigneeIds.filter(Boolean)) {
                    await tx.insert(assignmentAssignees).values({
                        id: crypto.randomUUID(),
                        assignmentId: id,
                        userId,
                    });
                }
            });
        }

        const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
        return assignment ? NextResponse.json(assignment) : notFound;
    } catch (error) {
        console.error('[assignments/:id][PUT]', error);
        return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await db.transaction(async (tx) => {
            await tx.delete(assignmentAssignees).where(eq(assignmentAssignees.assignmentId, id));
            await tx.delete(assignments).where(eq(assignments.id, id));
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[assignments/:id][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }
}
