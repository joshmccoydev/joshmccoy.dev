#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SITE = 'joshmccoy.dev';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const DEFAULT_FONT_DIR = path.join(REPO_ROOT, 'fonts');
const DEFAULT_OUT_DIR = 'img/og';
const DEFAULT_CHROME = '/usr/bin/google-chrome';
const IGNORED_SEGMENTS = new Set([
  '404',
  'archive',
  'node_modules',
  'test',
]);
const PAGE_EXTENSIONS = new Set(['.htm', '.html']);

const TOKENS = `
:root{
  color-scheme:dark;
  --c-bg:#0a0a0b;
  --c-surface:#111113;
  --c-surface-2:#18181b;
  --c-line:#27272a;
  --c-line-strong:#52525b;
  --c-text:#ededef;
  --c-muted:#a1a1aa;
  --c-subtle:#8b8b94;
  --c-signal:#c6ff3d;
  --c-signal-ink:#0a0a0b;
  --c-signal-wash:rgba(198,255,61,.08);
  --c-signal-line:rgba(198,255,61,.32);
  --c-focus:var(--c-signal);
  --font-sans:"Geist","Geist Fallback",system-ui,-apple-system,"Segoe UI",sans-serif;
  --font-mono:"Geist Mono","Geist Mono Fallback",ui-monospace,SFMono-Regular,Menlo,monospace;
  --fs--1:0.8rem;
  --fs-0:1rem;
  --fs-1:1.25rem;
  --fs-2:1.563rem;
  --fs-3:1.953rem;
  --fs-4:2.441rem;
  --fs-5:3.052rem;
  --fs-6:3.815rem;
  --lh-tight:1.1; --lh-snug:1.3; --lh-body:1.6;
  --tracking-tight:-0.03em; --tracking-label:0.08em;
  --s-0:4px; --s-1:8px; --s-2:16px; --s-3:24px; --s-4:32px; --s-5:40px; --s-6:48px; --s-8:64px; --s-10:80px; --s-12:96px; --s-16:128px;
  --r-sm:6px; --r-md:12px; --r-lg:16px;
  --tap:44px; --max:1120px; --measure:62ch; --gutter:var(--s-2);
  --dur:160ms; --ease:cubic-bezier(.2,.7,.2,1);
}
@media (min-width:480px){:root{--gutter:var(--s-3)}}
@media (min-width:768px){:root{--gutter:var(--s-5)}}
`;

const CARD_STYLE = `
html,body{margin:0}body{width:1200px;height:630px;background:var(--c-bg);color:var(--c-text);font-family:var(--font-sans);position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(var(--c-line) 1px,transparent 1px),linear-gradient(90deg,var(--c-line) 1px,transparent 1px);background-size:32px 32px;mask-image:radial-gradient(70% 80% at 85% 15%,#000,transparent 75%);opacity:.5}
.in{position:absolute;inset:72px 80px;display:flex;flex-direction:column}
.brand{font:600 28px/1 var(--font-mono);display:flex;align-items:center}
.brand i{display:inline-block;width:15px;height:30px;margin-left:4px;background:var(--c-signal)}
.eyebrow{margin-top:auto;margin-bottom:20px;font:500 18px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--c-subtle)}
h1{margin:0;font-size:64px;line-height:1.08;letter-spacing:-.03em;font-weight:600;max-width:23ch;text-transform:lowercase;overflow-wrap:anywhere}
h1.clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.foot{margin-top:36px;display:flex;align-items:center;gap:16px;font:500 22px/1 var(--font-mono);color:var(--c-subtle);letter-spacing:.06em;text-transform:uppercase}
.dot{width:10px;height:10px;border-radius:50%;background:var(--c-signal);box-shadow:0 0 0 5px var(--c-signal-wash)}
`;

const FIT_SCRIPT =
  "(async()=>{await document.fonts.ready;" +
  "const h=document.querySelector('h1');" +
  'const max=+h.dataset.max,min=+h.dataset.min,' +
  'lh=parseFloat(getComputedStyle(h).lineHeight)/' +
  'parseFloat(getComputedStyle(h).fontSize);' +
  'let s=max;const lines=()=>Math.round(h.scrollHeight/(s*lh));' +
  "h.style.fontSize=s+'px';" +
  "while(lines()>3&&s>min){s-=2;h.style.fontSize=s+'px'}" +
  "if(lines()>3)h.classList.add('clamp');" +
  "document.body.dataset.fs=s;window.__ready=true})();";

const HTML_ENTITIES = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['gt', '>'],
  ['hellip', '\u2026'],
  ['ldquo', '\u201c'],
  ['lsquo', '\u2018'],
  ['lt', '<'],
  ['mdash', '\u2014'],
  ['middot', '\u00b7'],
  ['nbsp', '\u00a0'],
  ['ndash', '\u2013'],
  ['quot', '"'],
  ['rdquo', '\u201d'],
  ['rsquo', '\u2019'],
]);

function decodeHtml(value) {
  return String(value).replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]+));/gi,
    (entity, decimal, hexadecimal, named) => {
      if (decimal || hexadecimal) {
        const codePoint = Number.parseInt(decimal ?? hexadecimal, decimal ? 10 : 16);
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return entity;
        }
      }
      return HTML_ENTITIES.get(named.toLowerCase()) ?? entity;
    },
  );
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, ' ');
}

function normalizeText(value) {
  return decodeHtml(stripTags(value)).replace(/\s+/g, ' ').trim();
}

function parseAttributes(tag) {
  const attributes = {};
  const pattern =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = pattern.exec(tag)) !== null) {
    const name = match[1].toLowerCase();
    if (name === 'meta') {
      continue;
    }
    attributes[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }

  return attributes;
}

function pageTitle(source) {
  const html = source.replace(/<!--[\s\S]*?-->/g, '');
  let openGraphTitle = '';

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const property = (
      attributes.property ??
      attributes.name ??
      ''
    ).toLowerCase();
    if (property === 'og:title') {
      openGraphTitle = normalizeText(attributes.content ?? '');
      break;
    }
  }

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const documentTitle = titleMatch ? normalizeText(titleMatch[1]) : '';
  const siteSuffix = new RegExp(
    `\\s*[|\\u00b7\\u2022\\u2013\\u2014-]\\s*${SITE.replaceAll('.', '\\.')}\\s*$`,
    'i',
  );

  return [openGraphTitle, documentTitle]
    .map((title) => title.replace(siteSuffix, '').trim())
    .find(Boolean) ?? '';
}

function relativeParts(relativePath) {
  return relativePath.split(path.sep).filter(Boolean);
}

function hasIgnoredSegment(relativePath) {
  return relativeParts(relativePath).some((segment) => {
    const parsed = path.parse(segment);
    const stem = parsed.name.toLowerCase();
    return (
      segment.startsWith('.') ||
      IGNORED_SEGMENTS.has(segment.toLowerCase()) ||
      (stem === '404' && PAGE_EXTENSIONS.has(parsed.ext.toLowerCase()))
    );
  });
}

function stemForPage(segment) {
  const extension = path.extname(segment).toLowerCase();
  return PAGE_EXTENSIONS.has(extension)
    ? path.basename(segment, path.extname(segment)).toLowerCase()
    : segment.toLowerCase();
}

function hasWowSegment(relativePath) {
  return relativeParts(relativePath).some((segment) => {
    const parsed = path.parse(segment);
    return (
      segment.toLowerCase() === 'wow' ||
      (stemForPage(segment) === 'wow' && PAGE_EXTENSIONS.has(parsed.ext.toLowerCase()))
    );
  });
}

function canonicalSitePath(value) {
  const slashPath = String(value).replaceAll(path.sep, '/');
  const rootedPath = slashPath.startsWith('/') ? slashPath : `/${slashPath}`;
  const withoutTrailingSlash = rootedPath.replace(/\/+$/, '') || '/';

  return (
    withoutTrailingSlash
      .replace(/\/index\.html?$/i, '')
      .replace(/\.html?$/i, '') || '/'
  );
}

function redirectSources(root) {
  const redirectsPath = path.join(root, '_redirects');
  if (!fs.existsSync(redirectsPath)) {
    return new Set();
  }

  const sources = new Set();
  for (const line of fs.readFileSync(redirectsPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const source = trimmed.split(/\s+/, 1)[0];
    sources.add(canonicalSitePath(source));
  }
  return sources;
}

function findPages(root) {
  const pages = [];

  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath);
      if (entry.isSymbolicLink() || hasIgnoredSegment(relativePath)) {
        continue;
      }
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (
        entry.isFile() &&
        PAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        pages.push({ absolutePath, relativePath });
      }
    }
  }

  walk(path.resolve(root));
  return pages.sort((left, right) =>
    left.relativePath < right.relativePath
      ? -1
      : left.relativePath > right.relativePath
        ? 1
        : 0,
  );
}

function eyebrowFor(relativePath) {
  const parts = relativeParts(relativePath);
  if (parts.length <= 1) {
    return 'home';
  }
  return parts[0].toLowerCase().replace(/[-_]+/g, ' ');
}

export function slugFor(relativePath) {
  const slashPath = String(relativePath).replaceAll('\\', '/');
  const withoutExtension = slashPath.replace(/\.html?$/i, '');
  const withoutIndex = withoutExtension.replace(/(?:^|\/)index$/i, '');
  const slug = withoutIndex
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'home';
}

export function cardsFromPages(root) {
  const cards = [];
  const slugs = new Set();
  const redirectedPaths = redirectSources(root);
  const botTeamPath = '/case-studies/bot-team';

  for (const page of findPages(root)) {
    const sitePath = canonicalSitePath(page.relativePath);
    if (
      sitePath === botTeamPath ||
      sitePath.startsWith(`${botTeamPath}/`) ||
      redirectedPaths.has(sitePath)
    ) {
      continue;
    }
    if (hasWowSegment(page.relativePath)) {
      continue;
    }

    const title = pageTitle(fs.readFileSync(page.absolutePath, 'utf8'));
    if (!title) {
      throw new Error(`Page has an empty title: ${page.relativePath}`);
    }
    if (/\bwow\b/i.test(title)) {
      continue;
    }

    const slug = slugFor(page.relativePath);
    if (slugs.has(slug)) {
      throw new Error(`Duplicate card slug "${slug}"`);
    }
    slugs.add(slug);

    cards.push({
      site: SITE,
      slug,
      title,
      eyebrow: eyebrowFor(page.relativePath),
    });
  }

  return cards.sort((left, right) =>
    left.slug < right.slug ? -1 : left.slug > right.slug ? 1 : 0,
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function cardHtml(card, { fontDir = DEFAULT_FONT_DIR } = {}) {
  const sansFont = pathToFileURL(
    path.join(path.resolve(fontDir), 'geist-latin-var.woff2'),
  ).href;
  const monoFont = pathToFileURL(
    path.join(path.resolve(fontDir), 'geist-mono-latin-var.woff2'),
  ).href;
  const site = escapeHtml(String(card.site ?? SITE).toLowerCase());
  const eyebrow = escapeHtml(String(card.eyebrow ?? '').toLowerCase());
  const title = escapeHtml(String(card.title ?? '').toLowerCase());

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
@font-face{font-family:"Geist";src:url("${sansFont}") format("woff2");font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:"Geist Mono";src:url("${monoFont}") format("woff2");font-weight:100 900;font-style:normal;font-display:swap}
${TOKENS}
${CARD_STYLE}
</style></head><body><div class="grid"></div><div class="in">
<div class="brand">${site}<i></i></div>
<div class="eyebrow">${eyebrow}</div>
<h1 data-max="64" data-min="46">${title}</h1>
<div class="foot"><span class="dot"></span>joshmccoy.dev \u00b7 South Texas</div>
</div><script>${FIT_SCRIPT}</script></body></html>`;
}

export function cacheKey(card) {
  return createHash('sha256')
    .update(`${card.site ?? ''}${card.title ?? ''}${card.eyebrow ?? ''}`)
    .digest('hex')
    .slice(0, 16);
}

function defaultExec(chrome, args) {
  return execFileSync(chrome, args, { encoding: 'utf8' });
}

function readManifest(manifestPath) {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export async function renderCards(
  cards,
  {
    outDir = DEFAULT_OUT_DIR,
    chrome = DEFAULT_CHROME,
    exec = defaultExec,
    fontDir = DEFAULT_FONT_DIR,
  } = {},
) {
  const absoluteOutDir = path.resolve(outDir);
  const manifestPath = path.join(absoluteOutDir, 'manifest.json');
  fs.mkdirSync(absoluteOutDir, { recursive: true });

  const manifest = readManifest(manifestPath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'share-cards-'));

  try {
    for (const card of cards) {
      const key = cacheKey(card);
      const screenshotPath = path.join(absoluteOutDir, `${card.slug}.png`);
      if (fs.existsSync(screenshotPath) && manifest[card.slug] === key) {
        continue;
      }

      const tempHtmlPath = path.join(tempDir, `${card.slug}.html`);
      fs.writeFileSync(
        tempHtmlPath,
        cardHtml(card, { fontDir }),
        'utf8',
      );
      await exec(chrome, [
        '--headless=new',
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=1200,630',
        '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost',
        `--screenshot=${screenshotPath}`,
        '--virtual-time-budget=3000',
        pathToFileURL(tempHtmlPath).href,
      ]);
      manifest[card.slug] = key;
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  return manifest;
}

function parseCliArguments(argv) {
  const options = { dryRun: false, outDir: DEFAULT_OUT_DIR };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--out') {
      const value = argv[(index += 1)];
      if (!value) {
        throw new Error('Missing value for --out');
      }
      options.outDir = value;
    } else if (argument.startsWith('--out=')) {
      const value = argument.slice('--out='.length);
      if (!value) {
        throw new Error('Missing value for --out');
      }
      options.outDir = value;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

async function main(argv) {
  const options = parseCliArguments(argv);
  const cards = cardsFromPages(REPO_ROOT);
  if (options.dryRun) {
    console.log(JSON.stringify(cards, null, 2));
    return;
  }
  await renderCards(cards, {
    outDir: path.resolve(REPO_ROOT, options.outDir),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
