/** Unidade em que o preço de um item é definido (€/kg, €/l, €/un). */
export type UnidadeItem = 'kg' | 'l' | 'un';

/** Unidade em que a quantidade usada pode ser introduzida no orçamento. */
export type UnidadeEntrada = 'kg' | 'g' | 'l' | 'ml' | 'un';

export const UNIDADES_ITEM: UnidadeItem[] = ['kg', 'l', 'un'];

/** Unidades de entrada aceites para cada unidade de item, pela ordem em que são mostradas. */
export const UNIDADES_ENTRADA: Record<UnidadeItem, UnidadeEntrada[]> = {
  kg: ['g', 'kg'],
  l: ['ml', 'l'],
  un: ['un'],
};

/** Unidade de entrada sugerida por omissão (normalmente mede-se em g e ml). */
export function unidadeEntradaPorOmissao(unidade: UnidadeItem): UnidadeEntrada {
  return UNIDADES_ENTRADA[unidade][0];
}

const FATOR: Record<UnidadeEntrada, number> = {
  kg: 1,
  g: 1 / 1000,
  l: 1,
  ml: 1 / 1000,
  un: 1,
};

function verificarCompatibilidade(unidadeItem: UnidadeItem, entrada: UnidadeEntrada) {
  if (!UNIDADES_ENTRADA[unidadeItem].includes(entrada)) {
    throw new Error(`Unidade ${entrada} não é compatível com ${unidadeItem}`);
  }
}

/** Converte uma quantidade introduzida (ex.: 250 g) para a unidade do item (0,25 kg). */
export function paraUnidadeItem(
  quantidade: number,
  entrada: UnidadeEntrada,
  unidadeItem: UnidadeItem,
): number {
  verificarCompatibilidade(unidadeItem, entrada);
  return quantidade * FATOR[entrada];
}

/** Converte uma quantidade na unidade do item para a unidade de entrada (0,25 kg → 250 g). */
export function deUnidadeItem(
  quantidade: number,
  entrada: UnidadeEntrada,
  unidadeItem: UnidadeItem,
): number {
  verificarCompatibilidade(unidadeItem, entrada);
  return quantidade / FATOR[entrada];
}
