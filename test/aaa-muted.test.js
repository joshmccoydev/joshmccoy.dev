'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const tokens = fs.readFileSync(path.join(repoRoot, 'tokens.css'), 'utf8');

function token(name) {
  const match = tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  assert.ok(match, `Expected --${name} color token`);
  return match[1];
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((channel) =>
    linearize(Number.parseInt(channel, 16)),
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function shippedHtmlAndCss(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === '.git') return [];
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return shippedHtmlAndCss(filePath);
    return /\.(?:html|css)$/i.test(entry.name) ? [filePath] : [];
  });
}

test('muted token has AAA contrast against the page background', () => {
  const foreground = luminance(token('c-subtle'));
  const background = luminance(token('c-bg'));
  const contrast = (Math.max(foreground, background) + 0.05)
    / (Math.min(foreground, background) + 0.05);

  assert.ok(contrast >= 7, `Expected contrast >= 7:1, got ${contrast.toFixed(2)}:1`);
});

test('shipped HTML and CSS contain no old muted color', () => {
  for (const filePath of shippedHtmlAndCss(repoRoot)) {
    const contents = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(contents, /#8b8b94/i, `${path.relative(repoRoot, filePath)} contains old muted color`);
  }
});
