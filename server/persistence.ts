import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

export interface DocumentStore {
  kind: "sqlite" | "postgres";
  label: string;
  load(name: string): Promise<Uint8Array | null>;
  save(name: string, state: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS documents (
    name TEXT PRIMARY KEY,
    snapshot BLOB NOT NULL,
    updated_at INTEGER NOT NULL
  )
`;

export function openSqliteStore(filename: string): DocumentStore {
  if (filename !== ":memory:") {
    mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);
  const read = db.prepare("SELECT snapshot FROM documents WHERE name = ?");
  const write = db.prepare(`
    INSERT INTO documents (name, snapshot, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      snapshot = excluded.snapshot,
      updated_at = excluded.updated_at
  `);

  return {
    kind: "sqlite",
    label: filename === ":memory:" ? "sqlite memory" : `sqlite ${filename}`,
    async load(name) {
      const row = read.get(name) as { snapshot?: unknown } | undefined;
      return toBytes(row?.snapshot);
    },
    async save(name, state) {
      write.run(name, Buffer.from(state), Date.now());
    },
    async close() {
      db.close();
    },
  };
}

export async function openPostgresStore(connectionString: string): Promise<DocumentStore> {
  const pool = new pg.Pool({ connectionString });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      name TEXT PRIMARY KEY,
      snapshot BYTEA NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);
  return {
    kind: "postgres",
    label: "postgres",
    async load(name) {
      const result = await pool.query<{ snapshot: unknown }>(
        "SELECT snapshot FROM documents WHERE name = $1",
        [name],
      );
      return toBytes(result.rows[0]?.snapshot);
    },
    async save(name, state) {
      await pool.query(
        `INSERT INTO documents (name, snapshot, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET
           snapshot = EXCLUDED.snapshot,
           updated_at = EXCLUDED.updated_at`,
        [name, Buffer.from(state), Date.now()],
      );
    },
    async close() {
      await pool.end();
    },
  };
}

export async function openStore(options: {
  databasePath?: string;
  databaseUrl?: string;
} = {}): Promise<DocumentStore> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.startsWith("postgres")) {
    return openPostgresStore(databaseUrl);
  }
  const filename = options.databasePath ?? process.env.DATABASE_PATH ?? "./data/tandem.sqlite";
  return openSqliteStore(filename);
}

function toBytes(value: unknown): Uint8Array | null {
  if (value == null) return null;
  if (value instanceof Uint8Array) return new Uint8Array(value);
  return null;
}
