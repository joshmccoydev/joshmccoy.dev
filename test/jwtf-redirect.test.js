'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const repoRoot = `${__dirname}/..`;
const redirectsPath = `${repoRoot}/_redirects`;
const homepagePath = `${repoRoot}/index.html`;
const target = 'https://j0sh.wtf/case-studies/bot-team/';

function readFile(filePath) {
  assert.ok(fs.existsSync(filePath), `Expected ${filePath} to exist`);
  return fs.readFileSync(filePath, 'utf8');
}

function getAttribute(tag, attributeName) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(
    new RegExp(
      `\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      'i',
    ),
  );

  return match ? (match[1] ?? match[2] ?? match[3] ?? null) : null;
}

function findAnchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: getAttribute(match[0], 'href'),
    text: match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  }));
}

test('root redirects map both case study paths to j0sh.wtf with status 301', () => {
  const rules = readFile(redirectsPath)
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 3 && !parts[0].startsWith('#'));

  for (const source of ['/case-studies/bot-team/', '/case-studies/bot-team']) {
    assert.ok(
      rules.some(
        ([ruleSource, ruleTarget, status]) =>
          ruleSource === source && ruleTarget === target && status === '301',
      ),
      `Expected ${source} to redirect to ${target} with status 301`,
    );
  }
});

test('homepage links to the j0sh.wtf case study with the required text', () => {
  const anchors = findAnchors(readFile(homepagePath));

  assert.ok(
    anchors.some(
      (anchor) =>
        anchor.href === target && anchor.text === 'how i run my work',
    ),
    `Expected an anchor to ${target} with text "how i run my work"`,
  );
});

test('homepage does not use the relative or old case study hrefs', () => {
  const hrefs = findAnchors(readFile(homepagePath)).map((anchor) => anchor.href);
  const forbiddenHrefs = [
    '/case-studies/bot-team/',
    'https://joshmccoy.dev/case-studies/bot-team/',
  ];

  for (const href of forbiddenHrefs) {
    assert.ok(
      !hrefs.includes(href),
      `Expected homepage anchors not to include ${href}`,
    );
  }
});
