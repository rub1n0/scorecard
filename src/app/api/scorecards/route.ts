import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Scorecard } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const db = await getDb();
        return NextResponse.json(db.data.scorecards);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch scorecards' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const db = await getDb();

        const newScorecard: Scorecard = {
            id: uuidv4(),
            name,
            description: description || '',
            kpis: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        db.data.scorecards.push(newScorecard);
        await db.write();

        return NextResponse.json(newScorecard, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create scorecard' }, { status: 500 });
    }
}
