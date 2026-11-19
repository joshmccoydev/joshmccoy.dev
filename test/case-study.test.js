'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

function walk(directory, found = []) {
  if (!fs.existsSync(directory)) {
    return found;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, found);
    } else {
      found.push(path.relative(repoRoot, absolutePath).split(path.sep).join('/'));
    }
  }

  return found;
}

test('the bot-team essay and its images are not published here', () => {
  const published = walk(repoRoot).filter(
    (relativePath) =>
      relativePath === 'case-studies/bot-team/index.html' ||
      relativePath.startsWith('img/case-studies/bot-team/'),
  );

  assert.deepEqual(published, []);
});

test('no page points at the retired bot-team image set', () => {
  const pages = walk(repoRoot).filter((relativePath) => relativePath.endsWith('.html'));

  for (const relativePath of pages) {
    const html = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.doesNotMatch(
      html,
      /\/img\/case-studies\/bot-team\//,
      relativePath,
    );
  }
});
