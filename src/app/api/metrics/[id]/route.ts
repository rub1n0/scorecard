import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { metricDataPoints, metricValues, metrics, scorecards, sections } from '../../../../../db/schema';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const [row] = await db
            .select({
                metric: metrics,
                section: sections,
                scorecard: scorecards,
            })
            .from(metrics)
            .leftJoin(sections, eq(metrics.sectionId, sections.id))
            .leftJoin(scorecards, eq(metrics.scorecardId, scorecards.id))
            .where(eq(metrics.id, id));

        if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const values = await db.select().from(metricValues).where(eq(metricValues.metricId, id));
        const dataPoints = await db.select().from(metricDataPoints).where(eq(metricDataPoints.metricId, id));

        return NextResponse.json({
            ...row.metric,
            section: row.section || null,
            scorecard: row.scorecard || null,
            values,
            dataPoints,
        });
    } catch (error) {
        console.error('[metrics/:id][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch metric' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        await db.update(metrics).set({ ...body, date: body?.date ? new Date(body.date) : undefined }).where(eq(metrics.id, id));
        const [row] = await db.select().from(metrics).where(eq(metrics.id, id));
        return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[metrics/:id][PUT]', error);
        return NextResponse.json({ error: 'Failed to update metric' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await db.delete(metrics).where(eq(metrics.id, id));
        await db.delete(metricValues).where(eq(metricValues.metricId, id));
        await db.delete(metricDataPoints).where(eq(metricDataPoints.metricId, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[metrics/:id][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete metric' }, { status: 500 });
    }
}
