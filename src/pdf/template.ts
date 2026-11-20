/**
 * HTML do orçamento em PDF para o cliente. Módulo puro (testado sem telemóvel);
 * a geração do ficheiro está em `pdf.ts`.
 *
 * Mostra o nome do negócio no topo, o número do orçamento, os preços finais de cada bolo, o
 * total e, no fundo, os contactos do negócio. Sem nome do cliente, título do pedido, notas
 * internas nem detalhe de ingredientes.
 *
 * O nome, a cor e os contactos são sempre os das definições atuais (não ficam guardados no
 * orçamento): são a apresentação do negócio, não fazem parte do preço.
 */
import { formatarData, formatarEuroInteiro } from '@/domain/format';
import type { OrcamentoCalculado } from '@/domain/pricing';

import { corPdf } from './cores';

/** Contactos do negócio, como estão nas definições. Os vazios não aparecem. */
export interface ContactosNegocio {
  telefone: string;
  email: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  site: string;
}

export interface DadosPdf {
  /** Nome do negócio, em destaque no topo. Vazio: só o título "Orçamento". */
  nomeNegocio: string;
  /** Id da cor, ver `CORES_PDF`. */
  cor: string;
  contactos: ContactosNegocio;
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

/** Tira o endereço do site e o "@" do início, para aceitar "@nome", "nome" ou o link do perfil. */
function utilizador(texto: string, dominio: string): string {
  return texto
    .trim()
    .replace(new RegExp(`^(https?://)?(www\\.|m\\.)?${dominio.replace('.', '\\.')}/`, 'i'), '')
    .replace(/[/?#].*$/, '')
    .replace(/^@+/, '');
}

/**
 * Contactos prontos a mostrar, pela ordem do rodapé. As redes sociais levam o nome da rede,
 * porque "@nome" sozinho não diz onde procurar.
 */
export function linhasContactos(c: ContactosNegocio): string[] {
  const linhas: string[] = [];
  if (c.telefone.trim()) linhas.push(c.telefone.trim());
  if (c.email.trim()) linhas.push(c.email.trim());
  const instagram = utilizador(c.instagram, 'instagram.com');
  if (instagram) linhas.push(`Instagram @${instagram}`);
  const facebook = utilizador(c.facebook, 'facebook.com');
  if (facebook) linhas.push(`Facebook ${facebook}`);
  const tiktok = utilizador(c.tiktok, 'tiktok.com');
  if (tiktok) linhas.push(`TikTok @${tiktok}`);
  const site = c.site.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (site) linhas.push(site);
  return linhas;
}

export function htmlOrcamento(d: DadosPdf): string {
  const e = escaparHtml;
  const cor = corPdf(d.cor);
  const nome = d.nomeNegocio.trim();
  const contactos = linhasContactos(d.contactos);
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
  body { font-family: sans-serif; color: ${cor.texto}; font-size: 12pt; margin: 0; }
  header { text-align: center; margin: 4mm 0 2mm; }
  .marca { color: ${cor.principal}; font-family: serif; font-size: 26pt; line-height: 1.2; }
  h1 { color: ${cor.principal}; font-size: 20pt; font-weight: normal; margin: 4mm 0 6mm; text-align: center; letter-spacing: 1px; }
  .dados { margin-bottom: 8mm; line-height: 1.7; }
  .rotulo { display: inline-block; width: 22mm; color: ${cor.secundaria}; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: normal; color: ${cor.secundaria}; border-bottom: 1px solid ${cor.linhas}; padding: 2mm 0; }
  td { padding: 3mm 0; border-bottom: 1px solid ${cor.linhas}; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  .valor { text-align: right; white-space: nowrap; padding-left: 6mm; }
  tr.total td { border-bottom: none; border-top: 2px solid ${cor.principal}; font-size: 15pt; font-weight: bold; color: ${cor.principal}; padding-top: 4mm; }
  footer { margin-top: 14mm; text-align: center; color: ${cor.secundaria}; font-size: 10pt; page-break-inside: avoid; break-inside: avoid; }
  .contactos { margin-bottom: 3mm; line-height: 1.6; }
  .contacto { white-space: nowrap; }
  .aviso { font-style: italic; }
</style>
</head>
<body>
${nome ? `<header><div class="marca">${e(nome)}</div></header>` : ''}
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
<footer>
${contactos.length ? `<div class="contactos">${contactos.map((c) => `<span class="contacto">${e(c)}</span>`).join(' &nbsp;·&nbsp; ')}</div>\n` : ''}<div class="aviso">Orçamento — não serve de fatura.</div>
</footer>
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
