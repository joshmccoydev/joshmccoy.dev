'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { planSync } = require('../scripts/sync-public.mjs');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(abs, out);
    else if (entry.name.endsWith('.html')) {
      out.push(path.relative(root, abs).split(path.sep).join('/'));
    }
  }
  return out;
}

function isRedirected(rel) {
  return rel === 'case-studies/bot-team/index.html';
}

function canonicalOf(html) {
  const link = html.match(/<link\b[^>]*rel="canonical"[^>]*>/i);
  if (!link) return null;
  const href = link[0].match(/\bhref="([^"]+)"/i);
  return href ? href[1] : null;
}

function lin(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const left = luminance(a);
  const right = luminance(b);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

test('sitemap lists every indexable page and skips the redirected study', () => {
  const sitemap = read('sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(locs.length > 1, 'sitemap should list the new pages');
  assert.ok(!locs.some((loc) => loc.includes('case-studies')));
  assert.equal((sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) ?? []).length, locs.length);

  const expected = walkHtml(root)
    .filter((rel) => !isRedirected(rel) && path.basename(rel) !== '404.html')
    .map((rel) => canonicalOf(read(rel)))
    .sort();

  assert.deepEqual([...locs].sort(), expected);
});

test('homepage JSON-LD matches the public facts and skips a headcount', () => {
  const html = read('index.html');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1);
  const graph = JSON.parse(blocks[0][1]);
  const types = graph['@graph'].map((node) => node['@type']);
  assert.deepEqual(types.sort(), ['ItemList', 'Organization', 'Person', 'ProfilePage', 'WebSite'].sort());

  const person = graph['@graph'].find((node) => node['@type'] === 'Person');
  const org = graph['@graph'].find((node) => node['@type'] === 'Organization');
  assert.equal(person.homeLocation.name, 'Coastal Bend, Texas');
  assert.equal(org.name, 'McCoy Built AI Solutions');
  assert.equal(JSON.stringify(graph).includes('telephone'), false);
  assert.doesNotMatch(
    JSON.stringify(graph),
    /\b(8|10|11|15|20)\s+(ai\s+)?(agents|assistants|bots|lanes)\b/i,
  );
  assert.doesNotMatch(JSON.stringify(graph), /Corpus Christi/i);

  const urls = graph['@graph']
    .find((node) => node['@type'] === 'ItemList')
    .itemListElement.map((item) => item.url);
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  for (const url of urls) assert.ok(locs.includes(url), url);
});

test('public copy keeps the offer and does not publish a bot count or private details', () => {
  const pages = walkHtml(root).filter((rel) => !isRedirected(rel));
  const corpus = pages.map((rel) => read(rel)).join('\n');
  const home = read('index.html');

  assert.match(home, /2004/);
  assert.match(home, /45-minute/);
  assert.match(home, /direct line/);
  assert.match(home, /does not sell websites/);
  assert.match(home, /Coastal Bend/);
  assert.doesNotMatch(home, /\b(8|10|11|15|20)\s+(ai\s+)?(agents|assistants|bots|lanes)\b/i);
  assert.doesNotMatch(home, /alfred|don-draper|hemingway|banksy|post-malone|dr-eggbot/i);
  assert.doesNotMatch(corpus, /Corpus Christi/i);
  assert.doesNotMatch(corpus, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/);
  assert.doesNotMatch(home, /github\.com\/joshmccoydev\/life-dashboard/);
});

test('pages stay zero-JS under the existing CSP', () => {
  const headers = read('_headers');
  assert.match(headers, /script-src 'none'/);
  assert.match(headers, /form-action 'none'/);
  assert.doesNotMatch(headers, /script-src [^;\n]*unsafe-inline/);

  for (const rel of walkHtml(root)) {
    const html = read(rel);
    const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
    for (const script of scripts) {
      assert.match(script, /type="application\/ld\+json"/, rel);
    }
    assert.doesNotMatch(html, /\son[a-z]+=/i, rel);
  }
});

test('published images are referenced by a page that is actually served', () => {
  assert.equal(fs.existsSync(path.join(root, 'og.png')), false);
  const planned = planSync(root);
  assert.ok(planned.includes('site.css'));
  assert.ok(planned.includes('work/index.html'));
  assert.ok(planned.includes('log/index.html'));
  assert.ok(!planned.includes('og.png'));
  assert.ok(!planned.some((file) => file.startsWith('scripts/')));

  const corpus = [
    ...walkHtml(root).filter((rel) => !isRedirected(rel)).map((rel) => read(rel)),
    read('site.webmanifest'),
    read('site.css'),
    read('tokens.css'),
  ].join('\n');

  const images = planned.filter((file) => /\.(png|webp|avif|svg|ico)$/.test(file));
  assert.ok(images.some((file) => file.includes('bot-team-hero')));
  for (const image of images) {
    assert.ok(corpus.includes(`/${image}`) || corpus.includes(image), `${image} is published but unused`);
  }
});

test('theme tokens cover light and dark, with enough contrast', () => {
  const css = read('tokens.css');
  assert.match(css, /prefers-color-scheme:\s*light/);
  assert.match(css, /#theme-light:checked/);
  assert.match(css, /#theme-dark:checked/);

  const pairs = [
    ['#f4efe6', '#14120e'],
    ['#b3a898', '#14120e'],
    ['#1a100c', '#ff8a4c'],
    ['#1a1714', '#f6f1e7'],
    ['#655e52', '#f6f1e7'],
    ['#fff8f3', '#b84312'],
  ];
  for (const [fg, bg] of pairs) {
    assert.ok(contrast(fg, bg) >= 4.5, `${fg} on ${bg}`);
  }
});
