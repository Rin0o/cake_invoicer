/** Estados de um orçamento. Mudam-se à mão; partilhar um rascunho passa-o a "enviado". */
import { textos } from '@/i18n';

export const ESTADOS = ['rascunho', 'enviado', 'aceite', 'recusado', 'entregue'] as const;
export type EstadoOrcamento = (typeof ESTADOS)[number];

/** Nome do estado no idioma atual. */
export function nomeEstado(estado: EstadoOrcamento): string {
  return textos().estados.nome[estado];
}

export interface PassoSeguinte {
  estado: EstadoOrcamento;
  /** Texto do botão (curto, para caber ao lado do estado). */
  rotulo: string;
  /** Texto completo, para leitores de ecrã. */
  descricao: string;
  /** O passo mais provável (botão em destaque). */
  principal: boolean;
}

type Passos = ReturnType<typeof textos>['estados']['passos'];

/** Passos de cada estado; os textos vêm de `textos().estados.passos`. */
const PASSOS: Record<EstadoOrcamento, { estado: EstadoOrcamento; texto: keyof Passos; principal: boolean }[]> = {
  // Enviar o PDF ou o texto já passa um rascunho a "enviado".
  rascunho: [],
  enviado: [
    { estado: 'aceite', texto: 'aceitou', principal: true },
    { estado: 'recusado', texto: 'recusou', principal: false },
  ],
  aceite: [{ estado: 'entregue', texto: 'entregue', principal: true }],
  // Reabrir volta a rascunho: ajusta-se e, ao partilhar de novo, passa a "enviado".
  recusado: [{ estado: 'rascunho', texto: 'reabrir', principal: true }],
  entregue: [],
};

/** Listas do ecrã de orçamentos: os abertos e o histórico, separado em entregues e recusados. */
export const GRUPOS = ['abertos', 'entregues', 'recusados'] as const;
export type GrupoOrcamentos = (typeof GRUPOS)[number];

/** Nome da lista no idioma atual. */
export function nomeGrupo(grupo: GrupoOrcamentos): string {
  return textos().estados.grupo[grupo];
}

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
  const t = textos().estados;
  return grupo === 'abertos' ? t.reaberto : t.passouPara(nomeGrupo(grupo));
}

/** Ações sugeridas a partir de um estado. Os outros estados escolhem-se à mão. */
export function passosSeguintes(estado: EstadoOrcamento): PassoSeguinte[] {
  const t = textos().estados.passos;
  return PASSOS[estado].map((p) => ({ estado: p.estado, ...t[p.texto], principal: p.principal }));
}

/** Estado do orçamento depois de ser partilhado com o cliente. */
export function estadoDepoisDePartilhar(estado: EstadoOrcamento): EstadoOrcamento {
  return estado === 'rascunho' ? 'enviado' : estado;
}
