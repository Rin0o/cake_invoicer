/**
 * Formatação e leitura de valores. A formatação segue o idioma atual (`textos().formato`:
 * "1,20 €" em português, "€1.20" em inglês); a leitura aceita vírgula ou ponto decimal.
 */
import { textos } from '@/i18n';

import { simboloUnidade, type UnidadeEntrada } from './units';

/** Lê um número escrito como "1,5", "1.5" ou " 2 ". Devolve `null` se não for válido. */
export function lerDecimal(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (limpo === '' || !/^-?\d*\.?\d*$/.test(limpo) || limpo === '.' || limpo === '-') return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Lê um valor em euros ("1,20") e devolve cêntimos inteiros (120). */
export function lerEurosParaCent(texto: string): number | null {
  const n = lerDecimal(texto);
  return n === null ? null : Math.round(n * 100);
}

/** Formata um número com o separador decimal do idioma, sem zeros desnecessários (máx. `casas`). */
export function formatarDecimal(n: number, casas = 3): string {
  const fixo = n.toFixed(casas).replace(/\.?0+$/, '');
  return fixo.replace('.', textos().formato.decimal);
}

/** 30 → "30 %" (em inglês "30%"). */
export function formatarPercentagem(pct: number): string {
  return textos().formato.percentagem(formatarDecimal(pct, 2));
}

function agruparMilhares(inteiro: string): string {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, textos().formato.milhares);
}

/** 12345 → "123,45 €". Arredonda ao cêntimo. */
export function formatarEuro(cent: number): string {
  const negativo = cent < 0;
  const abs = Math.round(Math.abs(cent));
  const euros = Math.floor(abs / 100);
  const resto = String(abs % 100).padStart(2, '0');
  const f = textos().formato;
  return `${negativo ? '−' : ''}${f.euro(`${agruparMilhares(String(euros))}${f.decimal}${resto}`)}`;
}

/** 120, "kg" → "1,20 €/kg". A unidade é a guardada ("kg", "l", "un"); o símbolo segue o idioma. */
export function formatarPrecoUnidade(cent: number, unidade: UnidadeEntrada): string {
  return `${formatarEuro(cent)}/${simboloUnidade(unidade)}`;
}

/** Para valores já arredondados ao euro: 4500 → "45 €". */
export function formatarEuroInteiro(cent: number): string {
  const negativo = cent < 0;
  const euros = Math.round(Math.abs(cent) / 100);
  return `${negativo ? '−' : ''}${textos().formato.euro(agruparMilhares(String(euros)))}`;
}

/** Valor em cêntimos para um campo de texto: 120 → "1,20". */
export function centParaTexto(cent: number): string {
  return (cent / 100).toFixed(2).replace('.', textos().formato.decimal);
}

/**
 * Lê um tempo de trabalho e devolve minutos.
 * Aceita "150" (minutos), "2h", "2h30", "2:30", "1,5h".
 */
export function lerTempo(texto: string): number | null {
  const t = texto.trim().toLowerCase().replace(/\s/g, '');
  if (t === '') return null;

  const hm = /^(\d+)[:h](\d{1,2})?(?:m|min)?$/.exec(t);
  if (hm) {
    const minutos = hm[2] ? Number(hm[2]) : 0;
    if (minutos >= 60) return null;
    return Number(hm[1]) * 60 + minutos;
  }

  const horasDecimais = /^(\d+(?:[.,]\d+)?)h$/.exec(t);
  if (horasDecimais) return Math.round(lerDecimal(horasDecimais[1])! * 60);

  const minutos = /^(\d+)(?:m|min)?$/.exec(t);
  if (minutos) return Number(minutos[1]);

  return null;
}

/** 150 → "2h30", 45 → "45 min", 120 → "2h". */
export function formatarTempo(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Lê "dd/mm/aaaa" e devolve "aaaa-mm-dd". Aceita também "d/m/aa". */
export function lerData(texto: string): string | null {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return null;
  }
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Data local de hoje em "aaaa-mm-dd". */
export function hojeIso(agora = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${m}-${d}`;
}

/** "aaaa-mm-dd" → `Date` à meia-noite local (para o seletor de data). Sem data → hoje. */
export function isoParaData(iso: string | null | undefined, agora = new Date()): Date {
  if (!iso) return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** "aaaa-mm-dd" → "dd/mm/aaaa". */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/** Instante ISO guardado na base (UTC, ex.: `estado_em`) → "dd/mm/aaaa" no dia local. */
export function formatarDataDeInstante(instante: string | null | undefined): string {
  if (!instante) return '';
  const d = new Date(instante);
  return Number.isNaN(d.getTime()) ? '' : formatarData(hojeIso(d));
}
