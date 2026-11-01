// Promote the reviewed dev tree to the public production repository as one pull request.
// Usage: node internal/promote.mjs <branch> "<title>" [--dry-run] [--body <file>] [--prod <path>]
//
// Only paths in prod-allowlist.txt are exported; every exported text file is scanned
// against prod-markers.txt (and gitleaks when installed) before anything is written.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, readdirSync, readFileSync, rmSync, rmdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const devRoot = resolve(here, '..');
const defaultProd = resolve(devRoot, '..', 'Food4U');

export function readList(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
}

export function selectPaths(files, allowlist) {
  const covers = (entry, file) => file === entry || file.startsWith(`${entry.replace(/\/$/, '')}/`);
  const allow = allowlist.filter((entry) => !entry.startsWith('!'));
  const deny = allowlist.filter((entry) => entry.startsWith('!')).map((entry) => entry.slice(1));
  return files.filter((file) => allow.some((entry) => covers(entry, file)) && !deny.some((entry) => covers(entry, file)));
}

export function scanForMarkers(files, patterns, read) {
  const regexes = patterns.map((pattern) => new RegExp(pattern, 'i'));
  const hits = [];
  for (const file of files) {
    const bytes = read(file);
    if (bytes.includes(0)) continue; // binary
    bytes.toString('utf8').split('\n').forEach((line, index) => {
      if (line.includes('promote:allow')) return; // explicit, visible exemption for a fake fixture
      for (const regex of regexes) {
        if (regex.test(line)) hits.push({ file, line: index + 1, pattern: regex.source });
      }
    });
  }
  return hits;
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function trackedFiles(cwd) {
  return git(['ls-files', '-z'], cwd).split('\0').filter(Boolean);
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
    return;
  }
  const run = spawnSync('gitleaks', ['detect', '--no-git', '--no-banner', '--source', dir], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`gitleaks found secrets:\n${run.stdout}${run.stderr}`);
}

export async function main(argv, { prod = defaultProd, dev = devRoot, log = console.log } = {}) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') flags.set('dry-run', true);
    else if (argv[i] === '--body' || argv[i] === '--prod') flags.set(argv[i].slice(2), argv[++i]);
    else positional.push(argv[i]);
  }
  const [branch, title] = positional;
  if (!branch || !title) throw new Error('usage: node internal/promote.mjs <branch> "<title>" [--dry-run] [--body <file>]');
  prod = flags.get('prod') ? resolve(flags.get('prod')) : prod;

  if (git(['status', '--porcelain'], dev)) throw new Error('dev working tree is not clean');
  if (git(['rev-parse', '--abbrev-ref', 'HEAD'], dev) !== 'main') throw new Error('promote from dev main only');
  const devSha = git(['rev-parse', 'HEAD'], dev);

  const allowlist = readList(readFileSync(join(dev, 'internal/prod-allowlist.txt'), 'utf8'));
  const markers = readList(readFileSync(join(dev, 'internal/prod-markers.txt'), 'utf8'));
  const files = selectPaths(trackedFiles(dev), allowlist);
  const hits = scanForMarkers(files, markers, (file) => readFileSync(join(dev, file)));
  for (const hit of hits) log(`${hit.file}:${hit.line}: matches /${hit.pattern}/`);
  if (hits.length) throw new Error(`${hits.length} marker hit(s); nothing was promoted`);
  log(`${files.length} files pass the allowlist and marker scan (dev ${devSha.slice(0, 7)})`);
  if (flags.get('dry-run')) return 0;

  if (git(['status', '--porcelain'], prod)) throw new Error('production clone is not clean');
  git(['fetch', '-q', 'origin'], prod);
  git(['checkout', '-q', '-B', branch, 'origin/main'], prod);
  for (const file of trackedFiles(prod)) rmSync(join(prod, file), { force: true });
  pruneEmptyDirs(prod, prod);
  for (const file of files) {
    const target = join(prod, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(dev, file), target);
  }
  appendFileSync(join(prod, '.gitignore'), '\n# Never published\ninternal/\nrust-app/\n');
  gitleaks(prod, log);

  git(['add', '-A'], prod);
  if (!git(['status', '--porcelain'], prod)) {
    log('production already matches; nothing to promote');
    return 0;
  }
  const message = `${title}\n\nPromoted from Food4U-dev ${devSha}.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n`;
  execFileSync('git', ['commit', '-q', '-F', '-'], { cwd: prod, input: message });
  git(['push', '-q', '-u', 'origin', branch], prod);

  const bodyArgs = flags.get('body') ? ['--body-file', resolve(flags.get('body'))] : ['--body', `Promoted from Food4U-dev ${devSha.slice(0, 7)}.`];
  const pr = spawnSync('gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', title, ...bodyArgs], { cwd: prod, encoding: 'utf8' });
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
