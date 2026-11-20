import { formatarData, formatarEuroInteiro } from '@/domain/format';
import type { OrcamentoCalculado } from '@/domain/pricing';

export interface DadosResumo {
  nomeNegocio: string;
  /** Referência do orçamento para o cliente ("2026-QJQX"), ver `formatarReferencia`. */
  referencia: string;
  dataEntrega: string | null;
  bolos: { nome: string }[];
  calculo: OrcamentoCalculado;
}

/**
 * Resumo em texto para enviar ao cliente (WhatsApp, SMS, email).
 * Mostra só os preços finais de cada bolo e o total, sem o detalhe de ingredientes.
 * Inclui a referência do orçamento (não o número interno, que revelaria quantos orçamentos há);
 * não inclui o nome do cliente, o título do pedido nem as notas internas.
 */
export function resumoTexto(d: DadosResumo): string {
  const linhas: string[] = [];
  const titulo = `Orçamento ref. ${d.referencia}`;
  linhas.push(d.nomeNegocio ? `*${titulo} — ${d.nomeNegocio}*` : `*${titulo}*`);
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
