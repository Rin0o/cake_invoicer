/**
 * Referência do orçamento para o cliente ("2026-K7QM"). Substitui o número sequencial
 * ("2026-001") em tudo o que o cliente recebe (PDF, texto, nome do ficheiro), para não revelar
 * quantos orçamentos já foram feitos. O número interno continua na app.
 *
 * A referência é calculada a partir do número (ano + sequência), sem coluna própria na base:
 * - uma permutação (rede de Feistel com 6 voltas) baralha a sequência dentro de 0…31⁴-1, por
 *   isso cada número dá um código diferente e consecutivos não têm padrão visível;
 * - o ano entra na permutação, por isso o 001 de 2026 e o 001 de 2027 têm códigos diferentes;
 * - o código tem 4 carateres de um alfabeto sem 0/O, 1/I/L, fácil de ditar ao telefone.
 *
 * Não é cifra a sério: quem ler este código fonte consegue reverter a referência. Chega para o
 * objetivo (um cliente não deduz o volume de pedidos a partir do que recebe).
 *
 * NUNCA mudar ALFABETO, CHAVE, VOLTAS nem `mistura`: as referências já enviadas a clientes
 * deixariam de corresponder aos orçamentos.
 */
import type { NumeroOrcamento } from './numero';

const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const BASE = ALFABETO.length; // 31
const METADE = BASE * BASE; // 961: cada metade da rede de Feistel tem 2 carateres
const TOTAL = METADE * METADE; // 923 521 códigos por ano
const VOLTAS = 6;
const CHAVE = 0x5bd1e995;

/** Função de cada volta: mistura metade direita, ano e volta num valor 0…960. */
function mistura(r: number, ano: number, volta: number): number {
  let h = Math.imul(r + 1, 0x9e3779b1) ^ Math.imul(ano, 0x85ebca6b) ^ Math.imul(volta + 1, 0xc2b2ae35) ^ CHAVE;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) % METADE;
}

function permutar(x: number, ano: number): number {
  let l = Math.floor(x / METADE);
  let r = x % METADE;
  for (let v = 0; v < VOLTAS; v++) [l, r] = [r, (l + mistura(r, ano, v)) % METADE];
  return l * METADE + r;
}

function desfazer(y: number, ano: number): number {
  let l = Math.floor(y / METADE);
  let r = y % METADE;
  for (let v = VOLTAS - 1; v >= 0; v--) [l, r] = [(r - mistura(l, ano, v) + METADE) % METADE, l];
  return l * METADE + r;
}

/** Só o código, sem o ano: 2026, 1 → "QJQX". */
export function codigoReferencia(n: NumeroOrcamento): string {
  if (!Number.isInteger(n.numero_seq) || n.numero_seq < 1 || n.numero_seq >= TOTAL) {
    throw new Error(`Sequência fora do intervalo da referência: ${n.numero_seq}`);
  }
  let y = permutar(n.numero_seq, n.numero_ano);
  let codigo = '';
  for (let i = 0; i < 4; i++) {
    codigo = ALFABETO[y % BASE] + codigo;
    y = Math.floor(y / BASE);
  }
  return codigo;
}

/** Referência completa para o cliente: "2026-K7QM". */
export function formatarReferencia(n: NumeroOrcamento): string {
  return `${n.numero_ano}-${codigoReferencia(n)}`;
}

/** "k7qm" → "K7QM"; `null` se não for um código válido (4 carateres do alfabeto). */
function lerCodigo(texto: string): string | null {
  const c = texto.trim().toUpperCase();
  if (c.length !== 4) return null;
  for (const ch of c) if (!ALFABETO.includes(ch)) return null;
  return c;
}

/** Código + ano → número interno; `null` se o código não corresponder a nenhum número. */
export function numeroDaReferencia(codigo: string, ano: number): NumeroOrcamento | null {
  const c = lerCodigo(codigo);
  if (!c) return null;
  let y = 0;
  for (const ch of c) y = y * BASE + ALFABETO.indexOf(ch);
  const seq = desfazer(y, ano);
  return seq >= 1 ? { numero_ano: ano, numero_seq: seq } : null;
}

/**
 * Interpreta texto da pesquisa como referência: "2026-K7QM" (ano indicado) ou "K7QM" (qualquer
 * ano). Devolve `null` se não tiver a forma de uma referência.
 */
export function lerPesquisaReferencia(texto: string): { codigo: string; ano: number | null } | null {
  const m = /^\s*(?:(\d{4})\s*-\s*)?([A-Za-z0-9]{4})\s*$/.exec(texto);
  if (!m) return null;
  const codigo = lerCodigo(m[2]);
  if (!codigo) return null;
  return { codigo, ano: m[1] ? Number(m[1]) : null };
}
