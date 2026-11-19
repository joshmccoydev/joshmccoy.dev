# joshmccoy.dev

This is a static site with no build step. It is served by the Cloudflare static Worker `joshmccoy-dev` (`wrangler.toml`, assets `./dist`).

Run the tests with `node --test` (or `npm test`).

Preview the publish file plan with `node scripts/sync-public.mjs` (dry run).
Build the publish folder with `npm run dist` (same as `node scripts/sync-public.mjs --apply --dest dist`). `--apply` needs an explicit `--dest <dir>` or `JMD_PUBLIC_DEST`; there is no hardcoded default path any more. Syncing leaves extra files in the destination, so use a fresh `dist/`.

`.github/workflows/deploy.yml` deploys `main` only once the `CF_WORKER_NAME` repository variable and the Cloudflare secrets are set. Setting them is Josh's call.

After a deploy, check the live site with `node scripts/check-live.mjs` (PASS/FAIL lines only, exit 1 on any failure).
