// Run: node --test internal/promote.test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { devRoot, main, publicOnlyChanges, readList, scanForMarkers, selectPaths } from './promote.mjs';

const allowlist = readList(readFileSync(join(devRoot, 'internal/prod-allowlist.txt'), 'utf8'));
const markers = readList(readFileSync(join(devRoot, 'internal/prod-markers.txt'), 'utf8'));

test('private folders are never selected, even when named like public ones', () => {
  const files = [
    'README.md', 'internal/STATUS.md', 'internal/history/notes/01-idea.md', 'rust-app/src/main.rs',
    'frontend/app/page.tsx', 'docs/adr/0001.md', 'contract/local-rust.mjs', 'contract/local-next.mjs',
    'docs-private/x.md', 'frontend-old/x.ts', '.github/pull_request_template.md', '.omc/state.json',
  ];
  assert.deepEqual(selectPaths(files, allowlist), [
    'README.md', 'frontend/app/page.tsx', 'docs/adr/0001.md', 'contract/local-next.mjs', '.github/pull_request_template.md',
  ]);
});

test('an allowlist that names a private folder is refused outright', () => {
  for (const entry of ['internal', 'internal/', 'rust-app/src', 'internal/candidates']) {
    assert.throws(() => selectPaths(['README.md'], [...allowlist, entry]), /private folder/);
  }
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
    'Copyright Tajae Knox',
    'see internal/e2e/DEFECTS.md',
    'postgresql://food4u_web:Sup3rSecretPw@ep-host.neon.tech/db',
    'written by Claude Code',
  ];
  for (const line of leaks) {
    assert.equal(scanForMarkers(['x'], markers, () => Buffer.from(line)).length > 0, true, line);
  }
  const fine = [
    'https://food4u-frontend.qias-webdev.workers.dev', 'postgresql+asyncpg://u:p@localhost:5432/test', 'Rust spike parked',
    'https://github.com/vTajae/Food4U/issues/1', 'assert.doesNotMatch(out, /postgres:\\/\\//)',
    'DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?sslmode=disable',
  ];
  for (const line of fine) {
    assert.equal(scanForMarkers(['x'], markers, () => Buffer.from(line)).length, 0, line);
  }
});

test('readList drops comments and blank lines', () => {
  assert.deepEqual(readList('# c\n\n a \nb\n'), ['a', 'b']);
});

function repo(dir, files) {
  mkdirSync(dir, { recursive: true });
  const g = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'test@example.invalid');
  g('config', 'user.name', 'test');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  g('add', '-A');
  g('commit', '-q', '-m', 'init');
  return g;
}

test('a dry run fails closed on a planted secret and never prints its value', async () => {
  const dev = mkdtempSync(join(tmpdir(), 'promote-dev-'));
  const planted = 'AIzaSyFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE12';
  repo(dev, {
    'internal/prod-allowlist.txt': readFileSync(join(devRoot, 'internal/prod-allowlist.txt'), 'utf8'),
    'internal/prod-markers.txt': readFileSync(join(devRoot, 'internal/prod-markers.txt'), 'utf8'),
    'internal/secret-notes.md': 'private thoughts',
    'README.md': `# x\nkey=${planted}\n`,
  });
  const lines = [];
  await assert.rejects(main(['promote/x', 'title', '--dry-run'], { dev, log: (line) => lines.push(line) }), /1 marker hit/);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^README\.md:2: matches/);
  assert.doesNotMatch(lines.join('\n'), /AIzaSy/);
});

test('a dry run with clean public files exports nothing private', async () => {
  const dev = mkdtempSync(join(tmpdir(), 'promote-dev-'));
  repo(dev, {
    'internal/prod-allowlist.txt': readFileSync(join(devRoot, 'internal/prod-allowlist.txt'), 'utf8'),
    'internal/prod-markers.txt': readFileSync(join(devRoot, 'internal/prod-markers.txt'), 'utf8'),
    'internal/secret-notes.md': 'private thoughts',
    'rust-app/main.rs': 'fn main() {}',
    'README.md': '# public\n',
    'docs/a.md': 'fine\n',
  });
  const lines = [];
  assert.equal(await main(['promote/x', 'title', '--dry-run'], { dev, log: (line) => lines.push(line) }), 0);
  assert.match(lines[0], /^2 files pass/);
});

test('public-only edits are detected against the baseline export, ignoring the appended ignore lines', () => {
  const dev = mkdtempSync(join(tmpdir(), 'promote-dev-'));
  const gdev = repo(dev, { '.gitignore': 'node_modules/\n', 'README.md': '# v1\n', 'internal/x.md': 'private\n' });
  const baseline = gdev('rev-parse', 'HEAD').trim();
  const prod = mkdtempSync(join(tmpdir(), 'promote-prod-'));
  const gprod = repo(prod, { '.gitignore': 'node_modules/\n\n# Never published\ninternal/\nrust-app/\n', 'README.md': '# v1\n' });
  gprod('update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.deepEqual(publicOnlyChanges({ dev, prod, baselineSha: baseline, allowlist }), []);
  writeFileSync(join(prod, 'README.md'), '# edited on public\n');
  writeFileSync(join(prod, 'SECURITY.md'), 'new on public\n');
  gprod('add', '-A');
  gprod('commit', '-q', '-m', 'public edits');
  gprod('update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.deepEqual(publicOnlyChanges({ dev, prod, baselineSha: baseline, allowlist }).sort((a, b) => a.path.localeCompare(b.path)), [
    { path: 'README.md', kind: 'modified' },
    { path: 'SECURITY.md', kind: 'added on public' },
  ]);
});
