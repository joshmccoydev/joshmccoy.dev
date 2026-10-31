import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  SITE,
  slugFor,
  cardsFromPages,
  cardHtml,
  cacheKey,
  renderCards,
} from '../scripts/share-cards.mjs';

function makeFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'share-cards-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeFixture(root, relPath, contents) {
  const file = path.join(root, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  return file;
}

function page(title, { ogTitle } = {}) {
  const metadata = ogTitle
    ? `<meta property="og:title" content="${ogTitle}">`
    : '';
  return `<!doctype html><html><head>${metadata}<title>${title}</title></head><body></body></html>`;
}

test('SITE is the joshmccoy.dev website id', () => {
  assert.equal(SITE, 'joshmccoy.dev');
});

test('slugFor produces site-relative lowercase kebab-case slugs', () => {
  assert.equal(slugFor('index.html'), 'home');
  assert.equal(
    slugFor('case-studies/bot-team/index.html'),
    'case-studies-bot-team',
  );
  assert.equal(slugFor('about.html'), 'about');
});

test('cardsFromPages extracts, normalizes, and sorts page cards', (t) => {
  const root = makeFixture(t);
  writeFixture(
    root,
    'index.html',
    page('Home | joshmccoy.dev'),
  );
  writeFixture(
    root,
    'case-studies/bot-team/index.html',
    page('Fallback title', {
      ogTitle: 'Bot Team - Approval Routing — joshmccoy.dev',
    }),
  );

  assert.deepEqual(cardsFromPages(root), [
    {
      site: 'joshmccoy.dev',
      slug: 'case-studies-bot-team',
      title: 'Bot Team - Approval Routing',
      eyebrow: 'case studies',
    },
    {
      site: 'joshmccoy.dev',
      slug: 'home',
      title: 'Home',
      eyebrow: 'home',
    },
  ]);
});

test('cardsFromPages excludes WOW content and ignored locations', (t) => {
  const root = makeFixture(t);
  writeFixture(root, 'visible.html', page('Visible | joshmccoy.dev'));
  writeFixture(root, 'wow/index.html', page('wow forever'));
  writeFixture(root, 'notes.html', page('WoW build notes'));
  writeFixture(root, '404.html', page('Not found'));
  writeFixture(root, 'node_modules/skip.html', page('Dependency page'));
  writeFixture(root, 'test/skip.html', page('Test page'));
  writeFixture(root, 'archive/old.html', page('Old page'));

  const cards = cardsFromPages(root);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].slug, 'visible');
  assert.doesNotMatch(
    cards
      .flatMap(({ slug, title, eyebrow }) => [slug, title, eyebrow])
      .join('\n'),
    /wow/i,
  );
});

test('cardsFromPages rejects empty titles and duplicate slugs', (t) => {
  const emptyRoot = makeFixture(t);
  writeFixture(
    emptyRoot,
    'empty.html',
    '<!doctype html><html><head></head><body></body></html>',
  );
  assert.throws(
    () => cardsFromPages(emptyRoot),
    (error) => /empty\.html/.test(error.message),
  );

  const duplicateRoot = makeFixture(t);
  writeFixture(duplicateRoot, 'topic.html', page('Topic'));
  writeFixture(
    duplicateRoot,
    'topic/index.html',
    page('Topic landing page'),
  );
  assert.throws(() => cardsFromPages(duplicateRoot));
});

test('cardHtml builds a lowercase, escaped, local-font card', (t) => {
  const root = makeFixture(t);
  const fontDir = path.join(root, 'fonts');
  writeFixture(fontDir, 'fixture.woff2', 'fake font');

  const html = cardHtml(
    {
      site: 'joshmccoy.dev',
      slug: 'escaped-card',
      title: '<B>X</B> & Y',
      eyebrow: 'case studies',
    },
    { fontDir },
  );

  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /width:\s*1200px/i);
  assert.match(html, /height:\s*630px/i);
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt; &amp; y'));
  assert.ok(html.includes('case studies'));
  assert.ok(html.includes('South Texas'));
  assert.ok(html.includes('joshmccoy.dev'));
  const fontFaces = html.match(/@font-face\s*\{[^}]*\}/gis) ?? [];
  assert.ok(fontFaces.length > 0);
  for (const fontFace of fontFaces) {
    const urls = [
      ...fontFace.matchAll(
        /url\(\s*(?:["']?)([^"')]+?)(?:["']?)\s*\)/gi,
      ),
    ].map((match) => match[1]);
    assert.ok(urls.length > 0);
    for (const url of urls) {
      assert.match(url, /^(?:file:|(?:\.{0,2}\/)?[^/:]+(?:\/|$))/i);
      assert.doesNotMatch(url, /^https?:|^\/\//i);
    }
  }
  assert.doesNotMatch(html, /fonts\.googleapis/i);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=\s*["']?https?:/i);

  const otherSiteHtml = cardHtml({
    site: 'j0sh.wtf',
    slug: 'lowercase',
    title: 'MIXED Case TITLE',
    eyebrow: 'writing',
  }, { fontDir });
  assert.ok(otherSiteHtml.includes('mixed case title'));
});

test('cacheKey is stable, hexadecimal, and title-sensitive', () => {
  const card = {
    site: 'joshmccoy.dev',
    slug: 'stable',
    title: 'Stable title',
    eyebrow: 'home',
  };
  const key = cacheKey(card);

  assert.match(key, /^[0-9a-f]{12,}$/i);
  assert.equal(cacheKey({ ...card }), key);
  assert.notEqual(cacheKey({ ...card, title: 'Changed title' }), key);
});

test('renderCards screenshots each card, writes a manifest, and caches', async (t) => {
  const root = makeFixture(t);
  const outDir = path.join(root, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const cards = [
    {
      site: 'joshmccoy.dev',
      slug: 'alpha',
      title: 'Alpha',
      eyebrow: 'case studies',
    },
    {
      site: 'joshmccoy.dev',
      slug: 'beta',
      title: 'Beta',
      eyebrow: 'home',
    },
  ];
  const calls = [];
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const fakeExec = async (chrome, args) => {
    calls.push({ chrome, args });
    const screenshotArg = args.find((arg) =>
      arg.startsWith('--screenshot='),
    );
    assert.ok(screenshotArg, 'Chrome call must include --screenshot');
    fs.writeFileSync(screenshotArg.slice('--screenshot='.length), png);
    return { stdout: '', stderr: '' };
  };
  const chrome = '/fixture/chrome';

  await renderCards(cards, { outDir, chrome, exec: fakeExec });

  assert.equal(calls.length, cards.length);
  for (let index = 0; index < cards.length; index += 1) {
    const { chrome: calledChrome, args } = calls[index];
    const card = cards[index];
    assert.equal(calledChrome, chrome);
    assert.ok(args.includes('--headless'));
    assert.ok(args.includes('--window-size=1200,630'));
    assert.ok(
      args.includes(
        `--screenshot=${path.join(outDir, `${card.slug}.png`)}`,
      ),
    );
    assert.ok(fs.existsSync(path.join(outDir, `${card.slug}.png`)));
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(manifest, {
    alpha: cacheKey(cards[0]),
    beta: cacheKey(cards[1]),
  });

  await renderCards(cards, { outDir, chrome, exec: fakeExec });
  assert.equal(calls.length, cards.length);
});
