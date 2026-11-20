/**
 * HTML do orçamento em PDF para o cliente. Módulo puro (testado sem telemóvel);
 * a geração do ficheiro está em `pdf.ts`.
 *
 * Mostra o número do orçamento, os preços finais de cada bolo e o total, como o resumo em texto.
 * Sem nome do negócio (o logótipo já o tem), nome do cliente, título do pedido, notas internas
 * nem detalhe de ingredientes.
 */
import { formatarData, formatarEuroInteiro } from '@/domain/format';
import type { OrcamentoCalculado } from '@/domain/pricing';

export interface DadosPdf {
  /** Imagem em data URI (`data:image/png;base64,…`), ou `null` sem logótipo. */
  logotipo: string | null;
  /** Número público do orçamento ("2026-014"). */
  numero: string;
  dataEntrega: string | null;
  /** Data em que o PDF é gerado, "aaaa-mm-dd". */
  dataEmissao: string;
  bolos: { nome: string }[];
  calculo: OrcamentoCalculado;
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const COR = '#A63D6B';

export function htmlOrcamento(d: DadosPdf): string {
  const e = escaparHtml;
  const linhasBolos = d.bolos
    .map(
      (b, i) =>
        `<tr><td>${e(b.nome)}</td><td class="valor">${e(formatarEuroInteiro(d.calculo.bolos[i].precoFinalCent))}</td></tr>`,
    )
    .join('\n');

  const dados: string[] = [];
  dados.push(`<div><span class="rotulo">Número</span> ${e(d.numero)}</div>`);
  if (d.dataEntrega) dados.push(`<div><span class="rotulo">Entrega</span> ${e(formatarData(d.dataEntrega))}</div>`);
  dados.push(`<div><span class="rotulo">Data</span> ${e(formatarData(d.dataEmissao))}</div>`);

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: sans-serif; color: #2B151C; font-size: 12pt; margin: 0; }
  header { text-align: center; margin-bottom: 8mm; }
  header img { width: 45mm; height: 45mm; object-fit: contain; }
  h1 { color: ${COR}; font-size: 20pt; font-weight: normal; margin: 4mm 0 6mm; text-align: center; letter-spacing: 1px; }
  .dados { margin-bottom: 8mm; line-height: 1.7; }
  .rotulo { display: inline-block; width: 22mm; color: #74565F; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: normal; color: #74565F; border-bottom: 1px solid #F2DDE1; padding: 2mm 0; }
  td { padding: 3mm 0; border-bottom: 1px solid #F2DDE1; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  .valor { text-align: right; white-space: nowrap; padding-left: 6mm; }
  tr.total td { border-bottom: none; border-top: 2px solid ${COR}; font-size: 15pt; font-weight: bold; color: ${COR}; padding-top: 4mm; }
  footer { margin-top: 14mm; text-align: center; color: #74565F; font-size: 10pt; font-style: italic; }
</style>
</head>
<body>
${d.logotipo ? `<header><img src="${d.logotipo}" alt=""></header>` : ''}
<h1>Orçamento</h1>
<div class="dados">
${dados.join('\n')}
</div>
<table>
<thead><tr><th>Bolo</th><th class="valor">Preço</th></tr></thead>
<tbody>
${linhasBolos}
<tr class="total"><td>Total</td><td class="valor">${e(formatarEuroInteiro(d.calculo.totalCent))}</td></tr>
</tbody>
</table>
<footer>Orçamento — não serve de fatura.</footer>
</body>
</html>`;
}

/** Nome do ficheiro PDF: "Orcamento-2026-014-Ana-Silva.pdf" (sem acentos nem espaços). */
export function nomeFicheiroPdf(numero: string, cliente: string): string {
  const limpo = cliente
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `Orcamento-${numero}${limpo ? '-' + limpo : ''}.pdf`;
}
