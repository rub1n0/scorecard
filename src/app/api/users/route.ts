import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { users } from '../../../../db/schema';
import { canEditScorecard, getScorecardRole } from '@/lib/scorecardAuth';

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function GET(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const rows = await db.select().from(users);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('[users][GET]', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const body = await req.json();
        const id = crypto.randomUUID();
        const name = body?.name ?? null;
        const email = body?.email ?? null;

        await db.insert(users).values({
            id,
            name,
            email,
        });

        return NextResponse.json({ id, name, email }, { status: 201 });
    } catch (error) {
        console.error('[users][POST]', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const body = await req.json();
        const id = body?.id as string;
        if (!id) return badRequest('id is required');

        const update = {
            name: body?.name ?? null,
            email: body?.email ?? null,
            updatedAt: new Date(),
        };

        await db.update(users).set(update).where(eq(users.id, id));
        const [row] = await db.select().from(users).where(eq(users.id, id));
        return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[users][PUT]', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const role = getScorecardRole(req);
        if (!canEditScorecard(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const body = await req.json();
        const id = body?.id as string;
        if (!id) return badRequest('id is required');

        await db.delete(users).where(eq(users.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[users][DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
