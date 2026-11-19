'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const script = path.join(__dirname, '..', 'scripts', 'sync-public.mjs');

function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('apply refuses to publish without a destination', () => {
  const result = run(['--apply'], { JMD_PUBLIC_DEST: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing publish destination/);
});

test('apply copies to --dest and to JMD_PUBLIC_DEST', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'jmd-dest-'));
  const fromFlag = run(['--apply', '--dest', dest]);
  assert.equal(fromFlag.status, 0, fromFlag.stderr);
  assert.ok(fs.existsSync(path.join(dest, 'index.html')));

  const envDest = fs.mkdtempSync(path.join(os.tmpdir(), 'jmd-env-dest-'));
  const fromEnv = run(['--apply'], { JMD_PUBLIC_DEST: envDest });
  assert.equal(fromEnv.status, 0, fromEnv.stderr);
  assert.ok(fs.existsSync(path.join(envDest, 'index.html')));
  fs.rmSync(dest, { recursive: true, force: true });
  fs.rmSync(envDest, { recursive: true, force: true });
});
