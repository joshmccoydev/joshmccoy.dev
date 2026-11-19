'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const widths = [320, 390, 820, 1280];
const paths = [
  '/',
  '/work/',
  '/work/bot-team/',
  '/work/social/',
  '/work/lifedash/',
  '/work/owner-math/',
  '/work/brief/',
  '/work/j0sh-wtf/',
  '/work/dad-cant-draw/',
  '/log/',
  '/404.html',
  '/case-studies/bot-team/',
];

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('missing');
      return;
    }
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

test('no horizontal scroll from 320px through desktop, in both themes', { timeout: 180000 }, async (t) => {
  const chrome = chromePath();
  if (!chrome) {
    if (process.env.CI) assert.fail('Chrome is required in CI');
    t.skip('Chrome is not installed');
    return;
  }

  const server = await startServer();
  const { port } = server.address();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jmd-chrome-'));
  const debugPort = 9333 + (process.pid % 1000);
  const proc = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  t.after(async () => {
    server.close();
    proc.kill();
    await new Promise((resolve) => {
      if (proc.exitCode !== null) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, 1000);
      proc.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  let version;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) {
        version = await response.json();
        break;
      }
    } catch {
      await sleep(100);
    }
  }
  assert.ok(version, 'Chrome debugging port did not open');

  const browser = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve) => browser.addEventListener('open', resolve, { once: true }));
  let nextId = 0;
  const pending = new Map();
  browser.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId + 1;
    nextId = id;
    pending.set(id, (message) => {
      if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
      else resolve(message.result);
    });
    browser.send(JSON.stringify({ id, method, params }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const target = targets.find((item) => item.id === targetId);
  const page = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => page.addEventListener('open', resolve, { once: true }));
  let pageId = 0;
  const pagePending = new Map();
  page.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pagePending.has(message.id)) {
      pagePending.get(message.id)(message);
      pagePending.delete(message.id);
    }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = pageId + 1;
    pageId = id;
    pagePending.set(id, (message) => {
      if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
      else resolve(message.result);
    });
    page.send(JSON.stringify({ id, method, params }));
  });

  await call('Page.enable');
  await call('Runtime.enable');

  async function measure(urlPath, width) {
    await call('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 800,
    });
    await call('Page.navigate', { url: `http://127.0.0.1:${port}${urlPath}` });
    await call('Runtime.evaluate', {
      expression: 'document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => resolve())))',
      awaitPromise: true,
    });
    const result = await call('Runtime.evaluate', {
      expression: `(() => {
        const doc = document.documentElement;
        const header = document.querySelector('header');
        return JSON.stringify({
          scroll: doc.scrollWidth,
          client: doc.clientWidth,
          header: header ? header.scrollWidth : 0,
          headerClient: header ? header.clientWidth : 0
        });
      })()`,
      returnByValue: true,
    });
    return JSON.parse(result.result.value);
  }

  for (const urlPath of paths) {
    for (const width of widths) {
      const box = await measure(urlPath, width);
      assert.ok(
        box.scroll <= box.client + 1,
        `${urlPath} at ${width}px scrolls (${box.scroll} > ${box.client})`,
      );
      assert.ok(
        box.header <= box.headerClient + 1,
        `${urlPath} header at ${width}px scrolls (${box.header} > ${box.headerClient})`,
      );
    }
  }

  await call('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'light' }],
  });
  await measure('/', 390);
  const light = await call('Runtime.evaluate', {
    expression: 'getComputedStyle(document.body).backgroundColor',
    returnByValue: true,
  });
  assert.equal(light.result.value, 'rgb(246, 241, 231)');

  await call('Runtime.evaluate', {
    expression: 'document.getElementById("theme-dark").click()',
    returnByValue: true,
  });
  const dark = await call('Runtime.evaluate', {
    expression: 'getComputedStyle(document.body).backgroundColor',
    returnByValue: true,
  });
  assert.equal(dark.result.value, 'rgb(20, 18, 14)');

  await measure('/work/social/', 390);
  const held = await call('Runtime.evaluate', {
    expression: 'getComputedStyle(document.querySelector(".is-sent")).display',
    returnByValue: true,
  });
  assert.equal(held.result.value, 'none');
  await call('Runtime.evaluate', {
    expression: 'document.getElementById("send-ok").click()',
    returnByValue: true,
  });
  const sent = await call('Runtime.evaluate', {
    expression: 'getComputedStyle(document.querySelector(".is-sent")).display',
    returnByValue: true,
  });
  assert.equal(sent.result.value, 'block');

  page.close();
  browser.close();
});
