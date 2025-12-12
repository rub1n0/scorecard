import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { kpiValues, kpis, metrics, scorecards, sections } from '../../../../../db/schema';
import { buildChartSettings, extractChartSettingColumns, mapMetricValue, normalizeDateOnly } from '@/utils/metricNormalization';
import { buildPersistedMetrics, IncomingMetric } from '@/utils/metricPersistence';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const [row] = await db
            .select({
                kpi: kpis,
                section: sections,
                scorecard: scorecards,
            })
            .from(kpis)
            .leftJoin(sections, eq(kpis.sectionId, sections.id))
            .leftJoin(scorecards, eq(kpis.scorecardId, scorecards.id))
            .where(eq(kpis.id, id));

        if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const values = await db.select().from(kpiValues).where(eq(kpiValues.kpiId, id));
        const metricRows = await db
            .select()
            .from(metrics)
            .where(eq(metrics.kpiId, id));

        const chartSettings = buildChartSettings(row.kpi);
        const metricsForKpi = metricRows.map((dp) => mapMetricValue(row.kpi.chartType, dp.date, dp.value, dp.color));

        return NextResponse.json({
            ...row.kpi,
            name: row.kpi.kpiName || row.kpi.name,
            kpiName: row.kpi.kpiName || row.kpi.name,
            chartSettings,
            section: row.section || null,
            scorecard: row.scorecard || null,
            values,
            metrics: metricsForKpi,
            dataPoints: metricsForKpi,
            sankeySettings: (row.kpi as { sankeySettings?: unknown }).sankeySettings || null,
        });
    } catch (error) {
        console.error('[kpis/:id][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch KPI' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const chartSettings = extractChartSettingColumns(body?.chartSettings);

        const [existing] = await db.select().from(kpis).where(eq(kpis.id, id));
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const updates: Partial<typeof kpis.$inferInsert> = {
            chartSettings: body?.chartSettings ?? undefined,
            sankeySettings: body?.sankeySettings ?? existing.sankeySettings ?? undefined,
            subtitle: body?.subtitle ?? undefined,
            notes: body?.notes ?? undefined,
            chartType: body?.chartType ?? existing.chartType ?? undefined,
            visualizationType: body?.visualizationType ?? existing.visualizationType ?? undefined,
            assignment: body?.assignment ?? undefined,
            reverseTrend: body?.reverseTrend !== undefined ? Boolean(body.reverseTrend) : undefined,
            prefix: body?.prefix ?? undefined,
            prefixOpacity: body?.prefixOpacity ?? undefined,
            suffix: body?.suffix ?? undefined,
            suffixOpacity: body?.suffixOpacity ?? undefined,
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
            showGridlines: chartSettings.showGridlines ?? (typeof body?.showGridLines === 'boolean' ? body.showGridLines : undefined),
            showDataLabels: chartSettings.showDataLabels ?? body?.showDataLabels ?? undefined,
            updatedAt: new Date(),
        };

        if (body?.name || body?.kpiName) {
            const name = body?.kpiName ?? body?.name;
            updates.name = name;
            updates.kpiName = name;
        }

        const incomingMetrics: IncomingMetric[] | null = Array.isArray(body?.metrics)
            ? body.metrics
            : Array.isArray(body?.dataPoints)
                ? body.dataPoints
                : null;

        // Apply updates and optionally replace metrics in a transaction
        await db.transaction(async (tx) => {
            // If metrics are provided (even an empty array), replace them
            if (incomingMetrics !== null) {
                await tx.delete(metrics).where(eq(metrics.kpiId, id));

                const chartType = updates.chartType ?? existing.chartType ?? null;
                const { points, latestValue, valueJson, latestDate } = buildPersistedMetrics(id, chartType, incomingMetrics);

                if (points.length) {
                    await tx.insert(metrics).values(points);
                    if (updates.valueJson === undefined && valueJson) {
                        updates.valueJson = valueJson;
                    }
                    if (updates.latestValue === undefined && latestValue !== undefined) {
                        updates.latestValue = latestValue;
                    }
                    if (latestDate) {
                        updates.date = latestDate;
                    }
                } else {
                    // No points provided; clear metrics and leave valueJson as provided
                    updates.latestValue = updates.latestValue ?? null;
                }
            }

            await tx.update(kpis).set(updates).where(eq(kpis.id, id));
        });

        const [row] = await db.select().from(kpis).where(eq(kpis.id, id));
        return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[kpis/:id][PUT]', error);
        return NextResponse.json({ error: 'Failed to update KPI' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await db.delete(kpis).where(eq(kpis.id, id));
        await db.delete(kpiValues).where(eq(kpiValues.kpiId, id));
        await db.delete(metrics).where(eq(metrics.kpiId, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[kpis/:id][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete KPI' }, { status: 500 });
    }
}
