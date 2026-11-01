import assert from 'node:assert/strict';
import { fork, spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// A separate process owns Wrangler's process-wide helpers. Delete only its fresh
// private directory, after that process exits (including on failed tests).
export default async function globalSetup() {
  if (process.env.E2E_PROD === '1') return;
  const artifacts = resolve('e2e/.artifacts');
  await mkdir(artifacts, { recursive: true });
  const temp = await mkdtemp(join(tmpdir(), 'food4u-e2e-018-'));
  assert.equal(dirname(resolve(temp)).toLowerCase(), resolve(tmpdir()).toLowerCase());
  assert.ok(basename(temp).startsWith('food4u-e2e-018-'));
  const ownerHashes = async () => {
    const hashes: Record<string, string> = {};
    for (const name of ['.dev.vars', '../.env.local', '../.neon', 'dist/server/wrangler.json', 'dist/server/index.js', '.wrangler/deploy/config.json']) {
      const hash = createHash('sha256');
      try {
        for await (const bytes of createReadStream(resolve(name))) hash.update(bytes);
        hashes[name] = hash.digest('hex');
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; hashes[name] = 'ABSENT'; }
    }
    return hashes;
  };
  const before = await ownerHashes();
  const build = spawn(process.execPath, [resolve('e2e/safe-build.mjs'), temp], {
    cwd: resolve('.'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
  });
  const buildLog = createWriteStream(join(artifacts, '018-build.log'));
  build.stdout.pipe(buildLog, { end: false }); build.stderr.pipe(buildLog, { end: false });
  const buildExit = await new Promise<number | null>((ok, no) => { build.once('error', no); build.once('close', ok); });
  buildLog.end();
  if (buildExit !== 0) {
    await rm(temp, { recursive: true, force: true });
    throw new Error('Fresh isolated build failed; see e2e/.artifacts/018-build.log');
  }
  const log = createWriteStream(join(artifacts, '018-runtime.log'));
  const child = fork(resolve('e2e/runtime.mjs'), [temp, artifacts], {
    cwd: temp, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
  });
  child.stdout!.pipe(log, { end: false }); child.stderr!.pipe(log, { end: false });
  const exited = new Promise<number | null>(ok => child.once('exit', ok));
  const stop = async () => {
    if (child.connected) child.send({ type: 'stop' });
    let timer: ReturnType<typeof setTimeout>;
    const code = await Promise.race([exited, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { child.kill(); reject(new Error('E2E runtime cleanup timed out')); }, 30_000);
    })]).finally(() => clearTimeout(timer));
    log.end();
    assert.equal(dirname(resolve(temp)).toLowerCase(), resolve(tmpdir()).toLowerCase());
    assert.ok(basename(temp).startsWith('food4u-e2e-018-'));
    await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    const after = await ownerHashes();
    assert.deepEqual(after, before, 'owner hashes unchanged across fresh build and all tests');
    await writeFile(join(artifacts, '018-cleanup.json'), JSON.stringify({ before, after, owner_hashes_unchanged: true, private_state_removed: true, child_exit: code }, null, 2));
    assert.equal(code, 0, 'isolated runtime, egress and owner-hash teardown must pass');
  };
  try {
    const ready = await new Promise<{ base: string; proxy: string; harness: string }>((ok, reject) => {
      const timer = setTimeout(() => reject(new Error('Built Worker startup timed out; see 018-runtime.log')), 120_000);
      child.once('error', reject);
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Runtime exited ${code}; see 018-runtime.log`)); });
      child.on('message', (message: unknown) => {
        if (typeof message === 'object' && message !== null && 'type' in message && message.type === 'ready' &&
          'base' in message && typeof message.base === 'string' && 'proxy' in message && typeof message.proxy === 'string' &&
          'harness' in message && typeof message.harness === 'string') {
          clearTimeout(timer); ok({ base: message.base, proxy: message.proxy, harness: message.harness });
        }
      });
    });
    process.env.E2E_BASE_URL = ready.base;
    process.env.E2E_PROXY_URL = ready.proxy;
    // Session database probes for sessions.spec.ts; called from the test process only.
    process.env.E2E_HARNESS_URL = ready.harness;
  } catch (error) { await stop(); throw error; }
  return stop;
}
