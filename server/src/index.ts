import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { assertDatabaseConfigured, env, isProduction } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  assertDatabaseConfigured();
  await connectDatabase();

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

  // In production, optionally serve the built React bundle from client/dist so a
  // single process can host the whole app.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (isProduction && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    app.use(notFoundHandler);
  }

  app.use(errorHandler);

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
