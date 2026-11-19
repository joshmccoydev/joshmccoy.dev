const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const FONT_DIR = path.join(REPO_ROOT, 'fonts');

test('every WOFF2 filename includes the first eight characters of its SHA-256', () => {
  const fontFiles = fs.readdirSync(FONT_DIR).filter((name) => name.endsWith('.woff2'));

  assert.ok(fontFiles.length > 0, 'expected at least one WOFF2 font');

  for (const filename of fontFiles) {
    const contents = fs.readFileSync(path.join(FONT_DIR, filename));
    const hashPrefix = crypto.createHash('sha256').update(contents).digest('hex').slice(0, 8);
    assert.ok(
      filename.includes(hashPrefix),
      `${filename} should include its SHA-256 prefix ${hashPrefix}`,
    );
  }
});

test('font URLs in the shared stylesheet and HTML entrypoints exist on disk', () => {
  for (const filename of ['tokens.css', 'index.html', '404.html']) {
    const contents = fs.readFileSync(path.join(REPO_ROOT, filename), 'utf8');
    const urls = [...contents.matchAll(/(?:url\(|href=["'])\s*["']?(\/fonts\/[^"')\s]+|fonts\/[^"')\s]+)/g)];

    for (const [, url] of urls) {
      const relativePath = url.replace(/^\//, '');
      assert.ok(
        fs.existsSync(path.join(REPO_ROOT, relativePath)),
        `${filename} references missing font ${url}`,
      );
    }
  }
});
