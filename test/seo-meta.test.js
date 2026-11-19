'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? null) : null;
}

function meta(html, key) {
  return tags(html, 'meta').find((tag) => attr(tag, 'name') === key || attr(tag, 'property') === key);
}

function content(html, key) {
  const tag = meta(html, key);
  assert.ok(tag, `Expected ${key} metadata`);
  return attr(tag, 'content');
}

test('homepage metadata and structured data meet SEO requirements', () => {
  const titles = [...index.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  assert.equal(titles.length, 1);
  const title = titles[0][1].trim();
  assert.ok(title.length < 60);

  const description = content(index, 'description');
  assert.ok(description.length >= 50 && description.length <= 160);
  const canonical = tags(index, 'link').find((tag) => attr(tag, 'rel') === 'canonical');
  assert.ok(canonical);
  assert.equal(attr(canonical, 'href'), 'https://joshmccoy.dev/');

  for (const key of ['og:title', 'og:description', 'og:image', 'og:url']) assert.ok(meta(index, key), `Expected ${key}`);
  assert.equal(content(index, 'twitter:card'), 'summary_large_image');
  assert.equal(content(index, 'twitter:title'), content(index, 'og:title'));
  assert.equal(content(index, 'twitter:description'), content(index, 'og:description'));
  assert.equal(content(index, 'twitter:image:alt'), content(index, 'og:image:alt'));
  assert.equal(content(index, 'og:locale'), 'en_US');
  const robots = content(index, 'robots');
  assert.match(robots, /\bindex\b/);
  assert.match(robots, /max-image-preview:large/);

  const blocks = [...index.matchAll(/<script\b(?=[^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(blocks.length > 0);
  const types = blocks.map(([, json]) => JSON.parse(json)['@type']);
  for (const expected of ['Person', 'WebSite', 'ProfilePage']) assert.ok(types.includes(expected), `Expected ${expected} JSON-LD`);

  assert.equal([...index.matchAll(/<h1\b/gi)].length, 1);
  for (const image of tags(index, 'img')) {
    for (const dimension of ['width', 'height']) assert.ok(attr(image, dimension), `Image missing ${dimension}: ${image}`);
    assert.ok(attr(image, 'alt')?.trim(), `Image missing non-empty alt: ${image}`);
  }
});

test('sitemap and robots directives remain correct', () => {
  const sitemap = read('sitemap.xml');
  assert.doesNotMatch(sitemap, /<lastmod\b/i);
  assert.doesNotMatch(sitemap, /case-studies\//i);
  assert.match(read('robots.txt'), /^Sitemap: https:\/\/joshmccoy\.dev\/sitemap\.xml$/m);
});

test('bot-team case study remains noindex and canonicalized to j0sh.wtf', () => {
  const html = read('case-studies/bot-team/index.html');
  assert.match(html, /<meta\s+name="robots"\s+content="[^\"]*noindex/i);
  assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/j0sh\.wtf\/case-studies\/bot-team\/"/i);
});
