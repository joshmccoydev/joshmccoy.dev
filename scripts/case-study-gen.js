#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const IMAGE_EXTENSIONS = new Set(['.avif', '.png', '.webp']);
const IMAGE_BASES = [
  'hero',
  'fig1-roles',
  'fig2-approval',
  'fig3-compute',
  'og',
];
const IMAGE_VARIANTS = [
  { extension: '.avif' },
  { extension: '.webp' },
  { extension: '.png' },
];
const HEADING_IDS = {
  'the problem': 'problem',
  'what it does': 'what-it-does',
  'how it works': 'how-it-works',
  'what it shows': 'what-it-shows',
  'want to run something like this?': 'want-to-run',
};
const FIGURE_DETAILS = {
  hero: {
    width: 1600,
    height: 900,
    alt:
      'Headline &quot;I run my own work with a team of 15 AI assistants,&quot; ' +
      'next to a terminal listing assistant roles and the rule ' +
      '&quot;ask first, always.&quot;',
  },
  'fig1-roles': {
    width: 1600,
    height: 640,
    alt:
      'Twelve work roles in three groups: running the business (chief of staff, ' +
      'sales lead, editor, social media), building (engineering lead, builder, ' +
      'designer, researcher) and keeping it running (CFO, inbox manager, ' +
      'calendar, librarian), plus three personal assistants. All of them share ' +
      'one notebook.',
  },
  'fig2-approval': {
    width: 1600,
    height: 560,
    alt:
      'Four steps: the sales lead drafts an email, the editor cleans it up, ' +
      'Josh approves it, and only that exact message goes out. Below them is ' +
      'the rule: ask first, always.',
  },
  'fig3-compute': {
    width: 1600,
    height: 620,
    alt:
      'Three tiers: free scripts handle simple checks, cheaper models do the ' +
      'bulk drafting and sorting, and the main assistant handles judgment calls ' +
      'and talking to Josh.',
  },
};

const STYLE = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--c-bg);color:var(--c-text);font:400 var(--fs-0)/var(--lh-body) var(--font-sans);font-feature-settings:"kern","calt";-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit;text-decoration-thickness:1px;text-underline-offset:3px}
:focus-visible{outline:2px solid var(--c-focus);outline-offset:3px;border-radius:var(--r-sm)}
img{display:block;max-width:100%;height:auto}
h1,h2{margin:0;font-weight:600;letter-spacing:var(--tracking-tight);text-wrap:balance}
p{margin:0;text-wrap:pretty}
.wrap{width:100%;max-width:var(--max);margin:0 auto;padding-inline:var(--gutter)}
.skip{position:absolute;left:var(--s-2);top:-100px;z-index:20;min-height:var(--tap);display:inline-flex;align-items:center;padding:0 var(--s-2);background:var(--c-signal);color:var(--c-signal-ink);border-radius:var(--r-sm);font-weight:600;text-decoration:none}
.skip:focus{top:var(--s-2)}
.top{position:sticky;top:0;z-index:10;background:rgba(10,10,11,.88);backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--c-line)}
.top .wrap{display:flex;align-items:center;min-height:64px}
.brand{display:inline-flex;align-items:center;gap:var(--s-1);min-height:var(--tap);font:600 var(--fs-0)/1 var(--font-mono);letter-spacing:-.01em;text-decoration:none}
.brand::before{content:"\u2190";color:var(--c-signal);font-weight:400}
.brand .cursor{display:inline-block;width:.55em;height:1.05em;margin-left:2px;background:var(--c-signal);transform:translateY(.12em);animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.hero{padding-block:var(--s-8) var(--s-10);border-bottom:1px solid var(--c-line)}
.hero-copy{display:grid;gap:var(--s-4)}
.hero h1{max-width:18ch;font-size:var(--fs-4);line-height:var(--lh-tight)}
.hero figure{margin:0;border:1px solid var(--c-line);border-radius:var(--r-lg);overflow:hidden;background:var(--c-surface);box-shadow:0 24px 64px -36px rgba(0,0,0,.9)}
.hero img{width:100%;aspect-ratio:16/9;object-fit:cover}
.article{padding-block:var(--s-10)}
.section{display:grid;gap:var(--s-3);padding-block:var(--s-8);border-top:1px solid var(--c-line)}
.section:first-child{border-top:0;padding-top:0}
.section h2{font-size:var(--fs-3);line-height:var(--lh-snug)}
.prose{display:grid;gap:var(--s-3);max-width:var(--measure);color:var(--c-muted);font-size:var(--fs-1);line-height:1.6}
.prose strong{color:var(--c-text);font-weight:600}
.how ol{display:grid;gap:var(--s-3);margin:0;padding:0;max-width:var(--measure);list-style:none;counter-reset:steps;color:var(--c-muted);font-size:var(--fs-1);line-height:1.6}
.how li{position:relative;padding-left:var(--s-6);counter-increment:steps}
.how li::before{content:counter(steps);position:absolute;left:0;top:.05em;width:var(--s-4);height:var(--s-4);display:grid;place-items:center;border:1px solid var(--c-signal-line);border-radius:50%;background:var(--c-signal-wash);color:var(--c-signal);font:500 var(--fs--1)/1 var(--font-mono)}
.how li strong{color:var(--c-text);font-weight:600}
.needs-josh{display:inline;padding:.05em .25em .1em;border-left:3px solid var(--c-signal);background:var(--c-signal-wash);color:var(--c-text);font-family:var(--font-mono);font-size:.82em;line-height:1.5;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.figure{margin:var(--s-4) 0 0;border:1px solid var(--c-line);border-radius:var(--r-md);overflow:hidden;background:var(--c-surface)}
.figure img{width:100%}
.how .figure{margin-left:calc(var(--s-6) * -1)}
.footer{padding-block:var(--s-6);border-top:1px solid var(--c-line);color:var(--c-subtle);font-size:var(--fs--1)}
.footer a{display:inline-flex;align-items:center;gap:var(--s-1);min-height:var(--tap);color:var(--c-muted);font-family:var(--font-mono)}
.footer a::before{content:"\u2190";color:var(--c-signal)}
@media (min-width:768px){
  .hero{padding-block:var(--s-12) var(--s-16)}
  .hero h1{font-size:var(--fs-5)}
  .article{padding-block:var(--s-12)}
  .section{grid-template-columns:minmax(180px,4fr) minmax(0,8fr);gap:var(--s-8);padding-block:var(--s-10)}
  .section:first-child{padding-top:0}
  .section h2{position:sticky;top:calc(64px + var(--s-4));align-self:start}
  .figure img{max-height:800px;object-fit:contain;background:var(--c-bg)}
}
@media (min-width:1024px){
  .hero h1{font-size:var(--fs-6)}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
}
`;

function usage() {
  return (
    'Usage: scripts/case-study-gen.js --copy <copy.md> ' +
    '--assets <dir> --slug <slug> --root <dir>'
  );
}

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const values = {};
  const names = new Set(['--copy', '--assets', '--slug', '--root']);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      return { help: true };
    }

    const equalsIndex = argument.indexOf('=');
    const name =
      equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    if (!names.has(name)) {
      fail(`Unknown argument: ${argument}\n${usage()}`);
    }

    const value =
      equalsIndex === -1 ? argv[(index += 1)] : argument.slice(equalsIndex + 1);
    if (!value || value.startsWith('--')) {
      fail(`Missing value for ${name}\n${usage()}`);
    }
    values[name.slice(2)] = value;
  }

  for (const name of ['copy', 'assets', 'slug', 'root']) {
    if (!values[name]) {
      fail(`Missing --${name}\n${usage()}`);
    }
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    fail(`Invalid slug: ${values.slug}`);
  }

  return values;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineMarkdown(value, { callToAction = false } = {}) {
  let html = escapeHtml(value);

  html = html.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_match, label, href) => {
      const classes = callToAction
        ? href.startsWith('https://cal.com/')
          ? ' class="btn btn-primary"'
          : href.startsWith('mailto:')
            ? ' class="btn"'
            : ''
        : '';
      const arrow = href.startsWith('https://cal.com/')
        ? ' <span class="arr" aria-hidden="true">\u2192</span>'
        : '';
      return `<a${classes} href="${escapeHtml(href)}">${label}${arrow}</a>`;
    },
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return html;
}

function headingId(heading) {
  const knownId = HEADING_IDS[heading.toLowerCase()];
  if (knownId) {
    return knownId;
  }

  return heading
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCopy(source) {
  if (!/^##\s+Case study\s*$/im.test(source)) {
    fail('Copy is missing the "## Case study" heading');
  }
  if (/\[needs Josh/i.test(source)) {
    fail('Copy still contains a [needs Josh ...] placeholder');
  }

  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
  const lines = withoutComments.split(/\r?\n/);
  const sections = [];
  let title = null;
  let currentSection = null;

  for (const line of lines) {
    const titleMatch = line.match(/^#\s+(.+?)\s*$/);
    if (!title) {
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      continue;
    }

    const sectionMatch = line.match(/^##\s+(.+?)\s*$/);
    if (sectionMatch) {
      const heading = sectionMatch[1].trim();
      if (heading.toLowerCase() === 'case study') {
        currentSection = null;
        continue;
      }
      currentSection = { heading, lines: [] };
      sections.push(currentSection);
      continue;
    }

    if (/^#\s+/.test(line)) {
      fail('Copy must contain exactly one top-level heading');
    }
    if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  if (!title) {
    fail('Copy is missing a top-level case-study title');
  }
  if (sections.length === 0) {
    fail('Copy is missing case-study sections');
  }

  return { title, sections };
}

function parseBlocks(lines) {
  const blocks = [];
  let paragraphs = [];
  let list = null;

  function flushParagraph() {
    if (paragraphs.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paragraphs.join(' '),
      });
      paragraphs = [];
    }
  }

  function flushList() {
    if (list) {
      blocks.push({ type: 'list', items: list });
      list = null;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const listMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      if (!list) {
        list = [];
      }
      list.push(listMatch[1].trim());
      continue;
    }

    flushList();
    paragraphs.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function picture(base, slug, { hero = false, className = 'figure' } = {}) {
  const details = FIGURE_DETAILS[base] ?? {
    width: 1600,
    height: 900,
    alt: `${base} case study illustration`,
  };
  const imagePath = `/img/case-studies/${slug}/${slug}-${base}`;
  const figureClass = className ? ` class="${className}"` : '';
  const loading = hero
    ? 'loading="eager" fetchpriority="high"'
    : 'loading="lazy" decoding="async"';

  return [
    `<figure${figureClass}>`,
    '  <picture>',
    `    <source srcset="${imagePath}.avif" type="image/avif">`,
    `    <source srcset="${imagePath}.webp" type="image/webp">`,
    `    <img src="${imagePath}.png" width="${details.width}" height="${details.height}" alt="${details.alt}" ${loading}>`,
    '  </picture>',
    '</figure>',
  ].join('\n');
}

function renderParagraph(text, options) {
  return `<p>${inlineMarkdown(text, options)}</p>`;
}

function renderProse(blocks, { callToAction = false } = {}) {
  const content = blocks
    .map((block) => {
      if (block.type === 'list') {
        return [
          '<ol>',
          ...block.items.map((item) => `  <li>${inlineMarkdown(item)}</li>`),
          '</ol>',
        ].join('\n');
      }
      return renderParagraph(block.text, { callToAction });
    })
    .join('\n');

  return `<div class="prose">\n${content}\n</div>`;
}

function renderHowItWorks(section, slug) {
  const parts = [];

  for (const block of parseBlocks(section.lines)) {
    if (block.type !== 'list') {
      parts.push(renderParagraph(block.text));
      continue;
    }

    const items = block.items.map((item, index) => {
      const figure =
        index === 2
          ? `\n${picture('fig2-approval', slug)}`
          : index === 3
            ? `\n${picture('fig3-compute', slug)}`
            : '';
      return `<li>${inlineMarkdown(item)}${figure}</li>`;
    });
    parts.push(`<ol>\n${items.join('\n')}\n</ol>`);
  }

  return parts.join('\n');
}

function renderSection(section, slug) {
  const normalizedHeading = section.heading.toLowerCase();
  const id = headingId(section.heading);
  const className =
    normalizedHeading === 'how it works' ? 'section how' : 'section';
  let content;

  if (normalizedHeading === 'how it works') {
    content = renderHowItWorks(section, slug);
  } else {
    const blocks = parseBlocks(section.lines);
    if (normalizedHeading === 'what it does') {
      content = [renderProse(blocks), picture('fig1-roles', slug)].join('\n');
    } else {
      content = renderProse(blocks, {
        callToAction: normalizedHeading.startsWith('want to run'),
      });
    }
  }

  return [
    `<section class="${className}" aria-labelledby="${id}">`,
    `  <h2 id="${id}">${escapeHtml(section.heading)}</h2>`,
    ...content
      .split('\n')
      .map((line) => (line ? `  ${line}` : ''))
      .filter((line, index, all) => line || all[index - 1]),
    '</section>',
  ].join('\n');
}

function metadataFor(slug, title) {
  const pageTitle = `${title} \u00b7 Josh McCoy`;
  const description =
    slug === 'bot-team'
      ? '15 assistants. one job each. they draft. i approve. how i run my own work with ai.'
      : `${title}. a case study by Josh McCoy.`;
  const canonical = `https://joshmccoy.dev/case-studies/${slug}/`;
  const ogImage = `https://joshmccoy.dev/img/case-studies/${slug}/${slug}-og.png`;

  return { pageTitle, description, canonical, ogImage };
}

function renderPage(parsed, slug) {
  const metadata = metadataFor(slug, parsed.title);
  const sections = parsed.sections.map((section) =>
    renderSection(section, slug),
  );

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(metadata.pageTitle)}</title>
<meta name="description" content="${escapeHtml(metadata.description)}">
<meta name="theme-color" content="#0a0a0b">
<link rel="canonical" href="${metadata.canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="joshmccoy.dev">
<meta property="og:title" content="${escapeHtml(metadata.pageTitle)}">
<meta property="og:description" content="${escapeHtml(metadata.description)}">
<meta property="og:url" content="${metadata.canonical}">
<meta property="og:image" content="${metadata.ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(metadata.description)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@j0shdotwtf">
<meta name="twitter:image" content="${metadata.ogImage}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/geist-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/tokens.css">
<style>${STYLE}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Back to joshmccoy.dev">joshmccoy.dev<span class="cursor" aria-hidden="true"></span></a>
  </div>
</header>

<main id="main">
  <article>
    <header class="hero">
      <div class="wrap">
        <div class="hero-copy">
          <h1>${escapeHtml(parsed.title)}</h1>
        </div>
      </div>
      <div class="wrap">
        ${picture('hero', slug, { hero: true, className: '' })}
      </div>
    </header>

    <div class="wrap article">
${sections.map((section) => `      ${section}`).join('\n\n')}
    </div>
  </article>
</main>

<footer class="footer">
  <div class="wrap">
    <a href="/">Back to joshmccoy.dev</a>
  </div>
</footer>
</body>
</html>
`;
}

function loadImages(assetsPath, slug) {
  if (!fs.existsSync(assetsPath) || !fs.statSync(assetsPath).isDirectory()) {
    fail(`Assets directory does not exist: ${assetsPath}`);
  }

  for (const base of IMAGE_BASES) {
    for (const { extension } of IMAGE_VARIANTS) {
      const filename = `${slug}-${base}${extension}`;
      const sourcePath = path.join(assetsPath, filename);
      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        fail(`Missing case-study image: ${filename}`);
      }
    }
  }

  return fs
    .readdirSync(assetsPath, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith(`${slug}-`) &&
        IMAGE_EXTENSIONS.has(path.extname(entry.name)),
    )
    .map((entry) => ({
      filename: entry.name,
      contents: fs.readFileSync(path.join(assetsPath, entry.name)),
    }))
    .sort((left, right) => left.filename.localeCompare(right.filename));
}

function writeOutput(root, slug, html, images) {
  const pageDirectory = path.join(root, 'case-studies', slug);
  const imageDirectory = path.join(root, 'img', 'case-studies', slug);

  fs.mkdirSync(pageDirectory, { recursive: true });
  fs.mkdirSync(imageDirectory, { recursive: true });

  for (const image of images) {
    fs.writeFileSync(path.join(imageDirectory, image.filename), image.contents);
  }
  fs.writeFileSync(path.join(pageDirectory, 'index.html'), html, 'utf8');
}

function main(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    if (args.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }

    const copyPath = path.resolve(args.copy);
    const assetsPath = path.resolve(args.assets);
    const root = path.resolve(args.root);

    if (!fs.existsSync(copyPath) || !fs.statSync(copyPath).isFile()) {
      fail(`Copy file does not exist: ${copyPath}`);
    }

    const source = fs.readFileSync(copyPath, 'utf8');
    const parsed = parseCopy(source);
    const images = loadImages(assetsPath, args.slug);
    const html = renderPage(parsed, args.slug);
    writeOutput(root, args.slug, html, images);

    process.stdout.write(
      `Generated case-studies/${args.slug}/index.html and ` +
        `${images.length} images\n`,
    );
    return 0;
  } catch (error) {
    process.stderr.write(`case-study-gen: ${error.message}\n`);
    return 1;
  }
}

module.exports = { main };

if (require.main === module) {
  process.exitCode = main();
}
