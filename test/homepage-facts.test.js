'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const crew = [
  ['Chief', 'chief of staff'],
  ['Clock', 'calendar'],
  ['Forge', 'engineering'],
  ['Echo', 'editing'],
  ['Scout', 'research'],
  ['Ledger', 'money'],
  ['Mailroom', 'inbox'],
  ['Coach', 'training'],
  ['Sleuth', 'fact-checks'],
  ['Canvas', 'design'],
  ['Archive', 'notes'],
  ['Hermes', 'outreach'],
];

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

test('hero terminal lists the current crew and the approval rule', () => {
  for (const [name, role] of crew) {
    assert.match(
      index,
      new RegExp(`<th scope="row">${name}</th><td>${role}</td>`),
    );
  }
  assert.match(index, /nothing sends, posts or spends until Josh says yes/);
  assert.doesNotMatch(index, /azeroth/i);
  assert.doesNotMatch(index, /\bwow\b/i);
});

test('homepage drops stale claims and keeps the consultancy facts', () => {
  assert.match(index, /McCoy Built does not sell websites/);
  assert.match(index, /from \$1,000\/mo/);
  assert.match(index, /around \$2,000/);
  assert.match(index, /from \$5,000/);
  assert.match(index, /two 45-minute calls a month/);
  assert.match(index, /under 12 hours/);
  assert.match(index, /30 days' notice/);
  assert.match(index, /Coming soon/);
  assert.match(index, /https:\/\/cal\.com\/mccoybuilt\/15min/);
  assert.match(index, /mailto:josh@mccoybuilt\.com/);
  assert.doesNotMatch(index, /life-dashboard/);
  assert.doesNotMatch(index, /tel:/i);
  assert.doesNotMatch(index, /\bphone\b/i);
  assert.doesNotMatch(index, /postiz/i);
  assert.doesNotMatch(index, /every tuesday/i);
  assert.doesNotMatch(index, /0\s*kb/i);
  assert.doesNotMatch(index, /launching/i);
  assert.doesNotMatch(index, /voxer/i);
  assert.doesNotMatch(index, /white-space:\s*nowrap/i);

  for (const name of retiredNames) {
    assert.doesNotMatch(
      index,
      new RegExp(`\\b${name.replaceAll('-', '\\-')}\\b`, 'i'),
      name,
    );
  }
});
