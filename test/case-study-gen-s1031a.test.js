'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts', 'case-study-gen.js');
const copyPath = path.join(
  repoRoot,
  'test',
  'fixtures',
  'case-study-sample',
  'copy.md',
);
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z6WQAAAAASUVORK5CYII=';
const IMAGE_BASES = [
  'hero',
  'fig1-roles',
  'fig2-approval',
  'fig3-compute',
  'og',
];
const IMAGE_EXTENSIONS = ['.avif', '.png', '.webp'];
const FORBIDDEN_SOURCE_PATH = path.posix.join('/', 'workspace', 'design');

function makeFixture(t, slug) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), `case-study-gen-s1031a-${slug}-`),
  );
  const assetsPath = path.join(root, 'assets');
  const outputRoot = path.join(root, 'output');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(assetsPath, { recursive: true });
  const png = Buffer.from(PNG_1X1_BASE64, 'base64');
  for (const base of IMAGE_BASES) {
    for (const extension of IMAGE_EXTENSIONS) {
      fs.writeFileSync(
        path.join(assetsPath, `${slug}-${base}${extension}`),
        png,
      );
    }
  }

  return { assetsPath, outputRoot };
}

function runGenerator(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function generatorArgs({ assetsPath, outputRoot, slug, site }) {
  const args = [
    '--copy',
    copyPath,
    '--assets',
    assetsPath,
    '--slug',
    slug,
    '--root',
    outputRoot,
  ];
  if (site) {
    args.push('--site', site);
  }
  return args;
}

function assertSuccessful(result, context) {
  assert.equal(
    result.status,
    0,
    `${context} failed with status ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
}

function readGeneratedHtml(outputRoot, slug) {
  return fs.readFileSync(
    path.join(outputRoot, 'case-studies', slug, 'index.html'),
    'utf8',
  );
}

function getMetaContent(html, key) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = metaTags.find(
    (candidate) =>
      candidate.includes(`name="${key}"`) ||
      candidate.includes(`property="${key}"`),
  );
  assert.ok(tag, `Expected a meta tag for ${key}`);

  const content = tag.match(/\bcontent="([^"]*)"/i);
  assert.ok(content, `Expected content on the meta tag for ${key}`);
  return content[1];
}

function getCanonical(html) {
  const link = html.match(/<link\b[^>]*\brel="canonical"[^>]*>/i);
  assert.ok(link, 'Expected a canonical link');

  const href = link[0].match(/\bhref="([^"]*)"/i);
  assert.ok(href, 'Expected an href on the canonical link');
  return href[1];
}

test('bot-team generation fails with the real social handle', (t) => {
  const fixture = makeFixture(t, 'bot-team');
  const result = runGenerator(
    generatorArgs({
      ...fixture,
      slug: 'bot-team',
    }),
  );

  assert.notEqual(
    result.status,
    0,
    `Expected bot-team generation to fail\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stderr, /j0sh\.wtf/);
});

test('sample-shop omits legacy Twitter metadata and uses its exact description', (t) => {
  const fixture = makeFixture(t, 'sample-shop');
  const result = runGenerator(
    generatorArgs({
      ...fixture,
      slug: 'sample-shop',
    }),
  );
  assertSuccessful(result, 'sample-shop generation');

  const html = readGeneratedHtml(fixture.outputRoot, 'sample-shop');
  assert.doesNotMatch(html, /twitter:site/i);
  assert.doesNotMatch(html, /@j0shdotwtf/i);
  assert.equal(
    getMetaContent(html, 'description'),
    'Sample Shop Refresh. a case study by Josh McCoy.',
  );
});

test('--site controls the canonical URL and social image URL', (t) => {
  const fixture = makeFixture(t, 'sample-shop');
  const result = runGenerator(
    generatorArgs({
      ...fixture,
      site: 'https://example.test',
      slug: 'sample-shop',
    }),
  );
  assertSuccessful(result, 'sample-shop generation with --site');

  const html = readGeneratedHtml(fixture.outputRoot, 'sample-shop');
  assert.equal(
    getCanonical(html),
    'https://example.test/case-studies/sample-shop/',
  );
  assert.ok(
    getMetaContent(html, 'og:image').startsWith('https://example.test/'),
  );
});

test('canonical URL defaults to joshmccoy.dev without --site', (t) => {
  const fixture = makeFixture(t, 'sample-shop');
  const result = runGenerator(
    generatorArgs({
      ...fixture,
      slug: 'sample-shop',
    }),
  );
  assertSuccessful(result, 'sample-shop generation without --site');

  const html = readGeneratedHtml(fixture.outputRoot, 'sample-shop');
  assert.equal(
    getCanonical(html),
    'https://joshmccoy.dev/case-studies/sample-shop/',
  );
});

test('test source and sample fixture avoid the design workspace path', () => {
  for (const sourcePath of [__filename, copyPath]) {
    const source = fs.readFileSync(sourcePath, 'utf8');
    assert.equal(
      source.includes(FORBIDDEN_SOURCE_PATH),
      false,
      `${sourcePath} must not reference the design workspace path`,
    );
  }
});
