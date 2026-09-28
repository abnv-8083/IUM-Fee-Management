import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { env, isProduction } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * True when running inside a Vercel function.
 *
 * The platform sets `VERCEL=1` for both builds and invocations. Static assets
 * are served from Vercel's CDN there, so the function must never try to serve
 * `client/dist` itself — and its `__dirname` does not sit next to the client
 * bundle anyway.
 */
const isServerless = Boolean(process.env.VERCEL);

/**
 * Builds the Express application without binding a port.
 *
 * Kept separate from `index.ts` so the same app can be reused by two very
 * different hosts: a long-running Node process that calls `listen()`, and the
 * Vercel function in `api/index.ts` that hands requests straight to it.
 */
export function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    cors({
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
      credentials: true,
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
      ],
    })
  );

  // All application routes live under /api.
  app.use('/api', apiRouter);

  // A single process can host the whole app when the React bundle has been
  // built alongside it. Skipped on serverless, where the CDN owns static files.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (isProduction && !isServerless && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    app.use(notFoundHandler);
  }

  app.use(errorHandler);

  return app;
}
