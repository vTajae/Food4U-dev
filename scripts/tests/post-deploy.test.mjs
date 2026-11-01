import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const secret = 'private-password postgres://user:private-password@example/db'; // promote:allow fake fixture
function output() {
  const lines = [];
  return { lines, write: line => lines.push(line) };
}
const d1 = rows => JSON.stringify([{ success: true, results: rows }]);

for (const [script, prefix, args] of [
  ['live-check.mjs', 'LIVE_CHECK', ['--backend', secret]],
  ['check-d1-schema.mjs', 'D1_SCHEMA', ['--unknown', secret]],
  ['delete-live-check-account.mjs', 'LIVE_CLEANUP', ['--public-id', secret]],
  ['delete-live-check-account.mjs', 'LIVE_CLEANUP', []],
]) {
  test(`${script} rejects bad arguments with one safe JSON line (${args.length})`, () => {
    const child = spawnSync(process.execPath, [`scripts/${script}`, ...args], { cwd: root, encoding: 'utf8' });
    assert.notEqual(child.status, 0);
    assert.equal(child.stderr, '');
    const lines = child.stdout.trim().split('\n');
    assert.equal(lines.length, 1);
    assert.ok(lines[0].startsWith(`${prefix} `));
    assert.equal(JSON.parse(lines[0].slice(prefix.length + 1)).result, 'FAIL');
    assert.doesNotMatch(child.stdout, /private-password|postgres:\/\/|\bat .*:\d+/);
  });
}

test('D1 public runner fails missing 0001 and passes applied 0001', async () => {
  const { main } = await import('../check-d1-schema.mjs');
  for (const applied of [[], [{ name: '0001_user_public_id.sql' }]]) {
    const out = output(), calls = [];
    const code = await main([], { ...out, run: async (command, args) => {
      calls.push(args);
      return args.includes('list') ? 'Wrangler list output' : d1(applied);
    } });
    assert.equal(code, applied.length ? 0 : 1);
    assert.equal(out.lines.length, 1);
    const result = JSON.parse(out.lines[0].slice('D1_SCHEMA '.length));
    assert.equal(result.result, applied.length ? 'PASS' : 'FAIL');
    assert.deepEqual(result.missing, applied.length ? [] : ['0001_user_public_id.sql']);
    assert.ok(calls.some(args => args.includes('list') && args.includes('--remote')));
  }
});

test('cleanup refuses a real username before any delete or Neon access', async () => {
  const { main } = await import('../delete-live-check-account.mjs');
  const out = output(), calls = [];
  assert.equal(await main(['--public-id', 'test-id'], { ...out,
    run: async (command, args) => { calls.push(args); return d1([{ public_id: 'test-id', username: 'owner@example.com' }]); },
  }), 1);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('--command'));
  assert.doesNotMatch(calls.flat().join(' '), /DELETE/i);
  assert.match(out.lines[0], /FAIL/);
});

test('cleanup deletes Neon before guarded D1 delete, then no-ops when absent', async () => {
  const { main } = await import('../delete-live-check-account.mjs');
  const calls = [], out = output();
  const code = await main(['--public-id', 'test-id'], { ...out,
    run: async (command, args) => {
      calls.push('d1');
      const sql = args[args.indexOf('--command') + 1];
      if (/DELETE/.test(sql)) {
        assert.match(sql, /username = 'livecheck-123-abc@food4u.test'/);
        return d1([{ public_id: 'test-id' }]);
      }
      return d1([{ public_id: 'test-id', username: 'livecheck-123-abc@food4u.test' }]);
    },
    deleteProfile: async id => { assert.equal(id, 'test-id'); calls.push('neon'); return 1; },
  });
  assert.equal(code, 0);
  assert.deepEqual(calls, ['d1', 'neon', 'd1']);
  assert.equal(JSON.parse(out.lines[0].slice('LIVE_CLEANUP '.length)).d1_users_deleted, 1);
  const absent = output();
  assert.equal(await main(['--public-id', 'test-id'], { ...absent,
    run: async () => d1([]), deleteProfile: async () => assert.fail('must not delete without D1 identity'),
  }), 0);
  assert.match(absent.lines[0], /"neon_profiles_deleted":0,"d1_users_deleted":0/);
});

test('command errors never leak their stack, password, or connection string', async () => {
  for (const [module, prefix, args] of [
    ['check-d1-schema.mjs', 'D1_SCHEMA', []],
    ['delete-live-check-account.mjs', 'LIVE_CLEANUP', ['--public-id', 'test-id']],
  ]) {
    const { main } = await import(`../${module}`), out = output();
    assert.equal(await main(args, { ...out, run: async () => { throw new Error(secret); } }), 1);
    assert.equal(out.lines.length, 1);
    assert.ok(out.lines[0].startsWith(prefix));
    assert.doesNotMatch(out.lines[0], /private-password|postgres:\/\/|\bat .*:\d+/);
  }
});

test('a failed Neon delete never deletes D1 or reveals the upstream secret', async () => {
  const { main } = await import('../delete-live-check-account.mjs');
  const out = output(), calls = [];
  assert.equal(await main(['--public-id', 'test-id'], { ...out,
    run: async (command, args) => {
      calls.push(args);
      return d1([{ public_id: 'test-id', username: 'livecheck-123@food4u.test' }]);
    },
    deleteProfile: async () => { throw new Error(secret); },
  }), 1);
  assert.equal(calls.length, 1);
  assert.match(out.lines[0], /"result":"FAIL"/);
  assert.doesNotMatch(out.lines[0], /private-password|postgres:\/\//);
});
