import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { canUpdateKpiWithToken, canUpdateScorecard, getKpiUpdateToken, getScorecardRole } from '@/lib/scorecardAuth';
import { kpis, metrics } from '../../../../../../db/schema';
import { normalizeDateOnly, normalizeValueForChartType } from '@/utils/metricNormalization';
import { LabeledValue } from '@/types';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });
const isLabeledValue = (value: unknown): value is LabeledValue => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as Partial<LabeledValue>;
    return (
        typeof candidate.value === 'number' &&
        'label' in candidate &&
        typeof candidate.label === 'string'
    );
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const role = getScorecardRole(req);
        const updateToken = getKpiUpdateToken(req);
        const body = await req.json();
        const dateInput = body?.date;
        if (!dateInput) return badRequest('date is required');
        if (body?.value === undefined || body?.value === null) return badRequest('value is required');

        const [kpi] = await db.select().from(kpis).where(eq(kpis.id, id));
        if (!kpi) return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
        const canUpdateRole = canUpdateScorecard(role);
        const canUpdate = canUpdateRole || (await canUpdateKpiWithToken(id, updateToken));
        if (!canUpdate) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const chartType = body?.chartType ?? kpi.chartType ?? null;
        const normalizedDate = normalizeDateOnly(dateInput);
        const normalizedValue = normalizeValueForChartType(chartType, body.labeledValues ?? body.value);
        const color = body?.color ?? null;
        const dateValue = new Date(`${normalizedDate}T00:00:00.000Z`);

        await db
            .insert(metrics)
            .values({
                kpiId: id,
                date: dateValue,
                value: normalizedValue,
                color,
            })
            .onDuplicateKeyUpdate({
                set: {
                    value: normalizedValue,
                    ...(body?.color !== undefined ? { color } : {}),
                },
            });

        let valueRecord: Record<string, number>;
        let latestVal: number;

        if (Array.isArray(normalizedValue)) {
            if (normalizedValue.length > 0 && isLabeledValue(normalizedValue[0])) {
                // LabeledValue[]
                const labeled = normalizedValue as LabeledValue[];
                valueRecord = labeled.reduce<Record<string, number>>((acc, item, idx) => {
                    acc[item.label || String(idx)] = item.value;
                    return acc;
                }, {});
                latestVal = labeled.reduce((sum, item) => sum + item.value, 0);
            } else {
                // number[]
                const nums = normalizedValue as number[];
                valueRecord = nums.reduce<Record<string, number>>((acc, val, idx) => {
                    acc[String(idx)] = val;
                    return acc;
                }, {});
                latestVal = nums[0] ?? 0;
            }
        } else {
            valueRecord = { "0": normalizedValue as number };
            latestVal = normalizedValue as number;
        }

        await db
            .update(kpis)
            .set({
                valueJson: valueRecord,
                latestValue: latestVal,
                date: dateValue,
                updatedAt: new Date(),
            })
            .where(eq(kpis.id, id));

        return NextResponse.json({ kpiId: id, date: normalizedDate, upserted: true });
    } catch (error) {
        console.error('[kpis/:id/metrics][POST]', error);
        return NextResponse.json({ error: 'Failed to upsert metric' }, { status: 500 });
    }
}
