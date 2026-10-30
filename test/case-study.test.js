'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const pagePath = path.join(repoRoot, 'case-studies', 'bot-team', 'index.html');
const pageExists = fs.existsSync(pagePath);

function readPage() {
  assert.ok(pageExists, `Expected case study page at ${pagePath}`);
  return fs.readFileSync(pagePath, 'utf8');
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

function headingMatches(html, tagName) {
  return [
    ...html.matchAll(
      new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi'),
    ),
  ];
}

function findMeta(html, key) {
  return findTags(html, 'meta').find(
    (tag) => getAttribute(tag, 'property') === key || getAttribute(tag, 'name') === key,
  );
}

function findLinkByRel(html, rel) {
  return findTags(html, 'link').find((tag) => {
    const relValue = getAttribute(tag, 'rel');
    return relValue?.toLowerCase().split(/\s+/).includes(rel);
  });
}

function pictureStartIndex(html, pictures, imageName) {
  const index = pictures.findIndex((picture) => picture.includes(imageName));
  assert.notEqual(index, -1, `Expected a picture for ${imageName}`);

  const start = html.indexOf(pictures[index]);
  assert.notEqual(start, -1, `Expected ${imageName} in the page source`);
  return start;
}

test('case study page exists', () => {
  assert.ok(pageExists, `Expected ${pagePath} to exist`);
});

test('headings and pending-review markers are correct', { skip: !pageExists }, () => {
  const html = readPage();
  const h1s = headingMatches(html, 'h1').map((match) =>
    normalizeText(match[1]),
  );
  const h2s = headingMatches(html, 'h2').map((match) =>
    normalizeText(match[1]),
  );

  assert.deepEqual(h1s, ['I run my own work with a team of 15 AI assistants']);
  assert.deepEqual(h2s, [
    'The problem',
    'What it does',
    'How it works',
    'What it shows',
    'Want to run something like this?',
  ]);
  assert.equal((html.match(/\[needs Josh:/g) ?? []).length, 3);
});

test('social metadata and canonical URL are correct', { skip: !pageExists }, () => {
  const html = readPage();
  const imageUrl =
    'https://joshmccoy.dev/img/case-studies/bot-team/bot-team-og.png';

  assert.equal(getAttribute(findMeta(html, 'og:image') ?? '', 'content'), imageUrl);
  assert.equal(
    getAttribute(findMeta(html, 'twitter:image') ?? '', 'content'),
    imageUrl,
  );
  assert.equal(
    getAttribute(findMeta(html, 'og:image:width') ?? '', 'content'),
    '1200',
  );
  assert.equal(
    getAttribute(findMeta(html, 'og:image:height') ?? '', 'content'),
    '630',
  );
  assert.equal(
    getAttribute(findLinkByRel(html, 'canonical') ?? '', 'href'),
    'https://joshmccoy.dev/case-studies/bot-team/',
  );
});

test('page links to the shared token stylesheet', { skip: !pageExists }, () => {
  const html = readPage();

  assert.ok(
    findTags(html, 'link').some(
      (tag) => getAttribute(tag, 'href') === '/tokens.css',
    ),
  );
});

test('pictures use the required formats and fallbacks in order', { skip: !pageExists }, () => {
  const html = readPage();
  const pictures = [
    ...html.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi),
  ].map((match) => match[0]);
  const expectedImages = [
    'bot-team-hero',
    'bot-team-fig1-roles',
    'bot-team-fig2-approval',
    'bot-team-fig3-compute',
  ];

  assert.equal(pictures.length, 4);

  pictures.forEach((picture, index) => {
    const parts = [
      ...picture.matchAll(/<(source|img)\b[^>]*>/gi),
    ].map((match) => ({ name: match[1].toLowerCase(), tag: match[0] }));

    assert.deepEqual(
      parts.map((part) => part.name),
      ['source', 'source', 'img'],
    );
    assert.equal(getAttribute(parts[0].tag, 'type'), 'image/avif');
    assert.equal(getAttribute(parts[1].tag, 'type'), 'image/webp');

    const src = getAttribute(parts[2].tag, 'src');
    assert.ok(src, `Expected ${expectedImages[index]} to use an img src`);
    assert.match(
      src,
      new RegExp(`(?:^|/)${escapeRegex(expectedImages[index])}\\.png(?:[?#].*)?$`),
    );
  });
});

test('all images have dimensions, alt text, and loading behavior', { skip: !pageExists }, () => {
  const html = readPage();
  const images = findTags(html, 'img');
  const expectedImages = [
    { name: 'bot-team-hero', width: '1600', height: '900' },
    { name: 'fig1-roles', width: '1600', height: '640' },
    { name: 'fig2-approval', width: '1600', height: '560' },
    { name: 'fig3-compute', width: '1600', height: '620' },
  ];

  assert.equal(images.length, 4);

  images.forEach((image) => {
    const width = getAttribute(image, 'width');
    const height = getAttribute(image, 'height');
    const alt = getAttribute(image, 'alt');

    assert.match(width ?? '', /^\d+$/, `Expected numeric img width in ${image}`);
    assert.match(height ?? '', /^\d+$/, `Expected numeric img height in ${image}`);
    assert.ok(alt?.trim(), `Expected non-empty img alt in ${image}`);
  });

  expectedImages.forEach(({ name, width, height }, index) => {
    const image = images[index];
    const src = getAttribute(image, 'src') ?? '';

    assert.ok(src.includes(name), `Expected image ${index} to be ${name}`);
    assert.equal(getAttribute(image, 'width'), width);
    assert.equal(getAttribute(image, 'height'), height);

    if (index === 0) {
      assert.equal(getAttribute(image, 'loading'), 'eager');
      assert.equal(getAttribute(image, 'fetchpriority'), 'high');
    } else {
      assert.equal(getAttribute(image, 'loading'), 'lazy');
      assert.equal(getAttribute(image, 'decoding'), 'async');
    }
  });
});

test('figures appear in the required narrative order', { skip: !pageExists }, () => {
  const html = readPage();
  const pictures = [
    ...html.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi),
  ].map((match) => match[0]);
  const fig1Index = pictureStartIndex(html, pictures, 'fig1-roles');
  const fig2Index = pictureStartIndex(html, pictures, 'fig2-approval');
  const fig3Index = pictureStartIndex(html, pictures, 'fig3-compute');
  const draftsIndex = html.indexOf('Drafts, then my yes');
  const cheapestIndex = html.indexOf('Cheapest tool that works');
  const howItWorks = headingMatches(html, 'h2').find(
    (match) => normalizeText(match[1]) === 'How it works',
  );

  assert.notEqual(draftsIndex, -1);
  assert.notEqual(cheapestIndex, -1);
  assert.ok(howItWorks);
  assert.ok(fig1Index < howItWorks.index);
  assert.ok(draftsIndex < fig2Index);
  assert.ok(fig2Index < cheapestIndex);
  assert.ok(cheapestIndex < fig3Index);
});

test('page avoids prohibited pricing and contact content', { skip: !pageExists }, () => {
  const html = readPage();

  assert.doesNotMatch(html, /\$\s*\d/);
  assert.doesNotMatch(html, /\d{3}[-. ]\d{3}[-. ]\d{4}/);
  assert.doesNotMatch(html, /\bdone(?:-|\s+)for(?:-|\s+)you\b/i);
});

test('every referenced image file exists', { skip: !pageExists }, () => {
  const html = readPage();
  const references = [
    ...new Set(
      [...html.matchAll(/\/img\/[^\s"'<>),]+/g)].map((match) =>
        match[0].replace(/[.;]+$/, '').split(/[?#]/)[0],
      ),
    ),
  ];

  assert.ok(references.length > 0, 'Expected at least one referenced image');

  references.forEach((reference) => {
    const localPath = path.resolve(repoRoot, reference.replace(/^\/+/, ''));
    assert.ok(fs.existsSync(localPath), `Missing referenced image: ${reference}`);
  });
});
