/**
 * Receitas: listas de ingredientes, materiais e linhas livres com quantidades, que se
 * copiam para um bolo do orçamento. Módulo puro.
 *
 * A escala (ex.: 1,5) multiplica só as quantidades dos ingredientes. Materiais (caixa,
 * base, topper) e linhas livres ficam iguais: um bolo maior continua a levar uma caixa.
 */

export interface LinhaReceitaInput {
  livre: boolean;
  /** `null` em linhas livres. */
  tipo: 'ingrediente' | 'material' | null;
  /** Na unidade do item; 1 em linhas livres. */
  quantidade: number;
  precoUnitCent: number;
}

/** Diz se a escala se aplica a esta linha. */
export function escalaAplicaSe(l: Pick<LinhaReceitaInput, 'livre' | 'tipo'>): boolean {
  return !l.livre && l.tipo === 'ingrediente';
}

/** Devolve as linhas com a escala aplicada às quantidades dos ingredientes. */
export function escalarLinhas<T extends LinhaReceitaInput>(linhas: T[], escala: number): T[] {
  if (!(escala > 0)) throw new Error('A escala tem de ser maior que zero.');
  return linhas.map((l) => (escalaAplicaSe(l) ? { ...l, quantidade: l.quantidade * escala } : l));
}

/** Escala válida: número maior que zero, até 100 (protege contra erros de escrita). */
export function escalaValida(escala: number | null): escala is number {
  return escala !== null && escala > 0 && escala <= 100;
}
