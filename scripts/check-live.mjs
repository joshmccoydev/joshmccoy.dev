#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

export function checkWebsite(html) {
  return html.includes('"@type":"WebSite"');
}

export function checkSitemap(xml) {
  return !/<lastmod\b/i.test(xml);
}

export function checkRedirect(status, location) {
  return status === 301 && location === 'https://j0sh.wtf/case-studies/bot-team/';
}

export async function runChecks(baseUrl = 'https://joshmccoy.dev/', fetchImpl = fetch) {
  const base = new URL(baseUrl);
  const websiteUrl = new URL('/', base);
  const sitemapUrl = new URL('/sitemap.xml', base);
  const redirectUrl = new URL('/case-studies/bot-team/', base);

  const website = await fetchImpl(websiteUrl);
  const websiteOk = checkWebsite(await website.text());
  console.log(`${websiteOk ? 'PASS' : 'FAIL'} website structured data (HTTP ${website.status})`);

  const sitemap = await fetchImpl(sitemapUrl);
  const sitemapOk = checkSitemap(await sitemap.text());
  console.log(`${sitemapOk ? 'PASS' : 'FAIL'} sitemap has no lastmod (HTTP ${sitemap.status})`);

  const redirect = await fetchImpl(redirectUrl, { redirect: 'manual' });
  const redirectOk = checkRedirect(redirect.status, redirect.headers.get('location'));
  console.log(`${redirectOk ? 'PASS' : 'FAIL'} bot-team redirect (HTTP ${redirect.status})`);

  return websiteOk && sitemapOk && redirectOk;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ok = await runChecks(process.argv[2] ?? 'https://joshmccoy.dev/');
  if (!ok) process.exitCode = 1;
}
