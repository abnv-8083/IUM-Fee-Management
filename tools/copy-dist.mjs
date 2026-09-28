#!/usr/bin/env node
/**
 * Mirrors the built React bundle from `client/dist` to `dist/` at the repo root.
 *
 * Vercel resolves the project's Output Directory relative to the repository
 * root, and this project is configured to look for `dist`. Vite writes its
 * bundle to `client/dist`, so without this copy the deployment stops with
 * "No Output Directory named "dist" found after the Build completed."
 *
 * Runs after `vite build`, skips quietly if the client has not been built, and
 * is a no-op for local development apart from a little duplicated output.
 */
import { cpSync, existsSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repoRoot, 'client', 'dist');
const target = path.join(repoRoot, 'dist');

if (source === target) {
  console.log('[copy-dist] source and target are the same directory, nothing to do');
  process.exit(0);
}

if (!existsSync(source)) {
  console.log(`[copy-dist] ${source} not found, nothing to mirror`);
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log('[copy-dist] mirrored client/dist -> dist');
