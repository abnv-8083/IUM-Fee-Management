import type { NextFunction, Request, Response } from 'express';
import { isProduction } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

/** Translates thrown errors into a consistent `{ error }` JSON envelope. */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.status || err.statusCode || 500;

  // Mongoose duplicate-key failures bubble up as E11000; surface a usable message.
  if (err.code === 11000) {
    return res.status(409).json({
      error: `Duplicate value for ${Object.keys(err.keyPattern || {}).join(', ') || 'a unique field'}.`,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: `Validation failed: ${err.message}` });
  }

  console.error('[api] unhandled error:', err);

  res.status(status).json({
    error: err.message || 'Internal server error.',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
