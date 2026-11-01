#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PUBLIC_FILES = [
  '404.html',
  '_headers',
  '_redirects',
  'case-studies/x/index.html',
  'fonts/a.woff2',
  'img/og/home.png',
  'index.html',
  'og.png',
  'robots.txt',
  'tokens.css',
];

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const DEFAULT_DEST = '/workspace/sites/joshmccoy-dev/public';

export function planSync(root) {
  const absoluteRoot = path.resolve(root);

  return PUBLIC_FILES.filter((relativePath) => {
    const absolutePath = path.join(absoluteRoot, relativePath);
    return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
  }).sort();
}

export function syncPublic(root, destination, { apply = false } = {}) {
  if (!apply) {
    return { applied: false };
  }

  const absoluteRoot = path.resolve(root);
  const absoluteDestination = path.resolve(destination);
  for (const relativePath of planSync(absoluteRoot)) {
    const source = path.join(absoluteRoot, relativePath);
    const target = path.join(absoluteDestination, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }

  return { applied: true };
}

function parseCliArguments(argv) {
  const options = { apply: false, dest: DEFAULT_DEST };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') {
      options.apply = true;
    } else if (argument === '--dest') {
      const value = argv[(index += 1)];
      if (!value) {
        throw new Error('Missing value for --dest');
      }
      options.dest = value;
    } else if (argument.startsWith('--dest=')) {
      const value = argument.slice('--dest='.length);
      if (!value) {
        throw new Error('Missing value for --dest');
      }
      options.dest = value;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function main(argv) {
  const options = parseCliArguments(argv);
  const plannedFiles = planSync(REPO_ROOT);

  for (const relativePath of plannedFiles) {
    console.log(relativePath);
  }

  if (!options.apply) {
    console.log('dry-run: pass --apply to copy');
    return;
  }

  syncPublic(REPO_ROOT, options.dest, { apply: true });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
