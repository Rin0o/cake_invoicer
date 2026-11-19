import type { SQLiteDatabase } from 'expo-sqlite';

import { guardarBackupAutomatico } from '@/backup/backup';

/**
 * Migrations versionadas. A versão do schema é guardada em `PRAGMA user_version`.
 *
 * Regras:
 * - Nunca alterar uma migration já distribuída; acrescentar uma nova no fim.
 * - Antes de migrar uma base existente, é gravado um backup JSON automático.
 * - Ao acrescentar uma migration, atualizar também `TABELAS` em src/backup/backup.ts.
 */
export const MIGRATIONS: string[] = [
  // v1 — schema inicial
  `
  CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingrediente', 'material')),
    nome TEXT NOT NULL,
    unidade TEXT NOT NULL CHECK (unidade IN ('kg', 'l', 'un')),
    preco_unidade_cent INTEGER NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    atualizado_em TEXT NOT NULL
  );

  CREATE TABLE definicoes (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    valor_hora_cent INTEGER NOT NULL DEFAULT 1000,
    custo_indireto_pct REAL NOT NULL DEFAULT 10,
    margem_pct REAL NOT NULL DEFAULT 30,
    moeda TEXT NOT NULL DEFAULT 'EUR',
    nome_negocio TEXT NOT NULL DEFAULT '',
    contacto TEXT NOT NULL DEFAULT '',
    logotipo TEXT
  );
  INSERT INTO definicoes (id) VALUES (1);

  CREATE TABLE orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL DEFAULT '',
    contacto TEXT NOT NULL DEFAULT '',
    data_entrega TEXT,
    estado TEXT NOT NULL DEFAULT 'rascunho'
      CHECK (estado IN ('rascunho', 'enviado', 'aceite', 'recusado', 'entregue')),
    notas TEXT NOT NULL DEFAULT '',
    valor_hora_cent INTEGER NOT NULL,
    indireto_pct REAL NOT NULL,
    margem_pct REAL NOT NULL,
    total_calc_cent INTEGER NOT NULL DEFAULT 0,
    total_cent INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );

  CREATE TABLE orcamento_bolos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos (id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    tempo_min INTEGER NOT NULL DEFAULT 0,
    preco_final_cent INTEGER,
    preco_calc_no_ajuste_cent INTEGER
  );
  CREATE INDEX idx_bolos_orcamento ON orcamento_bolos (orcamento_id);

  CREATE TABLE orcamento_linhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bolo_id INTEGER NOT NULL REFERENCES orcamento_bolos (id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items (id) ON DELETE SET NULL,
    livre INTEGER NOT NULL DEFAULT 0,
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL,
    unidade_entrada TEXT NOT NULL,
    quantidade REAL NOT NULL,
    preco_unit_cent INTEGER NOT NULL,
    ordem INTEGER NOT NULL
  );
  CREATE INDEX idx_linhas_bolo ON orcamento_linhas (bolo_id);
  `,
];

export const VERSAO_SCHEMA = MIGRATIONS.length;

/** Chamado pelo SQLiteProvider ao abrir a base. */
export async function migrar(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const atual = row?.user_version ?? 0;

  if (atual > VERSAO_SCHEMA) {
    throw new Error(
      `A base de dados é de uma versão mais recente da app (v${atual}). Instale a versão mais recente.`,
    );
  }
  if (atual === VERSAO_SCHEMA) return;

  if (atual > 0) {
    await guardarBackupAutomatico(db, `pre-migracao-v${atual}`);
  }

  for (let v = atual; v < VERSAO_SCHEMA; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
