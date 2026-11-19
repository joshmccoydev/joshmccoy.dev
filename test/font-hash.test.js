'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function sha8(relativePath) {
  return createHash('sha256')
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest('hex')
    .slice(0, 8);
}

function lin(channel) {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((channel) => lin(Number.parseInt(channel, 16)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test('site fonts are referenced by their content hash', () => {
  const faces = [
    ['fonts/geist-latin-var.woff2', '3c002e62'],
    ['fonts/geist-mono-latin-var.woff2', '4fc2821c'],
  ];
  const tokens = fs.readFileSync(path.join(root, 'tokens.css'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  for (const [file, hash] of faces) {
    assert.equal(sha8(file), hash);
    const hashed = file.replace('.woff2', `.${hash}.woff2`);
    assert.equal(
      fs.readFileSync(path.join(root, hashed)).compare(fs.readFileSync(path.join(root, file))),
      0,
    );
    assert.match(tokens, new RegExp(path.posix.basename(hashed)));
    assert.match(index, new RegExp(`/fonts/${path.posix.basename(hashed)}`));
  }
});

test('text tokens stay at or above AAA on every surface', () => {
  const tokens = fs.readFileSync(path.join(root, 'tokens.css'), 'utf8');
  const value = (name) => {
    const match = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'));
    assert.ok(match, name);
    return match[1];
  };
  const surfaces = ['--c-bg', '--c-surface', '--c-surface-2'].map(value);
  const inks = ['--c-text', '--c-muted', '--c-subtle', '--c-signal'].map(value);

  for (const surface of surfaces) {
    for (const ink of inks) {
      assert.ok(
        ratio(ink, surface) >= 7,
        `${ink} on ${surface} is ${ratio(ink, surface).toFixed(2)}`,
      );
    }
  }
  assert.ok(ratio(value('--c-signal-ink'), value('--c-signal')) >= 7);
});
