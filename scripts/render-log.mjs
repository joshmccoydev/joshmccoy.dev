#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const SITE = 'https://joshmccoy.dev';
const DATA_PATH = path.join(REPO_ROOT, 'data', 'log.json');

const PAGE_STYLE = `
.article{padding-block:var(--s-8) var(--s-10)}
.article h1{font-size:var(--fs-4);line-height:var(--lh-tight);max-width:16ch}
.lede{margin-top:var(--s-3);color:var(--c-muted);max-width:var(--measure)}
.entry-list{list-style:none;margin-top:var(--s-5);display:grid}
.entry-list a{display:flex;flex-wrap:wrap;gap:var(--s-1) var(--s-3);align-items:baseline;justify-content:space-between;min-height:var(--tap);padding-block:var(--s-2);border-top:1px solid var(--c-line);color:var(--c-text);font-size:var(--fs-1);text-decoration:none}
.entry-list time,.meta{color:var(--c-muted);font:500 var(--fs--1)/1.4 var(--font-mono)}
.prose{display:grid;gap:var(--s-3);max-width:var(--measure);margin-top:var(--s-4);color:var(--c-muted);font-size:var(--fs-1);line-height:1.6}
.prose a,.back{overflow-wrap:anywhere}
@media (min-width:768px){.article h1{font-size:var(--fs-5)}}
`;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function readLog(root = REPO_ROOT) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'log.json'), 'utf8'));
  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    throw new Error('data/log.json needs at least one entry');
  }

  return data.entries.map((entry) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) {
      throw new Error(`Unsafe log slug: ${entry.slug}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      throw new Error(`Log date must be YYYY-MM-DD: ${entry.date}`);
    }
    return entry;
  });
}

function page({
  title,
  description,
  canonicalPath,
  slug,
  current,
  main,
}) {
  const canonical = `${SITE}${canonicalPath}`;
  const image = `${SITE}/img/og/${slug}.png`;
  const imageAlt = description;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="theme-color" content="#f3efe6">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="joshmccoy.dev">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@j0shdotwtf">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/geist-latin-var.3c002e62.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/geist-mono-latin-var.4fc2821c.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/tokens.css">
<style>${PAGE_STYLE}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="mast">
  <div class="wrap">
    <a class="brand" href="/" aria-label="joshmccoy.dev home">joshmccoy.dev</a>
    <nav aria-label="Main">
      <ul class="nav">
        <li><a href="/#work">Work</a></li>
        <li><a href="/#how">How</a></li>
        <li><a href="/log/"${current === 'log' ? ' aria-current="page"' : ''}>Log</a></li>
        <li><a href="/#hire">Hire</a></li>
        <li><a href="https://j0sh.wtf">j0sh.wtf <span aria-hidden="true">↗</span></a></li>
      </ul>
    </nav>
  </div>
</header>
<main id="main">
${main}
</main>
<footer class="site-footer">
  <div class="wrap">
    <span>© 2026 Josh McCoy · Coastal Bend, South Texas</span>
    <a href="mailto:josh@mccoybuilt.com">josh@mccoybuilt.com</a>
  </div>
</footer>
</body>
</html>
`;
}

export function renderLogPages(entries) {
  const pages = new Map();
  const items = entries
    .map((entry) => {
      const href = `/log/${entry.slug}/`;
      const when = formatDate(entry.date);
      return `        <li><a href="${href}"><span>${escapeHtml(entry.title)}</span><time datetime="${entry.date}">${when}</time></a></li>`;
    })
    .join('\n');

  pages.set(
    'log/index.html',
    page({
      title: 'Log · Josh McCoy',
      description:
        'Dated notes from Josh McCoy on the bots, tools and teaching work behind joshmccoy.dev.',
      canonicalPath: '/log/',
      slug: 'log',
      current: 'log',
      main: `  <article class="article">
    <div class="wrap">
      <p class="label">Log</p>
      <h1>Notes on the work.</h1>
      <p class="lede">Dated notes only. If a date is not on the page, it is not a claim.</p>
      <ul class="entry-list">
${items}
      </ul>
    </div>
  </article>`,
    }),
  );

  for (const entry of entries) {
    const paragraphs = entry.paragraphs
      .map((paragraph) => `        <p>${escapeHtml(paragraph)}</p>`)
      .join('\n');
    pages.set(
      `log/${entry.slug}/index.html`,
      page({
        title: `${entry.title} · Josh McCoy`,
        description: entry.description,
        canonicalPath: `/log/${entry.slug}/`,
        slug: `log-${entry.slug}`,
        current: 'log',
        main: `  <article class="article">
    <div class="wrap">
      <p class="meta"><time datetime="${entry.date}">${formatDate(entry.date)}</time></p>
      <h1>${escapeHtml(entry.title)}</h1>
      <div class="prose">
${paragraphs}
      </div>
      <a class="text-link back" href="https://j0sh.wtf/case-studies/bot-team/">Read the case study</a>
      <a class="text-link back" href="/log/">All notes</a>
    </div>
  </article>`,
      }),
    );
  }

  return pages;
}

export function renderSitemap(entries) {
  const urls = ['/', '/log/', ...entries.map((entry) => `/log/${entry.slug}/`)];
  const body = urls
    .map((url) => `  <url><loc>${SITE}${url}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function filesFor(entries) {
  const files = renderLogPages(entries);
  files.set('sitemap.xml', renderSitemap(entries));
  return files;
}

function writeFiles(files, { check = false, root = REPO_ROOT } = {}) {
  const mismatches = [];
  for (const [relativePath, contents] of files) {
    const target = path.join(root, relativePath);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (current !== contents) {
      mismatches.push(relativePath);
      if (!check) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, contents);
      }
    }
  }
  return mismatches;
}

function main(argv) {
  const check = argv.includes('--check');
  const entries = readLog(REPO_ROOT);
  const mismatches = writeFiles(filesFor(entries), { check });
  if (mismatches.length > 0) {
    const verb = check ? 'out of date' : 'wrote';
    console.error(`${verb}: ${mismatches.join(', ')}`);
    if (check) {
      process.exitCode = 1;
    }
    return;
  }
  console.log(check ? 'log pages match data/log.json' : 'log pages already current');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
