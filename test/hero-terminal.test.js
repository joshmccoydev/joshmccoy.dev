'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const homepagePath = `${__dirname}/../index.html`;
const retiredNames = [
  'alfred',
  'don-draper',
  'hemingway',
  'banksy',
  'neil',
  'elon',
  'woz',
  'post-malone',
  'dolly',
  'dewey',
  'dr-eggbot',
];
const expectedLines = [
  ['operations', 'runs the day, routes the work'],
  ['engineering', 'builds the tickets'],
  ['design', 'brand and visuals'],
  ['writing', 'edits every draft'],
  ['sales', 'drafts outreach'],
  ['finance', 'watches the money'],
  ['inbox', 'triages email'],
  ['research', 'fact-checks'],
  ['health', 'training and habits'],
  ['library', 'keeps the notes'],
  ['calendar', 'runs the routines'],
  ['night shop', 'light crew I–III, cheap jobs overnight'],
];

function homepage() {
  return fs.readFileSync(homepagePath, 'utf8');
}

function terminalLines(html) {
  const terminal = html.match(/<figure class="term"[\s\S]*?<\/figure>/i);
  assert.ok(terminal, 'Expected the hero terminal');
  return [...terminal[0].matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((match) => {
    const columns = [...match[1].matchAll(/<span class="n">([\s\S]*?)<\/span>|<span>([\s\S]*?)<\/span>/gi)]
      .map((column) => (column[1] ?? column[2]).replace(/<[^>]*>/g, '').trim());
    return columns.slice(-2);
  });
}

test('hero terminal lists the role lanes and keeps the approval rule', () => {
  const html = homepage();
  const rows = terminalLines(html);

  for (const expected of expectedLines) {
    assert.ok(
      rows.some(([role, description]) => role === expected[0] && description === expected[1]),
      `Expected terminal row: ${expected.join('  ')}`,
    );
  }
  assert.match(html, /nothing sends, posts or spends until Josh says yes/);
});

test('homepage terminal has no retired bot names', () => {
  const html = homepage();

  for (const name of retiredNames) {
    assert.doesNotMatch(
      html,
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i'),
      `Expected homepage not to include retired name ${name}`,
    );
  }
});
