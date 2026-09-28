/**
 * Browser smoke test for the IUM Fee Management SPA.
 *
 * Drives the locally installed Chrome over the DevTools Protocol (no extra npm
 * dependencies - uses Node's global WebSocket and fetch). Click through every
 * navigation tab and modal, then report console errors, uncaught exceptions and
 * failed network requests, with a screenshot per step.
 *
 * !! THIS TEST WRITES DATA !!
 * The "payment-successful-write" step records a real payment against the first
 * outstanding account it finds, so point it at a development or seeded database.
 * Those writes are tagged with an `E2E-OK-` invoice prefix and are easy to spot.
 *
 * Usage:
 *   node tools/browser-smoke.mjs [baseUrl]
 *
 * Env:
 *   CHROME_PATH   override the Chrome executable
 *   HEADFUL=1     run with a visible window
 *   CDP_PORT      Chrome remote debugging port (default 9333)
 *
 * Expects the app (and its API) to already be reachable at [baseUrl].
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = process.argv[2] || 'http://localhost:5173';
const DEBUG_PORT = Number(process.env.CDP_PORT || 9333);
const SHOT_DIR = path.resolve('tools/screenshots');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  throw new Error('Chrome not found. Set CHROME_PATH to the Chrome executable.');
}

/** Minimal CDP client over a single page target. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        (this.handlers.get(msg.method) || []).forEach((fn) => fn(msg.params));
      }
    });
  }

  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30_000);
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`eval failed: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description || ''}`);
    }
    return res.result?.value;
  }
}

async function connectToPage() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true });
          ws.addEventListener('error', reject, { once: true });
        });
        return new Cdp(ws);
      }
    } catch {
      /* Chrome not ready yet */
    }
    await sleep(500);
  }
  throw new Error('Could not attach to a Chrome page target.');
}

// --- test bookkeeping -------------------------------------------------------

const problems = [];
const warnings = [];
const steps = [];
let currentStep = 'boot';

/**
 * Negative tests deliberately provoke 4xx responses. Steps listed here are
 * exempt from HTTP/console error reporting so real regressions stay visible.
 */
const negativeTestSteps = new Set([
  'api-rejects-missing-invoice',
  'payment-duplicate-invoice-guard',
  'payment-duplicate-month-guard',
]);
const expectsFailure = () => negativeTestSteps.has(currentStep);

function noteProblem(kind, detail) {
  if (expectsFailure() && (kind === 'http-error' || kind === 'log-error')) return;
  problems.push({ step: currentStep, kind, detail: String(detail).slice(0, 500) });
}

function noteWarning(kind, detail) {
  warnings.push({ step: currentStep, kind, detail: String(detail).slice(0, 500) });
}

/**
 * Scans the currently rendered text for values that indicate a broken binding.
 * A view can render "successfully" while displaying `undefined` or `NaN`, which
 * element-existence checks would never catch.
 */
async function auditText(cdp, label) {
  const found = await cdp.eval(`(() => {
    const text = document.querySelector('main')?.innerText || '';
    const bad = [];
    for (const token of ['undefined', 'NaN', '[object Object]', 'Infinity']) {
      if (text.includes(token)) {
        const idx = text.indexOf(token);
        bad.push(token + ' -> \\u2026' + text.slice(Math.max(0, idx - 45), idx + 25).replace(/\\s+/g, ' ') + '\\u2026');
      }
    }
    return bad;
  })()`);

  (found || []).forEach((detail) => noteProblem('render-text', `${label}: ${detail}`));
}

/** Detects the app's own connection-failure banner. */
async function auditConnectionBanner(cdp, label) {
  const offline = await cdp.eval(
    `document.body.innerText.includes('Offline Mode') || document.body.innerText.includes('System Connection Error')`
  );
  if (offline) noteProblem('connection-banner', `${label}: app reported a backend connection problem`);
}

async function click(cdp, selector, label) {
  const exists = await cdp.eval(`!!document.querySelector(${JSON.stringify(selector)})`);
  if (!exists) throw new Error(`selector not found: ${selector}`);
  await cdp.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await sleep(700);
  return label || selector;
}

/** Sets a React-controlled input/select by value using the native setter. */
async function setField(cdp, selector, value) {
  await cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('missing ${selector}');
    const proto =
      el.tagName === 'SELECT' ? HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, ${JSON.stringify(String(value))});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(300);
}

/** Clicks the close (X) button of the topmost open modal, if any. */
async function closeModal(cdp) {
  const closed = await cdp.eval(`(() => {
    const btns = [...document.querySelectorAll('button')].filter(b =>
      b.querySelector('svg.lucide-x') && b.offsetParent !== null
    );
    if (btns.length) { btns[btns.length - 1].click(); return true; }
    return false;
  })()`);
  await sleep(600);
  return closed;
}

/** Reads the rose-coloured error alert inside the payment modal. */
async function paymentModalError(cdp) {
  return cdp.eval(`(() => {
    const el = [...document.querySelectorAll('div')].find(
      (d) => typeof d.className === 'string'
        && d.className.includes('bg-rose-50')
        && d.innerText.includes('Payment Error')
    );
    return el ? el.innerText.replace(/\\s+/g, ' ').trim() : null;
  })()`);
}

async function screenshot(cdp, name) {
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), Buffer.from(data, 'base64'));
  } catch (err) {
    noteProblem('screenshot', err.message);
  }
}

async function step(cdp, name, fn) {
  currentStep = name;
  const before = problems.length;
  try {
    await fn();
    await screenshot(cdp, name);
    steps.push({ name, ok: true, newProblems: problems.length - before });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    steps.push({ name, ok: false, error: err.message, newProblems: problems.length - before });
    console.log(`  FAIL  ${name} -> ${err.message}`);
    await screenshot(cdp, `${name}-FAILED`);
  }
}

// --- main -------------------------------------------------------------------

async function main() {
  const chromePath = findChrome();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ium-chrome-'));
  console.log(`Chrome: ${chromePath}`);
  console.log(`Target: ${BASE_URL}\n`);

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--window-size=1440,1000',
    ...(process.env.HEADFUL ? [] : ['--headless=new', '--disable-gpu']),
    'about:blank',
  ], { stdio: 'ignore' });

  let cdp;
  try {
    cdp = await connectToPage();

    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Log.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
    });

    cdp.on('Runtime.exceptionThrown', (p) => {
      const d = p.exceptionDetails;
      noteProblem('uncaught-exception', d.exception?.description || d.text);
    });
    cdp.on('Runtime.consoleAPICalled', (p) => {
      const text = p.args.map((a) => a.value ?? a.description ?? a.type).join(' ');
      if (p.type === 'error') noteProblem('console-error', text);
      else if (p.type === 'warning') noteWarning('console-warning', text);
    });
    cdp.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error' && !expectsFailure()) {
        noteProblem('log-error', `${p.entry.text} ${p.entry.url || ''}`);
      }
    });
    cdp.on('Network.responseReceived', (p) => {
      if (p.response.status >= 400 && !expectsFailure()) {
        noteProblem('http-error', `${p.response.status} ${p.response.url}`);
      }
    });
    cdp.on('Network.loadingFailed', (p) => {
      if (p.blockedReason || p.canceled) return;
      noteProblem('network-failed', p.errorText);
    });

    // ---- load -------------------------------------------------------------
    currentStep = 'load';
    await cdp.send('Page.navigate', { url: BASE_URL });
    for (let i = 0; i < 80; i++) {
      const ready = await cdp.eval(`!!document.querySelector('#nav-tab-dashboard')`).catch(() => false);
      if (ready) break;
      await sleep(500);
    }
    await sleep(1500);

    const bootOk = await cdp.eval(`!!document.querySelector('#nav-tab-dashboard')`);
    if (!bootOk) {
      const bodyText = await cdp.eval(`document.body.innerText.slice(0,600)`);
      throw new Error(`App did not render its navigation. Body text:\n${bodyText}`);
    }
    await screenshot(cdp, '00-load');

    // ---- navigation tabs --------------------------------------------------
    for (const view of ['dashboard', 'pending', 'families', 'anomalies', 'settings']) {
      await step(cdp, `nav-${view}`, async () => {
        await click(cdp, `#nav-tab-${view}`);
        // Assert on the accessible marker rather than a styling class, so the
        // rail can be restyled without silently breaking this check.
        const active = await cdp.eval(
          `(() => {
             const el = document.querySelector('#nav-tab-${view}');
             if (!el || el.getAttribute('aria-current') !== 'page') return false;
             const marked = document.querySelectorAll('nav[aria-label="Sections"] [aria-current="page"]');
             return marked.length === 1;
           })()`
        );
        if (!active) throw new Error(`${view} tab did not become the only active tab`);
        const main = await cdp.eval(`document.querySelector('main')?.innerText.length || 0`);
        if (main < 40) throw new Error(`${view} view rendered no content`);
        await auditText(cdp, view);
        await auditConnectionBanner(cdp, view);
      });
    }

    // ---- sidebar collapse -------------------------------------------------
    // Reads the docked rail's geometry, so it only means anything at `lg`+.
    await step(cdp, 'sidebar-collapse', async () => {
      const read = `(() => {
        const aside = document.querySelector('#app-sidebar');
        const label = document.querySelector('#nav-tab-dashboard span');
        const btn = document.querySelector('#sidebar-collapse-btn');
        return {
          width: Math.round(aside.getBoundingClientRect().width),
          contentLeft: Math.round(document.querySelector('main').getBoundingClientRect().left),
          labelHidden: label ? getComputedStyle(label).display === 'none' : null,
          expanded: btn.getAttribute('aria-expanded'),
        };
      })()`;

      const expanded = await cdp.eval(read);
      if (expanded.width !== 256) throw new Error(`expected a 256px rail, measured ${expanded.width}px`);
      if (expanded.labelHidden) throw new Error('labels should be visible while expanded');

      await click(cdp, '#sidebar-collapse-btn');
      await sleep(500);

      const collapsed = await cdp.eval(read);
      if (collapsed.width >= expanded.width) {
        throw new Error(`rail did not narrow (${expanded.width}px -> ${collapsed.width}px)`);
      }
      if (!collapsed.labelHidden) throw new Error('labels still visible in the collapsed rail');
      if (collapsed.expanded !== 'false') throw new Error('collapse button did not report aria-expanded=false');
      if (collapsed.contentLeft >= expanded.contentLeft) {
        throw new Error(`content did not follow the rail (${expanded.contentLeft}px -> ${collapsed.contentLeft}px)`);
      }
      const stillClickable = await cdp.eval(
        `(() => { const el = document.querySelector('#nav-tab-anomalies'); return !!el && el.getBoundingClientRect().width > 0; })()`
      );
      if (!stillClickable) throw new Error('nav items are not reachable in the collapsed rail');

      // Restore the expanded rail so later steps run against the default layout.
      await click(cdp, '#sidebar-collapse-btn');
      await sleep(500);
      const restored = await cdp.eval(read);
      if (restored.width !== 256) throw new Error(`rail did not restore (${restored.width}px)`);
    });

    // ---- payment modal ----------------------------------------------------
    await step(cdp, 'modal-record-payment', async () => {
      await click(cdp, '#header-record-payment-btn');
      const open = await cdp.eval(`!!document.querySelector('#submit-payment-btn')`);
      if (!open) throw new Error('payment modal did not open');
      const opts = await cdp.eval(`document.querySelector('#payment-family-select')?.options.length || 0`);
      if (opts < 2) throw new Error(`family dropdown has no options (${opts})`);
    });
    await step(cdp, 'close-payment-modal', async () => {
      if (!(await closeModal(cdp))) throw new Error('no close button found');
      if (await cdp.eval(`!!document.querySelector('#submit-payment-btn')`)) {
        throw new Error('payment modal still open');
      }
    });

    // ---- pending view interactions ---------------------------------------
    await step(cdp, 'pending-reminder-modal', async () => {
      await click(cdp, '#nav-tab-pending');
      const remindBtn = await cdp.eval(
        `[...document.querySelectorAll('button[id^="btn-remind-"]')][0]?.id || null`
      );
      if (!remindBtn) throw new Error('no reminder button found on pending view');
      await click(cdp, `#${remindBtn}`);
      if (!(await cdp.eval(`!!document.querySelector('#mark-sent-btn')`))) {
        throw new Error('smart reminder modal did not open');
      }
    });
    await step(cdp, 'close-reminder-modal', async () => {
      if (!(await closeModal(cdp))) throw new Error('no close button found');
    });

    // ---- payment write path (validation -> guards -> success) -------------
    await step(cdp, 'payment-invoice-auto-populated', async () => {
      await click(cdp, '#header-record-payment-btn');
      if (!(await cdp.eval(`!!document.querySelector('#submit-payment-btn')`))) {
        throw new Error('payment modal did not open');
      }
      // The modal auto-suggests a number, so the field should never be blank.
      const initial = await cdp.eval(`document.querySelector('#payment-invoice-number-input').value`);
      if (!initial || !initial.trim()) {
        throw new Error('invoice number was not auto-populated on open');
      }

      // Clearing it should be re-filled by the auto-suggest effect rather than
      // leaving the user able to submit an un-numbered payment.
      await setField(cdp, '#payment-invoice-number-input', '');
      await sleep(900);
      const afterClear = await cdp.eval(
        `document.querySelector('#payment-invoice-number-input').value`
      );
      if (!afterClear || !afterClear.trim()) {
        throw new Error('blank invoice number was left in place (auto-suggest effect did not refill)');
      }
    });

    await step(cdp, 'api-rejects-missing-invoice', async () => {
      // The client auto-fills the field, so exercise the server-side rule that
      // actually protects the ledger from an un-numbered payment.
      const result = await cdp.eval(`(async () => {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ family_id: 'fam-1', amount: 100, month: 11, year: 2026 })
        });
        return { status: res.status, body: await res.json() };
      })()`);
      if (result.status !== 400) {
        throw new Error(`expected HTTP 400 for a missing invoice, got ${result.status}`);
      }
      if (!/invoice number is mandatory/i.test(result.body?.error || '')) {
        throw new Error(`unexpected error body: ${JSON.stringify(result.body)}`);
      }
    });

    await step(cdp, 'payment-duplicate-invoice-guard', async () => {
      await setField(cdp, '#payment-invoice-number-input', 'INV-2026-0101');
      await click(cdp, '#submit-payment-btn');
      const err = await paymentModalError(cdp);
      if (!err || !/already exists/i.test(err)) {
        throw new Error(`expected the duplicate invoice error, got: ${err}`);
      }
    });

    await step(cdp, 'payment-duplicate-month-guard', async () => {
      // fam-1 already settled September in the seed data, so a fresh invoice
      // for the same month must be rejected by the monthly duplicate rule.
      await setField(cdp, '#payment-family-select', 'fam-1');
      await setField(cdp, '#payment-invoice-number-input', `E2E-DUP-${Date.now()}`);
      await click(cdp, '#submit-payment-btn');
      const err = await paymentModalError(cdp);
      if (!err || !/Duplicate Payment/i.test(err)) {
        throw new Error(`expected the duplicate-month warning, got: ${err}`);
      }
    });

    await step(cdp, 'close-payment-modal-after-errors', async () => {
      if (!(await closeModal(cdp))) throw new Error('no close button found');
    });

    let payButtonsBefore = 0;
    await step(cdp, 'payment-successful-write', async () => {
      // Drive the real flow: pay an outstanding account straight from Pending.
      await click(cdp, '#nav-tab-pending');
      payButtonsBefore = await cdp.eval(`document.querySelectorAll('button[id^="btn-pay-"]').length`);
      if (payButtonsBefore < 1) throw new Error('no payable pending items to test with');

      const payBtnId = await cdp.eval(
        `document.querySelectorAll('button[id^="btn-pay-"]')[0].id`
      );
      await click(cdp, `#${payBtnId}`);
      if (!(await cdp.eval(`!!document.querySelector('#submit-payment-btn')`))) {
        throw new Error('pending pay button did not open the payment modal');
      }

      await setField(cdp, '#payment-invoice-number-input', `E2E-OK-${Date.now()}`);
      await click(cdp, '#submit-payment-btn');

      // A successful POST closes the modal and refetches the dashboard.
      for (let i = 0; i < 30; i++) {
        const stillOpen = await cdp.eval(`!!document.querySelector('#submit-payment-btn')`);
        if (!stillOpen) return;
        await sleep(500);
      }
      const err = await paymentModalError(cdp);
      throw new Error(`payment modal did not close; error shown: ${err}`);
    });

    await step(cdp, 'payment-reflected-in-pending-list', async () => {
      await sleep(1200);
      const after = await cdp.eval(`document.querySelectorAll('button[id^="btn-pay-"]').length`);
      if (after !== payButtonsBefore - 1) {
        throw new Error(
          `pending list should shrink by one after payment (was ${payButtonsBefore}, now ${after})`
        );
      }
    });

    // ---- settings tabs ----------------------------------------------------
    for (const tab of ['families', 'tuition', 'currency', 'billing', 'risk', 'launch']) {
      await step(cdp, `settings-${tab}`, async () => {
        await click(cdp, '#nav-tab-settings');
        await click(cdp, `#settings-tab-${tab}`);
        const len = await cdp.eval(`document.querySelector('main')?.innerText.length || 0`);
        if (len < 40) throw new Error(`settings ${tab} tab rendered no content`);
        await auditText(cdp, `settings:${tab}`);
      });
    }

    // ---- payment corrections from the dashboard ---------------------------
    // The ledger view is gone, so edit and void live on the dashboard rows now.
    const EDIT_REASON = 'E2E: corrected amount via dashboard edit action';
    let correctedPaymentId = null;

    await step(cdp, 'dashboard-edit-payment', async () => {
      await click(cdp, '#nav-tab-dashboard');
      await sleep(900);

      correctedPaymentId = await cdp.eval(`(() => {
        const btn = document.querySelector('button[id^="dashboard-edit-payment-btn-"]');
        return btn ? btn.id.replace('dashboard-edit-payment-btn-', '') : null;
      })()`);
      if (!correctedPaymentId) throw new Error('no dashboard row offers an edit action');

      await click(cdp, `#dashboard-edit-payment-btn-${correctedPaymentId}`);
      await sleep(600);

      const invoice = await cdp.eval(`document.querySelector('#edit-invoice-number-input')?.value`);
      if (!invoice) throw new Error('edit modal did not open with a prefilled invoice number');

      await setField(cdp, '#edit-amount-input', 137);
      await setField(cdp, '#edit-reason-textarea', EDIT_REASON);
      await click(cdp, '#save-payment-edit-btn');

      for (let i = 0; i < 30; i++) {
        if (!(await cdp.eval(`!!document.querySelector('#save-payment-edit-btn')`))) return;
        await sleep(500);
      }
      throw new Error('edit modal stayed open - the save did not succeed');
    });

    await step(cdp, 'dashboard-edit-persisted', async () => {
      const stored = await cdp.eval(
        `fetch('/api/dashboard').then(r => r.json()).then(j => {
           const p = (j.payments || []).find(x => x.id === ${JSON.stringify(correctedPaymentId)});
           return p ? { amount: p.amount, status: p.status } : null;
         })`
      );
      if (!stored) throw new Error('the edited payment disappeared from the payload');
      if (stored.amount !== 137) throw new Error(`edit did not persist (amount is ${stored.amount})`);
      if (stored.status === 'void') throw new Error('an edit must not void the payment');
    });

    await step(cdp, 'dashboard-edit-audited', async () => {
      const logged = await cdp.eval(
        `fetch('/api/dashboard').then(r => r.json()).then(j =>
           (j.auditLogs || []).some(l => JSON.stringify(l).includes(${JSON.stringify(EDIT_REASON)}))
         )`
      );
      if (!logged) throw new Error('the dashboard edit left no audit trail');
    });

    await step(cdp, 'dashboard-void-modal', async () => {
      await click(cdp, '#nav-tab-dashboard');
      await sleep(700);

      const target = await cdp.eval(`(() => {
        const btn = document.querySelector('button[id^="dashboard-void-payment-btn-"]');
        return btn ? btn.id.replace('dashboard-void-payment-btn-', '') : null;
      })()`);
      if (!target) throw new Error('no dashboard row offers a void action');

      await click(cdp, `#dashboard-void-payment-btn-${target}`);
      await sleep(500);
      if (!(await cdp.eval(`!!document.querySelector('#void-reason-textarea')`))) {
        throw new Error('void modal did not open from the dashboard');
      }
      await closeModal(cdp);
      if (await cdp.eval(`!!document.querySelector('#void-reason-textarea')`)) {
        throw new Error('void modal did not close');
      }
    });

    // ---- families search --------------------------------------------------
    await step(cdp, 'families-search', async () => {
      await click(cdp, '#nav-tab-families');
      await setField(cdp, '#families-search-input', 'a');
      await sleep(600);
    });

    await screenshot(cdp, '99-final');
  } finally {
    try {
      await cdp?.send('Browser.close');
    } catch {
      /* ignore */
    }
    chrome.kill();
    await sleep(500);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  // ---- report -------------------------------------------------------------
  const failed = steps.filter((s) => !s.ok);
  console.log(`\n${'='.repeat(64)}`);
  console.log(`Steps: ${steps.length - failed.length}/${steps.length} passed`);
  console.log(`Screenshots: ${SHOT_DIR}`);

  const print = (list) => {
    const seen = new Set();
    for (const p of list) {
      const key = `${p.kind}|${p.detail.slice(0, 160)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  [${p.kind}] during "${p.step}"\n     ${p.detail.split('\n')[0]}`);
    }
  };

  if (problems.length) {
    console.log(`\nBrowser problems detected (${problems.length}):`);
    print(problems);
  } else {
    console.log('\nNo console errors, exceptions, failed requests or broken bindings.');
  }

  if (warnings.length) {
    console.log(`\nConsole warnings (${warnings.length}, non-fatal):`);
    print(warnings);
  }

  if (failed.length) {
    console.log('\nFailed steps:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
  }

  const exitCode = failed.length || problems.length ? 1 : 0;
  console.log(`\nResult: ${exitCode === 0 ? 'CLEAN' : 'ISSUES FOUND'}`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(`\nSmoke test could not run: ${err.message}`);
  process.exit(2);
});
