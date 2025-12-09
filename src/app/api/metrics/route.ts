import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { metrics, scorecards, sections } from '../../../../db/schema';
import { buildChartSettings, extractChartSettingColumns, normalizeDateOnly } from '@/utils/metricNormalization';

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
                name: row.metric.kpiName || row.metric.name,
                kpiName: row.metric.kpiName || row.metric.name,
                chartSettings: buildChartSettings(row.metric),
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
        const kpiName = (body?.kpiName ?? body?.name ?? '').trim();
        if (!kpiName) return badRequest('kpiName is required');
        const sectionId = body?.sectionId ?? body?.section ?? null;

        const id = crypto.randomUUID();
        const now = new Date();
        const chartSettings = extractChartSettingColumns(body?.chartSettings);
        const baseDefinition = {
            scorecardId,
            sectionId,
            name: kpiName,
            kpiName,
            subtitle: body?.subtitle || null,
            notes: body?.notes || null,
            chartType: body?.chartType || null,
            visualizationType: body?.visualizationType || (body?.chartType ? 'chart' : 'number'),
            assignment: body?.assignment || null,
            prefix: body?.prefix || null,
            suffix: body?.suffix || null,
            reverseTrend: Boolean(body?.reverseTrend),
            strokeWidth: chartSettings.strokeWidth ?? null,
            strokeColor: chartSettings.strokeColor ?? null,
            strokeOpacity: chartSettings.strokeOpacity ?? null,
            showLegend: chartSettings.showLegend ?? true,
            showGridlines: chartSettings.showGridlines ?? true,
            showDataLabels: chartSettings.showDataLabels ?? false,
            updateToken: body?.updateToken || null,
            date: new Date(normalizeDateOnly(body?.date)),
            trendValue: body?.trendValue ?? null,
            latestValue: body?.latestValue ?? null,
            chartSettings: body?.chartSettings ?? null,
            order: body?.order ?? null,
            lastUpdatedBy: body?.lastUpdatedBy || null,
            visible: body?.visible ?? true,
        };

        const valueJson = body?.valueJson ?? body?.value;
        const [existing] = await db
            .select()
            .from(metrics)
            .where(
                and(
                    eq(metrics.scorecardId, scorecardId),
                    eq(metrics.kpiName, kpiName),
                    sectionId ? eq(metrics.sectionId, sectionId) : isNull(metrics.sectionId)
                )
            );

        if (existing) {
            await db
                .update(metrics)
                .set({
                    ...baseDefinition,
                    ...(valueJson !== undefined ? { valueJson } : {}),
                    updatedAt: now,
                })
                .where(eq(metrics.id, existing.id));
            return NextResponse.json({ id: existing.id, deduped: true });
        }

        await db.insert(metrics).values({
            ...baseDefinition,
            id,
            valueJson: valueJson ?? {},
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({ id, created: true }, { status: 201 });
    } catch (error) {
        console.error('[metrics][POST]', error);
        return NextResponse.json({ error: 'Failed to create metric' }, { status: 500 });
    }
}
