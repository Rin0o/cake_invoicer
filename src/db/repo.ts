/**
 * Acesso à base de dados. Todas as escritas passam por aqui; as que mexem num
 * orçamento terminam com `recalcularTotais`, para manter os totais guardados certos.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { EstadoOrcamento } from '@/domain/estados';
import { hojeIso } from '@/domain/format';
import { calcularOrcamento, type ParametrosOrcamento } from '@/domain/pricing';
import { escalarLinhas } from '@/domain/receitas';
import type { UnidadeEntrada, UnidadeItem } from '@/domain/units';

export type { EstadoOrcamento };
export type TipoItem = 'ingrediente' | 'material';

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
  /** Id da cor do PDF, ver `CORES_PDF` em src/pdf/cores.ts. */
  pdf_cor: string;
  contacto_telefone: string;
  contacto_email: string;
  contacto_instagram: string;
  contacto_facebook: string;
  contacto_tiktok: string;
  contacto_site: string;
}

/** O que se edita no ecrã Definições (tudo menos a moeda). */
export type DefinicoesEditaveis = Omit<Definicoes, 'moeda'>;

const CAMPOS_EDITAVEIS = [
  'valor_hora_cent', 'custo_indireto_pct', 'margem_pct', 'nome_negocio', 'pdf_cor',
  'contacto_telefone', 'contacto_email', 'contacto_instagram', 'contacto_facebook',
  'contacto_tiktok', 'contacto_site',
] as const satisfies readonly (keyof DefinicoesEditaveis)[];

export interface Orcamento {
  id: number;
  /** Número público, ver `formatarNumero`. */
  numero_ano: number;
  numero_seq: number;
  cliente: string;
  /** Título interno do pedido (ex.: "Aniversário 5 anos"). Não vai para o PDF nem o texto. */
  titulo: string;
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

/**
 * Atualiza o item. Orçamentos existentes não mudam: as linhas têm cópia do preço.
 * Não deixa mudar a unidade de um item usado em receitas (as quantidades ficariam erradas).
 */
export async function atualizarItem(db: SQLiteDatabase, id: number, item: NovoItem) {
  const atual = await obterItem(db, id);
  if (atual && atual.unidade !== item.unidade) {
    const receitas = await receitasComItem(db, id);
    if (receitas.length > 0) {
      throw new Error(
        `Não é possível mudar a unidade: o item é usado nas receitas ${listarNomes(receitas)}. ` +
          'Retire-o dessas receitas primeiro, ou crie um item novo.',
      );
    }
  }
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

/** Nomes das receitas que usam o item. */
export async function receitasComItem(db: SQLiteDatabase, itemId: number): Promise<string[]> {
  const r = await db.getAllAsync<{ nome: string }>(
    `SELECT DISTINCT r.nome FROM receitas r JOIN receita_linhas l ON l.receita_id = r.id
     WHERE l.item_id = ? ORDER BY r.nome COLLATE NOCASE`,
    itemId,
  );
  return r.map((x) => x.nome || 'Sem nome');
}

function listarNomes(nomes: string[]) {
  return nomes.map((n) => `"${n}"`).join(', ');
}

/** Apaga o item. Recusa se for usado em receitas; em orçamentos, as linhas mantêm a cópia. */
export async function apagarItem(db: SQLiteDatabase, id: number) {
  const receitas = await receitasComItem(db, id);
  if (receitas.length > 0) {
    throw new Error(
      `Este item é usado nas receitas ${listarNomes(receitas)}. Retire-o dessas receitas ` +
        'antes de o apagar, ou desative-o.',
    );
  }
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
}

// ---------- Definições ----------

export async function obterDefinicoes(db: SQLiteDatabase): Promise<Definicoes> {
  const d = await db.getFirstAsync<Definicoes>('SELECT * FROM definicoes WHERE id = 1');
  if (!d) throw new Error('Definições em falta');
  return d;
}

export async function guardarDefinicoes(db: SQLiteDatabase, d: DefinicoesEditaveis) {
  await db.runAsync(
    `UPDATE definicoes SET ${CAMPOS_EDITAVEIS.map((c) => `${c} = ?`).join(', ')} WHERE id = 1`,
    CAMPOS_EDITAVEIS.map((c) => d[c]),
  );
}

// ---------- Orçamentos ----------

function padraoLike(texto: string) {
  return `%${texto.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
}

/** O número como texto em SQL, igual a `formatarNumero` (para a pesquisa). */
const SQL_NUMERO = `(o.numero_ano || '-' || printf('%03d', o.numero_seq))`;

/**
 * Histórico de orçamentos, com pesquisa por cliente, título ou número, e filtro por estado.
 * Ordem: entregas de hoje em diante (a mais próxima primeiro), depois as passadas
 * (a mais recente primeiro), e no fim os orçamentos sem data de entrega.
 */
export function listarOrcamentos(
  db: SQLiteDatabase,
  opcoes: { pesquisa?: string; estado?: EstadoOrcamento | null; hoje?: string } = {},
) {
  const hoje = opcoes.hoje ?? hojeIso();
  const padrao = padraoLike((opcoes.pesquisa ?? '').trim());
  const args: (string | number)[] = [padrao, padrao, padrao];
  let filtroEstado = '';
  if (opcoes.estado) {
    filtroEstado = 'AND o.estado = ?';
    args.push(opcoes.estado);
  }
  args.push(hoje, hoje, hoje);
  return db.getAllAsync<ResumoOrcamento>(
    `SELECT o.*, (SELECT COUNT(*) FROM orcamento_bolos b WHERE b.orcamento_id = o.id) AS n_bolos
     FROM orcamentos o
     WHERE (o.cliente LIKE ? ESCAPE '\\' OR o.titulo LIKE ? ESCAPE '\\' OR ${SQL_NUMERO} LIKE ? ESCAPE '\\')
       ${filtroEstado}
     ORDER BY
       CASE WHEN o.data_entrega IS NULL THEN 2 WHEN o.data_entrega >= ? THEN 0 ELSE 1 END,
       CASE WHEN o.data_entrega >= ? THEN o.data_entrega END ASC,
       CASE WHEN o.data_entrega < ? THEN o.data_entrega END DESC,
       o.criado_em DESC, o.id DESC`,
    args,
  );
}

/**
 * Próximo número do ano. Usa o maior entre o contador e os orçamentos que existem, para nunca
 * repetir um número (mesmo depois de apagar o último, ou de importar um backup).
 */
async function proximoNumero(db: SQLiteDatabase, ano: number): Promise<number> {
  const r = await db.getFirstAsync<{ n: number }>(
    `SELECT MAX(
       COALESCE((SELECT ultimo FROM numeracao WHERE ano = ?), 0),
       COALESCE((SELECT MAX(numero_seq) FROM orcamentos WHERE numero_ano = ?), 0)
     ) + 1 AS n`,
    ano, ano,
  );
  const n = r?.n ?? 1;
  await db.runAsync(
    `INSERT INTO numeracao (ano, ultimo) VALUES (?, ?)
     ON CONFLICT (ano) DO UPDATE SET ultimo = excluded.ultimo`,
    ano, n,
  );
  return n;
}

/**
 * Cria um orçamento com um bolo vazio, copiando valor/hora, indiretos e margem das definições,
 * e atribui o número seguinte do ano.
 */
export async function criarOrcamento(db: SQLiteDatabase, opcoes: { hoje?: string } = {}): Promise<number> {
  const d = await obterDefinicoes(db);
  const ano = Number((opcoes.hoje ?? hojeIso()).slice(0, 4));
  let id = 0;
  await db.withTransactionAsync(async () => {
    const t = agora();
    const seq = await proximoNumero(db, ano);
    const r = await db.runAsync(
      `INSERT INTO orcamentos
       (numero_ano, numero_seq, valor_hora_cent, indireto_pct, margem_pct, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ano, seq, d.valor_hora_cent, d.custo_indireto_pct, d.margem_pct, t, t,
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
  campos: Partial<
    Pick<Orcamento, 'cliente' | 'titulo' | 'contacto' | 'data_entrega' | 'notas' | 'margem_pct' | 'estado'>
  >,
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

// ---------- Receitas ----------
//
// Uma receita guarda só quantidades; os preços vêm sempre do catálogo atual. Ao aplicar
// uma receita a um bolo, as linhas são copiadas com os preços desse momento (snapshot),
// e a partir daí o bolo não depende da receita.

export interface Receita {
  id: number;
  nome: string;
  notas: string;
  atualizado_em: string;
}

export interface LinhaReceita {
  id: number;
  receita_id: number;
  item_id: number | null;
  livre: number;
  /** Só em linhas livres; nas de item usa-se o nome atual do item. */
  descricao: string;
  unidade_entrada: UnidadeEntrada;
  /** Na unidade do item; 1 em linhas livres. */
  quantidade: number;
  /** Só em linhas livres. */
  valor_cent: number | null;
  ordem: number;
}

/** Linha da receita com os dados atuais do item. */
export interface LinhaReceitaDetalhe extends LinhaReceita {
  nome: string;
  tipo: TipoItem | null;
  unidade: UnidadeItem;
  preco_unit_cent: number;
  ativo: number;
}

export interface ReceitaCompleta extends Receita {
  linhas: LinhaReceitaDetalhe[];
}

export interface ResumoReceita extends Receita {
  n_linhas: number;
}

export function listarReceitas(db: SQLiteDatabase, pesquisa = '') {
  return db.getAllAsync<ResumoReceita>(
    `SELECT r.*, (SELECT COUNT(*) FROM receita_linhas l WHERE l.receita_id = r.id) AS n_linhas
     FROM receitas r WHERE r.nome LIKE ? ESCAPE '\\' ORDER BY r.nome COLLATE NOCASE, r.id`,
    padraoLike(pesquisa),
  );
}

const SELECT_LINHA_RECEITA = `
  SELECT l.*,
    CASE WHEN l.livre = 1 THEN l.descricao ELSE i.nome END AS nome,
    i.tipo AS tipo,
    COALESCE(i.unidade, 'un') AS unidade,
    CASE WHEN l.livre = 1 THEN l.valor_cent ELSE i.preco_unidade_cent END AS preco_unit_cent,
    COALESCE(i.ativo, 1) AS ativo
  FROM receita_linhas l LEFT JOIN items i ON i.id = l.item_id`;

export async function obterReceita(db: SQLiteDatabase, id: number): Promise<ReceitaCompleta | null> {
  const r = await db.getFirstAsync<Receita>('SELECT * FROM receitas WHERE id = ?', id);
  if (!r) return null;
  const linhas = await db.getAllAsync<LinhaReceitaDetalhe>(
    `${SELECT_LINHA_RECEITA} WHERE l.receita_id = ? ORDER BY l.ordem, l.id`, id,
  );
  return { ...r, linhas };
}

export function obterLinhaReceita(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<LinhaReceitaDetalhe>(`${SELECT_LINHA_RECEITA} WHERE l.id = ?`, id);
}

/** Linhas no formato do cálculo (para o custo estimado e a escala). */
export function entradaDeLinhaReceita(l: LinhaReceitaDetalhe) {
  return { livre: !!l.livre, tipo: l.tipo, quantidade: l.quantidade, precoUnitCent: l.preco_unit_cent };
}

export async function criarReceita(db: SQLiteDatabase, nome = '') {
  const r = await db.runAsync('INSERT INTO receitas (nome, atualizado_em) VALUES (?, ?)', nome, agora());
  return r.lastInsertRowId;
}

export async function atualizarReceita(
  db: SQLiteDatabase,
  id: number,
  campos: Partial<Pick<Receita, 'nome' | 'notas'>>,
) {
  const chaves = Object.keys(campos) as (keyof typeof campos)[];
  if (chaves.length === 0) return;
  await db.runAsync(
    `UPDATE receitas SET ${chaves.map((k) => `${k} = ?`).join(', ')}, atualizado_em = ? WHERE id = ?`,
    ...chaves.map((k) => campos[k] ?? ''), agora(), id,
  );
}

/** Apaga a receita. Os bolos onde já foi aplicada não mudam. */
export async function apagarReceita(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM receitas WHERE id = ?', id);
}

async function inserirLinhaReceita(
  db: SQLiteDatabase,
  receitaId: number,
  l: Pick<LinhaReceita, 'item_id' | 'livre' | 'descricao' | 'unidade_entrada' | 'quantidade' | 'valor_cent'>,
) {
  const r = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(ordem) AS m FROM receita_linhas WHERE receita_id = ?', receitaId,
  );
  await db.runAsync(
    `INSERT INTO receita_linhas
     (receita_id, item_id, livre, descricao, unidade_entrada, quantidade, valor_cent, ordem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    receitaId, l.item_id, l.livre, l.descricao, l.unidade_entrada, l.quantidade, l.valor_cent,
    (r?.m ?? -1) + 1,
  );
  await db.runAsync('UPDATE receitas SET atualizado_em = ? WHERE id = ?', agora(), receitaId);
}

export async function adicionarLinhaReceitaItem(
  db: SQLiteDatabase,
  receitaId: number,
  itemId: number,
  quantidade: number,
  unidadeEntrada: UnidadeEntrada,
) {
  await inserirLinhaReceita(db, receitaId, {
    item_id: itemId, livre: 0, descricao: '', unidade_entrada: unidadeEntrada, quantidade, valor_cent: null,
  });
}

export async function adicionarLinhaReceitaLivre(
  db: SQLiteDatabase,
  receitaId: number,
  descricao: string,
  valorCent: number,
) {
  await inserirLinhaReceita(db, receitaId, {
    item_id: null, livre: 1, descricao, unidade_entrada: 'un', quantidade: 1, valor_cent: valorCent,
  });
}

export async function atualizarLinhaReceita(
  db: SQLiteDatabase,
  linhaId: number,
  campos: Partial<Pick<LinhaReceita, 'quantidade' | 'unidade_entrada' | 'descricao' | 'valor_cent'>>,
) {
  const chaves = Object.keys(campos) as (keyof typeof campos)[];
  if (chaves.length === 0) return;
  await db.runAsync(
    `UPDATE receita_linhas SET ${chaves.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    ...chaves.map((k) => campos[k] ?? null), linhaId,
  );
}

export async function apagarLinhaReceita(db: SQLiteDatabase, linhaId: number) {
  await db.runAsync('DELETE FROM receita_linhas WHERE id = ?', linhaId);
}

/**
 * Copia as linhas da receita para o bolo, com os preços atuais do catálogo e a escala
 * aplicada aos ingredientes. Junta às linhas que o bolo já tem. Se o bolo estiver vazio
 * e ainda tiver o nome por omissão ("Bolo 2"), passa a ter o nome da receita.
 */
export async function aplicarReceita(db: SQLiteDatabase, boloId: number, receitaId: number, escala: number) {
  const receita = await obterReceita(db, receitaId);
  if (!receita) throw new Error('A receita já não existe.');
  if (receita.linhas.length === 0) throw new Error('A receita não tem linhas.');
  const bolo = await db.getFirstAsync<Bolo & { n_linhas: number; max_ordem: number | null }>(
    `SELECT b.*, (SELECT COUNT(*) FROM orcamento_linhas l WHERE l.bolo_id = b.id) AS n_linhas,
       (SELECT MAX(ordem) FROM orcamento_linhas l WHERE l.bolo_id = b.id) AS max_ordem
     FROM orcamento_bolos b WHERE b.id = ?`,
    boloId,
  );
  if (!bolo) throw new Error('O bolo já não existe.');

  const escaladas = escalarLinhas(
    receita.linhas.map((l) => ({ ...entradaDeLinhaReceita(l), linha: l })),
    escala,
  );

  await db.withTransactionAsync(async () => {
    let ordem = (bolo.max_ordem ?? -1) + 1;
    for (const e of escaladas) {
      const l = e.linha;
      await db.runAsync(
        `INSERT INTO orcamento_linhas
         (bolo_id, item_id, livre, descricao, unidade, unidade_entrada, quantidade, preco_unit_cent, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        boloId, l.item_id, l.livre, l.nome, l.unidade, l.unidade_entrada, e.quantidade, l.preco_unit_cent,
        ordem++,
      );
    }
    if (bolo.n_linhas === 0 && /^Bolo \d+$/.test(bolo.nome) && receita.nome.trim()) {
      await db.runAsync('UPDATE orcamento_bolos SET nome = ? WHERE id = ?', receita.nome.trim(), boloId);
    }
  });
  await recalcularTotais(db, bolo.orcamento_id);
}
