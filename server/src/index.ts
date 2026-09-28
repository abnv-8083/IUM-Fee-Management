import { createApp } from './app.js';
import { assertDatabaseConfigured, env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

/**
 * Long-running Node entry point, used by `npm run dev` and by `npm start` on a
 * host that keeps a process alive (a VM, Render, Railway, Fly...).
 *
 * Vercel does not run this file: serverless functions are short-lived, so
 * `api/index.ts` wraps the same Express app from `app.ts` instead.
 */
async function startServer() {
  assertDatabaseConfigured();
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`[IUM Fee Management API] listening on http://localhost:${env.port}`);
    console.log(`[IUM Fee Management API] environment: ${env.nodeEnv}`);
  });

  // Close the HTTP server and the MongoDB connection cleanly.
  const shutdown = async (signal: string) => {
    console.log(`\n[IUM Fee Management API] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    // Don't hang forever if sockets refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[IUM Fee Management API] Failed to start:', err.message);
  process.exit(1);
});
