// Run: node --test internal/promote.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { devRoot, readList, scanForMarkers, selectPaths } from './promote.mjs';

const allowlist = readList(readFileSync(join(devRoot, 'internal/prod-allowlist.txt'), 'utf8'));
const markers = readList(readFileSync(join(devRoot, 'internal/prod-markers.txt'), 'utf8'));

test('private folders are never selected, even when named like public ones', () => {
  const files = [
    'README.md', 'internal/STATUS.md', 'internal/history/notes/01-idea.md', 'rust-app/src/main.rs',
    'frontend/app/page.tsx', 'docs/adr/0001.md', 'contract/local-rust.mjs', 'contract/local-next.mjs',
    'docs-private/x.md', 'frontend-old/x.ts', '.github/workflows/ci.yml', '.omc/state.json',
  ];
  assert.deepEqual(selectPaths(files, allowlist), [
    'README.md', 'frontend/app/page.tsx', 'docs/adr/0001.md', 'contract/local-next.mjs', '.github/workflows/ci.yml',
  ]);
});

test('the allowlist itself never names a private folder', () => {
  for (const entry of allowlist) assert.doesNotMatch(entry, /^(internal|rust-app)(\/|$)/);
});

test('a marker hit names the file and line, and binaries are skipped', () => {
  const contents = {
    'docs/a.md': Buffer.from('fine\nsee the OMC receipt\nfine'),
    'docs/b.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x4f, 0x4d, 0x43]),
    'docs/c.md': Buffer.from('nothing here'),
  };
  const hits = scanForMarkers(Object.keys(contents), markers, (file) => contents[file]);
  assert.deepEqual(hits.map((hit) => [hit.file, hit.line]), [['docs/a.md', 2]]);
});

test('the real markers catch the strings that leaked before', () => {
  const leaks = [
    'evidence in .cockpit/20261013-neon/plans/019-executor.md',
    'neon connection-string production --project-id patient-cherry-72346680',
    'render deploys create srv-crb5dm2j1k6c73cn8f40 --commit',
    'works on G:\\WebDev\\Food4U',
    'see internal/e2e/DEFECTS.md',
    'postgresql://food4u_web:Sup3rSecretPw@ep-host.neon.tech/db',
    'written by Claude Code',
  ];
  for (const line of leaks) {
    assert.equal(scanForMarkers(['x'], markers, () => Buffer.from(line)).length > 0, true, line);
  }
  const fine = ['https://food4u-frontend.qias-webdev.workers.dev', 'postgresql+asyncpg://u:p@localhost:5432/test', 'Rust spike parked'];
  for (const line of fine) {
    assert.equal(scanForMarkers(['x'], markers, () => Buffer.from(line)).length, 0, line);
  }
});

test('readList drops comments and blank lines', () => {
  assert.deepEqual(readList('# c\n\n a \nb\n'), ['a', 'b']);
});
