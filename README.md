# IUM Fee Management

Tuition fee management platform for coaching centres and schools — family ledgers, invoice-tracked payments, rules-based risk scoring, cash-flow forecasting, anomaly review, smart reminders, and multi-sheet Excel export.

Built as a **MERN** stack with TypeScript throughout:

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite + Tailwind CSS v4 (`client/`) |
| Backend | Node.js + Express 4 + TypeScript (`server/`) |
| Database | MongoDB Atlas via Mongoose (`server/src/models`) |
| AI | Google Gemini, with a deterministic fallback engine |

```
.
├── client/                 React SPA
│   ├── src/
│   │   ├── components/     Views and modals
│   │   ├── context/        Currency / settings context
│   │   ├── utils/          Client-side Excel export
│   │   ├── types.ts        API contract types
│   │   └── main.tsx
│   ├── vite.config.ts      Dev server + /api proxy to Express
│   └── .env.example
└── server/                 Express API
    ├── src/
    │   ├── config/         Env loading + Mongoose connection
    │   ├── models/         Mongoose schemas (one per collection)
    │   ├── services/       Business logic + intelligence engine
    │   ├── controllers/    HTTP request/response mapping
    │   ├── routes/         Express routers
    │   ├── middleware/     Async wrapper + error handling
    │   ├── scripts/seed.ts Demo data loader
    │   └── index.ts        Entry point
    └── .env.example
```

## Prerequisites

- Node.js 20+
- A MongoDB Atlas cluster (or any MongoDB 5+ instance)

## Setup

**1. Install dependencies** (npm workspaces installs both packages):

```bash
npm install
```

**2. Create the Atlas cluster and connection string**

In the Atlas UI: *Cluster → Connect → Drivers → Node.js*, then copy the `mongodb+srv://…` string. Grant your current IP address access under *Network Access*.

**3. Configure the server**

```bash
cp server/.env.example server/.env
```

Set at minimum:

```env
MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB_NAME="ium_fees"
PORT="5000"
CORS_ORIGIN="http://localhost:5173"
```

> URL-encode any special characters in the database password (`@` → `%40`, `#` → `%23`).

`GEMINI_API_KEY` is optional — without it the natural-language assistant falls back to the built-in rules-based engine.

**4. Run in development**

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000 (Vite proxies `/api` to it)

## Scripts

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API and the Vite dev server together |
| `npm run dev:server` / `npm run dev:client` | Start just one side |
| `npm run build` | Production build of both packages |
| `npm start` | Run the built API (serves `client/dist` when `NODE_ENV=production`) |
| `npm run seed` | Load the bundled demo dataset |
| `npm run typecheck` | Type-check both packages |
| `npm run test:browser` | Click through every view in Chrome (see below) |
| `npm run clean` | Remove build output and installed modules |

## Browser smoke test

`npm run test:browser` drives your installed Chrome over the DevTools Protocol (no extra npm dependencies) and clicks through all seven views, every settings tab, and each modal. For every step it records a screenshot, and it fails the run on console errors, uncaught exceptions, HTTP 4xx/5xx responses, or text that renders as `undefined` / `NaN`.

It also exercises the payment write path: the auto-suggested invoice number, both duplicate guards, and a genuine payment recorded from the *Auto-Pending* view which it then verifies removed the account from the pending list.

```bash
# with the app already running (npm run dev)
npm run test:browser
npm run test:browser -- http://localhost:5173
```

> **This test writes data.** The success step records a real payment tagged with an `E2E-OK-` invoice prefix, so run it against a seeded development database rather than production. Screenshots land in `tools/screenshots/` (git-ignored).

Options: `HEADFUL=1` shows the browser window, `CHROME_PATH` overrides the Chrome binary, `CDP_PORT` changes the debugging port.

## Starting from an empty database

A fresh database begins with zero records and default settings (INR / ₹). Either:

- **Add records through the UI** — register a family from the *Families* view, then record payments.
- **Load the demo dataset** — `npm run seed` inserts 8 families, 11 students and 30 payments spanning May–Sep 2026, including deliberately delinquent and trusted-payer cases so the risk and forecast views have something to show.
- **Restore a backup** — upload a previously downloaded JSON snapshot from the *Backup & Data* modal.

To wipe all transactional data and start over, use *Settings → Database → Clear*, or `POST /api/database/clear`.

## Deploying to Vercel

The repository is already configured for Vercel: `vercel.json` publishes the built React bundle to the CDN and routes every `/api/*` request to a serverless function (`api/index.ts`) that wraps the same Express app the Node entry point uses. Because both live on one origin, the client's relative `/api/...` fetches need no CORS setup and no API base URL.

**1. Import the repository**

Vercel → *Add New → Project*, pick the repo, and leave the framework preset as detected (*Other*) — `vercel.json` supplies the build command and output directory.

**2. Set environment variables**

Under *Settings → Environment Variables*, add these for Production (and Preview if you want previews to work):

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | Your Atlas SRV connection string |
| `MONGODB_DB_NAME` | yes | `ium_fees` |
| `GEMINI_API_KEY` | no | Without it the assistant falls back to the rules engine |
| `CORS_ORIGIN` | no | Only needed if you call the API from a *different* origin |
| `DNS_FALLBACK_SERVERS` | no | Not needed on Vercel; see the note below |

**3. Allow the function to reach Atlas**

Serverless functions run from rotating IP addresses, so add `0.0.0.0/0` to Atlas *Network Access* — or use Atlas's own Vercel integration, which authorises the deployment without opening the cluster to the internet.

### Differences from running on a server

- **The API is serverless.** Requests are served by short-lived functions, not a process that stays up. `api/index.ts` keeps the Mongoose connection at module scope so warm instances reuse it, but cold starts pay a connect. `maxDuration` is 30s and the region is `bom1` (Mumbai) in `vercel.json`.
- **The DNS fallback never triggers.** Vercel's resolver answers SRV queries normally, so the `dns.setServers` workaround built for local Windows machines stays idle.
- **Request bodies are capped at 4.5 MB** by the platform, below the `10mb` limit the Express JSON parser is configured with. This only matters for `POST /api/restore`, which in-app has had no caller since the Backup modal was removed.
- **The Express app no longer serves the SPA** when `VERCEL` is set; Vercel's CDN does. Running `npm start` on a normal host still serves `client/dist` exactly as before.

> The Vercel Hobby plan is free for personal, non-commercial projects. A fee-management deployment for a real institution is commercial use, which their terms place on the Pro plan.

## Troubleshooting

**`Could not connect to MongoDB Atlas: querySrv ECONNREFUSED …`**

This is a DNS problem on the machine, not an Atlas or credentials problem. A `mongodb+srv://` URI needs an SRV lookup, which Node performs through c-ares against the nameservers reported by the OS. Some Windows setups advertise a local stub (often `127.0.0.1`, left behind by a VPN or DNS filter) that answers ordinary hostname lookups through the OS DNS Client but refuses raw c-ares queries — so *only* the SRV step fails.

Check the machine's resolvers:

```bash
node -e "console.log(require('dns').getServers())"
```

If that prints a local address, either fix the machine's DNS settings, or let the server work around it. `connectDatabase()` probes the SRV record first and, when the configured resolver refuses to answer, retries through `DNS_FALLBACK_SERVERS` (default `8.8.8.8,1.1.1.1`) for that process only:

```
[db] Local DNS resolver (127.0.0.1) refused the SRV lookup for cluster0.xxxxx.mongodb.net [ECONNREFUSED]. Falling back to 8.8.8.8, 1.1.1.1 for this process only.
```

Because it uses `dns.setServers`, the override affects SRV/TXT lookups in the API process alone — it does not change your machine's configuration, and a plain `mongodb://` URI bypasses the logic entirely. Set `DNS_FALLBACK_SERVERS=""` to disable it, or switch to Atlas's non-SRV connection string.

Other connection failures are annotated with the likely cause (bad credentials, or this machine's IP missing from the Atlas *Network Access* list).

## API reference

All endpoints are mounted under `/api`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe, reports DB connection state |
| `GET` | `/dashboard` | Complete boot payload: metrics, families, pending items, forecasts, anomalies, reminders, audit trail, settings |
| `POST` | `/payments` | Record a payment (invoice number mandatory, duplicate-guarded) |
| `PUT` | `/payments/:id` | Edit a payment (audit reason mandatory) |
| `POST` | `/payments/:id/void` | Void a payment (reason mandatory) |
| `POST` | `/families` | Register a family with students and a fee plan |
| `PUT` | `/families/:id` | Update a family, its roster and fee plan |
| `DELETE` | `/families/:id` | Delete a family |
| `GET` / `PUT` | `/settings` | Read / update institutional settings |
| `POST` | `/settings/apply-fixed-rate` | Apply one tuition rate to every active family |
| `POST` | `/database/clear` | Wipe transactional data |
| `POST` | `/reminders/generate` | Draft a tone-calibrated reminder for a family |
| `POST` | `/reminders/send` | Log a sent reminder |
| `POST` | `/anomalies/:id/resolve` | Record a review decision |
| `POST` | `/ai/query` | Natural-language query over the live ledger |
| `POST` | `/ocr/parse` | Normalise receipt text into payment fields |
| `GET` | `/export/csv?type=pending\|ledger\|risk` | CSV export |
| `GET` | `/export/excel` | Filtered multi-sheet `.xlsx` export |
| `GET` | `/backup` | Download a full JSON snapshot |
| `POST` | `/restore` | Restore from a snapshot |

## Design notes

- **Stable string IDs.** Documents carry a human-readable `id` (`fam-…`, `pay-…`) alongside Mongo's `_id`. All relationships and API responses use `id`, so the client never sees a Mongo ObjectId. Schemas set `id: false` to disable Mongoose's `_id`→`id` virtual.
- **`_id` never leaves the API.** Mongoose's `toJSON` transform strips internals from hydrated documents, and `toPlain()` does the same for the `.lean()` reads used throughout the services.
- **Audit trail.** Every create/edit/void/delete funnels through `services/audit.service.ts`, which records the acting user, a description, and before/after state.
- **Logical uniqueness is enforced in services, not by DB indexes.** Invoice numbers must be unique among non-void records and family codes case-insensitively; both rules are validated in the service layer so a legacy backup restore can't fail with a raw duplicate-key error.
- **Business rules are pure functions.** `services/intelligence.service.ts` has no database access, so risk scoring, forecasting and anomaly detection can be unit tested directly.
- **Tenant time frame.** The intelligence engine evaluates against a fixed reference date (`2026-09-10`, fees due on the 2nd) defined in `server/src/types/index.ts`.
