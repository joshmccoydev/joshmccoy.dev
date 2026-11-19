import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRedirect, checkSitemap, checkWebsite, runChecks } from '../scripts/check-live.mjs';

test('checkWebsite requires the WebSite JSON-LD type', () => {
  assert.equal(checkWebsite('{"@type":"WebSite"}'), true);
  assert.equal(checkWebsite('{"@type": "WebSite"}'), true);
  assert.equal(checkWebsite('{"@type":"Person"}'), false);
});

test('checkSitemap requires the homepage URL', () => {
  assert.equal(checkSitemap('<url><loc>https://joshmccoy.dev/</loc><lastmod>2026-11-19</lastmod></url>'), true);
  assert.equal(checkSitemap('<urlset></urlset>'), false);
});

test('checkRedirect requires the exact permanent redirect', () => {
  assert.equal(checkRedirect(301, 'https://j0sh.wtf/case-studies/bot-team/'), true);
  assert.equal(checkRedirect(302, 'https://j0sh.wtf/case-studies/bot-team/'), false);
});

test('runChecks uses injected fetch responses and reports each result', async () => {
  const responses = [
    { status: 200, text: async () => '{"@type":"WebSite"}' },
    { status: 200, text: async () => '<urlset><url><loc>https://joshmccoy.dev/</loc></url></urlset>' },
    { status: 301, headers: new Headers({ location: 'https://j0sh.wtf/case-studies/bot-team/' }) },
  ];
  const calls = [];
  const lines = [];
  const originalLog = console.log;
  console.log = (line) => lines.push(line);
  try {
    const result = await runChecks('https://example.test/', async (...args) => {
      calls.push(args);
      return responses.shift();
    });
    assert.equal(result, true);
  } finally {
    console.log = originalLog;
  }
  assert.equal(calls.length, 3);
  assert.equal(calls[2][1].redirect, 'manual');
  assert.equal(lines.length, 3);
  assert.ok(lines.every((line) => line.startsWith('PASS')));
});
