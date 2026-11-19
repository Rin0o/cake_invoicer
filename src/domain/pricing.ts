/**
 * Cálculo de preços dos orçamentos. Módulo puro, sem dependências de UI ou base de dados.
 *
 * Todos os valores monetários estão em cêntimos. Os valores intermédios não são
 * arredondados; só o preço de cada bolo é arredondado ao euro.
 */

export interface ParametrosOrcamento {
  /** Valor de uma hora de trabalho, em cêntimos. */
  valorHoraCent: number;
  /** Custos indiretos em percentagem (ex.: 10 = 10 %), sobre materiais + tempo. */
  indiretoPct: number;
  /** Margem (markup) em percentagem (ex.: 30 = 30 %), só sobre os materiais. */
  margemPct: number;
}

export interface LinhaInput {
  /** Quantidade na unidade do item (kg, l ou un). */
  quantidade: number;
  /** Preço por unidade do item, em cêntimos. */
  precoUnitCent: number;
}

export interface BoloInput {
  linhas: LinhaInput[];
  tempoMin: number;
  /** Preço final editado manualmente, em cêntimos. `null` = usa o calculado. */
  precoFinalCent: number | null;
  /** Preço calculado no momento em que o preço final foi editado. */
  precoCalcNoAjusteCent?: number | null;
}

export interface BoloCalculado {
  materiaisCent: number;
  tempoCent: number;
  indiretosCent: number;
  margemCent: number;
  /** Materiais + tempo + indiretos. */
  custoCent: number;
  /** Preço calculado, arredondado ao euro. */
  precoCalcCent: number;
  /** Preço usado no orçamento: o editado, se existir, ou o calculado. */
  precoFinalCent: number;
  ajustado: boolean;
  /** precoFinal − precoCalc. */
  diferencaCent: number;
  abaixoDoCusto: boolean;
  /** Ajustado e o calculado mudou desde o ajuste. */
  calculadoMudou: boolean;
}

export interface OrcamentoCalculado {
  bolos: BoloCalculado[];
  custoCent: number;
  totalCalcCent: number;
  totalCent: number;
  diferencaCent: number;
}

/** Valor de uma linha: quantidade × preço por unidade. Sem arredondar. */
export function valorLinha(linha: LinhaInput): number {
  return linha.quantidade * linha.precoUnitCent;
}

/** Arredonda ao euro; 0,50 arredonda para cima. */
export function arredondarAoEuro(cent: number): number {
  // O pequeno epsilon evita que 249,9999999 (erro de vírgula flutuante) arredonde para baixo.
  return Math.floor(cent / 100 + 0.5 + 1e-9) * 100;
}

export function calcularBolo(bolo: BoloInput, p: ParametrosOrcamento): BoloCalculado {
  const materiaisCent = bolo.linhas.reduce((s, l) => s + valorLinha(l), 0);
  const tempoCent = (bolo.tempoMin / 60) * p.valorHoraCent;
  const indiretosCent = (materiaisCent + tempoCent) * (p.indiretoPct / 100);
  const margemCent = materiaisCent * (p.margemPct / 100);
  const custoCent = materiaisCent + tempoCent + indiretosCent;
  const precoCalcCent = arredondarAoEuro(custoCent + margemCent);

  const ajustado = bolo.precoFinalCent !== null;
  const precoFinalCent = bolo.precoFinalCent ?? precoCalcCent;
  const calculadoMudou =
    ajustado &&
    bolo.precoCalcNoAjusteCent != null &&
    bolo.precoCalcNoAjusteCent !== precoCalcCent;

  return {
    materiaisCent,
    tempoCent,
    indiretosCent,
    margemCent,
    custoCent,
    precoCalcCent,
    precoFinalCent,
    ajustado,
    diferencaCent: precoFinalCent - precoCalcCent,
    abaixoDoCusto: precoFinalCent < custoCent,
    calculadoMudou,
  };
}

export function calcularOrcamento(bolos: BoloInput[], p: ParametrosOrcamento): OrcamentoCalculado {
  const calculados = bolos.map((b) => calcularBolo(b, p));
  const soma = (f: (b: BoloCalculado) => number) => calculados.reduce((s, b) => s + f(b), 0);
  const totalCalcCent = soma((b) => b.precoCalcCent);
  const totalCent = soma((b) => b.precoFinalCent);
  return {
    bolos: calculados,
    custoCent: soma((b) => b.custoCent),
    totalCalcCent,
    totalCent,
    diferencaCent: totalCent - totalCalcCent,
  };
}
