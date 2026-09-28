import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locates `server/.env` no matter how the process was started.
 *
 * `__dirname` differs between the two run modes: running from source puts us in
 * `server/src/config`, while the bundled build sits in `server/dist`. The working
 * directory also varies (repo root vs. `server/`) depending on the npm script.
 */
const envCandidates = [
  path.resolve(process.cwd(), 'server/.env'), // started from the repo root
  path.resolve(process.cwd(), '.env'), // started from server/, or a root-level .env
  path.resolve(__dirname, '../.env'), // bundled output lives in server/dist
  path.resolve(__dirname, '../../.env'), // running from source: server/src/config
];

const envFile = envCandidates.find((candidate) => fs.existsSync(candidate));
if (envFile) {
  // `quiet` suppresses dotenv's promotional banner.
  dotenv.config({ path: envFile, quiet: true });
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[env] loaded configuration from ${envFile}`);
  }
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'ium_fees',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};

export const isProduction = env.nodeEnv === 'production';

/**
 * Fails fast at boot when Atlas is not configured, instead of letting every
 * request die later with an opaque Mongoose buffering timeout.
 */
export function assertDatabaseConfigured(): void {
  if (!env.mongodbUri) {
    throw new Error(
      'MONGODB_URI is not set. Copy server/.env.example to server/.env and paste ' +
        'your MongoDB Atlas connection string.'
    );
  }
}

export { required };
