#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { botTeamSize } from '../data/config.mjs';
import { diagram, diagramNames } from './diagrams.mjs';
import { slugFor } from './share-cards.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://joshmccoy.dev';
const CASE_STUDY = 'https://j0sh.wtf/case-studies/bot-team/';
const COUNT_PHRASE =
  /\b(?:eleven|twelve|thirteen|fourteen|fifteen|\d+)\s+(?:ai\s+)?(?:bots|assistants|agents|lanes)\b/i;
const PHONE = /\b(?:\+?1[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/;
const DIAGRAMS = new Set(diagramNames);

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8'));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function dedent(value) {
  const lines = String(value).replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const pad = lines
    .filter((line) => line.trim())
    .reduce((min, line) => Math.min(min, line.match(/^\s*/)[0].length), Infinity);
  return `${lines.map((line) => line.slice(pad)).join('\n')}\n`;
}

function indentBlock(value, spaces = 4) {
  const pad = ' '.repeat(spaces);
  return String(value)
    .replace(/^\n/, '')
    .replace(/\s+$/, '')
    .split('\n')
    .map((line) => (line.trim() ? `${pad}${line}` : ''))
    .join('\n');
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }
}

function walkStrings(value, label, visit) {
  if (typeof value === 'string') {
    visit(value, label);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, `${label}[${index}]`, visit));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walkStrings(child, `${label}.${key}`, visit);
    }
  }
}

function assertSafeCopy(value, label) {
  walkStrings(value, label, (text, where) => {
    if (COUNT_PHRASE.test(text)) {
      throw new Error(`${where} states a bot count`);
    }
    if (PHONE.test(text) || text.includes('tel:')) {
      throw new Error(`${where} contains a phone number`);
    }
  });
}

function assertHref(value, label) {
  if (
    !/^https:\/\//.test(value) &&
    !value.startsWith('mailto:') &&
    !value.startsWith('/')
  ) {
    throw new Error(`${label} has a bad href: ${value}`);
  }
}

function loadModel() {
  const projects = readJson('projects.json');
  const log = readJson('log.json');
  const now = readJson('now.json');
  assertSafeCopy({ projects, log, now }, 'data');

  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('projects.json must be a non-empty array');
  }
  const ids = new Set();
  for (const project of projects) {
    assertString(project.id, 'project.id');
    assertString(project.title, `${project.id}.title`);
    assertString(project.status, `${project.id}.status`);
    assertString(project.kind, `${project.id}.kind`);
    assertString(project.summary, `${project.id}.summary`);
    assertString(project.result, `${project.id}.result`);
    assertString(project.diagram, `${project.id}.diagram`);
    if (!/^[a-z0-9-]+$/.test(project.id)) {
      throw new Error(`Bad project id: ${project.id}`);
    }
    if (ids.has(project.id)) {
      throw new Error(`Duplicate project id: ${project.id}`);
    }
    ids.add(project.id);
    if (project.span !== undefined && project.span !== 'wide') {
      throw new Error(`${project.id} has a bad span`);
    }
    if (project.tone !== undefined && project.tone !== 'off' && project.tone !== 'live') {
      throw new Error(`${project.id} has a bad tone`);
    }
    if (!DIAGRAMS.has(project.diagram)) {
      throw new Error(`${project.id} has an unknown diagram`);
    }
    if (project.tags !== undefined && !Array.isArray(project.tags)) {
      throw new Error(`${project.id} tags must be an array`);
    }
    for (const tag of project.tags ?? []) {
      assertString(tag, `${project.id}.tag`);
    }
    for (const fact of project.facts ?? []) {
      assertString(fact.label, `${project.id}.fact.label`);
      assertString(fact.value, `${project.id}.fact.value`);
      if (/^\d+$/.test(fact.value)) {
        throw new Error(`${project.id} fact ${fact.label} is a bare number`);
      }
    }
    if (project.link) {
      assertHref(project.link.href, `${project.id}.link`);
      assertString(project.link.text, `${project.id}.link.text`);
    }
  }

  const bot = projects.find((project) => project.id === 'bot-team');
  if (!bot || bot.link?.href !== CASE_STUDY || bot.link?.text !== 'how i run my work') {
    throw new Error('The bot-team card must link to the j0sh.wtf case study');
  }

  if (!Array.isArray(log) || log.length === 0) {
    throw new Error('log.json must be a non-empty array');
  }
  const slugs = new Set();
  for (const entry of log) {
    assertString(entry.slug, 'log.slug');
    assertString(entry.title, `${entry.slug}.title`);
    assertString(entry.kicker, `${entry.slug}.kicker`);
    assertString(entry.summary, `${entry.slug}.summary`);
    if (!/^[a-z0-9-]+$/.test(entry.slug)) {
      throw new Error(`Bad log slug: ${entry.slug}`);
    }
    if (slugs.has(entry.slug)) {
      throw new Error(`Duplicate log slug: ${entry.slug}`);
    }
    slugs.add(entry.slug);
    if (!Array.isArray(entry.body) || entry.body.length === 0) {
      throw new Error(`${entry.slug} needs a body`);
    }
    for (const paragraph of entry.body) {
      assertString(paragraph, `${entry.slug}.body`);
    }
    for (const link of entry.links ?? []) {
      assertHref(link.href, `${entry.slug}.link`);
      assertString(link.text, `${entry.slug}.link.text`);
    }
  }

  if (!Array.isArray(now) || now.length === 0) {
    throw new Error('now.json must be a non-empty array');
  }
  for (const item of now) {
    assertString(item.name, 'now.name');
    assertString(item.note, 'now.note');
  }

  return { projects, log, now, botTeamSize };
}

export function applyRoster(project, size) {
  const facts = [...(project.facts ?? [])];
  if (project.id !== 'bot-team') {
    return facts;
  }
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 1) {
    return facts;
  }
  facts.push({ label: 'Roster', value: String(size) });
  return facts;
}

function absolute(pathname) {
  return pathname === '/' ? `${SITE}/` : `${SITE}${pathname}`;
}

function jsonLdScript(data) {
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function linkHtml(link, className) {
  const rel = link.rel ? ` rel="${escapeHtml(link.rel)}"` : '';
  const href = escapeHtml(link.href);
  const text = escapeHtml(link.text);
  const external = link.href.startsWith('https://');
  const outside = link.text === 'how i run my work';
  const arrow = external ? '<span aria-hidden="true"> ↗</span>' : '';
  const markup = outside
    ? `<a class="${className}" href="${href}"${rel}>${text}</a>${arrow}`
    : `<a class="${className}" href="${href}"${rel}>${text}${arrow}</a>`;
  return className === 'more' ? `<p class="card-link">${markup}</p>` : markup;
}

function nav(current) {
  const items = [
    ['/#builds', 'Builds', 'builds', ''],
    ['/log/', 'Log', 'log', ''],
    ['/#how', 'How I build', 'how', ' hide-sm'],
    ['/#hire', 'Hire', 'hire', ''],
  ];
  const links = items
    .map(([href, text, key, extra]) => {
      const currentAttr = key === current ? ' aria-current="page"' : '';
      return `<a class="nav-link${extra}" href="${href}"${currentAttr}>${text}</a>`;
    })
    .join('');
  return `<nav class="nav" aria-label="Main">${links}<a class="nav-link" href="https://j0sh.wtf">j0sh.wtf <span aria-hidden="true">↗</span></a></nav>`;
}

function nowList(items, hidden) {
  const hiddenAttr = hidden ? ' aria-hidden="true"' : ' aria-label="Current work"';
  const rows = items
    .map(
      (item) =>
        `<li><b>${escapeHtml(item.name)}</b> <span>${escapeHtml(item.note)}</span></li>`,
    )
    .join('');
  return `<ul${hiddenAttr}>${rows}</ul>`;
}

function nowStrip(now) {
  return `<section class="now" aria-labelledby="now-label"><p class="now-kicker" id="now-label">Now building</p><div class="now-window"><div class="now-track">${nowList(now, false)}${nowList(now, true)}</div></div><label class="now-pause-label"><input class="now-pause" type="checkbox"><span class="when-run">Pause</span><span class="when-paused">Play</span></label></section>`;
}

function footer() {
  return dedent(`
    <footer>
      <div class="wrap">
        <span>© 2026 Josh McCoy · Coastal Bend, Texas</span>
        <a href="mailto:josh@mccoybuilt.com">josh@mccoybuilt.com</a>
      </div>
    </footer>
  `);
}

function shell({
  title,
  description,
  ogTitle,
  ogAlt,
  pathname,
  ogSlug,
  current,
  main,
  robots,
  ogType = 'website',
  jsonLd = '',
  now,
}) {
  const canonical = pathname ? `<link rel="canonical" href="${absolute(pathname)}">` : '';
  const robotsTag = robots ? `<meta name="robots" content="${escapeHtml(robots)}">` : '';
  const url = pathname ? `<meta property="og:url" content="${absolute(pathname)}">` : '';
  const image = `${SITE}/img/og/${ogSlug}.png`;
  const headExtras = [canonical, robotsTag, url, jsonLd].filter(Boolean).join('\n');
  return dedent(`
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#0a0a0b">
${indentBlock(headExtras)}
    <meta property="og:type" content="${ogType}">
    <meta property="og:site_name" content="joshmccoy.dev">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(ogAlt)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@j0shdotwtf">
    <meta name="twitter:image" content="${image}">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="preload" href="/fonts/geist-latin-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/geist-mono-latin-var.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/tokens.css">
    <link rel="stylesheet" href="/site.css">
    </head>
    <body>
    <a class="skip" href="#main">Skip to content</a>
    <div class="marks" aria-hidden="true"></div>
    <p class="spine" aria-hidden="true">Coastal Bend, Texas · Builder</p>
    <header class="top">
      <div class="wrap">
        <a class="brand" href="/" aria-label="joshmccoy.dev home">joshmccoy.dev<span class="cursor" aria-hidden="true"></span></a>
        ${nav(current)}
      </div>
    </header>
${indentBlock(nowStrip(now))}
    <main id="main">
${indentBlock(main)}
    </main>
${indentBlock(footer())}
    </body>
    </html>
  `);
}

function projectCard(project, index, size) {
  const wide = project.span === 'wide' ? ' wide' : '';
  const tone = project.tone === 'off' ? ' off' : '';
  const number = `JM-${String(index + 1).padStart(2, '0')}`;
  const detail = project.detail ? `<p>${escapeHtml(project.detail)}</p>` : '';
  const facts = applyRoster(project, size);
  const factsHtml = facts.length
    ? `<dl class="facts">${facts
        .map(
          (fact) =>
            `<div><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`,
        )
        .join('')}</dl>`
    : '';
  const tags = project.tags?.length
    ? `<ul class="tags" aria-label="Built with">${project.tags
        .map((tag) => `<li>${escapeHtml(tag)}</li>`)
        .join('')}</ul>`
    : '';
  const link = project.link ? linkHtml(project.link, 'more') : '';
  return `<li class="card${wide}" id="${escapeHtml(project.id)}"><div class="viz" aria-hidden="true">${diagram(project.diagram)}</div><div class="card-body"><div class="meta"><span class="status${tone}"><span class="dot" aria-hidden="true"></span>${escapeHtml(project.status)}</span><span class="job-no">${number}</span><span class="label">${escapeHtml(project.kind)}</span></div><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.summary)}</p>${detail}<p class="result"><span class="label">Result</span> ${escapeHtml(project.result)}</p>${factsHtml}${tags}${link}</div></li>`;
}

function logItem(entry) {
  return `<li><a href="/log/${escapeHtml(entry.slug)}/"><span class="label">${escapeHtml(entry.kicker)}</span><span class="log-title">${escapeHtml(entry.title)}</span><span class="log-summary">${escapeHtml(entry.summary)}</span></a></li>`;
}

function homeJsonLd() {
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE}/#person`,
    name: 'Josh McCoy',
    url: `${SITE}/`,
    email: 'josh@mccoybuilt.com',
    jobTitle: 'Builder',
    homeLocation: { '@type': 'Place', name: 'Coastal Bend, Texas' },
    worksFor: {
      '@type': 'Organization',
      name: 'McCoy Built AI Solutions',
      url: 'https://mccoybuilt.com',
    },
    sameAs: [
      'https://github.com/joshmccoydev',
      'https://j0sh.wtf',
      'https://instagram.com/j0sh.wtf',
      'https://tiktok.com/@j0shdotwtf',
      'https://x.com/j0shdotwtf',
      'https://mccoybuilt.com',
    ],
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'joshmccoy.dev',
    url: `${SITE}/`,
    publisher: { '@id': `${SITE}/#person` },
    about: { '@id': `${SITE}/#person` },
  };
  return `${jsonLdScript(person)}\n${jsonLdScript(website)}`;
}

function renderHome(model) {
  const cards = model.projects
    .map((project, index) => projectCard(project, index, model.botTeamSize))
    .join('\n');
  const notes = model.log.map((entry) => logItem(entry)).join('\n');
  const main = dedent(`
    <section class="hero" aria-labelledby="hero-h">
      <div class="wrap">
        <div>
          <p class="label eyebrow"><span class="dot" aria-hidden="true"></span>Builder · Coastal Bend, Texas</p>
          <h1 id="hero-h">Tradesman turned builder. <span>I make bots, automations and tools that do real work.</span></h1>
          <p class="lead">I spent years building with my hands. Software gets the same treatment: look at the job, make the smallest thing that holds, and stay with it.</p>
          <dl class="sheet-meta">
            <div><dt>Sheet</dt><dd>Shop log</dd></div>
            <div><dt>Approver</dt><dd>Josh</dd></div>
            <div><dt>Sends</dt><dd>On approval</dd></div>
          </dl>
          <div class="actions">
            <a class="btn btn-primary" href="#builds">See the builds <span class="arr" aria-hidden="true">↓</span></a>
            <a class="btn btn-ghost" href="#hire">Work with me <span class="arr" aria-hidden="true">→</span></a>
          </div>
        </div>
        <figure class="term">
          <div class="term-bar" aria-hidden="true"><i></i><i></i><i></i><span>~/bench</span></div>
          <div class="term-body">
            <p class="cmd" aria-hidden="true"><b>$</b> bench --sample</p>
            <ul aria-label="Sample lanes">
              <li><span class="d" aria-hidden="true"></span><span class="n">alfred</span><span>chief of staff</span></li>
              <li><span class="d" aria-hidden="true"></span><span class="n">hemingway</span><span>edits drafts</span></li>
              <li><span class="d" aria-hidden="true"></span><span class="n">dolly</span><span>calendar</span></li>
              <li><span class="d" aria-hidden="true"></span><span class="n">elon</span><span>code, deploys</span></li>
            </ul>
            <p class="rule"><b>rule:</b> nothing sends until Josh says yes.</p>
          </div>
          <figcaption class="sr-only">A sample of lanes, not a full roster. Nothing sends, posts, or spends until Josh says yes.</figcaption>
        </figure>
      </div>
    </section>

    <section class="section" id="builds" aria-labelledby="builds-h">
      <div class="wrap">
        <div class="section-head">
          <h2 id="builds-h">Selected builds</h2>
          <p>Tools I built because I was tired of doing the chore by hand. Most of them run my own week.</p>
        </div>
        <ul class="grid">
          ${cards}
        </ul>
      </div>
    </section>

    <section class="section" id="notes" aria-labelledby="notes-h">
      <div class="wrap">
        <div class="section-head">
          <h2 id="notes-h">Build log</h2>
          <p>Short notes from the shop. The illustrated case study stays on j0sh.wtf.</p>
        </div>
        <ul class="log-list">
          ${notes}
        </ul>
        <p class="section-more"><a class="text-link" href="/log/">All notes</a></p>
      </div>
    </section>

    <section class="section" id="how" aria-labelledby="how-h">
      <div class="wrap">
        <div class="section-head">
          <h2 id="how-h">How I build</h2>
          <p>Same rules as a job site. Look twice, build what the job needs, leave it clean.</p>
        </div>
        <ol class="steps">
          <li class="step"><span class="n">01</span><h3>Look at the job first</h3><p>I watch how the work gets done before I write anything. Most of the answer is in that first look.</p></li>
          <li class="step"><span class="n">02</span><h3>Build the smallest thing that works</h3><p>One tool, one job. It ships while it's still small, then it gets better because someone is using it.</p></li>
          <li class="step"><span class="n">03</span><h3>Keep a human on the switch</h3><p>Bots draft and prepare. A person approves anything that sends, posts, or spends money.</p></li>
        </ol>
        <p class="section-more"><a class="text-link" href="${CASE_STUDY}">how i run my work</a><span aria-hidden="true"> ↗</span></p>
        <ul class="stack" aria-label="Tools I use">
          <li>TypeScript</li><li>Next.js</li><li>React</li><li>Tailwind</li><li>Python</li><li>Cloudflare Workers</li><li>AI agents + MCP</li><li>Google Workspace</li><li>Excel / Sheets</li>
        </ul>
      </div>
    </section>

    <section class="section" aria-labelledby="about-h">
      <div class="wrap about">
        <div class="mono-tile" aria-hidden="true"><b>JM<i></i></b></div>
        <div>
          <h2 id="about-h">Hands first, code second.</h2>
          <p>I'm Josh McCoy. I wrote my first code in 2004, then spent years on job sites. Software has to pass the same test as anything I'd build with my hands: <strong>if it doesn't save real time on real work, it doesn't ship.</strong></p>
          <p>I built a company, Dad Can't Draw, and sold it.</p>
          <p>These days I run <a href="https://mccoybuilt.com">McCoy Built AI Solutions</a>, an AI-education retainer for local businesses in the Coastal Bend, Texas. I teach owners and their crews to put AI to work on the jobs they already have. If the job is a marketing website, I'm the wrong hire. This site is the shop log: tools I built and still use.</p>
        </div>
      </div>
    </section>

    <section class="section" id="hire" aria-labelledby="hire-h">
      <div class="wrap">
        <div class="hire">
          <p class="label eyebrow"><span class="dot" aria-hidden="true"></span>McCoy Built AI Solutions</p>
          <h2 id="hire-h">Want AI in the business you already run?</h2>
          <p>The retainer is hands-on teaching. I sit with you and your team and we put AI on real work: the inbox, the sheets, the follow-ups. If a tool has to be built, we scope it on a short call and I price it before I start.</p>
          <dl class="price">
            <div class="lead-offer"><dt>Hands-on AI teaching</dt><dd>from $1,000/mo <small>month to month</small></dd></div>
          </dl>
          <p class="price-sub">When you need something built</p>
          <dl class="price price-follow">
            <div><dt>Custom AI setup</dt><dd>from ~$2,000 <small>per project</small></dd></div>
            <div><dt>Custom software</dt><dd>from $5,000 <small>per project</small></dd></div>
          </dl>
          <div class="actions">
            <a class="btn btn-primary" href="https://cal.com/mccoybuilt/15min">Book a free 15-min call <span class="arr" aria-hidden="true">→</span></a>
            <a class="btn btn-ghost" href="mailto:josh@mccoybuilt.com">Email josh@mccoybuilt.com</a>
          </div>
          <p class="fine">Month to month. Quoted work is priced before I start.</p>
          <a class="text-link" href="https://mccoybuilt.com/services/#pricing">mccoybuilt.com/services</a>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="else-h">
      <div class="wrap">
        <h2 id="else-h" class="label else-label">Elsewhere</h2>
        <div class="links">
          <a href="https://j0sh.wtf"><b>j0sh.wtf</b><span>AI tools, minus the hype.</span><span class="u">j0sh.wtf ↗</span></a>
          <a href="https://github.com/joshmccoydev" rel="me"><b>GitHub</b><span>Public repos, including LifeDash.</span><span class="u">@joshmccoydev ↗</span></a>
          <a href="https://mccoybuilt.com"><b>McCoy Built AI Solutions</b><span>An AI-education retainer for local businesses.</span><span class="u">mccoybuilt.com ↗</span></a>
        </div>
        <ul class="social" aria-label="Social">
          <li><a href="https://instagram.com/j0sh.wtf" rel="me">Instagram @j0sh.wtf</a></li>
          <li><a href="https://tiktok.com/@j0shdotwtf" rel="me">TikTok @j0shdotwtf</a></li>
          <li><a href="https://x.com/j0shdotwtf" rel="me">X @j0shdotwtf</a></li>
        </ul>
      </div>
    </section>
  `);

  return shell({
    title: 'Josh McCoy · Builder of bots, automations and tools',
    description:
      'Tradesman turned builder in the Coastal Bend, Texas. Josh McCoy makes bots, automations and tools that do real work, and teaches local businesses to use AI through McCoy Built AI Solutions.',
    ogTitle: 'Josh McCoy · Tradesman turned builder',
    ogAlt:
      'Josh McCoy, tradesman turned builder in the Coastal Bend, Texas. Bots, automations and tools that do real work.',
    pathname: '/',
    ogSlug: 'home',
    current: '',
    main,
    jsonLd: homeJsonLd(),
    now: model.now,
  });
}

function renderLogIndex(model) {
  const notes = model.log.map((entry) => logItem(entry)).join('\n');
  const main = dedent(`
    <article class="entry wrap">
      <p class="label">Shop</p>
      <h1>Build log</h1>
      <p class="lead">Notes on the tools I actually run. The illustrated bot-team story stays on j0sh.wtf.</p>
      <ul class="log-list">
        ${notes}
      </ul>
    </article>
  `);
  return shell({
    title: 'Build log · joshmccoy.dev',
    description:
      'Build notes from Josh McCoy in the Coastal Bend: the bot team, LifeDash, shop spreadsheets, and j0sh.wtf.',
    ogTitle: 'Build log',
    ogAlt: 'Build log on joshmccoy.dev. Notes from the shop in the Coastal Bend, Texas.',
    pathname: '/log/',
    ogSlug: slugFor('log/index.html'),
    current: 'log',
    ogType: 'website',
    main,
    now: model.now,
  });
}

function renderEntry(entry, model) {
  const paragraphs = entry.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
  const links = (entry.links ?? [])
    .map((link) => linkHtml(link, 'btn btn-ghost'))
    .join('');
  const main = dedent(`
    <article class="entry wrap">
      <p class="label">${escapeHtml(entry.kicker)}</p>
      <h1>${escapeHtml(entry.title)}</h1>
      <p class="lead">${escapeHtml(entry.summary)}</p>
      <div class="prose">${paragraphs}</div>
      <div class="actions">${links}<a class="btn btn-ghost" href="/log/">All notes</a></div>
    </article>
  `);
  const relativePath = `log/${entry.slug}/index.html`;
  return shell({
    title: `${entry.title} · joshmccoy.dev`,
    description: entry.summary,
    ogTitle: entry.title,
    ogAlt: `${entry.kicker}: ${entry.title}`,
    pathname: `/log/${entry.slug}/`,
    ogSlug: slugFor(relativePath),
    current: 'log',
    ogType: 'article',
    main,
    now: model.now,
  });
}

function renderLost(model) {
  const main = dedent(`
    <div class="lost wrap">
      <p class="cmd"><b>$</b> cd this-page<br>no such file or directory</p>
      <h1>Nothing built here yet.</h1>
      <a class="btn btn-primary" href="/">Back to joshmccoy.dev</a>
    </div>
  `);
  return shell({
    title: 'Not found · joshmccoy.dev',
    description: "This page doesn't exist on joshmccoy.dev.",
    ogTitle: 'Nothing built here yet',
    ogAlt: 'Nothing built here yet on joshmccoy.dev.',
    pathname: '',
    ogSlug: 'not-found',
    current: '',
    robots: 'noindex',
    main,
    now: model.now,
  });
}

function renderSitemap(model) {
  const paths = ['/', '/log/', ...model.log.map((entry) => `/log/${entry.slug}/`)];
  const urls = paths.map((pathname) => `  <url><loc>${absolute(pathname)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderAll(model = loadModel()) {
  const files = {
    'index.html': renderHome(model),
    '404.html': renderLost(model),
    'log/index.html': renderLogIndex(model),
    'sitemap.xml': renderSitemap(model),
  };
  for (const entry of model.log) {
    files[`log/${entry.slug}/index.html`] = renderEntry(entry, model);
  }
  return files;
}

function listHtml(directory, found = []) {
  if (!fs.existsSync(directory)) {
    return found;
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      listHtml(absolutePath, found);
    } else if (entry.name.endsWith('.html')) {
      found.push(path.relative(ROOT, absolutePath).split(path.sep).join('/'));
    }
  }
  return found;
}

function unexpectedLogPages(files) {
  const keep = new Set(Object.keys(files).filter((relativePath) => relativePath.startsWith('log/')));
  return listHtml(path.join(ROOT, 'log')).filter((relativePath) => !keep.has(relativePath));
}

function firstDifference(left, right) {
  const limit = Math.min(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    if (left[index] !== right[index]) {
      return index;
    }
  }
  return limit;
}

function writeAll(files) {
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(ROOT, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);
  }
  for (const relativePath of unexpectedLogPages(files)) {
    fs.rmSync(path.join(ROOT, relativePath));
  }
}

function checkAll(files) {
  const problems = [];
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
      problems.push(`${relativePath} is missing. Run node scripts/render-site.mjs`);
      continue;
    }
    const current = fs.readFileSync(absolutePath, 'utf8');
    if (current !== contents) {
      const index = firstDifference(current, contents);
      problems.push(`${relativePath} is stale near character ${index}. Run node scripts/render-site.mjs`);
    }
  }
  for (const relativePath of unexpectedLogPages(files)) {
    problems.push(`${relativePath} is no longer generated`);
  }
  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }
}

function main(argv) {
  const check = argv.includes('--check');
  if (argv.some((argument) => argument !== '--check')) {
    throw new Error('Unknown argument');
  }
  const files = renderAll();
  if (check) {
    checkAll(files);
    console.log(`ok ${Object.keys(files).length} files`);
    return;
  }
  writeAll(files);
  console.log(Object.keys(files).sort().join('\n'));
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
