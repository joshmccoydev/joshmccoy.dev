'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts', 'case-study-gen.js');
const referencePagePath = path.join(
  repoRoot,
  'case-studies',
  'bot-team',
  'index.html',
);
const botTeamCopyPath =
  '/workspace/cto/evidence/CASESTUDY-2026-10-30/voice/copy.md';
const botTeamAssetsPath = '/workspace/design/case-studies/2026-10-30/out';
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

function findTags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map(
    (match) => match[0],
  );
}

function getAttribute(tag, attributeName) {
  const match = tag.match(
    new RegExp(
      `\\b${escapeRegex(attributeName)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      'i',
    ),
  );

  return match ? (match[1] ?? match[2] ?? match[3] ?? null) : null;
}

function normalizeText(markup) {
  return markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getElementTexts(html, tagName) {
  return [
    ...html.matchAll(
      new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi'),
    ),
  ].map((match) => normalizeText(match[1]));
}

function getHeadingDetails(html, tagName) {
  return [
    ...html.matchAll(
      new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi'),
    ),
  ].map((match) => ({
    id: getAttribute(match[1], 'id'),
    text: normalizeText(match[2]),
  }));
}

function getMetaContent(html, key) {
  const meta = findTags(html, 'meta').find(
    (tag) =>
      getAttribute(tag, 'name') === key ||
      getAttribute(tag, 'property') === key,
  );

  assert.ok(meta, `Expected a meta tag for ${key}`);
  return getAttribute(meta, 'content');
}

function getAnchors(html) {
  return [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((match) => {
    const openingTag = match[0].slice(0, match[0].indexOf('>') + 1);

    return {
      href: getAttribute(openingTag, 'href'),
      className: getAttribute(openingTag, 'class') ?? '',
    };
  });
}

function assertSuccessful(result, context) {
  assert.equal(
    result.status,
    0,
    `${context} failed with status ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
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

test(
  'bot-team copy renders the existing page structure and all source images',
  {
    skip:
      !fs.existsSync(botTeamCopyPath) || !fs.existsSync(botTeamAssetsPath)
        ? 'bot-team source inputs are unavailable'
        : false,
  },
  (t) => {
    const root = makeTempRoot('bot-team');
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    const result = runGenerator(
      generatorArgs({
        copyPath: botTeamCopyPath,
        assetsPath: botTeamAssetsPath,
        slug: 'bot-team',
        root,
      }),
    );
    assertSuccessful(result, 'bot-team generation');

    const generatedPagePath = path.join(
      root,
      'case-studies',
      'bot-team',
      'index.html',
    );
    assert.ok(
      fs.existsSync(generatedPagePath),
      `Expected generated page at ${generatedPagePath}`,
    );

    const generated = fs.readFileSync(generatedPagePath, 'utf8');
    const reference = fs.readFileSync(referencePagePath, 'utf8');

    assert.deepEqual(
      getElementTexts(generated, 'title'),
      getElementTexts(reference, 'title'),
      'Expected title text to match the existing page',
    );

    for (const metaKey of ['description', 'og:url', 'og:image']) {
      assert.equal(
        getMetaContent(generated, metaKey),
        getMetaContent(reference, metaKey),
        `Expected ${metaKey} to match the existing page`,
      );
    }

    const generatedH1s = getElementTexts(generated, 'h1');
    assert.equal(generatedH1s.length, 1, 'Expected exactly one H1');
    assert.deepEqual(
      generatedH1s,
      getElementTexts(reference, 'h1'),
      'Expected H1 text to match the existing page',
    );
    assert.deepEqual(
      getHeadingDetails(generated, 'h2'),
      getHeadingDetails(reference, 'h2'),
      'Expected ordered H2 ids and text to match the existing page',
    );

    assert.equal(
      findTags(generated, 'figure').length,
      findTags(reference, 'figure').length,
      'Expected figure count to match the existing page',
    );
    assert.equal(
      findTags(generated, 'picture').length,
      findTags(reference, 'picture').length,
      'Expected picture count to match the existing page',
    );

    const generatedImages = findTags(generated, 'img');
    const referenceImages = findTags(reference, 'img');
    assert.deepEqual(
      generatedImages.map((tag) => getAttribute(tag, 'src')),
      referenceImages.map((tag) => getAttribute(tag, 'src')),
      'Expected img src order to match the existing page',
    );
    referenceImages.forEach((referenceImage, index) => {
      assert.equal(
        getAttribute(generatedImages[index], 'width'),
        getAttribute(referenceImage, 'width'),
        `Expected img ${index + 1} width to match the existing page`,
      );
      assert.equal(
        getAttribute(generatedImages[index], 'height'),
        getAttribute(referenceImage, 'height'),
        `Expected img ${index + 1} height to match the existing page`,
      );
    });

    const anchors = getAnchors(generated);
    assert.ok(
      anchors.some(
        (anchor) =>
          anchor.href === 'https://cal.com/mccoybuilt/15min' &&
          anchor.className.split(/\s+/).includes('btn-primary'),
      ),
      'Expected the cal.com btn-primary link',
    );
    assert.ok(
      anchors.some(
        (anchor) => anchor.href === 'mailto:josh@mccoybuilt.com',
      ),
      'Expected the josh@mccoybuilt.com mailto link',
    );
    assert.doesNotMatch(generated, /\[needs Josh/);

    const sourceImages = fs
      .readdirSync(botTeamAssetsPath)
      .filter(
        (filename) =>
          filename.startsWith('bot-team-') &&
          IMAGE_EXTENSIONS.includes(path.extname(filename)),
      )
      .sort();
    assert.equal(sourceImages.length, 15, 'Expected 15 bot-team image files');

    const outputImageDir = path.join(
      root,
      'img',
      'case-studies',
      'bot-team',
    );
    for (const filename of sourceImages) {
      const generatedImagePath = path.join(outputImageDir, filename);
      assert.ok(
        fs.existsSync(generatedImagePath),
        `Expected generated image ${filename}`,
      );
      assert.equal(
        fs.statSync(generatedImagePath).size,
        fs.statSync(path.join(botTeamAssetsPath, filename)).size,
        `Expected ${filename} byte size to match its source`,
      );
    }
  },
);

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
