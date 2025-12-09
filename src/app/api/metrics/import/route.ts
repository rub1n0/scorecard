import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { metrics, metricDataPoints, scorecards, sections } from '../../../../../db/schema';
import { normalizeDateOnly, normalizeValueForChartType, extractChartSettingColumns } from '@/utils/metricNormalization';
import { parseCSV, ParsedKPI } from '@/utils/csvParser';
import { ChartSettings } from '@/types';

const badRequest = (message: string, detail?: unknown) =>
    NextResponse.json({ error: message, detail }, { status: 400 });

const metricKey = (kpiName: string, sectionId: string | null) => `${kpiName.trim().toLowerCase()}|${sectionId || 'NULL'}`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const scorecardId = body?.scorecardId as string;
        if (!scorecardId) return badRequest('scorecardId is required');

        const [sc] = await db.select().from(scorecards).where(eq(scorecards.id, scorecardId));
        if (!sc) return NextResponse.json({ error: 'Scorecard not found' }, { status: 404 });

        let parsed: ParsedKPI[] = [];
        if (typeof body?.csv === 'string') {
            const parsedResult = parseCSV(body.csv);
            if (!parsedResult.success) {
                return badRequest('Failed to parse CSV', parsedResult.errors);
            }
            parsed = parsedResult.kpis;
        } else if (Array.isArray(body?.metrics)) {
            parsed = body.metrics as ParsedKPI[];
        } else {
            return badRequest('Provide either csv (string) or metrics (ParsedKPI[]) in the request body');
        }

        const now = new Date();

        const result = await db.transaction(async (tx) => {
            // Prepare sections (dedupe by name within scorecard)
            const existingSections = await tx.select().from(sections).where(eq(sections.scorecardId, scorecardId));
            const sectionByKey = new Map<string, typeof sections.$inferSelect>();
            existingSections.forEach((s) => {
                if (!s.name) return;
                sectionByKey.set(s.name.trim().toLowerCase(), s);
            });

            const newSectionRows: typeof sections.$inferInsert[] = [];
            parsed.forEach((kpi) => {
                if (!kpi.sectionName) return;
                const key = kpi.sectionName.trim().toLowerCase();
                if (sectionByKey.has(key)) return;
                const row = {
                    id: crypto.randomUUID(),
                    scorecardId,
                    name: kpi.sectionName,
                    displayOrder: existingSections.length + newSectionRows.length,
                    color: null,
                    opacity: 1,
                    createdAt: now,
                    updatedAt: now,
                };
                newSectionRows.push(row);
                sectionByKey.set(key, row);
            });

            if (newSectionRows.length) {
                await tx.insert(sections).values(newSectionRows);
            }

            // Load metrics to dedupe by kpiName + section
            const existingMetrics = await tx.select().from(metrics).where(eq(metrics.scorecardId, scorecardId));
            const metricByKey = new Map<string, typeof metrics.$inferSelect>();
            existingMetrics.forEach((m) => {
                metricByKey.set(metricKey(m.kpiName || m.name, m.sectionId || null), m);
            });

            let metricsCreated = 0;
            let metricsUpdated = 0;
            let datapointsUpserted = 0;

            for (const kpi of parsed) {
                const kpiName = (kpi.name || '').trim();
                if (!kpiName) continue;

                const sectionId = kpi.sectionName
                    ? sectionByKey.get(kpi.sectionName.trim().toLowerCase())?.id || null
                    : kpi.sectionId || null;

                const key = metricKey(kpiName, sectionId);
                const existingMetric = metricByKey.get(key);

                const chartSettingsCols = extractChartSettingColumns(kpi.chartSettings);
                const showGridlinesFromSettings =
                    (kpi.chartSettings as ChartSettings | undefined)?.showGridLines ??
                    (kpi.chartSettings as { showGridlines?: boolean } | undefined)?.showGridlines;

                const baseDefinition = {
                    scorecardId,
                    sectionId,
                    name: kpiName,
                    kpiName,
                    subtitle: kpi.subtitle || null,
                    assignment: kpi.assignment || null,
                    visualizationType: kpi.visualizationType || (kpi.chartType ? 'chart' : 'number'),
                    chartType: kpi.chartType || null,
                    reverseTrend: Boolean(kpi.reverseTrend),
                    updateToken: kpi.updateToken || null,
                    date: new Date(`${normalizeDateOnly(kpi.date || now.toISOString())}T00:00:00.000Z`),
                    prefix: kpi.prefix || null,
                    suffix: kpi.suffix || null,
                    strokeWidth: chartSettingsCols.strokeWidth ?? null,
                    strokeColor: chartSettingsCols.strokeColor ?? null,
                    strokeOpacity: chartSettingsCols.strokeOpacity ?? null,
                    showLegend: chartSettingsCols.showLegend ?? (kpi.chartSettings?.showLegend ?? true),
                    showGridlines: chartSettingsCols.showGridlines ?? showGridlinesFromSettings ?? true,
                    showDataLabels: chartSettingsCols.showDataLabels ?? (kpi.chartSettings?.showDataLabels ?? false),
                    trendValue: kpi.trendValue ?? null,
                    valueJson: kpi.value || {},
                    notes: kpi.notes || null,
                    chartSettings: kpi.chartSettings || null,
                    order: kpi.order ?? null,
                    lastUpdatedBy: kpi.lastUpdatedBy || null,
                    visible: kpi.visible ?? existingMetric?.visible ?? true,
                    updatedAt: now,
                };

                let metricId = existingMetric?.id;
                if (existingMetric) {
                    await tx
                        .update(metrics)
                        .set(baseDefinition)
                        .where(
                            and(
                                eq(metrics.scorecardId, scorecardId),
                                eq(metrics.kpiName, kpiName),
                                sectionId ? eq(metrics.sectionId, sectionId) : isNull(metrics.sectionId)
                            )
                        );
                    metricsUpdated += 1;
                } else {
                    metricId = crypto.randomUUID();
                    await tx.insert(metrics).values({
                        ...baseDefinition,
                        id: metricId,
                        createdAt: now,
                    });
                    metricsCreated += 1;
                    metricByKey.set(key, { ...baseDefinition, id: metricId } as typeof metrics.$inferSelect);
                }

                if (!metricId) continue;

                const datapoints = kpi.dataPoints && kpi.dataPoints.length
                    ? kpi.dataPoints
                    : [{ date: kpi.date || now.toISOString(), value: kpi.value }];

                // Deduplicate datapoints by normalized date and prefer the most recent date instance
                const dpByDate = new Map<string, { date: string; value: unknown; color?: string | null; valueArray?: unknown; labeledValues?: unknown }>();
                for (const dpRaw of datapoints) {
                    const dp = dpRaw as { date?: string; value?: unknown; color?: string | null; valueArray?: unknown; labeledValues?: unknown };
                    const normalizedDate = normalizeDateOnly(dp.date as string);
                    const existing = dpByDate.get(normalizedDate);
                    if (!existing) {
                        dpByDate.set(normalizedDate, { date: normalizedDate, value: dp.value, color: dp.color, valueArray: dp.valueArray, labeledValues: dp.labeledValues });
                    } else {
                        const currentTs = new Date(existing.date).getTime();
                        const candidateTs = new Date(normalizedDate).getTime();
                        if (candidateTs >= currentTs) {
                            dpByDate.set(normalizedDate, { date: normalizedDate, value: dp.value, color: dp.color, valueArray: dp.valueArray, labeledValues: dp.labeledValues });
                        }
                    }
                }

                for (const dp of dpByDate.values()) {
                    const value = normalizeValueForChartType(kpi.chartType, dp.labeledValues ?? dp.valueArray ?? dp.value);
                    const dateValue = new Date(`${dp.date}T00:00:00.000Z`);

                    await tx
                        .insert(metricDataPoints)
                        .values({
                            metricId,
                            date: dateValue,
                            value,
                            color: dp.color ?? null,
                        })
                        .onDuplicateKeyUpdate({
                            set: {
                                value,
                                ...(dp && dp.color !== undefined ? { color: dp.color } : {}),
                            },
                        });

                    datapointsUpserted += 1;
                }
            }

            return { metricsCreated, metricsUpdated, datapointsUpserted, sectionsCreated: newSectionRows.length };
        });

        return NextResponse.json({
            scorecardId,
            ...result,
        });
    } catch (error) {
        console.error('[metrics/import][POST]', error);
        return NextResponse.json({ error: 'Failed to import metrics' }, { status: 500 });
    }
}
