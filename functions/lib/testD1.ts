// @ts-nocheck — test-only helper (uses node:sqlite, which the Workers typings don't know).
// A real SQLite database with the project's real migrations applied, wrapped
// in the small slice of the D1 API the handlers use. Higher fidelity than hand-written mocks.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function makeD1(): D1Database & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  const dir = join(process.cwd(), "migrations");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(dir, f), "utf8"));
  }
  const stmt = (sql, params = []) => ({
    bind: (...p) => stmt(sql, p),
    first: async () => sqlite.prepare(sql).get(...params) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
    run: async () => {
      const r = sqlite.prepare(sql).run(...params);
      return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } };
    },
    _run: () => sqlite.prepare(sql).run(...params),
  });
  return {
    sqlite,
    prepare: (sql) => stmt(sql),
    batch: async (stmts) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => s._run());
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

/** Inserts a user and a live session; returns the cookie header to use. */
export function loginAs(db, role: string, id = 1) {
  db.sqlite.prepare("INSERT INTO users (id, email, display_name, role) VALUES (?, ?, ?, ?)").run(id, `u${id}@t.local`, `u${id}`, role);
  db.sqlite.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(`s${id}`, id, Date.now(), Date.now() + 1e7);
  return `ecorex_session=s${id}`;
}
