# joshmccoy.dev

This is a static site with no build step.

Run the tests with `node --test`.

Preview the publish file plan with `node scripts/sync-public.mjs` (dry run).
Copy the files with `node scripts/sync-public.mjs --apply --dest <path to the Cloudflare Pages publish dir>`.
This GitHub repository does not deploy itself, and syncing leaves extra files in the destination.

After deployment, check the live site with `node scripts/check-live.mjs`.
