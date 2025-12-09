import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { metricDataPoints, metricValues, metrics, scorecards, sections } from '../../../../../db/schema';
import { buildChartSettings, extractChartSettingColumns, mapDataPointValue, normalizeDateOnly } from '@/utils/metricNormalization';

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
        const dataPoints = await db
            .select()
            .from(metricDataPoints)
            .where(eq(metricDataPoints.metricId, id));

        return NextResponse.json({
            ...row.metric,
            name: row.metric.kpiName || row.metric.name,
            kpiName: row.metric.kpiName || row.metric.name,
            chartSettings: buildChartSettings(row.metric),
            section: row.section || null,
            scorecard: row.scorecard || null,
            values,
            dataPoints: dataPoints.map((dp) => mapDataPointValue(row.metric.chartType, dp.date, dp.value, dp.color)),
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
        const chartSettings = extractChartSettingColumns(body?.chartSettings);
        const updates: Partial<typeof metrics.$inferInsert> = {
            chartSettings: body?.chartSettings ?? undefined,
            subtitle: body?.subtitle ?? undefined,
            notes: body?.notes ?? undefined,
            chartType: body?.chartType ?? undefined,
            visualizationType: body?.visualizationType ?? undefined,
            assignment: body?.assignment ?? undefined,
            reverseTrend: body?.reverseTrend !== undefined ? Boolean(body.reverseTrend) : undefined,
            prefix: body?.prefix ?? undefined,
            suffix: body?.suffix ?? undefined,
            trendValue: body?.trendValue ?? undefined,
            latestValue: body?.latestValue ?? undefined,
            valueJson: body?.valueJson ?? body?.value ?? undefined,
            order: body?.order ?? undefined,
            lastUpdatedBy: body?.lastUpdatedBy ?? undefined,
            visible: body?.visible ?? undefined,
            date: body?.date ? new Date(normalizeDateOnly(body.date)) : undefined,
            strokeWidth: chartSettings.strokeWidth ?? body?.strokeWidth ?? undefined,
            strokeColor: chartSettings.strokeColor ?? body?.strokeColor ?? undefined,
            strokeOpacity: chartSettings.strokeOpacity ?? body?.strokeOpacity ?? undefined,
            showLegend: chartSettings.showLegend ?? body?.showLegend ?? undefined,
            showGridlines: chartSettings.showGridlines ?? body?.showGridlines ?? undefined,
            showDataLabels: chartSettings.showDataLabels ?? body?.showDataLabels ?? undefined,
            updatedAt: new Date(),
        };

        if (body?.name || body?.kpiName) {
            const name = body?.kpiName ?? body?.name;
            updates.name = name;
            updates.kpiName = name;
        }

        await db.update(metrics).set(updates).where(eq(metrics.id, id));
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
