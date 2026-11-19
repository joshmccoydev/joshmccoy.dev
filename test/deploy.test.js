'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('deploy workflow cannot run from a pull request and does not name a route', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const config = read('wrangler.toml');
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /CF_WORKER_NAME/);
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(workflow, /pull_request/);
  assert.doesNotMatch(workflow, /apiToken:\s*["']?[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(config, /^\s*route\s*=/m);
  assert.doesNotMatch(config, /account_id/i);
});
