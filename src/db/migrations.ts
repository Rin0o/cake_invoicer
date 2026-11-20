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

  // v2 — receitas; sai o contacto do negócio e o logótipo das definições (o logótipo vem com a app)
  `
  CREATE TABLE receitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL DEFAULT '',
    notas TEXT NOT NULL DEFAULT '',
    atualizado_em TEXT NOT NULL
  );

  CREATE TABLE receita_linhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receita_id INTEGER NOT NULL REFERENCES receitas (id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items (id) ON DELETE RESTRICT,
    livre INTEGER NOT NULL DEFAULT 0,
    descricao TEXT NOT NULL DEFAULT '',
    unidade_entrada TEXT NOT NULL,
    quantidade REAL NOT NULL,
    valor_cent INTEGER,
    ordem INTEGER NOT NULL,
    CHECK ((livre = 1 AND item_id IS NULL AND valor_cent IS NOT NULL) OR (livre = 0 AND item_id IS NOT NULL))
  );
  CREATE INDEX idx_receita_linhas_receita ON receita_linhas (receita_id);
  CREATE INDEX idx_receita_linhas_item ON receita_linhas (item_id);

  ALTER TABLE definicoes DROP COLUMN contacto;
  ALTER TABLE definicoes DROP COLUMN logotipo;
  `,

  // v3 — número do orçamento (sequencial por ano, nunca reutilizado) e título interno do pedido.
  // Os orçamentos existentes são numerados por ordem de criação dentro de cada ano
  // (a mesma regra de numerarPorAno em src/domain/numero.ts).
  `
  ALTER TABLE orcamentos ADD COLUMN titulo TEXT NOT NULL DEFAULT '';
  ALTER TABLE orcamentos ADD COLUMN numero_ano INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE orcamentos ADD COLUMN numero_seq INTEGER NOT NULL DEFAULT 0;

  UPDATE orcamentos SET
    numero_ano = CAST(substr(criado_em, 1, 4) AS INTEGER),
    numero_seq = (
      SELECT COUNT(*) FROM orcamentos o2
      WHERE substr(o2.criado_em, 1, 4) = substr(orcamentos.criado_em, 1, 4)
        AND (o2.criado_em < orcamentos.criado_em
          OR (o2.criado_em = orcamentos.criado_em AND o2.id <= orcamentos.id))
    );

  CREATE UNIQUE INDEX idx_orcamentos_numero ON orcamentos (numero_ano, numero_seq);

  CREATE TABLE numeracao (
    ano INTEGER PRIMARY KEY,
    ultimo INTEGER NOT NULL
  );
  INSERT INTO numeracao (ano, ultimo)
    SELECT numero_ano, MAX(numero_seq) FROM orcamentos GROUP BY numero_ano;
  `,

  // v4 — marca no PDF: cor (id de src/pdf/cores.ts) e contactos do negócio no rodapé.
  // Quem já tem orçamentos fica com a framboesa, a cor que o PDF tinha até aqui; uma base
  // nova fica com a cor por omissão (a mesma regra de corInicialPdf em src/backup/backup.ts).
  `
  ALTER TABLE definicoes ADD COLUMN pdf_cor TEXT NOT NULL DEFAULT 'marinho';
  ALTER TABLE definicoes ADD COLUMN contacto_telefone TEXT NOT NULL DEFAULT '';
  ALTER TABLE definicoes ADD COLUMN contacto_email TEXT NOT NULL DEFAULT '';
  ALTER TABLE definicoes ADD COLUMN contacto_instagram TEXT NOT NULL DEFAULT '';
  ALTER TABLE definicoes ADD COLUMN contacto_facebook TEXT NOT NULL DEFAULT '';
  ALTER TABLE definicoes ADD COLUMN contacto_tiktok TEXT NOT NULL DEFAULT '';
  ALTER TABLE definicoes ADD COLUMN contacto_site TEXT NOT NULL DEFAULT '';

  UPDATE definicoes SET pdf_cor = 'framboesa' WHERE EXISTS (SELECT 1 FROM orcamentos);
  `,

  // v5 — data da última mudança de estado (ex.: quando foi entregue ou recusado).
  // Nos orçamentos existentes não se sabe; usa-se a última alteração, o melhor palpite
  // (a mesma regra do passo v4 → v5 em src/backup/backup.ts).
  `
  ALTER TABLE orcamentos ADD COLUMN estado_em TEXT NOT NULL DEFAULT '';
  UPDATE orcamentos SET estado_em = atualizado_em;
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
