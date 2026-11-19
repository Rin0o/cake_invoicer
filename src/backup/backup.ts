/**
 * Backup e restauro de toda a base em JSON.
 *
 * - Exportar: grava um ficheiro e abre a folha de partilha (Drive, WhatsApp, email,
 *   Transferências…), para o backup ficar fora do telemóvel ou pelo menos fora da app.
 * - Automático: antes de cada migração grava uma cópia na pasta da app (protege
 *   contra falhas de migração, não contra desinstalar a app).
 * - Importar: substitui todos os dados pelos do ficheiro.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

const APP_ID = 'orcamentos-bolos';
const MAX_BACKUPS_AUTOMATICOS = 10;

/** Tabelas e colunas incluídas no backup, pela ordem de inserção (respeita as chaves estrangeiras). */
export const TABELAS: Record<string, string[]> = {
  definicoes: ['id', 'valor_hora_cent', 'custo_indireto_pct', 'margem_pct', 'moeda', 'nome_negocio'],
  items: ['id', 'tipo', 'nome', 'unidade', 'preco_unidade_cent', 'ativo', 'atualizado_em'],
  receitas: ['id', 'nome', 'notas', 'atualizado_em'],
  receita_linhas: [
    'id', 'receita_id', 'item_id', 'livre', 'descricao', 'unidade_entrada', 'quantidade', 'valor_cent', 'ordem',
  ],
  orcamentos: [
    'id', 'cliente', 'contacto', 'data_entrega', 'estado', 'notas', 'valor_hora_cent', 'indireto_pct',
    'margem_pct', 'total_calc_cent', 'total_cent', 'criado_em', 'atualizado_em',
  ],
  orcamento_bolos: ['id', 'orcamento_id', 'nome', 'ordem', 'tempo_min', 'preco_final_cent', 'preco_calc_no_ajuste_cent'],
  orcamento_linhas: [
    'id', 'bolo_id', 'item_id', 'livre', 'descricao', 'unidade', 'unidade_entrada', 'quantidade',
    'preco_unit_cent', 'ordem',
  ],
};

export interface Backup {
  app: typeof APP_ID;
  versao_schema: number;
  exportado_em: string;
  tabelas: Record<string, Record<string, unknown>[]>;
}

async function versaoSchema(db: SQLiteDatabase) {
  const r = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return r?.user_version ?? 0;
}

/**
 * Exporta todas as tabelas que existem na base, com todas as colunas, tal como estão.
 * Não usa `TABELAS` de propósito: o backup automático antes de uma migração corre sobre o
 * schema antigo, onde as tabelas novas ainda não existem. A versão gravada é a da base,
 * e `validarBackup` converte-o ao importar.
 */
export async function gerarBackup(db: SQLiteDatabase): Promise<Backup> {
  const existentes = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  const tabelas: Backup['tabelas'] = {};
  for (const { name } of existentes) {
    tabelas[name] = await db.getAllAsync(`SELECT * FROM "${name}"`);
  }
  return {
    app: APP_ID,
    versao_schema: await versaoSchema(db),
    exportado_em: new Date().toISOString(),
    tabelas,
  };
}

function carimbo() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

async function gravar(dir: Directory, nome: string, conteudo: string) {
  if (!dir.exists) dir.create({ intermediates: true });
  const f = new File(dir, nome);
  f.create({ overwrite: true });
  await f.write(conteudo);
  return f;
}

/** Grava o backup num ficheiro e abre a folha de partilha. */
export async function exportarBackup(db: SQLiteDatabase) {
  const backup = await gerarBackup(db);
  const f = await gravar(new Directory(Paths.cache, 'export'), `orcamentos-bolos-${carimbo()}.json`, JSON.stringify(backup));
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('A partilha de ficheiros não está disponível neste dispositivo.');
  }
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Guardar backup' });
}

/** Backup automático na pasta da app; mantém só os mais recentes. */
export async function guardarBackupAutomatico(db: SQLiteDatabase, motivo: string) {
  const dir = new Directory(Paths.document, 'backups');
  const backup = await gerarBackup(db);
  await gravar(dir, `${carimbo()}-${motivo}.json`, JSON.stringify(backup));

  const ficheiros = dir
    .list()
    .filter((e): e is File => e instanceof File && e.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const antigo of ficheiros.slice(0, Math.max(0, ficheiros.length - MAX_BACKUPS_AUTOMATICOS))) {
    antigo.delete();
  }
}

/**
 * Passos para trazer um backup de uma versão antiga do schema para a seguinte.
 * `ATUALIZAR_BACKUP[v]` converte um backup da versão v + 1 para a v + 2 (o índice 0 converte
 * v1 → v2). Colunas que deixaram de existir são ignoradas ao restaurar; só é preciso
 * acrescentar tabelas novas e preencher colunas novas obrigatórias.
 * Ao acrescentar uma migration, acrescentar aqui o passo correspondente.
 */
const ATUALIZAR_BACKUP: ((t: Backup['tabelas']) => void)[] = [
  // v1 → v2: receitas
  (t) => {
    t.receitas = [];
    t.receita_linhas = [];
  },
];

/** Valida a estrutura de um backup. Lança erro com mensagem legível se não for válido. */
export function validarBackup(dados: unknown, versaoAtual: number): Backup {
  const b = dados as Partial<Backup> | null;
  if (!b || typeof b !== 'object' || b.app !== APP_ID || typeof b.tabelas !== 'object' || !b.tabelas) {
    throw new Error('Este ficheiro não é um backup desta app.');
  }
  const versao = b.versao_schema;
  if (typeof versao !== 'number' || !Number.isInteger(versao) || versao < 1) {
    throw new Error('O backup tem uma versão de dados inválida.');
  }
  if (versao > versaoAtual) {
    throw new Error(
      `O backup é da versão de dados ${versao} e a app usa a ${versaoAtual}. ` +
        'Instale a versão mais recente da app para o importar.',
    );
  }
  let tabelas = b.tabelas;
  if (versao < versaoAtual) {
    tabelas = JSON.parse(JSON.stringify(tabelas)) as Backup['tabelas'];
    for (let v = versao; v < versaoAtual; v++) ATUALIZAR_BACKUP[v - 1](tabelas);
  }
  for (const nome of Object.keys(TABELAS)) {
    if (!Array.isArray(tabelas[nome])) throw new Error(`O backup não tem a tabela "${nome}".`);
  }
  if (tabelas.definicoes.length !== 1) throw new Error('O backup tem definições inválidas.');
  return { app: APP_ID, versao_schema: versaoAtual, exportado_em: String(b.exportado_em ?? ''), tabelas };
}

/** Substitui todos os dados pelos do backup, numa só transação. */
export async function restaurarBackup(db: SQLiteDatabase, backup: Backup) {
  await db.withTransactionAsync(async () => {
    const nomes = Object.keys(TABELAS);
    for (const nome of [...nomes].reverse()) {
      await db.runAsync(`DELETE FROM ${nome}`);
    }
    for (const nome of nomes) {
      const colunas = TABELAS[nome];
      const sql = `INSERT INTO ${nome} (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`;
      for (const linha of backup.tabelas[nome]) {
        await db.runAsync(sql, colunas.map((c) => (linha[c] ?? null) as string | number | null));
      }
    }
  });
}

/**
 * Pede um ficheiro ao utilizador e devolve o backup validado, ou `null` se cancelar.
 * Não altera dados: quem chama confirma e depois chama `restaurarBackup`.
 */
export async function escolherBackup(db: SQLiteDatabase): Promise<Backup | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (r.canceled) return null;
  let dados: unknown;
  try {
    dados = JSON.parse(await new File(r.assets[0].uri).text());
  } catch {
    throw new Error('Não foi possível ler o ficheiro. Confirme que é um backup .json desta app.');
  }
  return validarBackup(dados, await versaoSchema(db));
}
