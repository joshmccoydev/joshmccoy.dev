import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['/', '/log/', '/log/ask-first/', '/404.html'];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function contentType(file) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.xml': 'application/xml',
    '.txt': 'text/plain; charset=utf-8',
  };
  return types[path.extname(file)] ?? 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) {
      pathname += 'index.html';
    }
    const file = path.normalize(path.join(root, pathname));
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404).end('not found');
        return;
      }
      response.writeHead(200, {
        'content-type': contentType(file),
        'cache-control': 'no-store',
      });
      response.end(data);
    });
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

async function waitForSocket(port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Chrome is still booting.
    }
    await sleep(100);
  }
  throw new Error('Chrome DevTools did not come up');
}

function openSocket(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    let nextId = 0;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) {
        return;
      }
      const { resolve: done, reject: fail } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        fail(new Error(JSON.stringify(message.error)));
      } else {
        done(message.result);
      }
    });
    socket.addEventListener('error', () => reject(new Error('DevTools socket failed')));
    socket.addEventListener('open', () => {
      resolve({
        socket,
        send(method, params = {}) {
          const id = (nextId += 1);
          return new Promise((done, fail) => {
            pending.set(id, { resolve: done, reject: fail });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
      });
    });
  });
}

const MEASURE = `(() => {
  const bad = [];
  for (const el of document.querySelectorAll('a, button, label')) {
    if (el.classList.contains('now-pause')) continue;
    const proseLink = el.closest('.prose') && el.tagName === 'A';
    if (proseLink) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    if (box.width < 44 || box.height < 44) {
      bad.push({
        text: (el.innerText || el.getAttribute('aria-label') || el.className || '').trim().slice(0, 48),
        w: Math.round(box.width),
        h: Math.round(box.height),
      });
    }
  }
  const track = document.querySelector('.now-track');
  const hidden = document.querySelector('.now-track ul[aria-hidden="true"]');
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bad,
    animation: track ? getComputedStyle(track).animationName : '',
    hiddenDisplay: hidden ? getComputedStyle(hidden).display : '',
  };
})()`;

test('pages hold at 320px and tap targets stay at least 44px', { timeout: 60_000 }, async () => {
  const chromePath = findChrome();
  assert.ok(chromePath, 'Chrome is required for the layout check');
  const server = await startServer();
  const port = 9400 + Math.floor(Math.random() * 400);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-chrome-'));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userData}`,
      '--window-size=320,800',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    await waitForSocket(port);
    const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    const page = list.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
    assert.ok(page, 'Chrome did not open a page target');
    const session = await openSocket(page.webSocketDebuggerUrl);
    await session.send('Runtime.enable');
    await session.send('Page.enable');
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 800,
      deviceScaleFactor: 1,
      mobile: true,
    });

    for (const pathname of pages) {
      await session.send('Page.navigate', { url: `${origin}${pathname}` });
      await session.send('Runtime.evaluate', {
        expression: 'document.fonts ? document.fonts.ready : null',
        awaitPromise: true,
      });
      const measured = await session.send('Runtime.evaluate', {
        expression: MEASURE,
        returnByValue: true,
      });
      const value = measured.result.value;
      assert.ok(
        value.scrollWidth <= value.clientWidth + 1,
        `${pathname} scrolls horizontally (${value.scrollWidth} > ${value.clientWidth})`,
      );
      assert.deepEqual(value.bad, [], `${pathname} has small tap targets`);
    }

    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await session.send('Page.navigate', { url: `${origin}/` });
    await session.send('Runtime.evaluate', {
      expression: 'document.fonts ? document.fonts.ready : null',
      awaitPromise: true,
    });
    const reduced = await session.send('Runtime.evaluate', {
      expression: MEASURE,
      returnByValue: true,
    });
    const reducedValue = reduced.result.value;
    assert.equal(reducedValue.animation, 'none');
    assert.equal(reducedValue.hiddenDisplay, 'none');
    assert.ok(reducedValue.scrollWidth <= reducedValue.clientWidth + 1);
    assert.deepEqual(reducedValue.bad, []);
    session.socket.close();
  } finally {
    chrome.kill('SIGKILL');
    server.close();
    fs.rmSync(userData, { recursive: true, force: true });
  }
});
