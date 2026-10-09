#!/usr/bin/env node
/**
 * Rebuild better-sqlite3 for either the host Node ABI (tests) or Electron (app/DMG).
 * better-sqlite3's stock prebuilds target Node; Electron needs a forced node-gyp build.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const moduleDir = path.join(root, 'node_modules', 'better-sqlite3');
const target = process.argv[2] || 'node';

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: opts.cwd || root,
    env: process.env,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (!fs.existsSync(moduleDir)) {
  console.error('better-sqlite3 is not installed. Run npm install first.');
  process.exit(1);
}

if (target === 'node') {
  console.log('Rebuilding better-sqlite3 for Node…');
  run('npm', ['rebuild', 'better-sqlite3']);
  process.exit(0);
}

if (target !== 'electron') {
  console.error('Usage: node scripts/rebuild-native.js [node|electron]');
  process.exit(1);
}

const electronVersion = require(path.join(
  root,
  'node_modules',
  'electron',
  'package.json'
)).version;
const arch = process.arch;

console.log(`Rebuilding better-sqlite3 for Electron ${electronVersion} (${arch})…`);

run(
  'npx',
  [
    'node-gyp',
    'rebuild',
    '--release',
    '--force_build=1',
    `--target=${electronVersion}`,
    `--arch=${arch}`,
    '--dist-url=https://electronjs.org/headers',
  ],
  { cwd: moduleDir }
);

const built = path.join(moduleDir, 'build', 'Release', 'better_sqlite3.node');
if (!fs.existsSync(built)) {
  console.error('Expected build output missing:', built);
  process.exit(1);
}

console.log('Native module ready:', built);
