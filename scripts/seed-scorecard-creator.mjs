import 'dotenv/config';
import crypto from 'crypto';
import mysql from 'mysql2/promise';

const CREATOR_NAME = process.env.SCORECARD_CREATOR_NAME || 'Anthony Rubino';
const CREATOR_EMAIL = process.env.SCORECARD_CREATOR_EMAIL || null;

const buildUri = () => {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '3306';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const dbname = process.env.DB_NAME || '';
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbname}`;
};

const pool = mysql.createPool({
    uri: buildUri(),
    connectionLimit: 2,
});

const findOrCreateUser = async () => {
    const [rows] = await pool.query('SELECT id FROM users WHERE name = ? LIMIT 1', [CREATOR_NAME]);
    const existing = Array.isArray(rows) ? rows[0] : null;
    if (existing?.id) return existing.id;

    const userId = crypto.randomUUID();
    await pool.query(
        'INSERT INTO users (id, name, email, created_at, updated_at) VALUES (?, ?, ?, NOW(3), NOW(3))',
        [userId, CREATOR_NAME, CREATOR_EMAIL]
    );
    return userId;
};

const run = async () => {
    const userId = await findOrCreateUser();
    const token = `user:${userId}`;
    await pool.query('UPDATE scorecards SET creator_token = ?', [token]);
    console.log(`Set creator_token for all scorecards to ${token} (${CREATOR_NAME}).`);
};

run()
    .then(() => pool.end())
    .catch((err) => {
        console.error('Creator seed failed', err);
        void pool.end();
        process.exit(1);
    });
