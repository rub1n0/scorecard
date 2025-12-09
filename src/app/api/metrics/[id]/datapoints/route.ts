import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { metricDataPoints, metrics } from '../../../../../../db/schema';
import { normalizeDateOnly, normalizeValueForChartType } from '@/utils/metricNormalization';
import { LabeledValue } from '@/types';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const dateInput = body?.date;
        if (!dateInput) return badRequest('date is required');
        if (body?.value === undefined || body?.value === null) return badRequest('value is required');

        const [metric] = await db.select().from(metrics).where(eq(metrics.id, id));
        if (!metric) return NextResponse.json({ error: 'Metric not found' }, { status: 404 });

        const chartType = body?.chartType ?? metric.chartType ?? null;
        const normalizedDate = normalizeDateOnly(dateInput);
        const normalizedValue = normalizeValueForChartType(chartType, body.labeledValues ?? body.value);
        const color = body?.color ?? null;
        const dateValue = new Date(`${normalizedDate}T00:00:00.000Z`);

        await db
            .insert(metricDataPoints)
            .values({
                metricId: id,
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
            if (normalizedValue.length > 0 && typeof normalizedValue[0] === 'object' && 'value' in (normalizedValue[0] as any)) {
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
            .update(metrics)
            .set({
                valueJson: valueRecord,
                latestValue: latestVal,
                date: dateValue,
                updatedAt: new Date(),
            })
            .where(eq(metrics.id, id));

        return NextResponse.json({ metricId: id, date: normalizedDate, upserted: true });
    } catch (error) {
        console.error('[metrics/:id/datapoints][POST]', error);
        return NextResponse.json({ error: 'Failed to upsert datapoint' }, { status: 500 });
    }
}
