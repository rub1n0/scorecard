import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { metrics, scorecards, sections } from '../../../../db/schema';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function GET() {
    try {
        const rows = await db
            .select({
                metric: metrics,
                section: sections,
                scorecard: scorecards,
            })
            .from(metrics)
            .leftJoin(sections, eq(metrics.sectionId, sections.id))
            .leftJoin(scorecards, eq(metrics.scorecardId, scorecards.id));

        return NextResponse.json(
            rows.map((row) => ({
                ...row.metric,
                section: row.section || null,
                scorecard: row.scorecard || null,
            }))
        );
    } catch (error) {
        console.error('[metrics][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const scorecardId = body?.scorecardId as string;
        if (!scorecardId) return badRequest('scorecardId is required');
        const name = (body?.name || '').trim();
        if (!name) return badRequest('name is required');

        const id = crypto.randomUUID();
        const now = new Date(body?.date || new Date());

        await db.insert(metrics).values({
            id,
            scorecardId,
            sectionId: body?.sectionId || null,
            name,
            subtitle: body?.subtitle || null,
            visualizationType: body?.visualizationType || 'number',
            chartType: body?.chartType || null,
            reverseTrend: Boolean(body?.reverseTrend),
            updateToken: body?.updateToken || null,
            date: now,
            prefix: body?.prefix || null,
            suffix: body?.suffix || null,
            trendValue: body?.trendValue ?? null,
            latestValue: body?.latestValue ?? null,
            valueJson: body?.valueJson ?? body?.value ?? null,
            notes: body?.notes || null,
            chartSettings: body?.chartSettings || null,
            order: body?.order ?? null,
            lastUpdatedBy: body?.lastUpdatedBy || null,
        });

        return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
        console.error('[metrics][POST]', error);
        return NextResponse.json({ error: 'Failed to create metric' }, { status: 500 });
    }
}
