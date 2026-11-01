/* eslint-env node */
// Local stand-in for Neon's SQL-over-HTTP endpoint, backed by PGlite (real
// Postgres compiled to WebAssembly). The e2e runtime and node tests point the
// real @neondatabase/serverless driver here (neonConfig.fetchEndpoint), so the
// app's SQL runs against real Postgres with no network access.
//
// Wire format, as sent by the pinned driver (1.2.0):
//   POST {query, params} or {queries: [{query, params}, ...]} (one transaction)
//   headers Neon-Connection-String, Neon-Raw-Text-Output: true, Neon-Array-Mode: true
// It expects Postgres text-format cells, which it parses by dataTypeID:
//   {fields: [{name, dataTypeID}], rows: [[text|null, ...]]} or {results: [...]}
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

function format(query, result) {
  return {
    command: query.trim().split(/\s+/)[0].toUpperCase(),
    rowCount: result.affectedRows ?? result.rows.length,
    fields: result.fields.map(({ name, dataTypeID }) => ({ name, dataTypeID })),
    rows: result.rows,
    rowAsArray: true,
  };
}

/** Starts an in-memory Postgres with the given migrations applied in order. */
export async function startFakeNeon(migrationFiles = []) {
  const db = new PGlite();
  // Identity parsers/serializers for every type, so cells and params stay in
  // Postgres text format exactly as Neon's endpoint returns and receives them.
  // (An explicit map: PGlite spreads these options, which drops a Proxy's keys.)
  const passthrough = Object.fromEntries((await db.query('SELECT oid FROM pg_type')).rows.map(({ oid }) => [oid, value => value]));
  const options = { rowMode: 'array', parsers: passthrough, serializers: passthrough };
  // Production creates this role with SQL before applying grants (docs/deploy.md).
  await db.exec('CREATE ROLE food4u_web NOLOGIN');
  for (const file of migrationFiles) await db.exec(await readFile(file, 'utf8'));

  async function run(body) {
    try {
      if (Array.isArray(body.queries)) {
        const results = await db.transaction(async tx => {
          const out = [];
          for (const { query, params } of body.queries) out.push(format(query, await tx.query(query, params ?? [], options)));
          return out;
        });
        return { status: 200, body: { results } };
      }
      return { status: 200, body: format(body.query, await db.query(body.query, body.params ?? [], options)) };
    } catch (error) {
      // Neon answers SQL errors with HTTP 400 and the Postgres error fields.
      return { status: 400, body: { message: error.message, code: error.code, severity: error.severity, detail: error.detail } };
    }
  }

  // PGlite has one connection; serialize requests the way a pooled backend would.
  let queue = Promise.resolve();
  const execute = body => (queue = queue.then(() => run(body), () => run(body)));

  return {
    db,
    execute,
    /** Node http handler for POST /sql. */
    async handle(req, res) {
      let raw = '';
      for await (const part of req) raw += part;
      const { status, body } = await execute(JSON.parse(raw));
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    },
    close: () => db.close(),
  };
}
