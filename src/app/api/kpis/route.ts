import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { canEditScorecard, canViewLinks, getScorecardRole } from '@/lib/scorecardAuth';
import { kpis, scorecards, sections } from '../../../../db/schema';
import { buildChartSettings, extractChartSettingColumns, normalizeDateOnly } from '@/utils/metricNormalization';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function GET(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        const allowLinks = canViewLinks(role);
        const rows = await db
            .select({
                kpi: kpis,
                section: sections,
                scorecard: scorecards,
            })
            .from(kpis)
            .leftJoin(sections, eq(kpis.sectionId, sections.id))
            .leftJoin(scorecards, eq(kpis.scorecardId, scorecards.id));

        return NextResponse.json(
            rows.map((row) => ({
                ...row.kpi,
                name: row.kpi.kpiName || row.kpi.name,
                kpiName: row.kpi.kpiName || row.kpi.name,
                chartSettings: buildChartSettings(row.kpi),
                section: row.section || null,
                scorecard: row.scorecard || null,
                updateToken: allowLinks ? row.kpi.updateToken : undefined,
            }))
        );
    } catch (error) {
        console.error('[kpis][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        const body = await req.json();
        const scorecardId = body?.scorecardId as string;
        if (!scorecardId) return badRequest('scorecardId is required');
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
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
            bannerStatus: body?.bannerStatus || null,
            notes: body?.notes || null,
            commentTextSize: body?.commentTextSize || null,
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
            .from(kpis)
            .where(
                and(
                    eq(kpis.scorecardId, scorecardId),
                    eq(kpis.kpiName, kpiName),
                    sectionId ? eq(kpis.sectionId, sectionId) : isNull(kpis.sectionId)
                )
            );

        if (existing) {
            await db
                .update(kpis)
                .set({
                    ...baseDefinition,
                    ...(valueJson !== undefined ? { valueJson } : {}),
                    updatedAt: now,
                })
                .where(eq(kpis.id, existing.id));
            return NextResponse.json({ id: existing.id, deduped: true });
        }

        await db.insert(kpis).values({
            ...baseDefinition,
            id,
            valueJson: valueJson ?? {},
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({ id, created: true }, { status: 201 });
    } catch (error) {
        console.error('[kpis][POST]', error);
        return NextResponse.json({ error: 'Failed to create KPI' }, { status: 500 });
    }
}
