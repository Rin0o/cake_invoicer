/** Estados de um orçamento. Mudam-se à mão; partilhar um rascunho passa-o a "enviado". */

export const ESTADOS = ['rascunho', 'enviado', 'aceite', 'recusado', 'entregue'] as const;
export type EstadoOrcamento = (typeof ESTADOS)[number];

export const NOME_ESTADO: Record<EstadoOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aceite: 'Aceite',
  recusado: 'Recusado',
  entregue: 'Entregue',
};

/** Estado do orçamento depois de ser partilhado com o cliente. */
export function estadoDepoisDePartilhar(estado: EstadoOrcamento): EstadoOrcamento {
  return estado === 'rascunho' ? 'enviado' : estado;
}
