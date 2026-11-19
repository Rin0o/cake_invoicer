import { formatarData, formatarEuroInteiro } from '@/domain/format';
import type { OrcamentoCalculado } from '@/domain/pricing';

export interface DadosResumo {
  nomeNegocio: string;
  dataEntrega: string | null;
  bolos: { nome: string }[];
  calculo: OrcamentoCalculado;
}

/**
 * Resumo em texto para enviar ao cliente (WhatsApp, SMS, email).
 * Mostra só os preços finais de cada bolo e o total, sem o detalhe de ingredientes.
 * Não inclui o nome do cliente nem as notas internas.
 */
export function resumoTexto(d: DadosResumo): string {
  const linhas: string[] = [];
  linhas.push(d.nomeNegocio ? `*Orçamento — ${d.nomeNegocio}*` : '*Orçamento*');
  linhas.push('');
  if (d.dataEntrega) {
    linhas.push(`Entrega: ${formatarData(d.dataEntrega)}`);
    linhas.push('');
  }

  d.bolos.forEach((b, i) => {
    linhas.push(`• ${b.nome}: ${formatarEuroInteiro(d.calculo.bolos[i].precoFinalCent)}`);
  });
  linhas.push('');
  linhas.push(`*Total: ${formatarEuroInteiro(d.calculo.totalCent)}*`);
  return linhas.join('\n');
}
