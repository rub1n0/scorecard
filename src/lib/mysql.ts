import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const buildConnectionUri = () => {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '3306';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const db = process.env.DB_NAME || '';
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
};

const connectionUri = buildConnectionUri();

export const pool = mysql.createPool({
    uri: connectionUri,
    connectionLimit: 10,
});

export const db = drizzle(pool);
