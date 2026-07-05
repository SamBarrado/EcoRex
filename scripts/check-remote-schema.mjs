#!/usr/bin/env node
// Compares schema.sql (source of truth) against the live remote D1 database
// (ecorex-db) and reports any tables/columns that schema.sql defines but
// remote is missing. Catches the class of bug where a schema.sql change
// gets committed and used locally (wrangler pages dev creates/updates the
// local D1 sqlite file from scratch) but is never applied to production
// with `wrangler d1 execute DB --remote`.
//
// Usage: npm run db:check-remote-schema
// Exits non-zero (and prints what's missing) if remote is behind schema.sql.
// Does not compare the other direction (extra remote tables/columns are not
// flagged) and does not check column types/constraints, only presence.

import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA_FILE = path.join(ROOT, "schema.sql");

function parseSchemaTables(sql) {
  const tables = new Map(); // name -> [columns]
  const tableRegex = /CREATE TABLE (\w+) \(([\s\S]*?)\n\);/g;
  let match;
  while ((match = tableRegex.exec(sql))) {
    const [, name, body] = match;
    const columns = body
      .split("\n")
      .map((line) => line.split("--")[0].trim())
      .filter(Boolean)
      .map((line) => line.replace(/,$/, ""))
      .filter((line) => !/^(PRIMARY KEY|UNIQUE|FOREIGN KEY|CHECK)\s*\(/i.test(line))
      .map((line) => line.split(/\s+/)[0]);
    tables.set(name, columns);
  }
  return tables;
}

function queryRemote(sql) {
  const output = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--remote", "--json", "--command", sql],
    { cwd: ROOT, encoding: "utf8" }
  );
  const parsed = JSON.parse(output);
  return parsed[0].results;
}

async function main() {
  const schemaSql = await readFile(SCHEMA_FILE, "utf8");
  const localTables = parseSchemaTables(schemaSql);

  console.log(`Checking ${localTables.size} table(s) from schema.sql against remote D1...\n`);

  const remoteTableRows = queryRemote(
    "SELECT name FROM sqlite_master WHERE type='table';"
  );
  const remoteTableNames = new Set(remoteTableRows.map((r) => r.name));

  let problems = 0;

  for (const [table, localColumns] of localTables) {
    if (!remoteTableNames.has(table)) {
      console.log(`✘ Missing table on remote: ${table}`);
      problems++;
      continue;
    }

    const remoteColumnRows = queryRemote(`PRAGMA table_info(${table});`);
    const remoteColumnNames = new Set(remoteColumnRows.map((r) => r.name));

    for (const col of localColumns) {
      if (!remoteColumnNames.has(col)) {
        console.log(`✘ Missing column on remote: ${table}.${col}`);
        problems++;
      }
    }
  }

  if (problems === 0) {
    console.log("✓ Remote D1 schema matches schema.sql (tables/columns present).");
    return;
  }

  console.log(
    `\n${problems} problem(s) found. Apply the missing pieces to production:\n` +
      `  - missing column: npx wrangler d1 execute DB --remote --command="ALTER TABLE <table> ADD COLUMN <col> <type>;"\n` +
      `  - missing table: put just its CREATE TABLE statement in a temp .sql file and run\n` +
      `    npx wrangler d1 execute DB --remote --file=<temp>.sql\n` +
      `    (schema.sql has no IF NOT EXISTS guards, so never run the whole file against remote once it has data)\n`
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
