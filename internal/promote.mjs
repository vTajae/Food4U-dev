// Promote the reviewed dev tree to the public production repository as one pull request.
// Usage: node internal/promote.mjs <branch> "<title>" [--dry-run] [--no-push] [--body <file>]
//                                  [--baseline <dev sha>] [--accept-public-changes] [--prod <path>]
//
// Only paths in prod-allowlist.txt are exported; every exported text file is scanned
// against prod-markers.txt (and gitleaks when installed) before anything is written.
// Public-only changes (anything on the public main that the previous promotion did not
// produce) stop the run unless --accept-public-changes is given. --no-push builds the
// candidate branch locally, writes a manifest and the full diff, and stops there.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, readdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const devRoot = resolve(here, '..');
const defaultProd = resolve(devRoot, '..', 'Food4U');
export const PRIVATE_ROOTS = ['internal', 'rust-app'];
export const PUBLIC_GITIGNORE_SUFFIX = '\n# Never published\ninternal/\nrust-app/\n';
const MARKER = /Promoted from Food4U-dev ([0-9a-f]{40})/;

export function readList(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
}

function covers(entry, file) {
  return file === entry || file.startsWith(`${entry.replace(/\/$/, '')}/`);
}

export function selectPaths(files, allowlist) {
  const allow = allowlist.filter((entry) => !entry.startsWith('!'));
  const deny = allowlist.filter((entry) => entry.startsWith('!')).map((entry) => entry.slice(1));
  for (const entry of allow) {
    if (PRIVATE_ROOTS.some((root) => covers(root, entry) || covers(entry, root))) {
      throw new Error(`allowlist entry "${entry}" would export a private folder`);
    }
  }
  return files.filter((file) => allow.some((entry) => covers(entry, file)) && !deny.some((entry) => covers(entry, file)));
}

export function scanForMarkers(files, patterns, read) {
  const regexes = patterns.map((pattern) => new RegExp(pattern, 'i'));
  const hits = [];
  for (const file of files) {
    const bytes = read(file);
    if (bytes.includes(0)) continue; // binary
    bytes.toString('utf8').split('\n').forEach((line, index) => {
      for (const regex of regexes) {
        if (regex.test(line)) hits.push({ file, line: index + 1, pattern: regex.source });
      }
    });
  }
  return hits;
}

function git(args, cwd, input) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', input }).trim();
}

function trackedFiles(cwd) {
  return git(['ls-files', '-z'], cwd).split('\0').filter(Boolean);
}

/** path -> blob id for every file in a tree. */
function blobs(cwd, ref) {
  const map = new Map();
  for (const line of git(['ls-tree', '-r', '-z', ref], cwd).split('\0').filter(Boolean)) {
    const [meta, path] = line.split('\t');
    map.set(path, meta.split(' ')[2]);
  }
  return map;
}

/** Files on the public base that the export of `baselineSha` did not produce. */
export function publicOnlyChanges({ dev, prod, baselineSha, allowlist }) {
  const expected = new Map();
  for (const [path, blob] of blobs(dev, baselineSha)) {
    if (selectPaths([path], allowlist).length) expected.set(path, blob);
  }
  const actual = blobs(prod, 'origin/main');
  const changes = [];
  for (const [path, blob] of actual) {
    if (path === '.gitignore') {
      const content = git(['cat-file', '-p', blob], prod, undefined) + '\n';
      const stripped = content.endsWith(PUBLIC_GITIGNORE_SUFFIX) ? content.slice(0, -PUBLIC_GITIGNORE_SUFFIX.length) : content;
      const devBlob = git(['hash-object', '--stdin'], prod, stripped);
      if (devBlob !== expected.get(path)) changes.push({ path, kind: 'modified' });
      continue;
    }
    if (!expected.has(path)) changes.push({ path, kind: 'added on public' });
    else if (expected.get(path) !== blob) changes.push({ path, kind: 'modified' });
  }
  for (const path of expected.keys()) {
    if (!actual.has(path)) changes.push({ path, kind: 'deleted on public' });
  }
  return changes;
}

function pruneEmptyDirs(dir, root) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== '.git') pruneEmptyDirs(join(dir, entry.name), root);
  }
  if (dir !== root && readdirSync(dir).length === 0) rmdirSync(dir);
}

function gitleaks(dir, log) {
  const probe = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
  if (probe.error) {
    log('gitleaks not installed; relying on the marker scan and GitHub push protection');
    return 'not installed';
  }
  const run = spawnSync('gitleaks', ['detect', '--no-git', '--no-banner', '--source', dir], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`gitleaks found secrets:\n${run.stdout}${run.stderr}`);
  return 'clean';
}

function parseArgs(argv) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (['--dry-run', '--no-push', '--accept-public-changes'].includes(argv[i])) flags.set(argv[i].slice(2), true);
    else if (['--body', '--prod', '--baseline'].includes(argv[i])) flags.set(argv[i].slice(2), argv[++i]);
    else positional.push(argv[i]);
  }
  return { flags, positional };
}

export async function main(argv, { prod = defaultProd, dev = devRoot, log = console.log } = {}) {
  const { flags, positional } = parseArgs(argv);
  const [branch, title] = positional;
  if (!branch || !title) throw new Error('usage: node internal/promote.mjs <branch> "<title>" [--dry-run] [--no-push] [--body <file>] [--baseline <dev sha>] [--accept-public-changes]');
  prod = flags.get('prod') ? resolve(flags.get('prod')) : prod;

  if (git(['status', '--porcelain'], dev)) throw new Error('dev working tree is not clean');
  if (git(['rev-parse', '--abbrev-ref', 'HEAD'], dev) !== 'main') throw new Error('promote from dev main only');
  const devSha = git(['rev-parse', 'HEAD'], dev);

  const allowlist = readList(readFileSync(join(dev, 'internal/prod-allowlist.txt'), 'utf8'));
  const markers = readList(readFileSync(join(dev, 'internal/prod-markers.txt'), 'utf8'));
  const tracked = trackedFiles(dev);
  const files = selectPaths(tracked, allowlist);
  const leaked = files.filter((file) => PRIVATE_ROOTS.some((root) => covers(root, file)));
  if (leaked.length) throw new Error(`refusing to export private paths: ${leaked.slice(0, 3).join(', ')}`);
  const hits = scanForMarkers(files, markers, (file) => readFileSync(join(dev, file)));
  for (const hit of hits) log(`${hit.file}:${hit.line}: matches /${hit.pattern}/`);
  if (hits.length) throw new Error(`${hits.length} marker hit(s); nothing was promoted`);
  log(`${files.length} files pass the allowlist and marker scan (dev ${devSha.slice(0, 7)})`);
  if (flags.get('dry-run')) return 0;

  if (git(['status', '--porcelain'], prod)) throw new Error('production clone is not clean');
  git(['fetch', '-q', 'origin'], prod);
  const prodBase = git(['rev-parse', 'origin/main'], prod);
  const requested = flags.get('baseline') ?? (git(['log', '-1', '--format=%B', 'origin/main'], prod).match(MARKER)?.[1] ?? null);
  const baseline = requested ? git(['rev-parse', '--verify', `${requested}^{commit}`], dev) : null;
  let publicChanges = [];
  if (baseline) {
    publicChanges = publicOnlyChanges({ dev, prod, baselineSha: baseline, allowlist });
    for (const change of publicChanges) log(`public-only change: ${change.kind}: ${change.path}`);
    if (publicChanges.length && !flags.get('accept-public-changes')) {
      throw new Error(`${publicChanges.length} public-only change(s) would be overwritten; review them, port them to dev, or pass --accept-public-changes`);
    }
  } else {
    log('no previous promotion marker on public main and no --baseline; public-only changes cannot be detected');
  }

  git(['checkout', '-q', '-B', branch, 'origin/main'], prod);
  for (const file of trackedFiles(prod)) rmSync(join(prod, file), { force: true });
  pruneEmptyDirs(prod, prod);
  for (const file of files) {
    const target = join(prod, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(dev, file), target);
  }
  appendFileSync(join(prod, '.gitignore'), PUBLIC_GITIGNORE_SUFFIX);
  const leaks = gitleaks(prod, log);

  git(['add', '-A'], prod);
  if (!git(['status', '--porcelain'], prod)) {
    log('production already matches; nothing to promote');
    return 0;
  }
  const marker = `Promoted from Food4U-dev ${devSha}.`;
  execFileSync('git', ['commit', '-q', '-F', '-'], { cwd: prod, input: `${title}\n\n${marker}\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n` });
  const candidate = git(['rev-parse', 'HEAD'], prod);

  const excluded = {};
  for (const file of tracked) {
    if (files.includes(file)) continue;
    const top = file.split('/')[0];
    excluded[top] = (excluded[top] ?? 0) + 1;
  }
  const outDir = join(dev, 'internal', 'candidates');
  mkdirSync(outDir, { recursive: true });
  const stem = join(outDir, `${branch.replace(/[^\w.-]+/g, '-')}-${devSha.slice(0, 7)}`);
  writeFileSync(`${stem}.json`, JSON.stringify({
    branch, title, devSha, prodBase, baseline, candidate, gitleaks: leaks,
    included: files.length, includedFiles: files, excludedTopLevel: excluded,
    markerPatterns: markers.length, publicChanges,
    diffStat: git(['diff', '--stat', `${prodBase}..${candidate}`], prod),
  }, null, 2) + '\n');
  writeFileSync(`${stem}.diff`, git(['diff', `${prodBase}..${candidate}`], prod) + '\n');
  log(`candidate ${candidate.slice(0, 7)} on ${branch}; manifest and diff under internal/candidates/`);
  if (flags.get('no-push')) return 0;

  // The branch is owned by this tool; a re-run replaces its single commit and updates the open PR.
  git(['push', '-q', '-u', '--force-with-lease', 'origin', branch], prod);
  const existing = spawnSync('gh', ['pr', 'view', branch, '--json', 'url', '--jq', '.url'], { cwd: prod, encoding: 'utf8' });
  if (existing.status === 0 && existing.stdout.trim()) {
    log(`updated ${existing.stdout.trim()}`);
    return 0;
  }
  const body = (flags.get('body') ? readFileSync(resolve(flags.get('body')), 'utf8').trimEnd() : '') + `\n\n${marker}\n`;
  const pr = spawnSync('gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', title, '--body', body], { cwd: prod, encoding: 'utf8' });
  if (pr.status !== 0) throw new Error(`gh pr create failed:\n${pr.stderr}`);
  log(pr.stdout.trim());
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
