#!/usr/bin/env node
// Post-deploy live check for joshmccoy.dev. Prints PASS/FAIL lines only; exit 1 on any failure.
import { pathToFileURL } from 'node:url';

const REQUIRED_HEAD = [
  /<link rel="canonical" href="https:\/\/joshmccoy\.dev\/">/,
  /<meta property="og:locale" content="en_US">/,
  /<meta property="og:image" content="https:\/\/joshmccoy\.dev\/img\/og\/home\.png">/,
  /<meta name="robots" content="index, follow, max-image-preview:large">/,
  /<meta name="author" content="Josh McCoy">/,
  /<meta name="twitter:card" content="summary_large_image">/,
  /<meta name="twitter:title" content="[^"]+">/,
  /<meta name="twitter:description" content="[^"]+">/,
  /<meta name="twitter:image:alt" content="[^"]+">/,
];
const REQUIRED_LD = ['"@id":"https://joshmccoy.dev/#person"', '"@id":"https://joshmccoy.dev/#website"', '"@type":"ProfilePage"'];
const PHONE = /tel:|\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/i;
const WOW = /azeroth|warcraft|\bwow\b/i;

export function checkHomeMeta(html) {
  const compact = html.replace(/"\s*:\s*"/g, '":"');
  const missing = [
    ...REQUIRED_HEAD.filter((re) => !re.test(html)).map(String),
    ...REQUIRED_LD.filter((s) => !compact.includes(s)),
  ];
  return { ok: missing.length === 0, missing };
}

export function checkClean(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ');
  return !PHONE.test(text) && !WOW.test(text);
}

export function checkSitemap(xml) {
  return /<loc>https:\/\/joshmccoy\.dev\/<\/loc>/.test(xml);
}

export function checkRedirect(status, location) {
  return status === 301 && location === 'https://j0sh.wtf/case-studies/bot-team/';
}

export async function runChecks(baseUrl = 'https://joshmccoy.dev/', fetchImpl = fetch) {
  const base = new URL(baseUrl);
  let ok = true;
  const report = (pass, label) => { ok &&= pass; console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); };

  const home = await fetchImpl(new URL('/', base));
  const html = home.status === 200 ? await home.text() : '';
  report(home.status === 200, `home (HTTP ${home.status})`);
  const meta = checkHomeMeta(html);
  report(meta.ok, `#14 meta and JSON-LD${meta.ok ? '' : ` missing: ${meta.missing.join(', ')}`}`);
  report(Boolean(html) && checkClean(html), 'no phone number or WoW mention on home');

  const sitemap = await fetchImpl(new URL('/sitemap.xml', base));
  report(sitemap.status === 200 && checkSitemap(await sitemap.text()), `sitemap lists the homepage (HTTP ${sitemap.status})`);

  const redirect = await fetchImpl(new URL('/case-studies/bot-team/', base), { redirect: 'manual' });
  report(checkRedirect(redirect.status, redirect.headers.get('location')), `bot-team 301 to j0sh.wtf (HTTP ${redirect.status})`);
  return ok;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ok = await runChecks(process.argv[2] ?? 'https://joshmccoy.dev/');
  if (!ok) process.exitCode = 1;
}
