// Safe local setup only. Portable assertions live in contract.test.mjs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, appendFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const frontend = resolve(root, 'frontend');
const evidence = resolve(root, 'contract/.evidence');
const varsPath = resolve(frontend, '.dev.vars');
const configPath = resolve(frontend, `.contract-${randomUUID()}.vite.config.ts`);
const ownership = randomUUID();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(evidence, { recursive: true });
const original = await readFile(varsPath); // Never print owner secrets.
const originalSha = sha(original);
const backup = resolve(evidence, `004-dev-vars-${randomUUID()}.backup`);
await writeFile(backup, original, { flag: 'wx' });
assert.equal(sha(await readFile(backup)), originalSha);
const socket = createServer();
await new Promise((ok, fail) => { socket.once('error', fail); socket.listen(3001, '127.0.0.1', ok); });
await new Promise(ok => socket.close(ok));

const config = `import original from './vite.config.ts';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const target = resolve('api/services/baseService.ts').replaceAll('\\\\', '/');
let proved = false;
const plugin = {
  name: 'contract-local-backend-only', apply: 'serve', enforce: 'pre',
  transform(code, id) {
    if (id.split('?')[0].replaceAll('\\\\', '/') !== target) return;
    const declaration = 'const API_BASE_URL = env.API_BASE_URL;';
    if (code.split(declaration).length !== 2) throw new Error('Expected exactly one backend declaration; refusing unsafe dev');
    let output = code.replace(declaration, 'const API_BASE_URL = "http://127.0.0.1:9";');
    if (output.split('await fetch(').length !== 4) throw new Error('Backend fetch surface changed; refusing unsafe dev');
    output = output.replaceAll('await fetch(', 'await contractLocalFetch(');
    output = 'const contractLocalFetch = (input, init) => { const url = new URL(input); if (url.origin !== "http://127.0.0.1:9") throw new Error("CONTRACT_SERVER_EGRESS_BLOCKED"); console.log("CONTRACT_SERVER_LOCAL_FETCH", url.pathname); return fetch(input, init); };\\n' + output;
    if (output.includes('onrender.com')) throw new Error('Production hostname remains; refusing unsafe dev');
    return { code: output, map: null };
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/_contract_local_setup/stop?owner=${ownership}') {
        res.end('Stopping owned local server');
        await server.close();
        return;
      }
      if (req.url !== '/_contract_local_setup/proof') {
        if (proved) return next();
        res.statusCode = 503; res.end('Local backend isolation has not been proven'); return;
      }
      try {
        const proofs = [];
        for (const name of ['rsc', 'ssr', 'client']) {
          const environment = server.environments[name];
          if (!environment) continue;
          const result = await environment.transformRequest('/api/services/baseService.ts');
          if (!result || !result.code.includes('http://127.0.0.1:9') || result.code.includes('onrender.com') || !result.code.includes('CONTRACT_SERVER_EGRESS_BLOCKED')) throw new Error('Unsafe transformed module: ' + name);
          proofs.push({ environment: name, sha256: createHash('sha256').update(result.code).digest('hex') });
        }
        if (!proofs.some(p => p.environment === 'rsc')) throw new Error('RSC environment proof missing');
        proved = true;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ owner: '${ownership}', backend: 'http://127.0.0.1:9', server_egress_guard: true, proofs }));
      } catch (error) { proved = false; res.statusCode = 503; res.end(String(error)); }
    });
  },
};
export default { ...original, plugins: [plugin, ...(original.plugins || [])], server: { ...original.server, host: '127.0.0.1', port: 3001, strictPort: true } };
`;

let child;
let closed;
let writes = Promise.resolve();
let log = '';
let cancelled;
const activeCommands = new Set();
let executionError;
let cleanupError;
let loggingError;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  cancelled = signal;
  for (const command of activeCommands) command.kill('SIGTERM');
});
async function run(command, args, cwd, filename, env = {}) {
  assert.ok(!cancelled, 'local run was cancelled');
  const processChild = spawn(command, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  activeCommands.add(processChild);
  let output = '';
  for (const stream of [processChild.stdout, processChild.stderr]) stream.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
  const code = await new Promise((ok, fail) => { processChild.once('error', fail); processChild.once('close', ok); });
  activeCommands.delete(processChild);
  await writeFile(resolve(evidence, filename), output);
  return code;
}
try {
  // Replace only any local override line; every original byte is restored finally.
  // Sessions stay in Miniflare's local KV: this suite must never reach a real database.
  const text = original.toString('utf8').replace(/^(API_BASE_URL|SESSION_STORE|SESSION_DATABASE_URL|NEON_FETCH_ENDPOINT)\s*=.*(?:\r?\n|$)/gm, '');
  await writeFile(varsPath, `${text}\nAPI_BASE_URL="http://127.0.0.1:9"\nSESSION_STORE="kv"\n`);
  await writeFile(configPath, config, { flag: 'wx' });
  await writeFile(resolve(evidence, '004-next-dev.log'), '');
  child = spawn(process.execPath, [resolve(frontend, 'node_modules/vite/bin/vite.js'), '--config', configPath], {
    cwd: frontend, windowsHide: true, env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  closed = new Promise(ok => child.once('close', (code, signal) => ok({ code, signal })));
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
    const text = chunk.toString(); log += text;
    writes = writes.then(() => appendFile(resolve(evidence, '004-next-dev.log'), text)).catch(error => { loggingError ??= error; });
    process.stdout.write(chunk);
  });
  child.once('error', error => { log += String(error); });
  const deadline = Date.now() + 120000;
  let proof;
  while (Date.now() < deadline && !cancelled) {
    if (child.exitCode !== null) throw new Error(`Vite exited ${child.exitCode}; see dev log`);
    try {
      const response = await fetch('http://127.0.0.1:3001/_contract_local_setup/proof', { signal: AbortSignal.timeout(10000) });
      if (response.ok) { proof = await response.json(); break; }
      throw new Error(`Isolation proof rejected: ${await response.text()}`);
    } catch (error) {
      if (error.message.startsWith('Isolation proof rejected:')) throw error;
    }
    await new Promise(ok => setTimeout(ok, 500));
  }
  assert.ok(proof && !cancelled, 'safe backend transform proof must pass before browser traffic');
  assert.equal(proof.owner, ownership, 'preflight must identify this owned Vite instance');
  await writeFile(resolve(evidence, '004-local-isolation.json'), JSON.stringify(proof, null, 2));
  console.log('LOCAL_BACKEND_ISOLATION_PROVEN', JSON.stringify(proof));
  const suite = await run(process.execPath, ['--test', 'contract/'], root, '004-next-contract.log', { BASE_URL: 'http://127.0.0.1:3001' });
  const npmCli = resolve(process.execPath, '../node_modules/npm/bin/npm-cli.js');
  const unit = await run(process.execPath, [npmCli, 'test'], frontend, '004-frontend-unit.log');
  await writeFile(resolve(evidence, '004-next-results.json'), JSON.stringify({ suite_exit: suite, frontend_test_exit: unit, server_egress_blocked: log.includes('CONTRACT_SERVER_EGRESS_BLOCKED') }, null, 2));
  assert.equal(suite, 0, 'contract suite exit');
  assert.equal(unit, 0, 'frontend npm test exit');
} catch (error) {
  executionError = error;
} finally {
  try {
    if (child && child.exitCode === null && child.signalCode === null) {
      await fetch(`http://127.0.0.1:3001/_contract_local_setup/stop?owner=${ownership}`, { signal: AbortSignal.timeout(10000) }).catch(() => {});
      await Promise.race([closed, new Promise(ok => setTimeout(ok, 10000))]);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    }
    if (closed) await closed;
    await writes;
  } catch (error) {
    cleanupError = error;
  } finally {
    try {
      await writeFile(varsPath, original);
      const restoredSha = sha(await readFile(varsPath));
      assert.equal(restoredSha, originalSha, 'owner .dev.vars must be restored byte-for-byte');
      await writeFile(resolve(evidence, '004-dev-vars-restoration.json'), JSON.stringify({ before_sha256: originalSha, after_sha256: restoredSha, matched: true }, null, 2));
      await unlink(configPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
      await unlink(backup);
      console.log(`DEV_VARS_RESTORED_SHA256=${restoredSha}`);
    } catch (error) {
      throw new AggregateError([executionError, cleanupError, error].filter(Boolean), `Restoration failed; preserve owner backup at ${backup}`);
    }
  }
}
if (executionError || cleanupError || loggingError) throw new AggregateError([executionError, cleanupError, loggingError].filter(Boolean), 'Local contract run failed; owner file restored');
