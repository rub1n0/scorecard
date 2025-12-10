import 'dotenv/config';
import crypto from 'crypto';
import { createPool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, sql } from 'drizzle-orm';
import {
    assignments,
    assignmentAssignees,
    metrics as metricEntries,
    kpiValues,
    kpis,
    scorecards,
    sections,
    users,
} from './schema';

const buildUri = () => {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '3306';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const dbname = process.env.DB_NAME || '';
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbname}`;
};

const pool = createPool({
    uri: buildUri(),
    connectionLimit: 5,
});
const db = drizzle(pool);

const deterministicId = (seed: string) => crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);

async function seed() {
    const scorecardId = deterministicId('sample-scorecard');
    const sectionId = deterministicId('sample-section');
    const kpiId = deterministicId('sample-kpi');
    const assignmentId = deterministicId('sample-assignment');
    const userId = deterministicId('sample-user');

    await db.transaction(async (tx) => {
        await tx
            .insert(scorecards)
            .values({
                id: scorecardId,
                name: 'Sample Scorecard',
                description: 'Seeded sample data',
            })
            .onDuplicateKeyUpdate({
                set: { name: sql`VALUES(name)`, description: sql`VALUES(description)` },
            });

        await tx
            .insert(sections)
            .values({
                id: sectionId,
                scorecardId,
                name: 'Section 1',
                displayOrder: 0,
            })
            .onDuplicateKeyUpdate({
                set: { name: sql`VALUES(name)`, displayOrder: sql`VALUES(display_order)` },
            });

        await tx
            .insert(kpis)
            .values({
                id: kpiId,
                scorecardId,
                sectionId,
                name: 'KPI001',
                kpiName: 'KPI001',
                subtitle: 'Sample Metric',
                assignment: null,
                visualizationType: 'number',
                reverseTrend: false,
                date: new Date(),
                trendValue: 5,
                latestValue: 120,
                valueJson: { "0": 120 },
                notes: 'Seeded metric',
                chartSettings: { showLegend: false },
                showLegend: false,
                showGridlines: true,
                showDataLabels: false,
                visible: true,
            })
            .onDuplicateKeyUpdate({
                set: {
                    kpiName: sql`VALUES(kpi_name)`,
                    sectionId,
                    subtitle: sql`VALUES(subtitle)`,
                    visualizationType: sql`VALUES(visualization_type)`,
                    date: sql`VALUES(date)`,
                    trendValue: sql`VALUES(trend_value)`,
                    latestValue: sql`VALUES(latest_value)`,
                    valueJson: sql`VALUES(value_json)`,
                    notes: sql`VALUES(notes)`,
                    chartSettings: sql`VALUES(chart_settings)`,
                    showLegend: sql`VALUES(show_legend)`,
                    showGridlines: sql`VALUES(show_gridlines)`,
                    showDataLabels: sql`VALUES(show_data_labels)`,
                },
            });

        await tx
            .insert(metricEntries)
            .values([
                { kpiId, date: new Date('2024-12-01T00:00:00.000Z'), value: 110, color: '#5094af' },
                { kpiId, date: new Date('2024-12-08T00:00:00.000Z'), value: 115, color: '#36c9b8' },
                { kpiId, date: new Date('2024-12-15T00:00:00.000Z'), value: 120, color: '#dea821' },
            ])
            .onDuplicateKeyUpdate({
                set: {
                    value: sql`VALUES(value)`,
                    color: sql`VALUES(color)`,
                },
            });

        await tx
            .insert(kpiValues)
            .values({ kpiId, valueKey: '0', numericValue: 120 })
            .onDuplicateKeyUpdate({
                set: { numericValue: sql`VALUES(numeric_value)` },
            });

        await tx
            .insert(users)
            .values({ id: userId, name: 'Sample User', email: 'sample@example.com' })
            .onDuplicateKeyUpdate({
                set: { name: sql`VALUES(name)`, email: sql`VALUES(email)` },
            });

        await tx
            .insert(assignments)
            .values({ id: assignmentId, kpiId, sectionId })
            .onDuplicateKeyUpdate({
                set: { sectionId },
            });

        const existing = await tx
            .select({ count: sql<number>`count(*)` })
            .from(assignmentAssignees)
            .where(and(eq(assignmentAssignees.assignmentId, assignmentId), eq(assignmentAssignees.userId, userId)));

        if (!existing[0] || Number(existing[0].count) === 0) {
            await tx.insert(assignmentAssignees).values({
                id: deterministicId(`aa:${assignmentId}:${userId}`),
                assignmentId,
                userId,
            });
        }
    });
}

seed()
    .then(() => {
        console.log('Seed completed');
        return pool.end();
    })
    .catch((err) => {
        console.error('Seed failed', err);
        void pool.end();
        process.exit(1);
    });
