'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test') {
        continue;
      }
      walk(absolutePath, files);
    } else {
      files.push(absolutePath);
    }
  }
  return files;
}

test('homepage does not publish a bot headcount', () => {
  const html = read('index.html');

  assert.match(html, /Headcount is unpublished/);
  assert.match(html, /used to say 11 assistants/);
  assert.match(html, /case study says 15/);
  assert.doesNotMatch(html, /Eleven AI agents/);
  assert.doesNotMatch(html, /<dd>\s*11\s*<\/dd>/);
  assert.doesNotMatch(html, />\s*15\s+assistants/);
});

test('homepage keeps the published offer and states what McCoy Built does not sell', () => {
  const html = read('index.html');

  assert.match(html, /Two 45-minute calls a month, plus a direct line/);
  assert.match(html, /McCoy Built does not sell websites/);
  assert.match(html, /from \$1,000\/mo/);
  assert.match(html, /from ~\$2,000/);
  assert.match(html, /from \$5,000/);
  assert.match(html, /https:\/\/cal\.com\/mccoybuilt\/15min/);
  assert.match(html, /mailto:josh@mccoybuilt\.com/);
});

test('public pages do not name Corpus Christi or print a phone number', () => {
  const pages = walk(root).filter((file) => file.endsWith('.html'));

  assert.ok(pages.length >= 3);
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    assert.doesNotMatch(html, /Corpus Christi/i, page);
    assert.doesNotMatch(html, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, page);
  }
});

test('layout guards keep the page inside the viewport', () => {
  const home = read('index.html');
  const tokens = read('tokens.css');
  const caseStudy = read('case-studies/bot-team/index.html');

  assert.match(tokens, /overflow-x:clip/);
  assert.match(tokens, /light-dark\(/);
  assert.match(home, /flex-wrap:wrap/);
  assert.match(home, /minmax\(0,/);
  assert.doesNotMatch(home, /white-space:\s*nowrap/);
  assert.doesNotMatch(caseStudy, /margin-left:calc\(var\(--s-6\) \* -1\)/);
  assert.match(read('404.html'), /max-width:40ch/);
  assert.match(read('404.html'), /min-width:0/);
});

test('security headers stay strict and the canonical case study host is j0sh.wtf', () => {
  const headers = read('_headers');
  const caseStudy = read('case-studies/bot-team/index.html');

  assert.match(headers, /script-src 'none'/);
  assert.match(headers, /connect-src 'none'/);
  assert.match(headers, /frame-src 'none'/);
  assert.match(headers, /form-action 'none'/);
  assert.match(
    caseStudy,
    /<link rel="canonical" href="https:\/\/j0sh\.wtf\/case-studies\/bot-team\/">/,
  );
});

test('every shipped raster is referenced, including no leftover root og image', () => {
  assert.equal(fs.existsSync(path.join(root, 'og.png')), false);

  const text = walk(root)
    .filter((file) => /\.(html|css|js|mjs|json|xml|webmanifest|svg|txt)$/.test(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const images = walk(root).filter((file) =>
    /\.(png|webp|avif|ico|svg)$/.test(file),
  );

  assert.ok(images.length > 0);
  for (const image of images) {
    const name = path.basename(image);
    assert.ok(text.includes(name), `Unreferenced image: ${name}`);
  }
});
