#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const DEFAULT_DEST = '/workspace/sites/joshmccoy-dev/public';
const PUBLIC_DIRECTORIES = new Set(['case-studies', 'fonts', 'img']);
const EXCLUDED_DIRECTORIES = new Set([
  'node_modules',
  'scripts',
  'test',
]);
const ROOT_FILE_NAMES = new Set([
  '_headers',
  '_redirects',
  'robots.txt',
  'site.webmanifest',
  'sitemap.xml',
  'tokens.css',
]);

function isRootPublicFile(name) {
  return (
    ROOT_FILE_NAMES.has(name) ||
    name.endsWith('.html') ||
    name.endsWith('.png') ||
    /^favicon\./.test(name)
  );
}

function isExcludedFile(name) {
  return (
    name.endsWith('.md') ||
    (name.startsWith('package') && name.endsWith('.json'))
  );
}

export function planSync(root) {
  const absoluteRoot = path.resolve(root);
  const files = [];

  function walk(directory, relativeDirectory = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const relativePath = relativeDirectory
        ? path.posix.join(relativeDirectory, entry.name)
        : entry.name;
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        const rootDirectory = relativePath.split('/')[0];
        if (relativeDirectory === '' || PUBLIC_DIRECTORIES.has(rootDirectory)) {
          walk(absolutePath, relativePath);
        }
        continue;
      }

      if (!entry.isFile() || isExcludedFile(entry.name)) {
        continue;
      }

      if (relativeDirectory === '') {
        if (isRootPublicFile(entry.name)) {
          files.push(relativePath);
        }
        continue;
      }

      const rootDirectory = relativePath.split('/')[0];
      if (
        PUBLIC_DIRECTORIES.has(rootDirectory) &&
        relativePath !== 'img/og/manifest.json'
      ) {
        files.push(relativePath);
      }
    }
  }

  walk(absoluteRoot);
  return files.sort();
}

export function syncPublic(root, destination, { apply = false } = {}) {
  const files = planSync(root);

  if (!apply) {
    return { files, applied: false };
  }

  const absoluteRoot = path.resolve(root);
  const absoluteDestination = path.resolve(destination);
  for (const relativePath of files) {
    const source = path.join(absoluteRoot, relativePath);
    const target = path.join(absoluteDestination, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }

  const result = { applied: true };
  Object.defineProperty(result, 'files', {
    enumerable: false,
    get: () => files,
  });
  return result;
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
