/**
 * Acesso à base de dados. Todas as escritas passam por aqui; as que mexem num
 * orçamento terminam com `recalcularTotais`, para manter os totais guardados certos.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { calcularOrcamento, type ParametrosOrcamento } from '@/domain/pricing';
import type { UnidadeEntrada, UnidadeItem } from '@/domain/units';

export type TipoItem = 'ingrediente' | 'material';
export type EstadoOrcamento = 'rascunho' | 'enviado' | 'aceite' | 'recusado' | 'entregue';

export interface Item {
  id: number;
  tipo: TipoItem;
  nome: string;
  unidade: UnidadeItem;
  preco_unidade_cent: number;
  ativo: number;
  atualizado_em: string;
}

export interface Definicoes {
  valor_hora_cent: number;
  custo_indireto_pct: number;
  margem_pct: number;
  moeda: string;
  nome_negocio: string;
  contacto: string;
  logotipo: string | null;
}

export interface Orcamento {
  id: number;
  cliente: string;
  contacto: string;
  data_entrega: string | null;
  estado: EstadoOrcamento;
  notas: string;
  valor_hora_cent: number;
  indireto_pct: number;
  margem_pct: number;
  total_calc_cent: number;
  total_cent: number;
  criado_em: string;
  atualizado_em: string;
}

export interface Bolo {
  id: number;
  orcamento_id: number;
  nome: string;
  ordem: number;
  tempo_min: number;
  preco_final_cent: number | null;
  preco_calc_no_ajuste_cent: number | null;
}

export interface Linha {
  id: number;
  bolo_id: number;
  item_id: number | null;
  livre: number;
  descricao: string;
  unidade: UnidadeItem;
  unidade_entrada: UnidadeEntrada;
  /** Na unidade do item. */
  quantidade: number;
  preco_unit_cent: number;
  ordem: number;
}

export interface BoloComLinhas extends Bolo {
  linhas: Linha[];
}

export interface OrcamentoCompleto extends Orcamento {
  bolos: BoloComLinhas[];
}

export interface ResumoOrcamento extends Orcamento {
  n_bolos: number;
}

const agora = () => new Date().toISOString();

// ---------- Catálogo ----------

export function listarItens(db: SQLiteDatabase, opcoes: { tipo?: TipoItem; soAtivos?: boolean } = {}) {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opcoes.tipo) {
    where.push('tipo = ?');
    args.push(opcoes.tipo);
  }
  if (opcoes.soAtivos) where.push('ativo = 1');
  const sql = `SELECT * FROM items ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ativo DESC, nome COLLATE NOCASE`;
  return db.getAllAsync<Item>(sql, args);
}

export function obterItem(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Item>('SELECT * FROM items WHERE id = ?', id);
}

export type NovoItem = Pick<Item, 'tipo' | 'nome' | 'unidade' | 'preco_unidade_cent' | 'ativo'>;

export async function criarItem(db: SQLiteDatabase, item: NovoItem) {
  const r = await db.runAsync(
    `INSERT INTO items (tipo, nome, unidade, preco_unidade_cent, ativo, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?)`,
    item.tipo, item.nome, item.unidade, item.preco_unidade_cent, item.ativo, agora(),
  );
  return r.lastInsertRowId;
}

/** Atualiza o item. Orçamentos existentes não mudam: as linhas têm cópia do preço. */
export async function atualizarItem(db: SQLiteDatabase, id: number, item: NovoItem) {
  await db.runAsync(
    `UPDATE items SET tipo = ?, nome = ?, unidade = ?, preco_unidade_cent = ?, ativo = ?,
     atualizado_em = ? WHERE id = ?`,
    item.tipo, item.nome, item.unidade, item.preco_unidade_cent, item.ativo, agora(), id,
  );
}

export async function itemEmUso(db: SQLiteDatabase, id: number) {
  const r = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM orcamento_linhas WHERE item_id = ?', id,
  );
  return (r?.n ?? 0) > 0;
}

export async function apagarItem(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
}

// ---------- Definições ----------

export async function obterDefinicoes(db: SQLiteDatabase): Promise<Definicoes> {
  const d = await db.getFirstAsync<Definicoes>('SELECT * FROM definicoes WHERE id = 1');
  if (!d) throw new Error('Definições em falta');
  return d;
}

export async function guardarDefinicoes(
  db: SQLiteDatabase,
  d: Pick<Definicoes, 'valor_hora_cent' | 'custo_indireto_pct' | 'margem_pct' | 'nome_negocio' | 'contacto'>,
) {
  await db.runAsync(
    `UPDATE definicoes SET valor_hora_cent = ?, custo_indireto_pct = ?, margem_pct = ?,
     nome_negocio = ?, contacto = ? WHERE id = 1`,
    d.valor_hora_cent, d.custo_indireto_pct, d.margem_pct, d.nome_negocio, d.contacto,
  );
}

// ---------- Orçamentos ----------

export function listarOrcamentos(db: SQLiteDatabase, pesquisa = '') {
  return db.getAllAsync<ResumoOrcamento>(
    `SELECT o.*, (SELECT COUNT(*) FROM orcamento_bolos b WHERE b.orcamento_id = o.id) AS n_bolos
     FROM orcamentos o
     WHERE o.cliente LIKE ? ESCAPE '\\'
     ORDER BY o.criado_em DESC`,
    `%${pesquisa.replace(/[\\%_]/g, (c) => '\\' + c)}%`,
  );
}

/** Cria um orçamento com um bolo vazio, copiando valor/hora, indiretos e margem das definições. */
export async function criarOrcamento(db: SQLiteDatabase): Promise<number> {
  const d = await obterDefinicoes(db);
  let id = 0;
  await db.withTransactionAsync(async () => {
    const t = agora();
    const r = await db.runAsync(
      `INSERT INTO orcamentos (valor_hora_cent, indireto_pct, margem_pct, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?)`,
      d.valor_hora_cent, d.custo_indireto_pct, d.margem_pct, t, t,
    );
    id = r.lastInsertRowId;
    await db.runAsync(
      'INSERT INTO orcamento_bolos (orcamento_id, nome, ordem) VALUES (?, ?, 0)', id, 'Bolo 1',
    );
  });
  return id;
}

export async function obterOrcamento(db: SQLiteDatabase, id: number): Promise<OrcamentoCompleto | null> {
  const o = await db.getFirstAsync<Orcamento>('SELECT * FROM orcamentos WHERE id = ?', id);
  if (!o) return null;
  const bolos = await db.getAllAsync<Bolo>(
    'SELECT * FROM orcamento_bolos WHERE orcamento_id = ? ORDER BY ordem, id', id,
  );
  const linhas = await db.getAllAsync<Linha>(
    `SELECT l.* FROM orcamento_linhas l JOIN orcamento_bolos b ON b.id = l.bolo_id
     WHERE b.orcamento_id = ? ORDER BY l.ordem, l.id`,
    id,
  );
  return {
    ...o,
    bolos: bolos.map((b) => ({ ...b, linhas: linhas.filter((l) => l.bolo_id === b.id) })),
  };
}

export function parametrosDe(o: Orcamento): ParametrosOrcamento {
  return { valorHoraCent: o.valor_hora_cent, indiretoPct: o.indireto_pct, margemPct: o.margem_pct };
}

export function entradaDeBolo(b: BoloComLinhas) {
  return {
    linhas: b.linhas.map((l) => ({ quantidade: l.quantidade, precoUnitCent: l.preco_unit_cent })),
    tempoMin: b.tempo_min,
    precoFinalCent: b.preco_final_cent,
    precoCalcNoAjusteCent: b.preco_calc_no_ajuste_cent,
  };
}

export function calcular(o: OrcamentoCompleto) {
  return calcularOrcamento(o.bolos.map(entradaDeBolo), parametrosDe(o));
}

/** Volta a calcular e guarda os totais do orçamento (usados na lista e na pesquisa). */
export async function recalcularTotais(db: SQLiteDatabase, orcamentoId: number) {
  const o = await obterOrcamento(db, orcamentoId);
  if (!o) return;
  const r = calcular(o);
  await db.runAsync(
    'UPDATE orcamentos SET total_calc_cent = ?, total_cent = ?, atualizado_em = ? WHERE id = ?',
    r.totalCalcCent, r.totalCent, agora(), orcamentoId,
  );
}

export async function atualizarOrcamento(
  db: SQLiteDatabase,
  id: number,
  campos: Partial<Pick<Orcamento, 'cliente' | 'contacto' | 'data_entrega' | 'notas' | 'margem_pct' | 'estado'>>,
) {
  const chaves = Object.keys(campos) as (keyof typeof campos)[];
  if (chaves.length === 0) return;
  await db.runAsync(
    `UPDATE orcamentos SET ${chaves.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    ...chaves.map((k) => campos[k] ?? null), id,
  );
  await recalcularTotais(db, id);
}

export async function apagarOrcamento(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM orcamentos WHERE id = ?', id);
}

// ---------- Bolos ----------

export async function adicionarBolo(db: SQLiteDatabase, orcamentoId: number) {
  const r = await db.getFirstAsync<{ n: number; maxOrdem: number | null }>(
    'SELECT COUNT(*) AS n, MAX(ordem) AS maxOrdem FROM orcamento_bolos WHERE orcamento_id = ?',
    orcamentoId,
  );
  await db.runAsync(
    'INSERT INTO orcamento_bolos (orcamento_id, nome, ordem) VALUES (?, ?, ?)',
    orcamentoId, `Bolo ${(r?.n ?? 0) + 1}`, (r?.maxOrdem ?? -1) + 1,
  );
  await recalcularTotais(db, orcamentoId);
}

async function orcamentoDoBolo(db: SQLiteDatabase, boloId: number) {
  const r = await db.getFirstAsync<{ orcamento_id: number }>(
    'SELECT orcamento_id FROM orcamento_bolos WHERE id = ?', boloId,
  );
  return r?.orcamento_id;
}

export async function atualizarBolo(
  db: SQLiteDatabase,
  boloId: number,
  campos: Partial<Pick<Bolo, 'nome' | 'tempo_min'>>,
) {
  const chaves = Object.keys(campos) as (keyof typeof campos)[];
  if (chaves.length === 0) return;
  await db.runAsync(
    `UPDATE orcamento_bolos SET ${chaves.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    ...chaves.map((k) => campos[k] ?? null), boloId,
  );
  const oid = await orcamentoDoBolo(db, boloId);
  if (oid) await recalcularTotais(db, oid);
}

/**
 * Guarda o preço final editado de um bolo, junto com o calculado nesse momento
 * (para depois avisar se o calculado mudar). `null` repõe o calculado.
 */
export async function definirPrecoFinal(
  db: SQLiteDatabase,
  boloId: number,
  precoFinalCent: number | null,
  precoCalcAtualCent: number,
) {
  await db.runAsync(
    'UPDATE orcamento_bolos SET preco_final_cent = ?, preco_calc_no_ajuste_cent = ? WHERE id = ?',
    precoFinalCent, precoFinalCent === null ? null : precoCalcAtualCent, boloId,
  );
  const oid = await orcamentoDoBolo(db, boloId);
  if (oid) await recalcularTotais(db, oid);
}

export async function apagarBolo(db: SQLiteDatabase, boloId: number) {
  const oid = await orcamentoDoBolo(db, boloId);
  await db.runAsync('DELETE FROM orcamento_bolos WHERE id = ?', boloId);
  if (oid) await recalcularTotais(db, oid);
}

// ---------- Linhas ----------

export function obterLinha(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Linha>('SELECT * FROM orcamento_linhas WHERE id = ?', id);
}

/** Adiciona uma linha com cópia do nome, unidade e preço atuais do item. */
export async function adicionarLinhaItem(
  db: SQLiteDatabase,
  boloId: number,
  item: Item,
  quantidade: number,
  unidadeEntrada: UnidadeEntrada,
) {
  await inserirLinha(db, boloId, {
    item_id: item.id,
    livre: 0,
    descricao: item.nome,
    unidade: item.unidade,
    unidade_entrada: unidadeEntrada,
    quantidade,
    preco_unit_cent: item.preco_unidade_cent,
  });
}

export async function adicionarLinhaLivre(
  db: SQLiteDatabase,
  boloId: number,
  descricao: string,
  valorCent: number,
) {
  await inserirLinha(db, boloId, {
    item_id: null,
    livre: 1,
    descricao,
    unidade: 'un',
    unidade_entrada: 'un',
    quantidade: 1,
    preco_unit_cent: valorCent,
  });
}

async function inserirLinha(db: SQLiteDatabase, boloId: number, l: Omit<Linha, 'id' | 'bolo_id' | 'ordem'>) {
  const r = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(ordem) AS m FROM orcamento_linhas WHERE bolo_id = ?', boloId,
  );
  await db.runAsync(
    `INSERT INTO orcamento_linhas
     (bolo_id, item_id, livre, descricao, unidade, unidade_entrada, quantidade, preco_unit_cent, ordem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    boloId, l.item_id, l.livre, l.descricao, l.unidade, l.unidade_entrada, l.quantidade,
    l.preco_unit_cent, (r?.m ?? -1) + 1,
  );
  const oid = await orcamentoDoBolo(db, boloId);
  if (oid) await recalcularTotais(db, oid);
}

/** Edita quantidade (linha de item) ou descrição/valor (linha livre). O preço copiado não muda. */
export async function atualizarLinha(
  db: SQLiteDatabase,
  linhaId: number,
  campos: Partial<Pick<Linha, 'quantidade' | 'unidade_entrada' | 'descricao' | 'preco_unit_cent'>>,
) {
  const chaves = Object.keys(campos) as (keyof typeof campos)[];
  if (chaves.length === 0) return;
  await db.runAsync(
    `UPDATE orcamento_linhas SET ${chaves.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    ...chaves.map((k) => campos[k] ?? null), linhaId,
  );
  const l = await obterLinha(db, linhaId);
  if (l) {
    const oid = await orcamentoDoBolo(db, l.bolo_id);
    if (oid) await recalcularTotais(db, oid);
  }
}

export async function apagarLinha(db: SQLiteDatabase, linhaId: number) {
  const l = await obterLinha(db, linhaId);
  await db.runAsync('DELETE FROM orcamento_linhas WHERE id = ?', linhaId);
  if (l) {
    const oid = await orcamentoDoBolo(db, l.bolo_id);
    if (oid) await recalcularTotais(db, oid);
  }
}
