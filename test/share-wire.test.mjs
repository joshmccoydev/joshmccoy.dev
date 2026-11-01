import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardsFromPages } from '../scripts/share-cards.mjs';
import { planSync, syncPublic } from '../scripts/sync-public.mjs';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const PLANNED_FILES = [
  '404.html',
  '_headers',
  '_redirects',
  'case-studies/x/index.html',
  'fonts/a.woff2',
  'img/og/home.png',
  'index.html',
  'og.png',
  'robots.txt',
  'tokens.css',
];

const RULE_BASED_FILES = [
  'about.html',
  'apple-touch-icon.png',
  'case-studies/y/index.html',
  'favicon.ico',
  'favicon.svg',
  'fonts/OFL.txt',
  'fonts/geist.woff2',
  'icon-192.png',
  'img/case-studies/y/pic.png',
  'site.webmanifest',
  'sitemap.xml',
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function makeFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'share-wire-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeFixture(root, relativePath, contents = '') {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
  return absolutePath;
}

function listFiles(root) {
  const files = [];

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else {
        files.push(
          path.relative(root, absolutePath).split(path.sep).join('/'),
        );
      }
    }
  }

  if (fs.existsSync(root)) {
    walk(root);
  }

  return files.sort();
}

function parseAttributes(tag) {
  const attributes = {};
  const pattern =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = pattern.exec(tag)) !== null) {
    const name = match[1].toLowerCase();
    if (name !== 'meta') {
      attributes[name] = match[2] ?? match[3] ?? match[4] ?? '';
    }
  }

  return attributes;
}

function metaContents(html, attributeName, attributeValue) {
  const contents = [];

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    if (attributes[attributeName] === attributeValue) {
      contents.push(attributes.content);
    }
  }

  return contents;
}

function pagePathFor(root, slug) {
  if (slug === 'home') {
    return path.join(root, 'index.html');
  }

  return [
    path.join(root, slug, 'index.html'),
    path.join(root, `${slug}.html`),
  ].find((candidate) => fs.existsSync(candidate));
}

function makeSyncFixture(t) {
  const workspace = makeFixture(t);
  const root = path.join(workspace, 'root');
  const destination = path.join(workspace, 'destination');

  for (const relativePath of [
    'index.html',
    '404.html',
    '_headers',
    '_redirects',
    'robots.txt',
    'tokens.css',
    'og.png',
    'fonts/a.woff2',
    'img/og/home.png',
    'img/og/manifest.json',
    'case-studies/x/index.html',
    'scripts/s.mjs',
    'test/t.mjs',
    'README.md',
    'package.json',
    '.git/config',
    '.env',
  ]) {
    writeFixture(root, relativePath, `fixture:${relativePath}\n`);
  }

  return { root, destination };
}

test('every share card page and PNG uses its share-wire image', () => {
  for (const { slug } of cardsFromPages(REPO_ROOT)) {
    const pagePath = pagePathFor(REPO_ROOT, slug);
    assert.ok(pagePath, `Missing page for share card "${slug}"`);

    const html = fs.readFileSync(pagePath, 'utf8');
    const imageUrl = `https://joshmccoy.dev/img/og/${slug}.png`;
    assert.ok(
      metaContents(html, 'property', 'og:image').includes(imageUrl),
      `${path.relative(REPO_ROOT, pagePath)} must set og:image to ${imageUrl}`,
    );
    assert.ok(
      metaContents(html, 'name', 'twitter:image').includes(imageUrl),
      `${path.relative(REPO_ROOT, pagePath)} must set twitter:image to ${imageUrl}`,
    );

    const imagePath = path.join(REPO_ROOT, 'img', 'og', `${slug}.png`);
    assert.ok(
      fs.existsSync(imagePath),
      `Missing ${path.relative(REPO_ROOT, imagePath)}`,
    );
    assert.deepEqual(
      fs.readFileSync(imagePath).subarray(0, PNG_SIGNATURE.length),
      PNG_SIGNATURE,
      `${path.relative(REPO_ROOT, imagePath)} must be a PNG`,
    );
  }
});

test('planSync returns only the sorted public site allowlist', (t) => {
  const { root } = makeSyncFixture(t);

  assert.deepEqual(planSync(root), PLANNED_FILES);
});

test('planSync selects public files by rule for a differently named fixture', (t) => {
  const root = makeFixture(t);

  for (const relativePath of [
    'about.html',
    'favicon.ico',
    'favicon.svg',
    'apple-touch-icon.png',
    'icon-192.png',
    'site.webmanifest',
    'sitemap.xml',
    'fonts/geist.woff2',
    'fonts/OFL.txt',
    'img/case-studies/y/pic.png',
    'case-studies/y/index.html',
    'img/og/manifest.json',
    'scripts/a.js',
    'test/b.js',
    'NOTES.md',
    'package-lock.json',
    '.gitignore',
  ]) {
    writeFixture(root, relativePath, `fixture:${relativePath}\n`);
  }

  assert.deepEqual(planSync(root), RULE_BASED_FILES);
});

test('planSync selects public files from the real repository', () => {
  const plannedFiles = planSync(REPO_ROOT);

  for (const requiredPath of [
    'index.html',
    'img/og/home.png',
    'fonts/geist-latin-var.woff2',
    'favicon.svg',
    'site.webmanifest',
    'sitemap.xml',
  ]) {
    assert.ok(
      plannedFiles.includes(requiredPath),
      `planSync must include ${requiredPath}`,
    );
  }

  for (const relativePath of plannedFiles) {
    assert.ok(
      !relativePath.startsWith('scripts/'),
      `planSync must exclude ${relativePath}`,
    );
    assert.ok(
      !relativePath.startsWith('test/'),
      `planSync must exclude ${relativePath}`,
    );
    assert.ok(
      !relativePath.startsWith('.git'),
      `planSync must exclude ${relativePath}`,
    );
    assert.ok(
      !relativePath.endsWith('.md'),
      `planSync must exclude ${relativePath}`,
    );
    assert.notEqual(relativePath, 'img/og/manifest.json');
  }
});

test('syncPublic defaults to a dry run and applies without deleting extras', (t) => {
  const { root, destination } = makeSyncFixture(t);

  assert.deepEqual(syncPublic(root, destination), {
    files: PLANNED_FILES,
    applied: false,
  });
  assert.deepEqual(listFiles(destination), []);

  writeFixture(destination, 'keep.txt', 'pre-existing\n');
  assert.deepEqual(syncPublic(root, destination, { apply: true }), {
    applied: true,
  });
  assert.deepEqual(
    listFiles(destination),
    [...PLANNED_FILES, 'keep.txt'].sort(),
  );

  for (const relativePath of PLANNED_FILES) {
    assert.deepEqual(
      fs.readFileSync(path.join(destination, relativePath)),
      fs.readFileSync(path.join(root, relativePath)),
      `${relativePath} must be copied byte-for-byte`,
    );
  }
  assert.equal(
    fs.readFileSync(path.join(destination, 'keep.txt'), 'utf8'),
    'pre-existing\n',
  );
});

test('syncPublic without options returns the plan without applying it', (t) => {
  const { root, destination } = makeSyncFixture(t);
  const plannedFiles = planSync(root);

  assert.deepEqual(syncPublic(root, destination), {
    files: plannedFiles,
    applied: false,
  });
  assert.deepEqual(listFiles(destination), []);
});
