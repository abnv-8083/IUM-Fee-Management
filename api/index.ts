import type { Express, Request, Response } from 'express';

import { createApp } from '../server/src/app.js';
import { assertDatabaseConfigured } from '../server/src/config/env.js';
import { connectDatabase } from '../server/src/config/database.js';

/**
 * Vercel serverless entry point.
 *
 * Vercel serves the built React bundle from its CDN and routes every `/api/*`
 * request here (see `vercel.json`), so this module only has to keep a MongoDB
 * connection alive and hand the request to the shared Express app. It never
 * calls `listen()` — the platform owns the HTTP lifecycle.
 *
 * The root `package.json` declares `"type": "module"`, so Vercel compiles this
 * function and the server sources it imports as ES modules. That matters: the
 * shared sources use `import.meta` and a top-level `__dirname`, both of which
 * are invalid in a CommonJS compilation and would abort the function at load.
 */
let app: Express | null = null;

/**
 * Module scope survives between invocations of a *warm* function instance, which
 * is what keeps us from reconnecting to Atlas on every request. A cold start
 * gets a fresh module and pays the connect once.
 */
let connection: Promise<unknown> | null = null;

function initDatabase(): Promise<unknown> {
  assertDatabaseConfigured();

  connection = connectDatabase().catch((err) => {
    // Forget the failed attempt so the next invocation retries a cold connect
    // instead of replaying the same rejected promise forever.
    connection = null;
    throw err;
  });

  return connection;
}

export default async function handler(req: Request, res: Response) {
  let instance = app;

  if (!instance) {
    try {
      instance = createApp();
      app = instance;
    } catch (err: any) {
      // Without this the platform reports an opaque 500, which says nothing
      // about the actual misconfiguration.
      res.status(500).json({ error: `Application failed to start: ${err.message}` });
      return;
    }
  }

  try {
    await (connection || initDatabase());
  } catch (err: any) {
    res.status(503).json({ error: `Database unavailable: ${err.message}` });
    return;
  }

  return instance(req, res);
}
