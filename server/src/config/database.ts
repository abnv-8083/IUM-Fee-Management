import dns, { promises as dnsPromises } from 'dns';
import mongoose from 'mongoose';
import { env, isProduction } from './env.js';

// Fail fast rather than queueing operations forever when Atlas is unreachable.
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

if (!isProduction) {
  mongoose.set('debug', process.env.MONGOOSE_DEBUG === 'true');
}

let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Resolvers used only when the machine's own resolver cannot answer SRV queries.
 *
 * `mongodb+srv://` needs an SRV lookup, which Node performs through c-ares
 * against the servers reported by the OS. Some Windows setups advertise a local
 * stub (e.g. `127.0.0.1`, left behind by a VPN or DNS filter) that serves
 * ordinary hostname lookups via the OS DNS Client but refuses raw queries from
 * c-ares. That combination fails *only* the SRV step, so the connection string
 * looks broken when Atlas and the credentials are perfectly fine.
 */
const fallbackDnsServers = (process.env.DNS_FALLBACK_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

/** Errors that mean "this resolver won't answer us", as opposed to "no record". */
const resolverRefusedCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEOUT',
  'ESERVFAIL',
  'EREFUSED',
  'EAI_AGAIN',
  'EBADRESP',
]);

function srvHostFrom(uri: string): string | null {
  const rest = uri.slice('mongodb+srv://'.length);
  const credentialsEnd = rest.lastIndexOf('@');
  const authority = credentialsEnd === -1 ? rest : rest.slice(credentialsEnd + 1);
  const host = authority.split(/[/?]/)[0];
  return host || null;
}

/**
 * Makes sure the SRV record behind a `mongodb+srv://` URI is resolvable,
 * switching to public resolvers if the local one refuses to answer.
 */
async function ensureSrvResolution(uri: string): Promise<void> {
  if (!uri.startsWith('mongodb+srv://')) {
    return;
  }

  const host = srvHostFrom(uri);
  if (!host) {
    return;
  }

  const srvName = `_mongodb._tcp.${host}`;

  try {
    await dnsPromises.resolveSrv(srvName);
    return;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code || '';

    if (!resolverRefusedCodes.has(code)) {
      throw err;
    }

    const configured = dns.getServers();
    if (fallbackDnsServers.length === 0) {
      throw err;
    }

    dns.setServers(fallbackDnsServers);

    try {
      await dnsPromises.resolveSrv(srvName);
    } catch {
      // The fallback could not help either — put the machine's own resolvers
      // back and let the original error explain the real problem.
      dns.setServers(configured);
      throw err;
    }

    console.warn(
      `[db] Local DNS resolver${configured.length ? ` (${configured.join(', ')})` : ''} ` +
        `refused the SRV lookup for ${host} [${code}]. ` +
        `Falling back to ${fallbackDnsServers.join(', ')} for this process only.`
    );
  }
}

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  await ensureSrvResolution(env.mongodbUri);

  connectionPromise = mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 10,
    autoIndex: !isProduction, // build indexes automatically only while developing
  });

  try {
    const conn = await connectionPromise;

    // Keep indexes in sync in production too, but without blocking boot.
    if (isProduction) {
      conn.connection
        .syncIndexes()
        .catch((err) => console.warn('[db] index sync failed:', err.message));
    }

    mongoose.connection.on('disconnected', () => {
      console.warn('[db] MongoDB disconnected');
      connectionPromise = null;
    });

    mongoose.connection.on('error', (err) => {
      console.error('[db] MongoDB connection error:', err.message);
    });

    console.log(`[db] Connected to MongoDB database "${conn.connection.name}"`);
    return conn;
  } catch (err: any) {
    connectionPromise = null;
    throw new Error(`Could not connect to MongoDB Atlas: ${explainConnectionFailure(err)}`);
  }
}

/**
 * Turns the driver's terse failures into something that points at the actual
 * cause, since "querySrv ECONNREFUSED" reads like a credentials problem.
 */
function explainConnectionFailure(err: any): string {
  const message: string = err?.message || String(err);

  if (/querySrv/i.test(message)) {
    return (
      `${message} — the SRV record could not be looked up. This is a DNS problem ` +
      'on this machine, not an Atlas or credentials problem: check that the ' +
      "machine's DNS servers respond to SRV queries, or use the non-SRV " +
      'connection string from Atlas.'
    );
  }

  if (/Authentication failed|bad auth/i.test(message)) {
    return `${message} — check the username and password in MONGODB_URI.`;
  }

  if (/IP that isn't whitelisted|not whitelisted|Could not connect to any servers/i.test(message)) {
    return (
      `${message} — check that this machine's public IP is allowed in your ` +
      'Atlas Network Access list.'
    );
  }

  return message;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function getConnectionState(): string {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

export { mongoose };
