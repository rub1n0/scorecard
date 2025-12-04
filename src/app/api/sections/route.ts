import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { sections } from '../../../../db/schema';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function GET() {
    try {
        const rows = await db.select().from(sections);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('[sections][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const id = crypto.randomUUID();
        const scorecardId = body?.scorecardId as string;
        if (!scorecardId) return badRequest('scorecardId is required');

        const name = body?.name ?? null;
        const displayOrder = Number.isFinite(body?.displayOrder) ? body.displayOrder : 0;
        const color = body?.color ?? null;

        await db.insert(sections).values({ id, scorecardId, name, displayOrder, color });
        return NextResponse.json({ id, scorecardId, name, displayOrder, color }, { status: 201 });
    } catch (error) {
        console.error('[sections][POST]', error);
        return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const id = body?.id as string;
        if (!id) return badRequest('id is required');

        const update: Partial<typeof sections.$inferInsert> = {
            name: body?.name ?? null,
            displayOrder: Number.isFinite(body?.displayOrder) ? body.displayOrder : undefined,
            color: body?.color ?? null,
        };

        await db.update(sections).set(update).where(eq(sections.id, id));
        const [row] = await db.select().from(sections).where(eq(sections.id, id));
        return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[sections][PUT]', error);
        return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const id = body?.id as string;
        if (!id) return badRequest('id is required');

        await db.delete(sections).where(eq(sections.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[sections][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
    }
}
