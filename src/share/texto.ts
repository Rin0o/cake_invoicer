import { formatarData, formatarEuroInteiro } from '@/domain/format';
import type { OrcamentoCalculado } from '@/domain/pricing';

export interface DadosResumo {
  nomeNegocio: string;
  contactoNegocio: string;
  cliente: string;
  dataEntrega: string | null;
  bolos: { nome: string }[];
  calculo: OrcamentoCalculado;
}

/**
 * Resumo em texto para enviar ao cliente (WhatsApp, SMS, email).
 * Mostra só os preços finais de cada bolo e o total, sem o detalhe de ingredientes.
 * As notas do orçamento são internas e não são incluídas.
 */
export function resumoTexto(d: DadosResumo): string {
  const linhas: string[] = [];
  linhas.push(d.nomeNegocio ? `*Orçamento — ${d.nomeNegocio}*` : '*Orçamento*');
  linhas.push('');
  if (d.cliente) linhas.push(`Cliente: ${d.cliente}`);
  if (d.dataEntrega) linhas.push(`Entrega: ${formatarData(d.dataEntrega)}`);
  if (d.cliente || d.dataEntrega) linhas.push('');

  d.bolos.forEach((b, i) => {
    linhas.push(`• ${b.nome}: ${formatarEuroInteiro(d.calculo.bolos[i].precoFinalCent)}`);
  });
  linhas.push('');
  linhas.push(`*Total: ${formatarEuroInteiro(d.calculo.totalCent)}*`);

  if (d.contactoNegocio.trim()) {
    linhas.push('');
    linhas.push(d.contactoNegocio.trim());
  }
  linhas.push('');
  linhas.push('_Orçamento — não serve de fatura._');
  return linhas.join('\n');
}
