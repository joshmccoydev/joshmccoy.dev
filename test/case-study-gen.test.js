'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts', 'case-study-gen.js');
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z6WQAAAAASUVORK5CYII=';
const IMAGE_EXTENSIONS = ['.avif', '.png', '.webp'];
const FIXTURE_IMAGE_BASES = [
  'hero',
  'fig1-roles',
  'fig2-approval',
  'fig3-compute',
  'og',
];

function makeTempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `case-study-gen-${label}-`));
}

function runGenerator(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function generatorArgs({ copyPath, assetsPath, slug, root }) {
  return [
    '--copy',
    copyPath,
    '--assets',
    assetsPath,
    '--slug',
    slug,
    '--root',
    root,
  ];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertNothingWritten(root) {
  assert.equal(
    fs.existsSync(path.join(root, 'case-studies')),
    false,
    'Expected the failed generation to leave case-studies absent',
  );
}

function writeFixtureCopy(
  copyPath,
  { includeHeading = true, marker = null } = {},
) {
  const lines = [];

  if (includeHeading) {
    lines.push('## Case study', '');

    if (marker) {
      lines.push(marker, '');
    }
  }

  lines.push(
    '# synthetic case study',
    '',
    '## The problem',
    '',
    'a synthetic problem for generator verification.',
    '',
    '## What it does',
    '',
    'a synthetic description.',
    '',
    '## How it works',
    '',
    '1. **first step.** a synthetic step.',
    '',
    '## What it shows',
    '',
    'a synthetic result.',
    '',
    '## Want to run something like this?',
    '',
    '[Book a free 15-min call](https://cal.com/mccoybuilt/15min) or email me at [josh@mccoybuilt.com](mailto:josh@mccoybuilt.com)',
    '',
  );

  fs.writeFileSync(copyPath, lines.join('\n'), 'utf8');
}

function writeFixtureAssets(assetsPath, slug, { omit = null } = {}) {
  fs.mkdirSync(assetsPath, { recursive: true });

  for (const base of FIXTURE_IMAGE_BASES) {
    for (const extension of IMAGE_EXTENSIONS) {
      const filename = `${slug}-${base}${extension}`;

      if (filename === omit) {
        continue;
      }

      const contents =
        extension === '.png'
          ? Buffer.from(PNG_1X1_BASE64, 'base64')
          : Buffer.alloc(0);
      fs.writeFileSync(path.join(assetsPath, filename), contents);
    }
  }
}

function writeFixtureSitemap(root) {
  fs.writeFileSync(
    path.join(root, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      '  <url><loc>https://joshmccoy.dev/</loc></url>\n' +
      '</urlset>\n',
    'utf8',
  );
}

test('generated page styles CTA links and adds its canonical URL to sitemap', (t) => {
  const root = makeTempRoot('sitemap');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const copyPath = path.join(root, 'copy.md');
  const assetsPath = path.join(root, 'assets');
  const slug = 'fixture';

  writeFixtureCopy(copyPath);
  writeFixtureAssets(assetsPath, slug);
  writeFixtureSitemap(root);

  const result = runGenerator(
    [
      ...generatorArgs({ copyPath, assetsPath, slug, root }),
      '--sitemap',
      path.join(root, 'sitemap.xml'),
    ],
  );

  assert.equal(result.status, 0, result.stderr);
  const html = fs.readFileSync(
    path.join(root, 'case-studies', slug, 'index.html'),
    'utf8',
  );
  assert.match(html, /\.btn-primary\{/);
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.match(
    sitemap,
    /<url><loc>https:\/\/joshmccoy\.dev\/case-studies\/fixture\/<\/loc><\/url>/,
  );
  assert.doesNotMatch(sitemap, /<lastmod>/);
});

test('pending number marker stops generation without writing output', (t) => {
  const root = makeTempRoot('pending-marker');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const copyPath = path.join(root, 'copy.md');
  const assetsPath = path.join(root, 'assets');
  const slug = 'fixture';

  writeFixtureCopy(copyPath, { marker: '[needs Josh: number]' });
  writeFixtureAssets(assetsPath, slug);

  const result = runGenerator(
    generatorArgs({ copyPath, assetsPath, slug, root }),
  );

  assert.equal(result.status, 1, 'Expected invalid copy to exit with status 1');
  assert.match(result.stderr, /needs Josh/);
  assertNothingWritten(root);
});

test('missing og PNG is named and stops generation without writing output', (t) => {
  const root = makeTempRoot('missing-og');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const copyPath = path.join(root, 'copy.md');
  const assetsPath = path.join(root, 'assets');
  const slug = 'fixture';
  const missingFilename = `${slug}-og.png`;

  writeFixtureCopy(copyPath);
  writeFixtureAssets(assetsPath, slug, { omit: missingFilename });

  const result = runGenerator(
    generatorArgs({ copyPath, assetsPath, slug, root }),
  );

  assert.equal(
    result.status,
    1,
    'Expected missing OG artwork to exit with status 1',
  );
  assert.match(result.stderr, new RegExp(escapeRegex(missingFilename)));
  assertNothingWritten(root);
});

test('missing Case study heading exits with status 1', (t) => {
  const root = makeTempRoot('missing-heading');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const copyPath = path.join(root, 'copy.md');
  const assetsPath = path.join(root, 'assets');
  const slug = 'fixture';

  writeFixtureCopy(copyPath, { includeHeading: false });
  writeFixtureAssets(assetsPath, slug);

  const result = runGenerator(
    generatorArgs({ copyPath, assetsPath, slug, root }),
  );

  assert.equal(
    result.status,
    1,
    'Expected copy without a Case study heading to exit with status 1',
  );
});
