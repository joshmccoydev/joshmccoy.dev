import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { botTeamSize } from '../data/config.mjs';
import { planSync } from '../scripts/sync-public.mjs';
import { applyRoster, escapeHtml, renderAll } from '../scripts/render-site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(directory, found = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test') {
        continue;
      }
      walk(absolutePath, found);
    } else {
      found.push(path.relative(root, absolutePath).split(path.sep).join('/'));
    }
  }
  return found;
}

function luminance(hex) {
  const channels = hex
    .match(/[0-9a-f]{2}/gi)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function token(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `Missing ${name}`);
  return match[1];
}

const projects = JSON.parse(read('data/projects.json'));
const log = JSON.parse(read('data/log.json'));
const now = JSON.parse(read('data/now.json'));
const files = renderAll();
const home = files['index.html'];
const phone = /\b(?:\+?1[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/;
const countPhrase =
  /\b(?:eleven|twelve|thirteen|fourteen|fifteen|\d+)\s+(?:ai\s+)?(?:bots|assistants|agents|lanes)\b/i;

test('escapeHtml encodes markup and keeps apostrophes readable', () => {
  assert.equal(escapeHtml(`<a href="x">&`), '&lt;a href=&quot;x&quot;&gt;&amp;');
  assert.equal(escapeHtml("Dad Can't Draw"), "Dad Can't Draw");
});

test('roster fact is the only place a bot-team size can render', () => {
  const project = { id: 'bot-team', facts: [{ label: 'Approver', value: 'Josh' }] };
  assert.deepEqual(applyRoster(project, null), project.facts);
  assert.deepEqual(applyRoster(project, 0), project.facts);
  assert.deepEqual(applyRoster(project, 1.5), project.facts);
  assert.deepEqual(applyRoster({ id: 'lifedash', facts: [] }, 4), []);
  assert.deepEqual(applyRoster(project, 4), [
    { label: 'Approver', value: 'Josh' },
    { label: 'Roster', value: '4' },
  ]);
});

test('bot-team size stays unset until Josh fills in the one TODO', () => {
  const config = read('data/config.mjs');
  assert.equal(botTeamSize, null);
  assert.equal(config.match(/TODO/g).length, 1);
  assert.match(config, /TODO\(josh\):/);
  assert.match(config, /export const botTeamSize = null;/);

  const todos = walk(root).filter((relativePath) => {
    if (!/\.(mjs|js|css|html|json|svg|yml)$/.test(relativePath)) {
      return false;
    }
    return read(relativePath).includes('TODO');
  });
  assert.deepEqual(todos, ['data/config.mjs']);
});

test('generated pages match the data files', () => {
  for (const [relativePath, html] of Object.entries(files)) {
    assert.equal(read(relativePath), html, `${relativePath} is stale`);
  }

  const cardTitles = [
    ...home.matchAll(/<li class="card[^"]*"[\s\S]*?<h3>(.*?)<\/h3>/g),
  ].map((match) => match[1]);
  assert.deepEqual(cardTitles, projects.map((project) => project.title));

  const logHtml = files['log/index.html'];
  for (const entry of log) {
    assert.ok(logHtml.includes(entry.title), entry.slug);
    assert.ok(files[`log/${entry.slug}/index.html`].includes(entry.title));
  }

  for (const item of now) {
    assert.equal(home.split(item.note).length - 1, 2, item.note);
  }
});

test('the public copy states the place, the retainer, and no bot count or phone', () => {
  assert.match(home, /Coastal Bend, Texas/);
  assert.match(home, /McCoy Built AI Solutions/);
  assert.match(home, /AI-education retainer/);
  assert.match(home, /wrong hire/);
  assert.match(home, /how i run my work/);
  assert.doesNotMatch(home, /<dt>Roster<\/dt>/);
  assert.doesNotMatch(home, countPhrase);
  assert.doesNotMatch(home, phone);
  assert.doesNotMatch(home, /tel:/);

  for (const html of Object.values(files)) {
    assert.doesNotMatch(html, phone);
    assert.doesNotMatch(html, countPhrase);
    assert.doesNotMatch(html, /<script\b(?![^>]*application\/ld\+json)/i);
  }
});

test('every generated page has an OG image declaration', () => {
  assert.match(files['404.html'], /property="og:image" content="https:\/\/joshmccoy\.dev\/img\/og\/not-found\.png"/);
  for (const [relativePath, html] of Object.entries(files)) {
    if (!relativePath.endsWith('.html')) {
      continue;
    }
    assert.match(html, /property="og:image" content="https:\/\/joshmccoy\.dev\/img\/og\/[^"]+\.png"/, relativePath);
    assert.match(html, /name="twitter:image"/, relativePath);
    assert.match(html, /og:image:width" content="1200"/, relativePath);
    assert.match(html, /og:image:height" content="630"/, relativePath);
    assert.match(html, /name="twitter:card" content="summary_large_image"/, relativePath);
  }
});

test('tokens clear WCAG AA and the layout stylesheet adds no hex ink', () => {
  const css = read('tokens.css');
  const pairs = [
    ['--c-text', '--c-bg'],
    ['--c-text', '--c-surface'],
    ['--c-muted', '--c-bg'],
    ['--c-muted', '--c-surface'],
    ['--c-muted', '--c-surface-2'],
    ['--c-subtle', '--c-bg'],
    ['--c-subtle', '--c-surface'],
    ['--c-subtle', '--c-surface-2'],
    ['--c-signal-ink', '--c-signal'],
  ];
  for (const [foreground, background] of pairs) {
    const ratio = contrast(token(css, foreground), token(css, background));
    assert.ok(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}`);
  }
  assert.equal(read('site.css').match(/#[0-9a-fA-F]{3,8}/g), null);
  assert.match(read('site.css'), /prefers-reduced-motion:\s*reduce/);
  assert.match(read('site.css'), /prefers-reduced-motion:\s*no-preference/);
  assert.match(read('site.css'), /min-height:\s*var\(--tap\)/);
});

test('the publish plan includes the new pages and leaves the bot-team images behind', () => {
  const planned = planSync(root);
  for (const relativePath of [
    'site.css',
    'log/index.html',
    'log/ask-first/index.html',
    'index.html',
    'sitemap.xml',
  ]) {
    assert.ok(planned.includes(relativePath), relativePath);
  }
  assert.equal(planned.some((relativePath) => relativePath.includes('bot-team')), false);
  assert.equal(planned.includes('data/config.mjs'), false);
  assert.equal(planned.includes('data/projects.json'), false);
  assert.equal(planned.includes('img/og/manifest.json'), false);
});
