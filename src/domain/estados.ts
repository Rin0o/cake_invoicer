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

export interface PassoSeguinte {
  estado: EstadoOrcamento;
  /** Texto do botão (curto, para caber ao lado do estado). */
  rotulo: string;
  /** Texto completo, para leitores de ecrã. */
  descricao: string;
  /** O passo mais provável (botão em destaque). */
  principal: boolean;
}

const PASSOS: Record<EstadoOrcamento, PassoSeguinte[]> = {
  // Enviar o PDF ou o texto já passa um rascunho a "enviado".
  rascunho: [],
  enviado: [
    { estado: 'aceite', rotulo: 'Aceitou', descricao: 'Cliente aceitou', principal: true },
    { estado: 'recusado', rotulo: 'Recusou', descricao: 'Cliente recusou', principal: false },
  ],
  aceite: [{ estado: 'entregue', rotulo: 'Entregue', descricao: 'Marcar como entregue', principal: true }],
  // Reabrir volta a rascunho: ajusta-se e, ao partilhar de novo, passa a "enviado".
  recusado: [{ estado: 'rascunho', rotulo: 'Reabrir', descricao: 'Reabrir para ajustar e reenviar', principal: true }],
  entregue: [],
};

/** Listas do ecrã de orçamentos: os abertos e o histórico, separado em entregues e recusados. */
export const GRUPOS = ['abertos', 'entregues', 'recusados'] as const;
export type GrupoOrcamentos = (typeof GRUPOS)[number];

export const NOME_GRUPO: Record<GrupoOrcamentos, string> = {
  abertos: 'Abertos',
  entregues: 'Entregues',
  recusados: 'Recusados',
};

export const ESTADOS_DO_GRUPO: Record<GrupoOrcamentos, readonly EstadoOrcamento[]> = {
  abertos: ['rascunho', 'enviado', 'aceite'],
  entregues: ['entregue'],
  recusados: ['recusado'],
};

export function grupoDoEstado(estado: EstadoOrcamento): GrupoOrcamentos {
  return GRUPOS.find((g) => ESTADOS_DO_GRUPO[g].includes(estado))!;
}

/** Aviso a mostrar quando uma mudança de estado leva o orçamento para outra lista (ou `null`). */
export function avisoMudancaDeGrupo(de: EstadoOrcamento, para: EstadoOrcamento): string | null {
  const grupo = grupoDoEstado(para);
  if (grupo === grupoDoEstado(de)) return null;
  return grupo === 'abertos' ? 'Reaberto: está nos Abertos' : `Passou para ${NOME_GRUPO[grupo]}`;
}

/** Ações sugeridas a partir de um estado. Os outros estados escolhem-se à mão. */
export function passosSeguintes(estado: EstadoOrcamento): PassoSeguinte[] {
  return PASSOS[estado];
}

/** Estado do orçamento depois de ser partilhado com o cliente. */
export function estadoDepoisDePartilhar(estado: EstadoOrcamento): EstadoOrcamento {
  return estado === 'rascunho' ? 'enviado' : estado;
}
