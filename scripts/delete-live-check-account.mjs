import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { d1Query, isMain, root, runCommand } from './post-deploy-common.mjs';

const liveUsername = /^livecheck-\d+.*@food4u\.test$/;
// Per-environment setting, like the Worker and backend URLs; not a secret.
const project = process.env.NEON_PROJECT_ID;

// Uses the backend's existing asyncpg, not a new Node database dependency.
// The URL is passed on stdin, never in argv, logs, a file, or a traceback.
const deletePython = `
import asyncio, json, sys
import asyncpg
async def main():
    data = json.load(sys.stdin)
    conn = await asyncpg.connect(data['url'], timeout=30, command_timeout=30)
    try:
        async with conn.transaction():
            rows = await conn.fetch('DELETE FROM public.profile WHERE public_id = $1 RETURNING id', data['id'])
            if len(rows) > 1:
                raise ValueError('ambiguous identity')
        print(len(rows))
    finally:
        await conn.close()
try:
    asyncio.run(main())
except Exception:
    sys.exit(1)
`;

async function deleteProfile(id, run) {
  let direct = process.env.NEON_DIRECT_URL;
  if (!direct) {
    if (!project) throw new Error('NEON_PROJECT_ID or NEON_DIRECT_URL required');
    const command = process.platform === 'win32' ? process.execPath : 'neon';
    const prefix = process.platform === 'win32' ? [resolve(process.env.APPDATA ?? '', 'npm/node_modules/neon/dist/cli.js')] : [];
    direct = await run(command, [...prefix, 'connection-string', 'production', '--project-id', project]);
  }
  const url = new URL(direct.trim());
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.includes('-pooler')) throw new Error('direct URL required');
  const python = process.env.PYTHON ?? resolve(root, 'backend/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (!process.env.PYTHON && !existsSync(python)) throw new Error('backend venv required');
  const count = await run(python, ['-c', deletePython], { input: JSON.stringify({ url: url.href, id }) });
  if (!/^[01]$/.test(count)) throw new Error('invalid delete count');
  return Number(count);
}

export async function main(args, { run = runCommand, write = console.log, deleteProfile: removeProfile = id => deleteProfile(id, run) } = {}) {
  let neon = 0, d1 = 0, reason = 'cleanup failed; no upstream error details are printed';
  try {
    if (args.length !== 2 || args[0] !== '--public-id' || !/^[A-Za-z0-9-]{1,80}$/.test(args[1])) {
      reason = 'use --public-id with one stable public ID';
      throw new Error('arguments');
    }
    const id = args[1];
    const rows = await d1Query(`SELECT public_id, username FROM user WHERE public_id = '${id}'`, run);
    if (rows.length) {
      if (rows.length !== 1 || rows[0].public_id !== id || !liveUsername.test(rows[0].username) || /['\r\n]/.test(rows[0].username)) {
        reason = 'refused: D1 identity is not one live-check account';
        throw new Error('identity');
      }
      neon = await removeProfile(id);
      if (![0, 1].includes(neon)) throw new Error('invalid Neon count');
      // Re-check both identity fields in the write, not just the earlier lookup.
      const deleted = await d1Query(`DELETE FROM user WHERE public_id = '${id}' AND username = '${rows[0].username}' RETURNING public_id`, run);
      d1 = deleted.length;
      if (d1 !== 1) throw new Error('D1 identity changed; retry after inspection');
    }
    write(`LIVE_CLEANUP ${JSON.stringify({ result: 'PASS', neon_profiles_deleted: neon, d1_users_deleted: d1 })}`);
    return 0;
  } catch {
    write(`LIVE_CLEANUP ${JSON.stringify({ result: 'FAIL', neon_profiles_deleted: neon, d1_users_deleted: d1, reason })}`);
    return 1;
  }
}

if (isMain(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
