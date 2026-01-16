import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { canEditScorecard, canUpdateKpiWithToken, canUpdateScorecard, canViewLinks, getKpiUpdateToken, getScorecardRole } from '@/lib/scorecardAuth';
import { kpiValues, kpis, metrics, scorecards, sections } from '../../../../../db/schema';
import { buildChartSettings, extractChartSettingColumns, mapMetricValue, normalizeDateOnly, resolveVisualizationType } from '@/utils/metricNormalization';
import { ChartSettings } from '@/types';
import { buildPersistedMetrics, IncomingMetric } from '@/utils/metricPersistence';

const buildKpiResponse = async (id: string) => {
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

    if (!row) return null;

    const values = await db.select().from(kpiValues).where(eq(kpiValues.kpiId, id));
    const metricRows = await db
        .select()
        .from(metrics)
        .where(eq(metrics.kpiId, id));

        const chartSettings = buildChartSettings(row.kpi);
        const resolvedVisualizationType = resolveVisualizationType(row.kpi.visualizationType, row.kpi.chartType);
        const metricsForKpi = metricRows.map((dp) => mapMetricValue(row.kpi.chartType, dp.date, dp.value, dp.color));
        const value = (row.kpi.valueJson as Record<string, number | string>) || {};
        let computedTrend: number | undefined;
        if (metricsForKpi.length >= 2) {
            const sorted = [...metricsForKpi].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const latest = sorted[sorted.length - 1];
            const prev = sorted[sorted.length - 2];
            if (typeof latest.value === 'number' && typeof prev.value === 'number') {
                computedTrend = latest.value - prev.value;
            }
        }

    return {
        ...row.kpi,
        name: row.kpi.kpiName || row.kpi.name,
        kpiName: row.kpi.kpiName || row.kpi.name,
        value,
        valueJson: row.kpi.valueJson ?? value,
        chartSettings,
        visualizationType: resolvedVisualizationType,
        section: row.section || null,
        scorecard: row.scorecard || null,
        values,
        metrics: metricsForKpi,
        dataPoints: metricsForKpi,
        sankeySettings: (row.kpi as { sankeySettings?: unknown }).sankeySettings || null,
        targetValue: (row.kpi as { targetValue?: unknown }).targetValue ?? null,
        targetColor: (row.kpi as { targetColor?: string | null }).targetColor ?? null,
        trendValue: computedTrend ?? row.kpi.trendValue ?? null,
    };
};

const sanitizeTokenUpdates = (payload: Record<string, unknown>) => {
    const allowed = new Set([
        'metrics',
        'dataPoints',
        'value',
        'valueJson',
        'notes',
        'date',
        'trendValue',
        'reverseTrend',
        'lastUpdatedBy',
        'sankeySettings',
    ]);
    return Object.fromEntries(Object.entries(payload || {}).filter(([key]) => allowed.has(key)));
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const role = getScorecardRole(_req);
        const payload = await buildKpiResponse(id);
        if (payload && !canViewLinks(role)) {
            payload.updateToken = null;
        }
        if (!payload) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(payload);
    } catch (error) {
        console.error('[kpis/:id][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch KPI' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const rawBody = await req.json();

        const [existing] = await db.select().from(kpis).where(eq(kpis.id, id));
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const role = getScorecardRole(req);
        const updateToken = getKpiUpdateToken(req);
        const canUpdateRole = canUpdateScorecard(role);
        const canUpdate = canUpdateRole || (await canUpdateKpiWithToken(id, updateToken));
        if (!canUpdate) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = canUpdateRole ? rawBody : sanitizeTokenUpdates(rawBody as Record<string, unknown>);
        const chartSettings = extractChartSettingColumns((body as { chartSettings?: ChartSettings | null })?.chartSettings);

        const hasTargetValue = Object.prototype.hasOwnProperty.call(body || {}, 'targetValue');
        const hasTargetColor = Object.prototype.hasOwnProperty.call(body || {}, 'targetColor');
        const hasChartType = Object.prototype.hasOwnProperty.call(body || {}, 'chartType');
        const hasSubtitle = Object.prototype.hasOwnProperty.call(body || {}, 'subtitle');
        const hasBannerStatus = Object.prototype.hasOwnProperty.call(body || {}, 'bannerStatus');
        const normalizedSubtitle =
            typeof body?.subtitle === 'string'
                ? body.subtitle.trim() || null
                : body?.subtitle ?? null;
        const normalizedBannerStatus =
            typeof body?.bannerStatus === 'string'
                ? body.bannerStatus.trim() || null
                : body?.bannerStatus ?? null;
        const chartTypeCandidate = hasChartType ? body?.chartType : existing.chartType ?? null;
        const rawVisualizationType = body?.visualizationType ?? existing.visualizationType ?? null;
        const isNonChartVisualization = rawVisualizationType === 'number' || rawVisualizationType === 'text';
        const resolvedVisualizationType = isNonChartVisualization
            ? rawVisualizationType
            : resolveVisualizationType(rawVisualizationType, chartTypeCandidate);
        const shouldClearChartType = isNonChartVisualization;
        const finalChartType = shouldClearChartType ? null : chartTypeCandidate;

        const normalizeStrokeColor = (value: unknown) => {
            if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
            return (typeof value === 'string' && value.trim()) ? value : null;
        };
        const primaryStrokeColor = normalizeStrokeColor(body?.strokeColor ?? chartSettings.strokeColor);

        const updates: Partial<typeof kpis.$inferInsert> = {
            chartSettings: body?.chartSettings ?? existing.chartSettings ?? undefined,
            sankeySettings: body?.sankeySettings ?? existing.sankeySettings ?? undefined,
            subtitle: hasSubtitle ? normalizedSubtitle : undefined,
            bannerStatus: hasBannerStatus ? normalizedBannerStatus : existing.bannerStatus ?? undefined,
            notes: body?.notes ?? undefined,
            commentTextSize: body?.commentTextSize ?? undefined,
            chartType: shouldClearChartType ? null : (hasChartType ? (finalChartType ?? null) : undefined),
            visualizationType: resolvedVisualizationType,
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
            strokeColor: primaryStrokeColor ?? existing.strokeColor ?? null,
            strokeOpacity: chartSettings.strokeOpacity ?? body?.strokeOpacity ?? undefined,
            showLegend: chartSettings.showLegend ?? body?.showLegend ?? undefined,
            showGridlines: chartSettings.showGridlines ?? (typeof body?.showGridLines === 'boolean' ? body.showGridLines : undefined),
            showDataLabels: chartSettings.showDataLabels ?? body?.showDataLabels ?? undefined,
            targetValue: hasTargetValue ? body?.targetValue ?? null : existing.targetValue ?? undefined,
            targetColor: hasTargetColor ? body?.targetColor ?? null : existing.targetColor ?? undefined,
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

        const chartTypeForMetrics = resolvedVisualizationType === 'chart' ? chartTypeCandidate : null;

        const oldValue = existing.valueJson ?? null;
        const oldUpdatedAt = existing.updatedAt ?? null;
        const newValue = updates.valueJson ?? body?.value ?? body?.valueJson ?? null;
        let rowsUpdated: number | null = null;

        // Apply updates and optionally replace metrics in a transaction
        await db.transaction(async (tx) => {
            // If metrics are provided (even an empty array), replace them
            if (incomingMetrics !== null) {
                await tx.delete(metrics).where(eq(metrics.kpiId, id));

                const { points, latestValue, valueJson, latestDate, trendValue } = buildPersistedMetrics(id, chartTypeForMetrics, incomingMetrics);

                if (points.length) {
                    await tx.insert(metrics).values(points);
                    if (updates.valueJson === undefined && valueJson) {
                        updates.valueJson = valueJson;
                    }
                    if (updates.latestValue === undefined && latestValue !== undefined) {
                        updates.latestValue = latestValue;
                    }
                    if (trendValue !== undefined) {
                        updates.trendValue = trendValue;
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
            const rowCountResult = await tx.execute(sql`select row_count() as count`);
            const rowCountRows = Array.isArray(rowCountResult) && Array.isArray(rowCountResult[0])
                ? rowCountResult[0]
                : [];
            const countValue = rowCountRows[0]
                ? (rowCountRows[0] as { count?: number | string }).count
                : undefined;
            const parsedCount = typeof countValue === 'number' ? countValue : Number(countValue);
            rowsUpdated = Number.isFinite(parsedCount) ? parsedCount : null;
        });

        const updated = await buildKpiResponse(id);

        console.info('[kpis/:id][PUT]', {
            kpiId: id,
            oldValue,
            newValue,
            updatedAtBefore: oldUpdatedAt instanceof Date ? oldUpdatedAt.toISOString() : oldUpdatedAt,
            updatedAtAfter: updated?.updatedAt
                ? new Date(updated.updatedAt as unknown as string).toISOString()
                : null,
            rowsUpdated,
        });

        return updated ? NextResponse.json(updated) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[kpis/:id][PUT]', error);
        return NextResponse.json({ error: 'Failed to update KPI' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const role = getScorecardRole(_req);
        const [existing] = await db.select().from(kpis).where(eq(kpis.id, id));
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await db.delete(kpis).where(eq(kpis.id, id));
        await db.delete(kpiValues).where(eq(kpiValues.kpiId, id));
        await db.delete(metrics).where(eq(metrics.kpiId, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[kpis/:id][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete KPI' }, { status: 500 });
    }
}
