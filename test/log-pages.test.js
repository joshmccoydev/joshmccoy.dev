'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'render-log.mjs');

const banned = [
  /azeroth/i,
  /\bwow\b/i,
  /postiz/i,
  /every tuesday/i,
  /0\s*kb/i,
  /launching/i,
  /voxer/i,
  /tel:/i,
  /\bphone\b/i,
  /alfred/i,
  /don-draper/i,
  /hemingway/i,
  /banksy/i,
  /dr-eggbot/i,
];

test('generated log pages and sitemap match data/log.json', () => {
  const result = spawnSync(process.execPath, [script, '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const pages = [
    'log/index.html',
    'log/one-job-each/index.html',
    'sitemap.xml',
  ].map((file) => fs.readFileSync(path.join(root, file), 'utf8'));

  assert.match(pages[0], /October 26, 2026/);
  assert.match(pages[0], /href="\/log\/one-job-each\/"/);
  assert.match(pages[1], /older assistant names were retired/);
  assert.match(pages[1], /https:\/\/j0sh\.wtf\/case-studies\/bot-team\//);
  assert.match(pages[2], /<loc>https:\/\/joshmccoy\.dev\/log\/<\/loc>/);
  assert.match(pages[2], /<loc>https:\/\/joshmccoy\.dev\/log\/one-job-each\/<\/loc>/);
  assert.doesNotMatch(pages[2], /<lastmod\b/i);
  assert.doesNotMatch(pages[2], /case-studies\//i);

  for (const html of pages.slice(0, 2)) {
    assert.equal([...html.matchAll(/<h1\b/gi)].length, 1);
    const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
    assert.ok(description.length >= 50 && description.length <= 160, description);
    for (const pattern of banned) {
      assert.doesNotMatch(html, pattern);
    }
  }
});
