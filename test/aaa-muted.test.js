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

function contrast(a, b) {
  const [hi, lo] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('text, muted and subtle tokens have AAA contrast on the page and surface backgrounds', () => {
  for (const fg of ['c-text', 'c-muted', 'c-subtle']) {
    for (const bg of ['c-bg', 'c-surface']) {
      const ratio = contrast(fg, bg);
      assert.ok(ratio >= 7, `--${fg} on --${bg} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('shipped HTML and CSS contain no old muted colors', () => {
  for (const filePath of shippedHtmlAndCss(repoRoot)) {
    const contents = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(contents, /#8b8b94/i, `${path.relative(repoRoot, filePath)} contains an old muted color`);
  }
});
