import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = await getDb();
        const scorecard = db.data.scorecards.find((s) => s.id === id);

        if (!scorecard) {
            return NextResponse.json({ error: 'Scorecard not found' }, { status: 404 });
        }

        return NextResponse.json(scorecard);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch scorecard' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const db = await getDb();

        const index = db.data.scorecards.findIndex((s) => s.id === id);

        if (index === -1) {
            return NextResponse.json({ error: 'Scorecard not found' }, { status: 404 });
        }

        // Update the scorecard
        db.data.scorecards[index] = {
            ...db.data.scorecards[index],
            ...body,
            updatedAt: new Date().toISOString(),
        };

        await db.write();

        return NextResponse.json(db.data.scorecards[index]);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update scorecard' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = await getDb();

        const initialLength = db.data.scorecards.length;
        db.data.scorecards = db.data.scorecards.filter((s) => s.id !== id);

        if (db.data.scorecards.length === initialLength) {
            return NextResponse.json({ error: 'Scorecard not found' }, { status: 404 });
        }

        await db.write();

        return NextResponse.json({ message: 'Scorecard deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete scorecard' }, { status: 500 });
    }
}
