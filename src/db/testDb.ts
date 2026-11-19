/**
 * Só para testes: adapta o SQLite nativo do Node (`node:sqlite`) à parte da API
 * do expo-sqlite usada na app, para testar migrations e queries sem telemóvel.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

type Param = string | number | null;

function normalizar(args: unknown[]): Param[] {
  if (args.length === 1 && Array.isArray(args[0])) return args[0] as Param[];
  return args as Param[];
}

export function abrirBaseDeTeste(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:');
  const adaptador = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, ...args: unknown[]) {
      const r = db.prepare(sql).run(...normalizar(args));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getFirstAsync(sql: string, ...args: unknown[]) {
      return db.prepare(sql).get(...normalizar(args)) ?? null;
    },
    async getAllAsync(sql: string, ...args: unknown[]) {
      return db.prepare(sql).all(...normalizar(args));
    },
    async withTransactionAsync(fn: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return adaptador as unknown as SQLiteDatabase;
}
