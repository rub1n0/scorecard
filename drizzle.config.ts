const config = {
    dialect: 'mysql',
    schema: './db/schema.ts',
    out: './db/migrations',
    dbCredentials: {
        url: process.env.DATABASE_URL || '',
    },
};

export default config;
