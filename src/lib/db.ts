import { JSONFilePreset } from 'lowdb/node';
import { Scorecard } from '@/types';

// Define the schema of the database
export interface Data {
    scorecards: Scorecard[];
}

// Initialize the database with default data
const defaultData: Data = { scorecards: [] };

// Create a singleton instance helper
// We use JSONFilePreset which is the recommended way in lowdb v7+ for Node
export const getDb = async () => {
    const db = await JSONFilePreset<Data>('db.json', defaultData);
    return db;
};
