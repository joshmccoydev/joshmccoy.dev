# joshmccoy.dev

This is a static site with no build step. It is served by the Cloudflare static Worker `joshmccoy-dev`. The Worker config lives outside this repo.

Run the tests with `node --test`.

Preview the publish file plan with `node scripts/sync-public.mjs` (dry run). Write the publish folder with `node scripts/sync-public.mjs --apply --dest <dir>`. `--apply` needs an explicit `--dest`; there is no default path. Use a fresh folder, because syncing leaves extra files in place.

Deploy only from a clean checkout of `main`.

After a deploy, check the live site with `node scripts/check-live.mjs`. It prints PASS/FAIL lines only and exits 1 on any failure. It checks:
- the homepage returns 200
- the SEO and social tags and JSON-LD are present
- there is no phone number or WoW mention
- the sitemap lists the homepage
- `/case-studies/bot-team/` redirects 301 to j0sh.wtf
