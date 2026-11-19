import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkClean, checkHomeMeta, checkRedirect, checkSitemap, runChecks } from '../scripts/check-live.mjs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the committed homepage passes the live meta and clean checks', () => {
  assert.deepEqual(checkHomeMeta(home), { ok: true, missing: [] });
  assert.equal(checkClean(home), true);
});

test('checkHomeMeta reports a dropped #14 tag', () => {
  const result = checkHomeMeta(home.replace(/<meta property="og:locale"[^>]*>/, ''));
  assert.equal(result.ok, false);
  assert.match(result.missing.join(' '), /og:locale/);
});

test('checkClean rejects phone numbers and WoW mentions', () => {
  assert.equal(checkClean('<p>call 361-555-0100</p>'), false);
  assert.equal(checkClean('<a href="tel:+13615550100">x</a>'), false);
  assert.equal(checkClean('<p>back in Azeroth</p>'), false);
  assert.equal(checkClean('<p>plain copy</p>'), true);
});

test('checkSitemap and checkRedirect are exact', () => {
  assert.equal(checkSitemap('<url><loc>https://joshmccoy.dev/</loc><lastmod>2026-11-19</lastmod></url>'), true);
  assert.equal(checkSitemap('<urlset></urlset>'), false);
  assert.equal(checkRedirect(301, 'https://j0sh.wtf/case-studies/bot-team/'), true);
  assert.equal(checkRedirect(302, 'https://j0sh.wtf/case-studies/bot-team/'), false);
});

test('runChecks uses injected fetch and prints one line per check', async () => {
  const responses = [
    { status: 200, text: async () => home },
    { status: 200, text: async () => '<urlset><url><loc>https://joshmccoy.dev/</loc></url></urlset>' },
    { status: 301, headers: new Headers({ location: 'https://j0sh.wtf/case-studies/bot-team/' }) },
  ];
  const calls = [];
  const lines = [];
  const originalLog = console.log;
  console.log = (line) => lines.push(line);
  try {
    assert.equal(await runChecks('https://example.test/', async (...args) => { calls.push(args); return responses.shift(); }), true);
  } finally {
    console.log = originalLog;
  }
  assert.equal(calls.length, 3);
  assert.equal(calls[2][1].redirect, 'manual');
  assert.equal(lines.length, 5);
  assert.ok(lines.every((line) => line.startsWith('PASS')), lines.join('\n'));
});
